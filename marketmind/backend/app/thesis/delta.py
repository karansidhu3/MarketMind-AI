"""
Language delta service.

Compares evidence language between two rolling time windows for a thesis.
Detects when risk language, supply chain signals, or tone shifts across
consecutive periods — the kind of change analysts notice in earnings calls
before the stock reacts.

Results are cached for 6h since LLM synthesis is expensive.
"""
from __future__ import annotations

import json
import logging
import re
from datetime import date, datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db.models import Evidence
from app.services.cache_service import CacheService
from app.services.llm_service import LLMService

logger = logging.getLogger(__name__)

DELTA_CACHE_TTL = 6 * 3600  # 6 hours

_JSON_RE = re.compile(r"\{.*\}", re.DOTALL)

_DELTA_PROMPT = """\
You are a financial analyst tracking language shifts in investment signals.

Thesis: {thesis_name}

Recent period ({recent_start} to {recent_end}) — {recent_count} signal(s):
{recent_text}

Prior period ({prior_start} to {prior_end}) — {prior_count} signal(s):
{prior_text}

Compare these two sets of signals. Identify meaningful language shifts.
Focus on: supply chain / demand language, risk language, tone (confident vs cautious),
capital allocation signals, and any themes that appeared, disappeared, or intensified.

Return ONLY valid JSON — no explanation, no markdown:
{{
  "appeared": ["theme or phrase that is present recently but absent before"],
  "disappeared": ["theme or phrase present before but absent recently"],
  "intensified": ["theme that is notably stronger or more frequent recently"],
  "summary": "2-3 sentence plain-English summary of the most significant shift"
}}

If there is no meaningful shift, return empty lists and a summary saying so."""


class LanguageDeltaService:
    MIN_EVIDENCE_PER_WINDOW = 2

    def __init__(
        self,
        factory: async_sessionmaker[AsyncSession],
        llm: LLMService,
        cache: CacheService,
    ) -> None:
        self._factory = factory
        self._llm = llm
        self._cache = cache

    async def get_delta(
        self,
        thesis_id: UUID,
        thesis_name: str,
        window_days: int = 30,
    ) -> dict:
        cache_key = f"delta:{thesis_id}:{window_days}"
        cached = await self._cache.get(cache_key)
        if cached:
            result = json.loads(cached)
            result["from_cache"] = True
            return result

        result = await self._compute(thesis_id, thesis_name, window_days)
        if result["status"] == "ok":
            await self._cache.set(cache_key, json.dumps(result), ttl_seconds=DELTA_CACHE_TTL)
        return result

    async def _compute(
        self,
        thesis_id: UUID,
        thesis_name: str,
        window_days: int,
    ) -> dict:
        now = datetime.now(timezone.utc)
        recent_end   = now
        recent_start = now - timedelta(days=window_days)
        prior_end    = recent_start
        prior_start  = now - timedelta(days=window_days * 2)

        async with self._factory() as session:
            recent_rows = await self._fetch_evidence(session, thesis_id, recent_start, recent_end)
            prior_rows  = await self._fetch_evidence(session, thesis_id, prior_start, prior_end)

        if len(recent_rows) < self.MIN_EVIDENCE_PER_WINDOW or len(prior_rows) < self.MIN_EVIDENCE_PER_WINDOW:
            needed = max(
                self.MIN_EVIDENCE_PER_WINDOW - len(recent_rows),
                self.MIN_EVIDENCE_PER_WINDOW - len(prior_rows),
            )
            return {
                "status": "insufficient_data",
                "message": (
                    f"Need at least {self.MIN_EVIDENCE_PER_WINDOW} signals per window. "
                    f"Recent: {len(recent_rows)}, prior: {len(prior_rows)}. "
                    f"Check back after {needed} more day(s) of ingestion."
                ),
                "evidence_count_recent": len(recent_rows),
                "evidence_count_prior":  len(prior_rows),
                "recent_window": f"{recent_start.date()} → {recent_end.date()}",
                "prior_window":  f"{prior_start.date()} → {prior_end.date()}",
                "from_cache": False,
            }

        recent_text = "\n".join(f"- {r.excerpt[:200]}" for r in recent_rows)
        prior_text  = "\n".join(f"- {r.excerpt[:200]}" for r in prior_rows)

        prompt = _DELTA_PROMPT.format(
            thesis_name=thesis_name,
            recent_start=recent_start.date(),
            recent_end=recent_end.date(),
            recent_count=len(recent_rows),
            recent_text=recent_text,
            prior_start=prior_start.date(),
            prior_end=prior_end.date(),
            prior_count=len(prior_rows),
            prior_text=prior_text,
        )

        appeared, disappeared, intensified, summary = [], [], [], "No language shift detected."
        try:
            raw = await self._llm.generate(prompt)
            match = _JSON_RE.search(raw)
            if match:
                parsed = json.loads(match.group())
                appeared     = parsed.get("appeared", [])
                disappeared  = parsed.get("disappeared", [])
                intensified  = parsed.get("intensified", [])
                summary      = parsed.get("summary", summary)
        except Exception:
            logger.warning("Language delta LLM call failed for thesis %s", thesis_id)
            summary = "Analysis unavailable — LLM synthesis failed."

        return {
            "status": "ok",
            "thesis_id": str(thesis_id),
            "recent_window": f"{recent_start.date()} → {recent_end.date()}",
            "prior_window":  f"{prior_start.date()} → {prior_end.date()}",
            "evidence_count_recent": len(recent_rows),
            "evidence_count_prior":  len(prior_rows),
            "appeared":     appeared,
            "disappeared":  disappeared,
            "intensified":  intensified,
            "summary":      summary,
            "from_cache":   False,
        }

    @staticmethod
    async def _fetch_evidence(
        session: AsyncSession,
        thesis_id: UUID,
        start: datetime,
        end: datetime,
    ) -> list[Evidence]:
        rows = (
            await session.execute(
                select(Evidence)
                .where(
                    Evidence.thesis_id == thesis_id,
                    Evidence.created_at >= start,
                    Evidence.created_at < end,
                )
                .order_by(Evidence.created_at.asc())
                .limit(30)   # cap context window to avoid prompt bloat
            )
        ).scalars().all()
        return list(rows)
