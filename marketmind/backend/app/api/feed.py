from __future__ import annotations

import json
import logging
from datetime import date
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.api.dependencies import (
    CurrentUser,
    get_cache,
    get_current_user,
    get_feed_service,
    get_llm,
    get_session_factory,
)
from app.db.models import DailyFeed, Thesis
from app.feed.schema import FeedResponse
from app.feed.service import FeedService
from app.services.cache_service import CacheService
from app.services.llm_service import LLMService
from app.thesis.explain import ThesisExplainService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/feed", tags=["feed"])


@router.get("", response_model=FeedResponse)
async def get_today_feed(
    feed_date: Optional[date] = Query(None, alias="date", description="Date in user's local timezone (YYYY-MM-DD). Defaults to server UTC date if omitted."),
    _user: CurrentUser = Depends(get_current_user),
    svc: FeedService = Depends(get_feed_service),
) -> FeedResponse:
    """Today's bottleneck intelligence feed. Cached for 25h."""
    return await svc.get_feed(feed_date or date.today())


@router.get("/dates")
async def get_feed_dates(
    _user: CurrentUser = Depends(get_current_user),
    factory: async_sessionmaker[AsyncSession] = Depends(get_session_factory),
) -> list[str]:
    """All dates that have a stored feed, newest first. Used by timeline scrubber."""
    async with factory() as session:
        rows = (
            await session.execute(
                select(DailyFeed.feed_date).order_by(DailyFeed.feed_date.desc())
            )
        ).scalars().all()
    return [d.isoformat() for d in rows]


@router.get("/explain-summary")
async def get_explain_summary(
    feed_date: Optional[date] = Query(None, alias="date"),
    _user: CurrentUser = Depends(get_current_user),
    svc: FeedService = Depends(get_feed_service),
) -> dict:
    """
    Plain-English version of today's briefing — casual tone, no financial jargon.
    Used by the feed page's Explain mode hero section.
    Cached separately from the main feed (6h TTL).
    Must be defined BEFORE /{feed_date} to avoid FastAPI matching it as a date param.
    """
    return await svc.get_explain_summary(feed_date or date.today())


@router.get("/unified-explain/stream")
async def stream_unified_explain(
    feed_date: Optional[date] = Query(None, alias="date"),
    _user: CurrentUser = Depends(get_current_user),
    svc: FeedService = Depends(get_feed_service),
):
    """
    SSE stream of a unified cross-theme plain-English narrative.
    One LLM call synthesises all active thesis signals into a single flowing
    briefing — replaces the five separate per-thesis ExplainCards in the feed UI.

    Tokens arrive as: data: {"chunk": "text"}\\n\\n
    Stream ends with:  data: [DONE]\\n\\n

    If cached, the full narrative is sent as a single chunk immediately.
    """
    target_date = feed_date or date.today()

    async def event_stream():
        try:
            async for chunk in svc.stream_unified_explain(target_date):
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
        except Exception:
            logger.warning("Unified explain stream error")
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/explain-summary/stream")
async def stream_explain_summary(
    feed_date: Optional[date] = Query(None, alias="date"),
    _user: CurrentUser = Depends(get_current_user),
    svc: FeedService = Depends(get_feed_service),
):
    """
    SSE stream of the plain-English feed summary.
    Tokens arrive as: data: {"chunk": "text"}\n\n
    Stream ends with:  data: [DONE]\n\n

    If cached, the full text is sent as a single chunk immediately.
    If not cached, tokens stream as the LLM generates them.
    """
    target_date = feed_date or date.today()

    async def event_stream():
        try:
            async for chunk in svc.stream_explain_summary(target_date):
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
        except Exception:
            logger.warning("Feed explain-summary stream error")
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


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
    background_tasks: BackgroundTasks,
    feed_date: Optional[date] = Query(None, alias="date"),
    _user: CurrentUser = Depends(get_current_user),
    svc: FeedService = Depends(get_feed_service),
    factory: async_sessionmaker[AsyncSession] = Depends(get_session_factory),
    llm: LLMService = Depends(get_llm),
    cache: CacheService = Depends(get_cache),
) -> dict:
    """
    Invalidate today's cache and trigger regeneration.
    Also fires a background task to pre-warm all explain caches so Explain
    mode loads instantly when the user opens the app.
    Accepts ?date=YYYY-MM-DD so the frontend can pass the user's local date
    instead of relying on the server's UTC clock.
    """
    target_date = feed_date or date.today()
    await svc.invalidate(target_date)
    feed = await svc.get_feed(target_date)

    # Pre-warm explain caches in background — by the time the user opens the
    # app after the morning ingestion run, all Explain content is ready.
    explain_svc = ThesisExplainService(factory=factory, llm=llm, cache=cache)
    background_tasks.add_task(_warm_explain_caches, svc, explain_svc, target_date, factory)

    return {"status": "regenerated", "generated_at": feed.generated_at.isoformat()}


# ── Background task ───────────────────────────────────────────────────────────

async def _warm_explain_caches(
    feed_svc: FeedService,
    explain_svc: ThesisExplainService,
    feed_date: date,
    factory: async_sessionmaker[AsyncSession],
) -> None:
    """
    Pre-generate and cache all explain content after feed regeneration.
    Runs as a background task — does not block the regenerate response.
    """
    # 1. Feed-level plain-English summary (hero)
    try:
        await feed_svc.get_explain_summary(feed_date)
        logger.info("Pre-warmed feed explain summary for %s", feed_date)
    except Exception:
        logger.warning("Failed to pre-warm feed explain summary for %s", feed_date)

    # 2. Unified cross-theme narrative (consumes the explain-summary stream fully)
    try:
        full = ""
        async for chunk in feed_svc.stream_unified_explain(feed_date):
            full += chunk
        logger.info("Pre-warmed unified explain (%d chars) for %s", len(full), feed_date)
    except Exception:
        logger.warning("Failed to pre-warm unified explain for %s", feed_date)

    # 3. Per-thesis narratives (one LLM call each — used on thesis detail page)
    try:
        async with factory() as session:
            theses = (
                await session.execute(
                    select(Thesis).where(Thesis.is_active == True)  # noqa: E712
                )
            ).scalars().all()

        for thesis in theses:
            try:
                await explain_svc.get_explain(
                    thesis_id=thesis.id,
                    thesis_name=thesis.name,
                    thesis_desc=thesis.description or "",
                )
                logger.info("Pre-warmed explain for '%s'", thesis.name)
            except Exception:
                logger.warning("Failed to pre-warm explain for '%s'", thesis.name)
    except Exception:
        logger.warning("Failed to load theses for explain pre-warm")
