import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.dependencies import CurrentUser, get_current_user

router = APIRouter(prefix="/feed", tags=["feed"])


@router.get("")
async def get_feed(user: CurrentUser = Depends(get_current_user)) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Implemented in Sprint 3")


@router.patch("/items/{item_id}/feedback")
async def record_feedback(
    item_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Implemented in Sprint 3")


@router.post("/regenerate")
async def regenerate_feed(user: CurrentUser = Depends(get_current_user)) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Implemented in Sprint 3")
