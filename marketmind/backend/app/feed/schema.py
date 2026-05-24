from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel


class ThesisSignal(BaseModel):
    thesis_id: str
    thesis_name: str
    new_evidence_count: int
    supporting_count: int
    opposing_count: int
    momentum: str  # "rising" | "flat" | "falling"
    confidence: float
    top_companies: list[str]
    highlight: str                      # most relevant excerpt from today
    evidence_ids: list[str] = []       # IDs of today's evidence records (C-011 provenance)
    language_shift: str | None = None  # cached language delta summary, if available


class NewCompany(BaseModel):
    company_name: str
    ticker: str | None
    thesis_names: list[str]
    first_seen: datetime
    context: str


class InsiderCluster(BaseModel):
    company_name: str
    filing_count: int
    filed_within_days: int


class FeedResponse(BaseModel):
    feed_date: date
    thesis_signals: list[ThesisSignal]
    new_companies: list[NewCompany]
    insider_clusters: list[InsiderCluster]
    summary: str
    generated_at: datetime
    from_cache: bool = False
