from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ThesisCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=200)
    description: str = Field(default="")
    keywords: list[str] = Field(default_factory=list)


class ThesisUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    keywords: list[str] | None = None
    is_active: bool | None = None


class EvidenceOut(BaseModel):
    id: uuid.UUID
    thesis_id: uuid.UUID
    document_id: str
    sentiment: str
    excerpt: str
    score: float
    source_url: str
    source_name: str
    document_date: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ThesisOut(BaseModel):
    id: uuid.UUID
    name: str
    description: str
    keywords: list[str]
    is_active: bool
    is_system: bool
    created_at: datetime
    updated_at: datetime
    evidence_count: int = 0
    supporting_count: int = 0
    opposing_count: int = 0
    confidence: float = 0.0

    model_config = {"from_attributes": True}


class CompanyRadarItem(BaseModel):
    company_name: str
    ticker: str | None
    thesis_names: list[str]
    doc_count: int              # unique source documents — primary ranking signal
    mention_count: int          # raw mentions (can be inflated by a single verbose filing)
    first_seen: datetime
    last_seen: datetime
    weekly_counts: list[int] = []  # evidence activity last 4 weeks, oldest → newest
