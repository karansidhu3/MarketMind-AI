from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.api.dependencies import CurrentUser, get_current_user, get_session_factory
from app.portfolio.schema import FeedGapSignal, HoldingCreate, HoldingOut, HoldingUpdate, PortfolioAlignment
from app.portfolio.service import PortfolioService

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


def _svc(
    factory: async_sessionmaker[AsyncSession] = Depends(get_session_factory),
) -> PortfolioService:
    return PortfolioService(session_factory=factory)


@router.get("/holdings", response_model=list[HoldingOut])
async def list_holdings(
    _user: CurrentUser = Depends(get_current_user),
    svc: PortfolioService = Depends(_svc),
) -> list[HoldingOut]:
    return await svc.list_holdings()


@router.post("/holdings", response_model=HoldingOut, status_code=status.HTTP_201_CREATED)
async def add_holding(
    body: HoldingCreate,
    _user: CurrentUser = Depends(get_current_user),
    svc: PortfolioService = Depends(_svc),
) -> HoldingOut:
    return await svc.add_holding(body)


@router.patch("/holdings/{holding_id}", response_model=HoldingOut)
async def update_holding(
    holding_id: uuid.UUID,
    body: HoldingUpdate,
    _user: CurrentUser = Depends(get_current_user),
    svc: PortfolioService = Depends(_svc),
) -> HoldingOut:
    result = await svc.update_holding(holding_id, body)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Holding not found")
    return result


@router.delete("/holdings/{holding_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_holding(
    holding_id: uuid.UUID,
    _user: CurrentUser = Depends(get_current_user),
    svc: PortfolioService = Depends(_svc),
) -> None:
    ok = await svc.delete_holding(holding_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Holding not found")


@router.get("/feed-signals", response_model=list[FeedGapSignal])
async def get_portfolio_feed_signals(
    _user: CurrentUser = Depends(get_current_user),
    svc: PortfolioService = Depends(_svc),
) -> list[FeedGapSignal]:
    """
    Gap companies (not held, in corpus) that had new signals today.
    Used by the feed page to surface portfolio gaps without a full alignment call.
    Returns an empty list when there are no holdings or no activity today.
    """
    return await svc.get_feed_gap_signals()


@router.get("/alignment", response_model=PortfolioAlignment)
async def get_alignment(
    _user: CurrentUser = Depends(get_current_user),
    svc: PortfolioService = Depends(_svc),
) -> PortfolioAlignment:
    """
    Compute thesis alignment for the current portfolio.
    Returns coverage per thesis + companies on radar you don't hold (gaps).
    Framing: alignment gaps, not buy/sell recommendations (ADR-023).
    """
    return await svc.get_alignment()
