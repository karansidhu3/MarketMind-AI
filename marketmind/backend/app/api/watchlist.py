"""
GET  /watchlist           — list watched companies (enriched with live corpus counts)
POST /watchlist           — add a company to the watchlist
DELETE /watchlist/{id}    — remove a company from the watchlist

Watchlist is lighter than portfolio: no shares or cost_basis, just a bookmark.
Watched companies always appear in the feed sidebar regardless of radar rank cutoff.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.api.dependencies import CurrentUser, get_current_user, get_session_factory
from app.db.models import CompanySignal, WatchedCompany

router = APIRouter(prefix="/watchlist", tags=["watchlist"])


class WatchRequest(BaseModel):
    normalised_name: str
    display_name: str
    ticker: str | None = None


def _enrich(w: WatchedCompany, signals: list[CompanySignal]) -> dict:
    """Attach live corpus counts to a WatchedCompany row."""
    now = datetime.now(timezone.utc)
    doc_count = len({s.document_id for s in signals})

    weekly_counts = [0, 0, 0, 0]
    for sig in signals:
        days_ago = (now - sig.last_seen).days
        if 0 <= days_ago < 28:
            bucket = min(days_ago // 7, 3)
            weekly_counts[3 - bucket] += 1

    return {
        "id":               str(w.id),
        "normalised_name":  w.normalised_name,
        "display_name":     w.display_name,
        "ticker":           w.ticker,
        "doc_count":        doc_count,
        "weekly_counts":    weekly_counts,
        "created_at":       w.created_at.isoformat(),
    }


@router.get("")
async def list_watchlist(
    _user: CurrentUser = Depends(get_current_user),
    factory: async_sessionmaker[AsyncSession] = Depends(get_session_factory),
) -> list[dict]:
    async with factory() as session:
        watched = (
            await session.execute(
                select(WatchedCompany).order_by(WatchedCompany.created_at.desc())
            )
        ).scalars().all()

        if not watched:
            return []

        # Fetch corpus signals for all watched names in one query
        names = [w.normalised_name for w in watched]
        all_signals = (
            await session.execute(
                select(CompanySignal).where(CompanySignal.normalised_name.in_(names))
            )
        ).scalars().all()

        sigs_by_name: dict[str, list[CompanySignal]] = {}
        for sig in all_signals:
            sigs_by_name.setdefault(sig.normalised_name, []).append(sig)

        return [_enrich(w, sigs_by_name.get(w.normalised_name, [])) for w in watched]


@router.post("", status_code=201)
async def add_to_watchlist(
    body: WatchRequest,
    _user: CurrentUser = Depends(get_current_user),
    factory: async_sessionmaker[AsyncSession] = Depends(get_session_factory),
) -> dict:
    async with factory() as session:
        existing = (
            await session.execute(
                select(WatchedCompany).where(
                    WatchedCompany.normalised_name == body.normalised_name
                )
            )
        ).scalar_one_or_none()

        if existing:
            # Idempotent — return existing record
            return _enrich(existing, [])

        item = WatchedCompany(
            normalised_name=body.normalised_name,
            display_name=body.display_name,
            ticker=body.ticker,
        )
        session.add(item)
        await session.commit()
        await session.refresh(item)
        return _enrich(item, [])


@router.delete("/{item_id}", status_code=204, response_model=None)
async def remove_from_watchlist(
    item_id: str,
    _user: CurrentUser = Depends(get_current_user),
    factory: async_sessionmaker[AsyncSession] = Depends(get_session_factory),
):
    async with factory() as session:
        item = (
            await session.execute(
                select(WatchedCompany).where(WatchedCompany.id == item_id)
            )
        ).scalar_one_or_none()

        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

        await session.delete(item)
        await session.commit()
