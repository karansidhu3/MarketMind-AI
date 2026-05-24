"""
GET /companies/{normalised_name}

Company deep-dive: all evidence, thesis breakdown, trajectory.
Normalised name is the DB key from company_signals.normalised_name
(lowercase, legal-suffix-stripped — e.g. "eaton", "quanta services").
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.api.dependencies import CurrentUser, get_current_user, get_session_factory
from app.db.models import CompanySignal, Evidence, Thesis
from app.ingestion.normalise import pick_canonical

router = APIRouter(prefix="/companies", tags=["companies"])


@router.get("/{normalised_name}")
async def get_company(
    normalised_name: str,
    _user: CurrentUser = Depends(get_current_user),
    factory: async_sessionmaker[AsyncSession] = Depends(get_session_factory),
) -> dict:
    """
    Full company profile: display name, thesis breakdown, recent evidence, 4-week trajectory.
    """
    async with factory() as session:
        # All signals for this normalised name
        signals = (
            await session.execute(
                select(CompanySignal).where(CompanySignal.normalised_name == normalised_name)
            )
        ).scalars().all()

        if not signals:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No company found with key '{normalised_name}'",
            )

        thesis_ids  = list({s.thesis_id for s in signals})
        document_ids = list({s.document_id for s in signals})

        # Thesis metadata
        theses = (
            await session.execute(select(Thesis).where(Thesis.id.in_(thesis_ids)))
        ).scalars().all()
        thesis_map = {t.id: t for t in theses}

        # Evidence scoped to this company's docs × theses (newest first)
        evidence_rows = (
            await session.execute(
                select(Evidence)
                .where(
                    Evidence.thesis_id.in_(thesis_ids),
                    Evidence.document_id.in_(document_ids),
                )
                .order_by(
                    Evidence.document_date.desc().nullslast(),
                    Evidence.created_at.desc(),
                )
                .limit(40)
            )
        ).scalars().all()

    # ── Company summary ───────────────────────────────────────────────────────

    all_names  = [s.company_name for s in signals]
    display_name = pick_canonical(all_names)
    ticker     = next((s.ticker for s in signals if s.ticker), None)
    first_seen = min(s.first_seen for s in signals)
    last_seen  = max(s.last_seen  for s in signals)
    doc_count  = len(document_ids)

    # ── 4-week trajectory (based on last_seen timestamps of each signal row) ─

    now = datetime.now(timezone.utc)
    weekly_counts = [0, 0, 0, 0]
    for sig in signals:
        days_ago = (now - sig.last_seen).days
        if 0 <= days_ago < 28:
            bucket = min(days_ago // 7, 3)
            weekly_counts[3 - bucket] += 1  # oldest→newest order

    # ── Thesis breakdown ──────────────────────────────────────────────────────

    breakdown: dict[str, dict] = {}
    for sig in signals:
        tid = str(sig.thesis_id)
        if tid not in breakdown:
            t = thesis_map.get(sig.thesis_id)
            breakdown[tid] = {
                "thesis_id":    tid,
                "thesis_name":  t.name if t else "Unknown",
                "confidence":   0.0,
                "doc_count":    0,
                "mention_count": 0,
                "supporting":   0,
                "opposing":     0,
                "neutral":      0,
            }
        breakdown[tid]["doc_count"]    += 1
        breakdown[tid]["mention_count"] += sig.mention_count

    for ev in evidence_rows:
        tid = str(ev.thesis_id)
        if tid in breakdown:
            sent = ev.sentiment if ev.sentiment in ("supporting", "opposing", "neutral") else "neutral"
            breakdown[tid][sent] += 1

    # Confidence per thesis = supporting / (supporting + opposing)
    for td in breakdown.values():
        total = td["supporting"] + td["opposing"]
        td["confidence"] = td["supporting"] / total if total else 0.0

    return {
        "normalised_name": normalised_name,
        "display_name":    display_name,
        "ticker":          ticker,
        "first_seen":      first_seen.isoformat(),
        "last_seen":       last_seen.isoformat(),
        "doc_count":       doc_count,
        "mention_count":   sum(s.mention_count for s in signals),
        "weekly_counts":   weekly_counts,
        "thesis_breakdown": sorted(
            breakdown.values(),
            key=lambda x: x["doc_count"],
            reverse=True,
        ),
        "evidence": [
            {
                "id":            str(ev.id),
                "thesis_id":     str(ev.thesis_id),
                "thesis_name":   thesis_map.get(ev.thesis_id, None) and thesis_map[ev.thesis_id].name or "Unknown",
                "sentiment":     ev.sentiment,
                "excerpt":       ev.excerpt,
                "score":         ev.score,
                "source_url":    ev.source_url,
                "source_name":   ev.source_name,
                "document_date": ev.document_date.isoformat() if ev.document_date else None,
            }
            for ev in evidence_rows
        ],
    }
