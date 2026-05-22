from __future__ import annotations

from pydantic import BaseModel


class ResearchRequest(BaseModel):
    query: str


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
