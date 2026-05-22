from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.dependencies import CurrentUser, get_current_user, get_thesis_service
from app.thesis.schema import CompanyRadarItem, EvidenceOut, ThesisCreate, ThesisOut, ThesisUpdate
from app.thesis.service import ThesisService

router = APIRouter(prefix="/theses", tags=["thesis"])


@router.get("", response_model=list[ThesisOut])
async def list_theses(
    _user: CurrentUser = Depends(get_current_user),
    svc: ThesisService = Depends(get_thesis_service),
) -> list[ThesisOut]:
    return await svc.list_all()


@router.post("", response_model=ThesisOut, status_code=status.HTTP_201_CREATED)
async def create_thesis(
    body: ThesisCreate,
    _user: CurrentUser = Depends(get_current_user),
    svc: ThesisService = Depends(get_thesis_service),
) -> ThesisOut:
    return await svc.create(body)


@router.get("/radar", response_model=list[CompanyRadarItem])
async def company_radar(
    min_mentions: int = 2,
    _user: CurrentUser = Depends(get_current_user),
    svc: ThesisService = Depends(get_thesis_service),
) -> list[CompanyRadarItem]:
    """Companies appearing across multiple documents — surfaces unknowns before they're obvious."""
    return await svc.get_company_radar(min_mentions=min_mentions)


@router.get("/{thesis_id}", response_model=ThesisOut)
async def get_thesis(
    thesis_id: uuid.UUID,
    _user: CurrentUser = Depends(get_current_user),
    svc: ThesisService = Depends(get_thesis_service),
) -> ThesisOut:
    result = await svc.get(thesis_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thesis not found")
    return result


@router.patch("/{thesis_id}", response_model=ThesisOut)
async def update_thesis(
    thesis_id: uuid.UUID,
    body: ThesisUpdate,
    _user: CurrentUser = Depends(get_current_user),
    svc: ThesisService = Depends(get_thesis_service),
) -> ThesisOut:
    result = await svc.update(thesis_id, body)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thesis not found")
    return result


@router.delete("/{thesis_id}")
async def archive_thesis(
    thesis_id: uuid.UUID,
    _user: CurrentUser = Depends(get_current_user),
    svc: ThesisService = Depends(get_thesis_service),
) -> dict:
    ok = await svc.archive(thesis_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thesis not found")
    return {"archived": True}


@router.get("/{thesis_id}/evidence", response_model=list[EvidenceOut])
async def get_thesis_evidence(
    thesis_id: uuid.UUID,
    limit: int = 50,
    _user: CurrentUser = Depends(get_current_user),
    svc: ThesisService = Depends(get_thesis_service),
) -> list[EvidenceOut]:
    rows = await svc.get_evidence(thesis_id, limit=limit)
    return [EvidenceOut.model_validate(r) for r in rows]
