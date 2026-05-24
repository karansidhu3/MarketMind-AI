"""
Portfolio service — holdings CRUD + thesis alignment + exposure gap detection.

Framing (ADR-023): thesis alignment, not buy/sell recommendations.
MarketMind surfaces what the corpus says about your coverage gaps.
The user decides what to do with that information.
"""
from __future__ import annotations

import logging
import uuid
from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db.models import CompanySignal, Holding, Thesis
from app.ingestion.normalise import normalise
from app.portfolio.schema import (
    GapCompany,
    HoldingCreate,
    HoldingOut,
    HoldingUpdate,
    PortfolioAlignment,
    ThesisExposure,
)
from app.thesis.decay import weighted_confidence
from app.db.models import Evidence

logger = logging.getLogger(__name__)

# Minimum unique docs for a company to appear in gap detection
_GAP_MIN_DOCS = 2
# How many gaps to surface per alignment result
_MAX_GAPS = 15


class PortfolioService:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self._factory = session_factory

    # ── Holdings CRUD ─────────────────────────────────────────────────────────

    async def list_holdings(self) -> list[HoldingOut]:
        async with self._factory() as session:
            rows = (
                await session.execute(select(Holding).order_by(Holding.added_at.desc()))
            ).scalars().all()
            return [HoldingOut.model_validate(r) for r in rows]

    async def add_holding(self, data: HoldingCreate) -> HoldingOut:
        async with self._factory() as session:
            # Upsert by ticker — update if already exists
            existing = (
                await session.execute(
                    select(Holding).where(Holding.ticker == data.ticker)
                )
            ).scalar_one_or_none()

            if existing:
                existing.company_name = data.company_name
                existing.shares = data.shares
                if data.cost_basis is not None:
                    existing.cost_basis = data.cost_basis
                await session.commit()
                await session.refresh(existing)
                return HoldingOut.model_validate(existing)

            holding = Holding(
                ticker=data.ticker,
                company_name=data.company_name,
                shares=data.shares,
                cost_basis=data.cost_basis,
            )
            session.add(holding)
            await session.commit()
            await session.refresh(holding)
            return HoldingOut.model_validate(holding)

    async def update_holding(
        self, holding_id: uuid.UUID, data: HoldingUpdate
    ) -> HoldingOut | None:
        async with self._factory() as session:
            holding = await session.get(Holding, holding_id)
            if not holding:
                return None
            if data.company_name is not None:
                holding.company_name = data.company_name
            if data.shares is not None:
                holding.shares = data.shares
            if data.cost_basis is not None:
                holding.cost_basis = data.cost_basis
            await session.commit()
            await session.refresh(holding)
            return HoldingOut.model_validate(holding)

    async def delete_holding(self, holding_id: uuid.UUID) -> bool:
        async with self._factory() as session:
            holding = await session.get(Holding, holding_id)
            if not holding:
                return False
            await session.delete(holding)
            await session.commit()
            return True

    # ── Alignment + gap detection ─────────────────────────────────────────────

    async def get_alignment(self) -> PortfolioAlignment:
        async with self._factory() as session:
            holdings = (
                await session.execute(select(Holding))
            ).scalars().all()

            theses = (
                await session.execute(
                    select(Thesis).where(Thesis.is_active == True)  # noqa: E712
                )
            ).scalars().all()

            all_signals = (
                await session.execute(select(CompanySignal))
            ).scalars().all()

            # Build weighted confidence per thesis
            thesis_confidence: dict[uuid.UUID, float] = {}
            for thesis in theses:
                ev = (
                    await session.execute(
                        select(Evidence).where(Evidence.thesis_id == thesis.id)
                    )
                ).scalars().all()
                conf, _, _, _ = weighted_confidence(ev)
                thesis_confidence[thesis.id] = conf

        # ── Build lookup structures ──────────────────────────────────────────

        # Ticker → holding
        ticker_to_holding: dict[str, Holding] = {h.ticker.upper(): h for h in holdings}

        # Normalised holding tickers/names for fuzzy matching
        holding_norms: set[str] = {normalise(h.ticker) for h in holdings} | \
                                   {normalise(h.company_name) for h in holdings}
        holding_norms.discard("")

        # Group signals: normalised_name → list of signals
        sig_groups: dict[str, list[CompanySignal]] = defaultdict(list)
        for sig in all_signals:
            if sig.normalised_name:
                sig_groups[sig.normalised_name].append(sig)

        # normalised_name → unique doc count
        company_doc_counts: dict[str, int] = {
            norm: len({s.document_id for s in sigs})
            for norm, sigs in sig_groups.items()
        }

        # thesis_id → set of normalised company names
        thesis_companies: dict[uuid.UUID, set[str]] = defaultdict(set)
        for sig in all_signals:
            if sig.normalised_name and sig.thesis_id:
                thesis_companies[sig.thesis_id].add(sig.normalised_name)

        # normalised_name → set of thesis_ids
        company_theses: dict[str, set[uuid.UUID]] = defaultdict(set)
        for sig in all_signals:
            if sig.normalised_name and sig.thesis_id:
                company_theses[sig.normalised_name].add(sig.thesis_id)

        # ── Match holdings to thesis companies ──────────────────────────────

        def _matches_holding(norm: str) -> str | None:
            """Return the ticker of the matching holding, or None."""
            # Direct normalised ticker match
            for ticker, h in ticker_to_holding.items():
                if norm == normalise(ticker) or norm == normalise(h.company_name):
                    return ticker
            return None

        # ── Build thesis exposure rows ───────────────────────────────────────

        thesis_id_to_obj = {t.id: t for t in theses}
        exposures: list[ThesisExposure] = []

        for thesis in theses:
            companies_in_thesis = thesis_companies.get(thesis.id, set())
            total = len(companies_in_thesis)
            if total == 0:
                continue

            held: list[str] = []
            for norm in companies_in_thesis:
                ticker = _matches_holding(norm)
                if ticker:
                    held.append(ticker)

            coverage = len(held) / total if total > 0 else 0.0
            exposures.append(ThesisExposure(
                thesis_id=str(thesis.id),
                thesis_name=thesis.name,
                confidence=thesis_confidence.get(thesis.id, 0.0),
                momentum="flat",    # feed momentum injected if needed; flat is safe default
                held_companies=sorted(set(held)),
                total_companies=total,
                coverage_pct=round(coverage, 3),
            ))

        # Sort by thesis confidence descending (most important theses first)
        exposures.sort(key=lambda e: e.confidence, reverse=True)

        # ── Compute overall coverage (weighted by confidence) ────────────────

        if exposures:
            total_weight = sum(e.confidence for e in exposures)
            if total_weight > 0:
                overall = sum(e.coverage_pct * e.confidence for e in exposures) / total_weight
            else:
                overall = sum(e.coverage_pct for e in exposures) / len(exposures)
        else:
            overall = 0.0

        # ── Gap detection: high-signal companies you don't hold ──────────────

        gaps: list[GapCompany] = []
        for norm, doc_count in company_doc_counts.items():
            if doc_count < _GAP_MIN_DOCS:
                continue
            if _matches_holding(norm):
                continue   # already held

            thesis_ids = company_theses.get(norm, set())
            if not thesis_ids:
                continue

            # Pick best thesis confidence for this company
            best_conf = max(
                thesis_confidence.get(tid, 0.0) for tid in thesis_ids
            )
            thesis_names = [
                thesis_id_to_obj[tid].name
                for tid in thesis_ids
                if tid in thesis_id_to_obj
            ]

            # Get a ticker from signals if available
            ticker = next(
                (s.ticker for sigs in [sig_groups.get(norm, [])] for s in sigs if s.ticker),
                None,
            )
            # Display name: canonical company name from signals
            company_name = sig_groups[norm][0].company_name if sig_groups.get(norm) else norm

            gaps.append(GapCompany(
                company_name=company_name,
                ticker=ticker,
                thesis_names=thesis_names,
                doc_count=doc_count,
                thesis_confidence=round(best_conf, 3),
            ))

        # Rank gaps: most relevant first (doc_count × confidence)
        gaps.sort(key=lambda g: g.doc_count * g.thesis_confidence, reverse=True)
        gaps = gaps[:_MAX_GAPS]

        return PortfolioAlignment(
            total_holdings=len(holdings),
            overall_coverage=round(overall, 3),
            theses=exposures,
            gaps=gaps,
        )
