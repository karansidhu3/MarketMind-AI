from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db.models import CompanySignal, Evidence, Thesis
from app.ingestion.normalise import is_same_company, normalise, pick_canonical
from app.ingestion.schema import Document
from app.services.llm_service import LLMService
from app.services.retrieval_service import COLLECTION, RetrievalService
from app.thesis.schema import CompanyRadarItem, ThesisCreate, ThesisOut, ThesisUpdate

logger = logging.getLogger(__name__)

KEYWORD_THRESHOLD = 0.15
MAX_COMPANIES_PER_DOC = 10

_SENTIMENT_PROMPT = """\
Is the following document supporting, opposing, or neutral regarding this investment thesis?

Thesis: {thesis_name}
Description: {thesis_desc}

Document title: {title}
Excerpt: {excerpt}

Reply with exactly one word: supporting, opposing, or neutral."""

_COMPANY_PROMPT = """\
List company names mentioned in this document that are relevant to the topic.
One company name per line. No commentary, no numbering, no tickers in parentheses.
If none, reply with "none".

Title: {title}
Text: {text}

Companies:"""


class ThesisService:
    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession],
        llm: LLMService,
    ) -> None:
        self._factory = session_factory
        self._llm = llm

    # ── CRUD ────────────────────────────────────────────────────────────────

    async def create(self, data: ThesisCreate) -> ThesisOut:
        async with self._factory() as session:
            thesis = Thesis(
                name=data.name,
                description=data.description,
                keywords=data.keywords,
                is_system=False,
            )
            session.add(thesis)
            await session.commit()
            await session.refresh(thesis)
            return await self._enrich(thesis, session)

    async def list_all(self) -> list[ThesisOut]:
        async with self._factory() as session:
            rows = (await session.execute(select(Thesis).order_by(Thesis.created_at))).scalars().all()
            return [await self._enrich(t, session) for t in rows]

    async def get(self, thesis_id: uuid.UUID) -> ThesisOut | None:
        async with self._factory() as session:
            thesis = await session.get(Thesis, thesis_id)
            if not thesis:
                return None
            return await self._enrich(thesis, session)

    async def update(self, thesis_id: uuid.UUID, data: ThesisUpdate) -> ThesisOut | None:
        async with self._factory() as session:
            thesis = await session.get(Thesis, thesis_id)
            if not thesis:
                return None
            if data.name is not None:
                thesis.name = data.name
            if data.description is not None:
                thesis.description = data.description
            if data.keywords is not None:
                thesis.keywords = data.keywords
            if data.is_active is not None:
                thesis.is_active = data.is_active
            await session.commit()
            await session.refresh(thesis)
            return await self._enrich(thesis, session)

    async def archive(self, thesis_id: uuid.UUID) -> bool:
        async with self._factory() as session:
            thesis = await session.get(Thesis, thesis_id)
            if not thesis:
                return False
            thesis.is_active = False
            await session.commit()
            return True

    async def get_evidence(self, thesis_id: uuid.UUID, limit: int = 50) -> list[Evidence]:
        async with self._factory() as session:
            rows = (
                await session.execute(
                    select(Evidence)
                    .where(Evidence.thesis_id == thesis_id)
                    .order_by(Evidence.created_at.desc())
                    .limit(limit)
                )
            ).scalars().all()
            return list(rows)

    async def get_company_radar(self, min_docs: int = 2) -> list[CompanyRadarItem]:
        """
        Companies ranked by unique source documents, grouped by normalised_name
        so "Eaton Corporation plc" and "Eaton Corporation" are a single entry.

        Uses Python-side aggregation so we can apply pick_canonical() on the name.
        """
        from collections import defaultdict

        async with self._factory() as session:
            all_signals = (
                await session.execute(select(CompanySignal))
            ).scalars().all()

            # Batch-load thesis names once
            thesis_id_to_name: dict[uuid.UUID, str] = {
                t.id: t.name
                for t in (await session.execute(select(Thesis))).scalars().all()
            }

        # Group by normalised_name
        groups: dict[str, list[CompanySignal]] = defaultdict(list)
        for sig in all_signals:
            if sig.normalised_name:
                groups[sig.normalised_name].append(sig)

        result: list[CompanyRadarItem] = []
        for norm, signals in groups.items():
            unique_docs = len({s.document_id for s in signals})
            if unique_docs < min_docs:
                continue

            canonical = pick_canonical([s.company_name for s in signals])
            ticker    = next((s.ticker for s in signals if s.ticker), None)
            thesis_names = list({
                thesis_id_to_name[s.thesis_id]
                for s in signals
                if s.thesis_id in thesis_id_to_name
            })
            total_mentions = sum(s.mention_count for s in signals)
            first_seen     = min(s.first_seen for s in signals)
            last_seen      = max(s.last_seen  for s in signals)

            result.append(CompanyRadarItem(
                company_name=canonical,
                ticker=ticker,
                thesis_names=thesis_names,
                doc_count=unique_docs,
                mention_count=total_mentions,
                first_seen=first_seen,
                last_seen=last_seen,
            ))

        return sorted(result, key=lambda x: x.doc_count, reverse=True)[:50]

    # ── Document scoring (called by IngestionWorker) ─────────────────────────

    async def score_document(self, doc: Document) -> None:
        """Score an ingested document against all active theses. Stores evidence + company signals."""
        async with self._factory() as session:
            theses = (
                await session.execute(select(Thesis).where(Thesis.is_active == True))  # noqa: E712
            ).scalars().all()

            for thesis in theses:
                score = self._keyword_score(thesis.keywords, doc)
                if score < KEYWORD_THRESHOLD:
                    continue

                # Check for duplicate evidence (same doc + thesis)
                existing = (
                    await session.execute(
                        select(Evidence).where(
                            Evidence.thesis_id == thesis.id,
                            Evidence.document_id == doc.id,
                        )
                    )
                ).scalar_one_or_none()
                if existing:
                    continue

                sentiment = await self._classify_sentiment(thesis, doc)
                excerpt = doc.content[:600]

                evidence = Evidence(
                    thesis_id=thesis.id,
                    document_id=doc.id,
                    sentiment=sentiment,
                    excerpt=excerpt,
                    score=round(score, 3),
                    source_url=doc.metadata.get("url", ""),
                    source_name=doc.source_name,
                    document_date=doc.created_at,
                )
                session.add(evidence)

                companies = await self._extract_companies(doc)
                for name in companies:
                    await self._upsert_company_signal(session, name, thesis.id, doc.id)

            await session.commit()

    # ── Corpus re-evaluation ─────────────────────────────────────────────────

    async def evaluate_against_corpus(
        self,
        thesis_id: uuid.UUID,
        retrieval: RetrievalService,
    ) -> int:
        """
        Score every document in the Qdrant corpus against this one thesis.
        Skips documents that already have evidence for this thesis.
        Returns count of new evidence records created.

        Intended use: called after a new thesis is created, or after keywords
        are updated, to immediately populate evidence without waiting for the
        next ingestion run.
        """
        async with self._factory() as session:
            thesis = await session.get(Thesis, thesis_id)
            if not thesis or not thesis.is_active:
                return 0
            # Snapshot thesis data before closing session
            thesis_id_val  = thesis.id
            thesis_name    = thesis.name
            thesis_desc    = thesis.description
            thesis_keywords = list(thesis.keywords)

            existing_doc_ids: set[str] = set(
                (await session.execute(
                    select(Evidence.document_id).where(Evidence.thesis_id == thesis_id)
                )).scalars().all()
            )

        # Use a minimal Thesis-like object so helpers don't need a DB session
        class _ThesisProxy:
            id = thesis_id_val
            name = thesis_name
            description = thesis_desc
            keywords = thesis_keywords

        proxy = _ThesisProxy()
        all_points = await retrieval.scroll_all(COLLECTION)
        new_count = 0

        for point in all_points:
            doc_id = point.payload.get("id", point.id)
            if doc_id in existing_doc_ids:
                continue

            doc = self._payload_to_document(point.payload)
            score = self._keyword_score(proxy.keywords, doc)
            if score < KEYWORD_THRESHOLD:
                continue

            sentiment = await self._classify_sentiment(proxy, doc)  # type: ignore[arg-type]
            excerpt   = doc.content[:600]

            async with self._factory() as session:
                # Guard against race if called concurrently
                already = (await session.execute(
                    select(Evidence).where(
                        Evidence.thesis_id == thesis_id,
                        Evidence.document_id == doc.id,
                    )
                )).scalar_one_or_none()
                if not already:
                    session.add(Evidence(
                        thesis_id=thesis_id,
                        document_id=doc.id,
                        sentiment=sentiment,
                        excerpt=excerpt,
                        score=round(score, 3),
                        source_url=doc.metadata.get("url", ""),
                        source_name=doc.source_name,
                        document_date=doc.created_at,
                    ))
                    await session.commit()
                    new_count += 1

        logger.info(
            "Re-evaluation of thesis %s complete — %d new evidence record(s)", thesis_id, new_count
        )
        return new_count

    # ── Seeding ──────────────────────────────────────────────────────────────

    async def seed_system_theses(self) -> int:
        """Insert pre-seeded theses if the table is empty. Returns count inserted."""
        from app.thesis.seed import SYSTEM_THESES

        async with self._factory() as session:
            count = (await session.execute(select(func.count(Thesis.id)))).scalar_one()
            if count > 0:
                return 0
            for data in SYSTEM_THESES:
                session.add(Thesis(is_system=True, **data))
            await session.commit()
            return len(SYSTEM_THESES)

    # ── Helpers ──────────────────────────────────────────────────────────────

    @staticmethod
    def _keyword_score(keywords: list[str], doc: Document) -> float:
        if not keywords:
            return 0.0
        text = (doc.title + " " + doc.content).lower()
        matches = sum(1 for kw in keywords if kw.lower() in text)
        return matches / len(keywords)

    async def _classify_sentiment(self, thesis: Thesis, doc: Document) -> str:
        try:
            response = await self._llm.generate(
                _SENTIMENT_PROMPT.format(
                    thesis_name=thesis.name,
                    thesis_desc=thesis.description[:200],
                    title=doc.title,
                    excerpt=doc.content[:600],
                )
            )
            r = response.strip().lower()
            if "supporting" in r:
                return "supporting"
            if "opposing" in r:
                return "opposing"
        except Exception:
            logger.warning("Sentiment classification failed for doc %s", doc.id)
        return "neutral"

    async def _extract_companies(self, doc: Document) -> list[str]:
        try:
            response = await self._llm.generate(
                _COMPANY_PROMPT.format(
                    title=doc.title,
                    text=doc.content[:1000],
                )
            )
            if "none" in response.lower()[:20]:
                return []
            names = []
            for line in response.strip().splitlines():
                name = line.strip().lstrip("-•*").strip()
                if name and 2 < len(name) < 100:
                    names.append(name)
            return names[:MAX_COMPANIES_PER_DOC]
        except Exception:
            logger.warning("Company extraction failed for doc %s", doc.id)
            return []

    async def _upsert_company_signal(
        self,
        session: AsyncSession,
        company_name: str,
        thesis_id: uuid.UUID,
        document_id: str,
    ) -> None:
        norm = normalise(company_name)
        if not norm:
            return

        # Load all signals for this thesis and match using is_same_company.
        # This handles both legal suffix variants ("Eaton Corp" == "Eaton Corporation")
        # and abbreviated extractions ("Quanta" == "Quanta Services").
        # The per-thesis list is small (~10-50 rows) so the Python-side scan is fine.
        all_signals = (
            await session.execute(
                select(CompanySignal).where(CompanySignal.thesis_id == thesis_id)
            )
        ).scalars().all()

        existing = next(
            (s for s in all_signals if is_same_company(s.company_name, company_name)),
            None,
        )

        now = datetime.now(timezone.utc)
        if existing:
            existing.mention_count += 1
            existing.last_seen = now
            # Always keep the longest (most complete) display name
            existing.company_name = pick_canonical([existing.company_name, company_name])
            existing.normalised_name = normalise(existing.company_name)
        else:
            session.add(
                CompanySignal(
                    company_name=company_name,
                    normalised_name=norm,
                    thesis_id=thesis_id,
                    document_id=document_id,
                )
            )

    @staticmethod
    def _payload_to_document(payload: dict) -> Document:
        """Reconstruct a Document from a Qdrant point payload for re-evaluation."""
        raw_ts = payload.get("created_at", "")
        try:
            created_at = datetime.fromisoformat(raw_ts) if raw_ts else datetime.now(timezone.utc)
        except ValueError:
            created_at = datetime.now(timezone.utc)
        return Document(
            id=payload.get("id", ""),
            title=payload.get("title", ""),
            source_name=payload.get("source_name", ""),
            source_type=payload.get("source_type", "rss"),
            source_credibility_score=float(payload.get("source_credibility_score", 0.5)),
            content=payload.get("content", ""),
            metadata=payload.get("metadata") or {},
            created_at=created_at,
        )

    async def _enrich(self, thesis: Thesis, session: AsyncSession) -> ThesisOut:
        counts = (
            await session.execute(
                select(Evidence.sentiment, func.count(Evidence.id))
                .where(Evidence.thesis_id == thesis.id)
                .group_by(Evidence.sentiment)
            )
        ).all()

        sentiment_map: dict[str, int] = {row[0]: row[1] for row in counts}
        supporting = sentiment_map.get("supporting", 0)
        opposing = sentiment_map.get("opposing", 0)
        total = sum(sentiment_map.values())
        confidence = round(supporting / total, 3) if total > 0 else 0.0

        return ThesisOut(
            id=thesis.id,
            name=thesis.name,
            description=thesis.description,
            keywords=thesis.keywords,
            is_active=thesis.is_active,
            is_system=thesis.is_system,
            created_at=thesis.created_at,
            updated_at=thesis.updated_at,
            evidence_count=total,
            supporting_count=supporting,
            opposing_count=opposing,
            confidence=confidence,
        )
