from fastapi import APIRouter, Depends, HTTPException, status

from app.api.dependencies import CurrentUser, get_current_user

router = APIRouter(prefix="/learn", tags=["learning"])


@router.get("/progress")
async def get_progress(user: CurrentUser = Depends(get_current_user)) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Implemented in Sprint 5")


@router.get("/next")
async def get_next_module(user: CurrentUser = Depends(get_current_user)) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Implemented in Sprint 5")


@router.post("/interact")
async def record_interaction(user: CurrentUser = Depends(get_current_user)) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Implemented in Sprint 5")
