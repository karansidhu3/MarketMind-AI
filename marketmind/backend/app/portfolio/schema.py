from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, field_validator


class HoldingCreate(BaseModel):
    ticker: str
    company_name: str
    shares: float
    cost_basis: float | None = None

    @field_validator("ticker")
    @classmethod
    def upper_ticker(cls, v: str) -> str:
        return v.strip().upper()

    @field_validator("shares")
    @classmethod
    def positive_shares(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("shares must be positive")
        return v


class HoldingUpdate(BaseModel):
    company_name: str | None = None
    shares: float | None = None
    cost_basis: float | None = None


class HoldingOut(BaseModel):
    id: uuid.UUID
    ticker: str
    company_name: str
    shares: float
    cost_basis: float | None
    added_at: datetime

    model_config = {"from_attributes": True}


# ── Alignment output ──────────────────────────────────────────────────────────

class ThesisExposure(BaseModel):
    """How much of a thesis your current holdings cover."""
    thesis_id: str
    thesis_name: str
    confidence: float
    momentum: str                       # rising / flat / falling (from feed)
    held_companies: list[str]           # tickers of holdings that appear in this thesis
    total_companies: int                # total tracked companies in this thesis
    coverage_pct: float                 # held / total, 0–1


class GapCompany(BaseModel):
    """A company on the radar that you don't hold, in a thesis you track."""
    normalised_name: str = ""           # DB key — use for /companies/{key} deep-dive
    company_name: str
    ticker: str | None
    thesis_names: list[str]
    doc_count: int
    thesis_confidence: float            # highest confidence among the theses it appears in
    weekly_counts: list[int] = []       # doc counts for each of the last 4 weeks (oldest → newest)


class FeedGapSignal(BaseModel):
    """A gap company (not held) that had new signals today. Used by the feed page."""
    company_name: str
    normalised_name: str
    ticker: str | None
    thesis_names: list[str]
    new_signals_today: int   # CompanySignal entries updated since midnight UTC
    doc_count: int           # all-time unique document count


class PortfolioAlignment(BaseModel):
    total_holdings: int
    overall_coverage: float             # weighted average coverage across all theses
    theses: list[ThesisExposure]
    gaps: list[GapCompany]             # top uncovered companies, ranked by doc_count × confidence
    held_company_docs: dict[str, int] = {}  # ticker → corpus doc count (0 if not in corpus)
