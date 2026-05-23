from __future__ import annotations

import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.api.dependencies import CurrentUser, get_current_user, get_session_factory, get_thesis_service
from app.db.models import ConfidenceSnapshot
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


@router.get("/{thesis_id}/confidence-history")
async def get_confidence_history(
    thesis_id: uuid.UUID,
    days: int = 30,
    _user: CurrentUser = Depends(get_current_user),
    factory: async_sessionmaker[AsyncSession] = Depends(get_session_factory),
) -> list[dict]:
    """Daily confidence snapshots for the given thesis, newest first."""
    cutoff = date.today() - timedelta(days=days)
    async with factory() as session:
        rows = (
            await session.execute(
                select(ConfidenceSnapshot)
                .where(
                    ConfidenceSnapshot.thesis_id == thesis_id,
                    ConfidenceSnapshot.snapshot_date >= cutoff,
                )
                .order_by(ConfidenceSnapshot.snapshot_date.asc())
            )
        ).scalars().all()

    return [
        {
            "date": r.snapshot_date.isoformat(),
            "confidence": r.confidence,
            "supporting_count": r.supporting_count,
            "opposing_count": r.opposing_count,
            "evidence_count": r.evidence_count,
        }
        for r in rows
    ]
