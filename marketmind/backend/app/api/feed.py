from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.dependencies import CurrentUser, get_current_user, get_feed_service
from app.feed.schema import FeedResponse
from app.feed.service import FeedService

router = APIRouter(prefix="/feed", tags=["feed"])


@router.get("", response_model=FeedResponse)
async def get_today_feed(
    _user: CurrentUser = Depends(get_current_user),
    svc: FeedService = Depends(get_feed_service),
) -> FeedResponse:
    """Today's bottleneck intelligence feed. Cached for 25h."""
    return await svc.get_feed(date.today())


@router.get("/{feed_date}", response_model=FeedResponse)
async def get_feed_by_date(
    feed_date: date,
    _user: CurrentUser = Depends(get_current_user),
    svc: FeedService = Depends(get_feed_service),
) -> FeedResponse:
    """Historical feed for any date."""
    return await svc.get_feed(feed_date)


@router.post("/regenerate", status_code=status.HTTP_202_ACCEPTED)
async def regenerate_feed(
    _user: CurrentUser = Depends(get_current_user),
    svc: FeedService = Depends(get_feed_service),
) -> dict:
    """Invalidate today's cache and trigger regeneration."""
    await svc.invalidate(date.today())
    feed = await svc.get_feed(date.today())
    return {"status": "regenerated", "generated_at": feed.generated_at.isoformat()}
