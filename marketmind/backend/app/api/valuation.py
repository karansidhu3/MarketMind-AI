"""
GET /valuation/{ticker} — latest valuation snapshot + computed label.

Sprint 17 (ADR-038). Deliberately its own router, its own axis — never
merged with /trajectory's ICR response. The frontend renders both labels
side by side, not combined.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.api.dependencies import CurrentUser, get_current_user, get_session_factory
from app.db.models import ValuationSnapshot
from app.services.valuation_label import compute_valuation_label

router = APIRouter(prefix="/valuation", tags=["valuation"])


@router.get("/{ticker}")
async def get_valuation(
    ticker: str,
    _user: CurrentUser = Depends(get_current_user),
    factory: async_sessionmaker[AsyncSession] = Depends(get_session_factory),
) -> dict:
    async with factory() as session:
        row = (
            await session.execute(
                select(ValuationSnapshot)
                .where(
                    ValuationSnapshot.ticker == ticker.upper(),
                    ValuationSnapshot.status == "ok",
                )
                .order_by(ValuationSnapshot.week_start.desc())
                .limit(1)
            )
        ).scalar_one_or_none()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No valuation data for '{ticker}' yet",
        )

    result = compute_valuation_label(row.forward_peg, row.price, row.price_52w_high)

    return {
        "ticker": ticker.upper(),
        "week_start": row.week_start.isoformat(),
        "price": row.price,
        "forward_pe": row.forward_pe,
        "forward_peg": row.forward_peg,
        "price_52w_high": row.price_52w_high,
        "price_52w_low": row.price_52w_low,
        "label": result.label,
        "reasoning": result.reasoning,
    }
