"""
Thesis explain service.

Generates a plain-English narrative interpreting a thesis's current
signal trend from its corpus history. Designed for the feed's Explain
mode — the reader is a non-expert investor, not a quant.

The goal: 2-3 sentences that answer "what is this thesis watching and
is the case getting stronger or weaker?" with specific evidence, no jargon.

Results are cached for 6 hours — the narrative is based on historical
data that changes slowly intraday.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db.models import ConfidenceSnapshot, Evidence
from app.services.cache_service import CacheService
from app.services.llm_service import LLMService

logger = logging.getLogger(__name__)

EXPLAIN_CACHE_TTL = 6 * 3600  # 6 hours

_EXPLAIN_PROMPT = """\
/no_think
You are explaining an investment thesis to someone who is NOT a financial analyst.
Avoid jargon. Write like you're messaging a smart friend who invests but doesn't follow markets daily.

Thesis: {thesis_name}
What it tracks: {thesis_desc}

Recent documents matched (last 14 days — {recent_count} signal{plural}):
{recent_excerpts}

Overall trend: {trend_direction} — {trend_note}.

Write exactly 2-3 sentences in plain English:
- What this thesis is watching and whether the evidence is building or fading
- What the most specific recent signal says (name companies or events if present)
- What would change this picture

Rules: No bullets. No headers. No percentages. No words like "confidence", "sentiment", \
"corpus", or "evidence". Just plain sentences a smart non-expert can understand."""


class ThesisExplainService:
    def __init__(
        self,
        factory: async_sessionmaker[AsyncSession],
        llm: LLMService,
        cache: CacheService,
    ) -> None:
        self._factory = factory
        self._llm = llm
        self._cache = cache

    async def get_explain(
        self,
        thesis_id: UUID,
        thesis_name: str,
        thesis_desc: str,
    ) -> dict:
        cache_key = f"explain:{thesis_id}"
        cached = await self._cache.get(cache_key)
        if cached:
            result = json.loads(cached)
            result["from_cache"] = True
            return result

        result = await self._compute(thesis_id, thesis_name, thesis_desc)
        await self._cache.set(cache_key, json.dumps(result), ttl_seconds=EXPLAIN_CACHE_TTL)
        return result

    async def invalidate(self, thesis_id: UUID) -> None:
        await self._cache.delete(f"explain:{thesis_id}")

    async def _compute(
        self,
        thesis_id: UUID,
        thesis_name: str,
        thesis_desc: str,
    ) -> dict:
        now = datetime.now(timezone.utc)
        recent_cutoff = now - timedelta(days=14)

        async with self._factory() as session:
            # Top-scoring recent evidence for narrative context
            recent_rows = (
                await session.execute(
                    select(Evidence)
                    .where(
                        Evidence.thesis_id == thesis_id,
                        Evidence.created_at >= recent_cutoff,
                    )
                    .order_by(Evidence.score.desc())
                    .limit(8)
                )
            ).scalars().all()

            # Last 30 days of daily snapshots for trend computation
            snapshot_rows = (
                await session.execute(
                    select(ConfidenceSnapshot)
                    .where(ConfidenceSnapshot.thesis_id == thesis_id)
                    .order_by(ConfidenceSnapshot.snapshot_date.asc())
                    .limit(30)
                )
            ).scalars().all()

            # All-time evidence count for framing
            all_count_result = (
                await session.execute(
                    select(Evidence).where(Evidence.thesis_id == thesis_id).limit(1)
                )
            ).scalars().first()
            has_any_evidence = all_count_result is not None

        if not has_any_evidence:
            return {
                "thesis_id": str(thesis_id),
                "narrative": (
                    "No documents have been scored against this thesis yet. "
                    "Run a corpus evaluation from the thesis detail page to start tracking signals."
                ),
                "trend": "none",
                "from_cache": False,
            }

        # Determine trend direction from confidence snapshots
        trend_direction = "stable"
        trend_note = "the signal picture has held steady"
        if len(snapshot_rows) >= 3:
            first_conf = snapshot_rows[0].confidence
            last_conf  = snapshot_rows[-1].confidence
            delta = last_conf - first_conf
            if delta > 0.05:
                trend_direction = "strengthening"
                trend_note = (
                    f"the case has been building over the past month "
                    f"(up {delta:.0%} overall)"
                )
            elif delta < -0.05:
                trend_direction = "weakening"
                trend_note = (
                    f"the case has been fading over the past month "
                    f"(down {abs(delta):.0%} overall)"
                )
            else:
                trend_note = "the picture has been broadly consistent this month"

        if not recent_rows:
            # Has historical evidence but nothing in the last 14 days
            return {
                "thesis_id": str(thesis_id),
                "narrative": (
                    f"The {thesis_name} thesis has historical signals but nothing new in the last two weeks — "
                    "either the corpus hasn't been updated recently or relevant filings haven't come in yet. "
                    f"Overall trend: {trend_direction}."
                ),
                "trend": trend_direction,
                "from_cache": False,
            }

        recent_excerpts = "\n".join(
            f"- [{ev.sentiment}] {ev.excerpt[:220]}"
            for ev in recent_rows
        )

        prompt = _EXPLAIN_PROMPT.format(
            thesis_name=thesis_name,
            thesis_desc=(thesis_desc or "No description provided.")[:300],
            recent_count=len(recent_rows),
            plural="s" if len(recent_rows) != 1 else "",
            recent_excerpts=recent_excerpts,
            trend_direction=trend_direction,
            trend_note=trend_note,
        )

        narrative = f"The {thesis_name} thesis has {len(recent_rows)} recent signal(s). Trend: {trend_direction}."
        try:
            raw = await self._llm.generate(prompt)
            # Strip any accidental thinking tags that slipped through
            narrative = raw.strip().removeprefix("<think>").split("</think>")[-1].strip()
        except Exception:
            logger.warning("Explain LLM call failed for thesis %s", thesis_id)

        return {
            "thesis_id": str(thesis_id),
            "narrative": narrative,
            "trend": trend_direction,
            "from_cache": False,
        }
