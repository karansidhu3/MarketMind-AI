import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.dependencies import CurrentUser, get_current_user

router = APIRouter(tags=["trends"])


@router.get("/trends")
async def list_trends(
    sector: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Implemented in Sprint 5")


@router.get("/trends/{trend_id}")
async def get_trend(
    trend_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Implemented in Sprint 5")


@router.get("/bottlenecks")
async def list_bottlenecks(user: CurrentUser = Depends(get_current_user)) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Implemented in Sprint 5")


@router.get("/bottlenecks/{bottleneck_id}")
async def get_bottleneck(
    bottleneck_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Implemented in Sprint 5")
