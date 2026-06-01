"""
GET /trajectory/top            — top companies ranked by ICR acceleration
GET /trajectory/{name}         — ICR series for a single entity
GET /trajectory/{name}/inflecting — boolean inflection status

Sprint 12 — ICR API (ADR-031, ADR-035).
This is the backend data contract for the Signal Map (Sprint 13 frontend).
Responses are intentionally minimal — no confidence scores.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.api.dependencies import CurrentUser, get_current_user, get_session_factory
from app.services.trajectory_service import TrajectoryService, is_inflecting

router = APIRouter(prefix="/trajectory", tags=["trajectory"])


def _get_service(
    factory: async_sessionmaker[AsyncSession] = Depends(get_session_factory),
) -> TrajectoryService:
    return TrajectoryService(session_factory=factory)


@router.get("/top")
async def get_top_trajectories(
    weeks: int = Query(default=12, ge=4, le=52, description="Number of weekly ICR buckets"),
    limit: int = Query(default=50, ge=1, le=200),
    _user: CurrentUser = Depends(get_current_user),
    svc: TrajectoryService = Depends(_get_service),
) -> list[dict]:
    """
    Top entities ranked by ICR acceleration.

    Each row: normalised_name, display_name, ticker,
              icr_series (oldest→newest), icr_current, icr_4w_avg,
              is_inflecting, acceleration.

    This is the data source for the Signal Map (Sprint 13).
    """
    return await svc.get_top_trajectories(weeks=weeks, limit=limit)


@router.get("/{normalised_name}")
async def get_icr_series(
    normalised_name: str,
    weeks: int = Query(default=12, ge=4, le=52),
    _user: CurrentUser = Depends(get_current_user),
    svc: TrajectoryService = Depends(_get_service),
) -> dict:
    """
    Full ICR time series for a single entity.

    Returns icr_series (list of ints, oldest first), current week ICR,
    4-week average, and inflection status.
    """
    series = await svc.get_icr_series(normalised_name, weeks=weeks)

    if not any(series):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No PRIMARY_DISCLOSURE citations found for '{normalised_name}'",
        )

    prior_4 = series[-5:-1] if len(series) >= 5 else series[:-1]
    icr_4w_avg = sum(prior_4) / len(prior_4) if prior_4 else 0.0

    return {
        "normalised_name": normalised_name,
        "icr_series":      series,
        "icr_current":     series[-1],
        "icr_4w_avg":      round(icr_4w_avg, 2),
        "is_inflecting":   is_inflecting(series),
        "weeks":           weeks,
    }
