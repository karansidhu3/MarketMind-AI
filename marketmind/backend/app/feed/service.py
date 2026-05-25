from __future__ import annotations

import json
import logging
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db.models import CompanyAlert, CompanySignal, ConfidenceSnapshot, DailyFeed, Evidence, InsiderTransaction, Thesis
from app.feed.schema import AlertTrigger, FeedResponse, InsiderCluster, NewCompany, ThesisSignal
from app.services.cache_service import CacheService
from app.services.llm_service import LLMService
from app.thesis.decay import weighted_confidence

logger = logging.getLogger(__name__)

FEED_TTL = 25 * 3600  # 25h — expires after next day's feed is generated
MOMENTUM_WINDOW_DAYS = 7

_SUMMARY_PROMPT = """\
You are a financial analyst. Summarise today's investment signal feed in 3-4 sentences.
Be specific — name theses and companies. Focus on what is actionable.

Thesis signals today:
{thesis_block}

New companies surfaced:
{company_block}

Insider filing clusters:
{insider_block}

Write the summary now:"""

_EXPLAIN_SUMMARY_PROMPT = """\
/no_think
Rewrite the following investment briefing in casual plain English for someone who invests \
but doesn't work in finance. Keep all the specific company names and facts — just strip the \
jargon and make it sound like a friend texting, not a financial report.

Original briefing:
{original_summary}

Rules:
- Same key facts, different tone
- No words like "thesis", "corpus", "sentiment", "signals", or "bottleneck"
- No bullets, no headers, no percentages
- 2-3 sentences max
- Sound like a person, not a press release

Rewritten:"""

EXPLAIN_SUMMARY_TTL = 6 * 3600  # 6 hours — separate from the 25h feed cache


class FeedService:
    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession],
        llm: LLMService,
        cache: CacheService,
    ) -> None:
        self._factory = session_factory
        self._llm = llm
        self._cache = cache

    async def get_feed(self, feed_date: date) -> FeedResponse:
        cache_key = f"feed:generated:{feed_date.isoformat()}"

        cached = await self._cache.get(cache_key)
        if cached:
            data = json.loads(cached)
            data["from_cache"] = True
            return FeedResponse(**data)

        feed = await self._generate(feed_date)

        await self._cache.set(cache_key, feed.model_dump_json(), ttl_seconds=FEED_TTL)
        return feed

    async def invalidate(self, feed_date: date) -> None:
        await self._cache.delete(f"feed:generated:{feed_date.isoformat()}")

    async def stream_explain_summary(self, feed_date: date):
        """
        Async generator — streams the plain-English feed summary token by token.
        If cached, yields the full text as one chunk. If not, streams from LLM.
        Caches the result once complete.
        """
        cache_key = f"feed:explain-summary:{feed_date.isoformat()}"
        cached = await self._cache.get(cache_key)
        if cached:
            data = json.loads(cached)
            yield data["summary"]
            return

        feed = await self.get_feed(feed_date)
        if not feed.thesis_signals or not feed.summary:
            yield "Nothing new came in today — the trackers are quiet. Check back after the next ingestion run."
            return

        full_text = ""
        try:
            async for token in self._llm.generate_stream(
                _EXPLAIN_SUMMARY_PROMPT.format(original_summary=feed.summary)
            ):
                if "<think>" in token or "</think>" in token:
                    continue
                full_text += token
                yield token
        except Exception:
            logger.warning("Explain summary stream failed for %s", feed_date)
            fallback = feed.summary
            yield fallback
            full_text = fallback

        result = {"summary": full_text.strip(), "from_cache": False}
        await self._cache.set(cache_key, json.dumps(result), ttl_seconds=EXPLAIN_SUMMARY_TTL)

    async def get_explain_summary(self, feed_date: date) -> dict:
        """
        Plain-English rewrite of the daily briefing — same facts, casual tone, no jargon.
        Derives from feed.summary so Data and Explain modes are always in sync.
        Only caches when a real LLM response was generated (not empty-feed fallbacks).
        """
        cache_key = f"feed:explain-summary:{feed_date.isoformat()}"
        cached = await self._cache.get(cache_key)
        if cached:
            data = json.loads(cached)
            data["from_cache"] = True
            return data

        # Use the existing feed — guaranteed to match what Data mode shows
        feed = await self.get_feed(feed_date)

        # No signals today — return contextual message but don't cache it
        # (so it retries after ingestion runs rather than serving stale "quiet day" for 6h)
        if not feed.thesis_signals or not feed.summary:
            return {
                "summary": "Nothing new came in today — the trackers are quiet. Check back after the next ingestion run.",
                "from_cache": False,
            }

        # Rewrite the existing analyst summary in casual English
        summary = feed.summary  # fallback: just use the original if LLM fails
        try:
            raw = await self._llm.generate(
                _EXPLAIN_SUMMARY_PROMPT.format(original_summary=feed.summary)
            )
            summary = raw.strip().removeprefix("<think>").split("</think>")[-1].strip()
        except Exception:
            logger.warning("Explain summary rewrite failed for %s", feed_date)

        result = {"summary": summary, "from_cache": False}
        # Only cache successful rewrites — not the "quiet day" fallback above
        await self._cache.set(cache_key, json.dumps(result), ttl_seconds=EXPLAIN_SUMMARY_TTL)
        return result

    # ── Generation ────────────────────────────────────────────────────────────

    async def _generate(self, feed_date: date) -> FeedResponse:
        async with self._factory() as session:
            day_start = datetime(feed_date.year, feed_date.month, feed_date.day, tzinfo=timezone.utc)
            day_end = day_start + timedelta(days=1)

            thesis_signals = await self._thesis_signals(session, day_start, day_end)
            new_companies = await self._new_companies(session, feed_date)
            insider_clusters = await self._insider_clusters(session, day_start, day_end)
            alert_triggers = await self._check_alerts(session)
            summary = await self._synthesise_summary(thesis_signals, new_companies, insider_clusters)

            # Persist snapshot so we can query historical feeds
            existing = (
                await session.execute(select(DailyFeed).where(DailyFeed.feed_date == feed_date))
            ).scalar_one_or_none()
            if existing:
                existing.thesis_signals = [s.model_dump(mode='json') for s in thesis_signals]
                existing.new_companies = [c.model_dump(mode='json') for c in new_companies]
                existing.insider_clusters = [i.model_dump(mode='json') for i in insider_clusters]
                existing.summary = summary
                existing.generated_at = datetime.now(timezone.utc)
            else:
                session.add(
                    DailyFeed(
                        feed_date=feed_date,
                        thesis_signals=[s.model_dump(mode='json') for s in thesis_signals],
                        new_companies=[c.model_dump(mode='json') for c in new_companies],
                        insider_clusters=[i.model_dump(mode='json') for i in insider_clusters],
                        summary=summary,
                    )
                )
            await session.commit()


        # Write confidence snapshots (one row per active thesis per day)
        await self._write_snapshots(feed_date, thesis_signals)

        return FeedResponse(
            feed_date=feed_date,
            thesis_signals=thesis_signals,
            new_companies=new_companies,
            insider_clusters=insider_clusters,
            alert_triggers=alert_triggers,
            summary=summary,
            generated_at=datetime.now(timezone.utc),
        )

    async def _thesis_signals(
        self,
        session: AsyncSession,
        day_start: datetime,
        day_end: datetime,
    ) -> list[ThesisSignal]:
        theses = (
            await session.execute(select(Thesis).where(Thesis.is_active == True))  # noqa: E712
        ).scalars().all()

        signals: list[ThesisSignal] = []
        for thesis in theses:
            # Evidence from today
            today_rows = (
                await session.execute(
                    select(Evidence)
                    .where(
                        Evidence.thesis_id == thesis.id,
                        Evidence.created_at >= day_start,
                        Evidence.created_at < day_end,
                    )
                    .order_by(Evidence.score.desc())
                )
            ).scalars().all()

            if not today_rows:
                continue

            supporting = sum(1 for e in today_rows if e.sentiment == "supporting")
            opposing = sum(1 for e in today_rows if e.sentiment == "opposing")

            momentum = await self._compute_momentum(session, thesis.id, day_start)

            # All-time confidence — temporally weighted (recent evidence counts more)
            all_evidence = (
                await session.execute(
                    select(Evidence).where(Evidence.thesis_id == thesis.id)
                )
            ).scalars().all()
            confidence, _, _, _ = weighted_confidence(all_evidence)

            # Top companies for this thesis today
            company_rows = (
                await session.execute(
                    select(CompanySignal.company_name)
                    .where(CompanySignal.thesis_id == thesis.id)
                    .order_by(CompanySignal.last_seen.desc())
                    .limit(3)
                )
            ).scalars().all()

            highlight = today_rows[0].excerpt[:300] if today_rows else ""
            evidence_ids = [str(e.id) for e in today_rows]

            # Pull language delta summary from cache if already computed (free — no LLM call)
            language_shift: str | None = None
            try:
                delta_cached = await self._cache.get(f"delta:{thesis.id}:30")
                if delta_cached:
                    delta_data = json.loads(delta_cached)
                    if delta_data.get("status") == "ok" and delta_data.get("summary"):
                        language_shift = delta_data["summary"]
            except Exception:
                pass

            signals.append(
                ThesisSignal(
                    thesis_id=str(thesis.id),
                    thesis_name=thesis.name,
                    new_evidence_count=len(today_rows),
                    supporting_count=supporting,
                    opposing_count=opposing,
                    momentum=momentum,
                    confidence=confidence,
                    top_companies=list(company_rows),
                    highlight=highlight,
                    evidence_ids=evidence_ids,
                    language_shift=language_shift,
                )
            )

        return sorted(signals, key=lambda s: s.new_evidence_count, reverse=True)

    async def _compute_momentum(
        self,
        session: AsyncSession,
        thesis_id,
        day_start: datetime,
    ) -> str:
        week_ago = day_start - timedelta(days=MOMENTUM_WINDOW_DAYS)
        prev_week_start = week_ago - timedelta(days=MOMENTUM_WINDOW_DAYS)

        current_week = (
            await session.execute(
                select(func.count(Evidence.id)).where(
                    Evidence.thesis_id == thesis_id,
                    Evidence.created_at >= week_ago,
                    Evidence.created_at < day_start,
                )
            )
        ).scalar_one()

        prior_week = (
            await session.execute(
                select(func.count(Evidence.id)).where(
                    Evidence.thesis_id == thesis_id,
                    Evidence.created_at >= prev_week_start,
                    Evidence.created_at < week_ago,
                )
            )
        ).scalar_one()

        if current_week > prior_week * 1.2:
            return "rising"
        if current_week < prior_week * 0.8:
            return "falling"
        return "flat"

    async def _new_companies(
        self,
        session: AsyncSession,
        feed_date: date,
    ) -> list[NewCompany]:
        """Companies whose first_seen is within the last 3 days — genuinely new signals."""
        cutoff = datetime(feed_date.year, feed_date.month, feed_date.day, tzinfo=timezone.utc) - timedelta(days=3)

        rows = (
            await session.execute(
                select(CompanySignal)
                .where(CompanySignal.first_seen >= cutoff)
                .order_by(CompanySignal.first_seen.desc())
                .limit(10)
            )
        ).scalars().all()

        result = []
        for row in rows:
            thesis = await session.get(Thesis, row.thesis_id)
            result.append(
                NewCompany(
                    company_name=row.company_name,
                    ticker=row.ticker,
                    thesis_names=[thesis.name] if thesis else [],
                    first_seen=row.first_seen,
                    context=f"First surfaced in context of {thesis.name if thesis else 'unknown thesis'}",
                )
            )
        return result

    async def _insider_clusters(
        self,
        session: AsyncSession,
        day_start: datetime,
        day_end: datetime,
    ) -> list[InsiderCluster]:
        """Companies with multiple Form 4 filings in a short window — insider buying clusters."""
        week_ago = day_start - timedelta(days=7)

        rows = (
            await session.execute(
                select(
                    InsiderTransaction.company_name,
                    func.count(InsiderTransaction.id).label("filing_count"),
                )
                .where(
                    InsiderTransaction.filed_at >= week_ago,
                    InsiderTransaction.filed_at < day_end,
                    InsiderTransaction.transaction_type == "buy",
                )
                .group_by(InsiderTransaction.company_name)
                .having(func.count(InsiderTransaction.id) >= 2)
                .order_by(func.count(InsiderTransaction.id).desc())
                .limit(5)
            )
        ).all()

        return [
            InsiderCluster(
                company_name=row.company_name,
                filing_count=row.filing_count,
                filed_within_days=7,
            )
            for row in rows
        ]

    async def _check_alerts(self, session: AsyncSession) -> list[AlertTrigger]:
        """Check all company alerts and return those whose threshold has been reached."""
        from collections import defaultdict

        alerts = (await session.execute(select(CompanyAlert))).scalars().all()
        if not alerts:
            return []

        # Compute doc_count per normalised_name (same logic as radar)
        all_signals = (await session.execute(select(CompanySignal))).scalars().all()
        groups: dict[str, set[str]] = defaultdict(set)
        for sig in all_signals:
            if sig.normalised_name:
                groups[sig.normalised_name].add(sig.document_id)

        triggered = []
        for alert in alerts:
            current = len(groups.get(alert.normalised_name, set()))
            if current >= alert.threshold:
                triggered.append(AlertTrigger(
                    normalised_name=alert.normalised_name,
                    display_name=alert.display_name,
                    threshold=alert.threshold,
                    current_doc_count=current,
                ))
        return triggered

    async def _write_snapshots(self, feed_date: date, signals: list[ThesisSignal]) -> None:
        """Upsert one ConfidenceSnapshot per thesis per day."""
        if not signals:
            return
        import uuid as _uuid
        async with self._factory() as session:
            for sig in signals:
                tid = _uuid.UUID(sig.thesis_id)
                existing = (
                    await session.execute(
                        select(ConfidenceSnapshot).where(
                            ConfidenceSnapshot.thesis_id == tid,
                            ConfidenceSnapshot.snapshot_date == feed_date,
                        )
                    )
                ).scalar_one_or_none()

                if existing:
                    existing.confidence       = sig.confidence
                    existing.supporting_count = sig.supporting_count
                    existing.opposing_count   = sig.opposing_count
                    existing.evidence_count   = sig.supporting_count + sig.opposing_count
                else:
                    session.add(ConfidenceSnapshot(
                        thesis_id        = tid,
                        snapshot_date    = feed_date,
                        confidence       = sig.confidence,
                        supporting_count = sig.supporting_count,
                        opposing_count   = sig.opposing_count,
                        evidence_count   = sig.supporting_count + sig.opposing_count,
                    ))
            await session.commit()
        logger.info("Wrote %d confidence snapshot(s) for %s", len(signals), feed_date)

    async def _synthesise_summary(
        self,
        thesis_signals: list[ThesisSignal],
        new_companies: list[NewCompany],
        insider_clusters: list[InsiderCluster],
    ) -> str:
        if not thesis_signals and not new_companies and not insider_clusters:
            return "No signals today. Run ingestion to populate the knowledge base."

        thesis_block = "\n".join(
            f"- {s.thesis_name}: {s.new_evidence_count} new signals, momentum {s.momentum}, confidence {s.confidence}"
            for s in thesis_signals
        ) or "None"

        company_block = "\n".join(
            f"- {c.company_name} (related to: {', '.join(c.thesis_names)})"
            for c in new_companies
        ) or "None"

        insider_block = "\n".join(
            f"- {i.company_name}: {i.filing_count} insider buy filing(s) in last {i.filed_within_days} days"
            for i in insider_clusters
        ) or "None"

        try:
            return await self._llm.generate(
                _SUMMARY_PROMPT.format(
                    thesis_block=thesis_block,
                    company_block=company_block,
                    insider_block=insider_block,
                )
            )
        except Exception:
            logger.warning("Feed summary generation failed, using fallback")
            parts = []
            if thesis_signals:
                parts.append(f"{len(thesis_signals)} thesis signal(s) today.")
            if new_companies:
                parts.append(f"{len(new_companies)} new company signal(s) surfaced.")
            if insider_clusters:
                parts.append(f"{len(insider_clusters)} insider buying cluster(s) detected.")
            return " ".join(parts)
