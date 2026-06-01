"""
TrajectoryService — Sprint 12 ICR computation (ADR-031, ADR-035, ADR-037).

Independent Citation Rate (ICR): for a given company entity, how many structurally
independent companies referenced that entity in primary SEC filings during a given
week. "Independent" means distinct filing companies (distinct filing_ticker values).

This is the primary intelligence primitive replacing confidence scores. The key
insight is that 9 mentions in 1 filing is very different from 9 filings from 9
different companies — the latter represents independent corroboration.

The trajectory moat: a company going 0 → 2 → 9 independent citations over 8 weeks
is a signal that requires a system that has been running and accumulating. No search
engine, terminal, or LLM can surface this — it is a temporal artifact.

Data model:
  - CompanySignal.normalised_name identifies the cited entity (company B)
  - CompanySignal.document_id → Evidence.document_id (join)
  - Evidence.filing_ticker = company A (the filing company, "citing company")
  - Evidence.source_classification = 'PRIMARY_DISCLOSURE' (required for ICR)
  - Evidence.document_date = when the filing was submitted (week bucket)

ICR for entity B in week W = COUNT(DISTINCT evidence.filing_ticker)
  WHERE company_signals.normalised_name = B
    AND evidence.source_classification = 'PRIMARY_DISCLOSURE'
    AND evidence.filing_ticker IS NOT NULL
    AND evidence.document_date IN [week_start, week_end)
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import distinct, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db.models import CompanySignal, Evidence
from app.ingestion.normalise import pick_canonical

logger = logging.getLogger(__name__)

# Minimum ICR in the current week to be included in trajectory results.
# Prevents entities that have never been cited from appearing in the Signal Map.
_MIN_ICR_CURRENT_WEEK = 1

# Inflection requires: current week ICR ≥ INFLECTION_MULTIPLIER × 4-week average
# AND ≥ INFLECTION_MIN_ABSOLUTE citations.
INFLECTION_MULTIPLIER = 2.0
INFLECTION_MIN_ABSOLUTE = 3


class TrajectoryService:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self._factory = session_factory

    async def get_icr_series(
        self,
        normalised_name: str,
        weeks: int = 12,
    ) -> list[int]:
        """
        Return a list of ICR values for the last `weeks` weeks, oldest first.

        Each value is COUNT(DISTINCT filing_ticker) across PRIMARY_DISCLOSURE
        Evidence rows whose document_id appears in a CompanySignal for this entity.

        Weeks with no citations return 0 — the series always has exactly `weeks`
        elements so sparklines render consistently.
        """
        now = datetime.now(timezone.utc)
        start = now - timedelta(weeks=weeks)

        async with self._factory() as session:
            # Single query: join CompanySignal → Evidence on document_id,
            # filter for PRIMARY_DISCLOSURE, group by week bucket.
            rows = (
                await session.execute(
                    select(
                        func.date_trunc("week", Evidence.document_date).label("week_start"),
                        func.count(distinct(Evidence.filing_ticker)).label("icr"),
                    )
                    .select_from(CompanySignal)
                    .join(Evidence, Evidence.document_id == CompanySignal.document_id)
                    .where(
                        CompanySignal.normalised_name == normalised_name,
                        Evidence.source_classification == "PRIMARY_DISCLOSURE",
                        Evidence.filing_ticker.isnot(None),
                        Evidence.document_date >= start,
                        Evidence.document_date < now,
                    )
                    .group_by(text("week_start"))
                    .order_by(text("week_start"))
                )
            ).all()

        # Build a week_start → icr lookup
        icr_by_week: dict[str, int] = {}
        for row in rows:
            if row.week_start:
                # date_trunc returns a datetime; normalize to date string for key
                key = row.week_start.strftime("%Y-%m-%d") if hasattr(row.week_start, "strftime") else str(row.week_start)[:10]
                icr_by_week[key] = int(row.icr)

        # Build the fixed-length series: one bucket per week, oldest first
        series: list[int] = []
        for week_back in range(weeks - 1, -1, -1):
            # Each bucket: [now - (week_back+1)*7d, now - week_back*7d)
            bucket_end   = now - timedelta(weeks=week_back)
            bucket_start = bucket_end - timedelta(weeks=1)
            # Align to Monday (date_trunc("week") in Postgres = Monday)
            monday = bucket_start - timedelta(days=bucket_start.weekday())
            key = monday.strftime("%Y-%m-%d")
            series.append(icr_by_week.get(key, 0))

        return series

    async def get_top_trajectories(
        self,
        weeks: int = 12,
        limit: int = 50,
    ) -> list[dict]:
        """
        Return the top `limit` entities ranked by ICR acceleration.

        Acceleration = (avg of last 2 weeks) - (avg of weeks 3-6).
        This captures entities whose citation rate is actively rising, not just
        entities that have accumulated a lot of historical citations.

        Each result dict contains:
          normalised_name, display_name, ticker,
          icr_series (list[int], length=weeks),
          icr_current (int), icr_4w_avg (float),
          is_inflecting (bool), acceleration (float)
        """
        # Get all entities that have at least one PRIMARY_DISCLOSURE citation
        async with self._factory() as session:
            candidates = (
                await session.execute(
                    select(
                        CompanySignal.normalised_name,
                        func.max(CompanySignal.company_name).label("display_name"),
                        func.max(CompanySignal.ticker).label("ticker"),
                    )
                    .join(Evidence, Evidence.document_id == CompanySignal.document_id)
                    .where(
                        Evidence.source_classification == "PRIMARY_DISCLOSURE",
                        Evidence.filing_ticker.isnot(None),
                        CompanySignal.normalised_name.isnot(None),
                        CompanySignal.normalised_name != "",
                    )
                    .group_by(CompanySignal.normalised_name)
                )
            ).all()

        if not candidates:
            return []

        results: list[dict] = []
        for row in candidates:
            norm = row.normalised_name
            if not norm:
                continue

            series = await self.get_icr_series(norm, weeks=weeks)
            icr_current = series[-1] if series else 0

            if icr_current < _MIN_ICR_CURRENT_WEEK:
                continue

            # 4-week average (weeks[-5:-1] = 4 weeks before current)
            prior_4 = series[-5:-1] if len(series) >= 5 else series[:-1]
            icr_4w_avg = sum(prior_4) / len(prior_4) if prior_4 else 0.0

            # Acceleration: recent 2w avg minus prior 4w avg
            recent_2 = series[-3:-1] if len(series) >= 3 else series[:-1]
            recent_avg = sum(recent_2) / len(recent_2) if recent_2 else 0.0
            acceleration = recent_avg - icr_4w_avg

            inflecting = is_inflecting(series)

            # Use longest company_name variant for display
            async with self._factory() as session:
                all_names = (
                    await session.execute(
                        select(CompanySignal.company_name)
                        .where(CompanySignal.normalised_name == norm)
                        .distinct()
                    )
                ).scalars().all()
            display = pick_canonical(list(all_names)) if all_names else row.display_name

            results.append({
                "normalised_name": norm,
                "display_name":    display or row.display_name,
                "ticker":          row.ticker,
                "icr_series":      series,
                "icr_current":     icr_current,
                "icr_4w_avg":      round(icr_4w_avg, 2),
                "is_inflecting":   inflecting,
                "acceleration":    round(acceleration, 2),
            })

        # Sort by acceleration descending, inflecting entities first
        results.sort(key=lambda x: (x["is_inflecting"], x["acceleration"]), reverse=True)
        return results[:limit]


def is_inflecting(icr_series: list[int]) -> bool:
    """
    Return True if the trajectory shows an inflection:
      - Current week ICR ≥ INFLECTION_MULTIPLIER × 4-week average
      - Current week ICR ≥ INFLECTION_MIN_ABSOLUTE

    A 0-citation baseline (4w avg = 0) cannot trigger inflection regardless of
    current week — we require at least some prior history.

    icr_series should be oldest-first, most-recent last.
    """
    if not icr_series:
        return False

    current = icr_series[-1]
    if current < INFLECTION_MIN_ABSOLUTE:
        return False

    prior_4 = icr_series[-5:-1] if len(icr_series) >= 5 else icr_series[:-1]
    if not prior_4:
        return False

    avg_prior = sum(prior_4) / len(prior_4)
    if avg_prior == 0:
        return False  # no prior baseline — not a meaningful inflection

    return current >= INFLECTION_MULTIPLIER * avg_prior
