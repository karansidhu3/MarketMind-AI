from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> uuid.UUID:
    return uuid.uuid4()


class Thesis(Base):
    __tablename__ = "theses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    keywords: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_system: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    evidence: Mapped[list[Evidence]] = relationship("Evidence", back_populates="thesis", lazy="noload")
    company_signals: Mapped[list[CompanySignal]] = relationship("CompanySignal", back_populates="thesis", lazy="noload")


class Evidence(Base):
    __tablename__ = "evidence"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    thesis_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("theses.id", ondelete="CASCADE"), nullable=False, index=True)
    document_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    sentiment: Mapped[str] = mapped_column(String(20), nullable=False, default="neutral")
    excerpt: Mapped[str] = mapped_column(Text, nullable=False, default="")
    score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    source_url: Mapped[str] = mapped_column(Text, nullable=False, default="")
    source_name: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    document_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)

    thesis: Mapped[Thesis] = relationship("Thesis", back_populates="evidence", lazy="noload")


class CompanySignal(Base):
    __tablename__ = "company_signals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    company_name: Mapped[str] = mapped_column(String(200), nullable=False)
    normalised_name: Mapped[str] = mapped_column(String(200), nullable=False, index=True, default="")
    ticker: Mapped[str | None] = mapped_column(String(20), nullable=True)
    thesis_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("theses.id", ondelete="CASCADE"), nullable=False, index=True)
    document_id: Mapped[str] = mapped_column(String(100), nullable=False)
    mention_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    first_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    last_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    thesis: Mapped[Thesis] = relationship("Thesis", back_populates="company_signals", lazy="noload")


class SupplyChainLink(Base):
    __tablename__ = "supply_chain_links"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    parent_company: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    child_company: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    relationship_type: Mapped[str] = mapped_column(String(20), nullable=False, default="supplier")
    evidence_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    source_document_id: Mapped[str] = mapped_column(String(100), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.5)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)


class InsiderTransaction(Base):
    __tablename__ = "insider_transactions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    company_name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    ticker: Mapped[str | None] = mapped_column(String(20), nullable=True)
    insider_name: Mapped[str] = mapped_column(String(200), nullable=False, default="Unknown")
    transaction_type: Mapped[str] = mapped_column(String(10), nullable=False, default="unknown")
    shares: Mapped[int | None] = mapped_column(Integer, nullable=True)
    price: Mapped[float | None] = mapped_column(Float, nullable=True)
    document_id: Mapped[str] = mapped_column(String(100), nullable=False)
    filed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class DailyFeed(Base):
    __tablename__ = "daily_feeds"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    feed_date: Mapped[date] = mapped_column(Date, nullable=False, unique=True, index=True)
    thesis_signals: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    new_companies: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    insider_clusters: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class CompanyAlert(Base):
    """User-defined doc_count threshold for a radar company. Triggers in feed when crossed."""
    __tablename__ = "company_alerts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    normalised_name: Mapped[str] = mapped_column(String(200), nullable=False, unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(200), nullable=False)
    threshold: Mapped[int] = mapped_column(Integer, nullable=False)  # alert when doc_count >= this
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class ConfidenceSnapshot(Base):
    """One row per thesis per day — enables confidence history charts."""
    __tablename__ = "confidence_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    thesis_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("theses.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    supporting_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    opposing_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    evidence_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class Holding(Base):
    """
    User's portfolio holdings. Stored locally, never leaves the machine.
    Used for thesis alignment scoring and exposure gap detection (Sprint 7).
    Framing: alignment gaps, not buy/sell recommendations (ADR-023).
    """
    __tablename__ = "holdings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    ticker: Mapped[str] = mapped_column(String(20), nullable=False, unique=True, index=True)
    company_name: Mapped[str] = mapped_column(String(200), nullable=False)
    shares: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    cost_basis: Mapped[float | None] = mapped_column(Float, nullable=True)  # per share, optional
    added_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
