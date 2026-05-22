import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.dependencies import CurrentUser, get_current_user

router = APIRouter(prefix="/theses", tags=["thesis"])


@router.get("")
async def list_theses(user: CurrentUser = Depends(get_current_user)) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Implemented in Sprint 3")


@router.post("")
async def create_thesis(user: CurrentUser = Depends(get_current_user)) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Implemented in Sprint 3")


@router.get("/{thesis_id}")
async def get_thesis(
    thesis_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Implemented in Sprint 3")


@router.patch("/{thesis_id}")
async def update_thesis(
    thesis_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Implemented in Sprint 3")


@router.delete("/{thesis_id}")
async def archive_thesis(
    thesis_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Implemented in Sprint 3")


@router.get("/{thesis_id}/events")
async def get_thesis_events(
    thesis_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Implemented in Sprint 3")


@router.get("/{thesis_id}/evidence")
async def get_thesis_evidence(
    thesis_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Implemented in Sprint 3")


@router.post("/{thesis_id}/evaluate")
async def evaluate_thesis(
    thesis_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Implemented in Sprint 3")
