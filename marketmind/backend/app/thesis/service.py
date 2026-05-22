from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db.models import CompanySignal, Evidence, Thesis
from app.ingestion.schema import Document
from app.services.llm_service import LLMService
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

    async def get_company_radar(self, min_mentions: int = 2) -> list[CompanyRadarItem]:
        """Companies appearing across multiple documents/theses — the unknown-company finder."""
        async with self._factory() as session:
            rows = (
                await session.execute(
                    select(
                        CompanySignal.company_name,
                        CompanySignal.ticker,
                        func.sum(CompanySignal.mention_count).label("total_mentions"),
                        func.min(CompanySignal.first_seen).label("first_seen"),
                        func.max(CompanySignal.last_seen).label("last_seen"),
                    )
                    .group_by(CompanySignal.company_name, CompanySignal.ticker)
                    .having(func.sum(CompanySignal.mention_count) >= min_mentions)
                    .order_by(func.sum(CompanySignal.mention_count).desc())
                    .limit(50)
                )
            ).all()

            result = []
            for row in rows:
                thesis_rows = (
                    await session.execute(
                        select(Thesis.name)
                        .join(CompanySignal, CompanySignal.thesis_id == Thesis.id)
                        .where(CompanySignal.company_name == row.company_name)
                        .distinct()
                    )
                ).scalars().all()
                result.append(
                    CompanyRadarItem(
                        company_name=row.company_name,
                        ticker=row.ticker,
                        thesis_names=list(thesis_rows),
                        mention_count=row.total_mentions,
                        first_seen=row.first_seen,
                        last_seen=row.last_seen,
                    )
                )
            return result

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
        existing = (
            await session.execute(
                select(CompanySignal).where(
                    CompanySignal.company_name == company_name,
                    CompanySignal.thesis_id == thesis_id,
                )
            )
        ).scalar_one_or_none()

        now = datetime.now(timezone.utc)
        if existing:
            existing.mention_count += 1
            existing.last_seen = now
        else:
            session.add(
                CompanySignal(
                    company_name=company_name,
                    thesis_id=thesis_id,
                    document_id=document_id,
                )
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
