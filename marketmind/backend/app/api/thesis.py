from __future__ import annotations

import json
import uuid
from datetime import date, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.api.dependencies import CurrentUser, get_cache, get_current_user, get_llm, get_retrieval, get_session_factory, get_thesis_service
from app.db.models import ConfidenceSnapshot, Thesis
from app.thesis.delta import LanguageDeltaService
from app.thesis.explain import ThesisExplainService
from app.thesis.schema import CompanyRadarItem, EvidenceOut, ThesisCreate, ThesisOut, ThesisUpdate
from app.thesis.service import ThesisService
from app.services.cache_service import CacheService
from app.services.llm_service import LLMService

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
    min_docs: int = 2,
    _user: CurrentUser = Depends(get_current_user),
    svc: ThesisService = Depends(get_thesis_service),
) -> list[CompanyRadarItem]:
    """Companies ranked by unique source documents — surfaces unknowns before they're obvious."""
    return await svc.get_company_radar(min_docs=min_docs)


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


@router.get("/{thesis_id}/language-delta")
async def language_delta(
    thesis_id: uuid.UUID,
    window_days: int = 30,
    _user: CurrentUser = Depends(get_current_user),
    factory: async_sessionmaker[AsyncSession] = Depends(get_session_factory),
    llm: LLMService = Depends(get_llm),
    cache: CacheService = Depends(get_cache),
    svc: ThesisService = Depends(get_thesis_service),
) -> dict:
    """
    Compare evidence language between two rolling windows.
    Returns appeared / disappeared / intensified themes + a plain-English summary.
    Returns status=insufficient_data until at least 2 signals exist in each window.
    """
    thesis = await svc.get(thesis_id)
    if not thesis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thesis not found")

    delta_svc = LanguageDeltaService(factory=factory, llm=llm, cache=cache)
    return await delta_svc.get_delta(
        thesis_id=thesis_id,
        thesis_name=thesis.name,
        window_days=window_days,
    )


@router.get("/{thesis_id}/explain")
async def explain_thesis(
    thesis_id: uuid.UUID,
    _user: CurrentUser = Depends(get_current_user),
    factory: async_sessionmaker[AsyncSession] = Depends(get_session_factory),
    llm: LLMService = Depends(get_llm),
    cache: CacheService = Depends(get_cache),
    svc: ThesisService = Depends(get_thesis_service),
) -> dict:
    """
    Generate a plain-English narrative interpreting this thesis's trend.
    Reads corpus history (last 14 days of evidence + 30-day snapshot trend).
    Results cached for 6 hours — LLM call is expensive.
    """
    thesis = await svc.get(thesis_id)
    if not thesis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thesis not found")

    explain_svc = ThesisExplainService(factory=factory, llm=llm, cache=cache)
    return await explain_svc.get_explain(
        thesis_id=thesis_id,
        thesis_name=thesis.name,
        thesis_desc=thesis.description or "",
    )


@router.get("/{thesis_id}/explain/stream")
async def stream_thesis_explain(
    thesis_id: uuid.UUID,
    _user: CurrentUser = Depends(get_current_user),
    factory: async_sessionmaker[AsyncSession] = Depends(get_session_factory),
    llm: LLMService = Depends(get_llm),
    cache: CacheService = Depends(get_cache),
    svc: ThesisService = Depends(get_thesis_service),
):
    """
    SSE stream of the plain-English thesis narrative.

    Event sequence:
      data: {"trend": "strengthening", "from_cache": false}   ← always first
      data: {"chunk": "token text..."}                         ← one or more
      data: [DONE]

    If cached, trend + full text arrive immediately as two events.
    If not cached, trend arrives first so the UI can show the badge,
    then narrative tokens stream as the LLM generates them.
    """
    thesis = await svc.get(thesis_id)
    if not thesis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thesis not found")

    explain_svc = ThesisExplainService(factory=factory, llm=llm, cache=cache)

    async def event_stream():
        try:
            async for event in explain_svc.stream_explain(
                thesis_id=thesis_id,
                thesis_name=thesis.name,
                thesis_desc=thesis.description or "",
            ):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception:
            pass
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/{thesis_id}/evaluate", status_code=status.HTTP_202_ACCEPTED)
async def evaluate_thesis(
    thesis_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    _user: CurrentUser = Depends(get_current_user),
    svc: ThesisService = Depends(get_thesis_service),
    retrieval=Depends(get_retrieval),
) -> dict:
    """
    Re-score the full Qdrant corpus against this thesis.
    Returns 202 immediately — evaluation runs in the background.
    New evidence records appear as the job progresses (refresh the page).
    """
    thesis = await svc.get(thesis_id)
    if not thesis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thesis not found")

    background_tasks.add_task(svc.evaluate_against_corpus, thesis_id, retrieval)
    return {
        "status": "started",
        "message": f"Re-evaluating corpus against '{thesis.name}'. New signals will appear as the job runs — refresh in a few minutes.",
    }
