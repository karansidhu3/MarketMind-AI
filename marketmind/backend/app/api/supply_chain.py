from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.api.dependencies import CurrentUser, get_current_user, get_session_factory
from app.db.models import SupplyChainLink

router = APIRouter(prefix="/supply-chain", tags=["supply-chain"])


class SupplyChainLinkOut(BaseModel):
    id: uuid.UUID
    parent_company: str
    child_company: str
    relationship_type: str
    evidence_text: str
    confidence: float
    source_document_id: str
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("/{company}", response_model=list[SupplyChainLinkOut])
async def get_supply_chain(
    company: str,
    limit: int = 50,
    _user: CurrentUser = Depends(get_current_user),
    factory: async_sessionmaker[AsyncSession] = Depends(get_session_factory),
) -> list[SupplyChainLinkOut]:
    """
    Returns all supply chain relationships where the given company appears
    as either parent (customer/hub) or child (supplier/partner).
    Case-insensitive partial match.
    """
    pattern = f"%{company}%"
    async with factory() as session:
        rows = (
            await session.execute(
                select(SupplyChainLink)
                .where(
                    or_(
                        SupplyChainLink.parent_company.ilike(pattern),
                        SupplyChainLink.child_company.ilike(pattern),
                    )
                )
                .order_by(SupplyChainLink.confidence.desc())
                .limit(limit)
            )
        ).scalars().all()

    return [SupplyChainLinkOut.model_validate(r) for r in rows]
