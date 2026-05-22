import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.dependencies import CurrentUser, get_current_user

router = APIRouter(prefix="/research", tags=["research"])


@router.post("/query")
async def submit_query(user: CurrentUser = Depends(get_current_user)) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Implemented in Sprint 4")


@router.get("/sessions")
async def list_sessions(user: CurrentUser = Depends(get_current_user)) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Implemented in Sprint 4")


@router.get("/sessions/{session_id}")
async def get_session(
    session_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Implemented in Sprint 4")
