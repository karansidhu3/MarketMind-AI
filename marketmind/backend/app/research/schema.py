from __future__ import annotations

from pydantic import BaseModel


class ResearchRequest(BaseModel):
    query: str
    days_back: int | None = None  # None = all time; 7/30/90 = recent only


class SourceRef(BaseModel):
    title: str
    source_name: str
    url: str
    source_credibility_score: float


class ResearchResponse(BaseModel):
    query: str
    answer: str
    evidence: list[str]
    sources: list[SourceRef]
    confidence: float
