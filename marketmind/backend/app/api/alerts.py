from __future__ import annotations

import uuid
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.api.dependencies import CurrentUser, get_current_user, get_session_factory
from app.db.models import CompanyAlert, CompanySignal

router = APIRouter(prefix="/alerts", tags=["alerts"])


class AlertCreate(BaseModel):
    normalised_name: str
    display_name: str
    threshold: int


class AlertUpdate(BaseModel):
    threshold: int


class AlertOut(BaseModel):
    id: uuid.UUID
    normalised_name: str
    display_name: str
    threshold: int
    current_doc_count: int = 0
    triggered: bool = False


@router.get("", response_model=list[AlertOut])
async def list_alerts(
    _user: CurrentUser = Depends(get_current_user),
    factory: async_sessionmaker[AsyncSession] = Depends(get_session_factory),
) -> list[AlertOut]:
    """List all company alerts with their current doc_count and triggered status."""
    async with factory() as session:
        alerts = (
            await session.execute(select(CompanyAlert).order_by(CompanyAlert.created_at))
        ).scalars().all()

        if not alerts:
            return []

        # Compute current doc_count for each alerted company (same logic as radar)
        all_signals = (await session.execute(select(CompanySignal))).scalars().all()

    doc_counts: dict[str, int] = defaultdict(int)
    groups: dict[str, set[str]] = defaultdict(set)
    for sig in all_signals:
        if sig.normalised_name:
            groups[sig.normalised_name].add(sig.document_id)
    for norm, doc_ids in groups.items():
        doc_counts[norm] = len(doc_ids)

    return [
        AlertOut(
            id=a.id,
            normalised_name=a.normalised_name,
            display_name=a.display_name,
            threshold=a.threshold,
            current_doc_count=doc_counts.get(a.normalised_name, 0),
            triggered=doc_counts.get(a.normalised_name, 0) >= a.threshold,
        )
        for a in alerts
    ]


@router.post("", response_model=AlertOut, status_code=status.HTTP_201_CREATED)
async def create_alert(
    body: AlertCreate,
    _user: CurrentUser = Depends(get_current_user),
    factory: async_sessionmaker[AsyncSession] = Depends(get_session_factory),
) -> AlertOut:
    """Set a doc_count alert for a radar company. Upserts if one already exists."""
    async with factory() as session:
        existing = (
            await session.execute(
                select(CompanyAlert).where(CompanyAlert.normalised_name == body.normalised_name)
            )
        ).scalar_one_or_none()

        if existing:
            existing.threshold = body.threshold
            existing.display_name = body.display_name
        else:
            existing = CompanyAlert(
                normalised_name=body.normalised_name,
                display_name=body.display_name,
                threshold=body.threshold,
            )
            session.add(existing)

        await session.commit()
        await session.refresh(existing)

        # Get current doc_count
        all_signals = (await session.execute(select(CompanySignal))).scalars().all()

    groups: dict[str, set[str]] = defaultdict(set)
    for sig in all_signals:
        if sig.normalised_name:
            groups[sig.normalised_name].add(sig.document_id)
    current = len(groups.get(body.normalised_name, set()))

    return AlertOut(
        id=existing.id,
        normalised_name=existing.normalised_name,
        display_name=existing.display_name,
        threshold=existing.threshold,
        current_doc_count=current,
        triggered=current >= existing.threshold,
    )


@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_alert(
    alert_id: uuid.UUID,
    _user: CurrentUser = Depends(get_current_user),
    factory: async_sessionmaker[AsyncSession] = Depends(get_session_factory),
) -> None:
    async with factory() as session:
        alert = await session.get(CompanyAlert, alert_id)
        if not alert:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
        await session.delete(alert)
        await session.commit()
