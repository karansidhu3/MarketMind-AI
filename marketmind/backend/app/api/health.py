from fastapi import APIRouter, Request
from sqlalchemy import func, select, text

router = APIRouter(tags=["health"])


@router.get("/health")
async def liveness() -> dict:
    """Liveness probe — returns 200 as long as the process is running."""
    return {"status": "ok"}


@router.get("/health/ready")
async def readiness(request: Request) -> dict:
    """
    Readiness probe. Checks that the Sprint 2 services initialised successfully.
    Returns 200 when all checks pass, 503 when any service is not ready.
    """
    from fastapi import status
    from fastapi.responses import JSONResponse

    checks = {
        "qdrant": "ok" if getattr(request.app.state, "retrieval", None) is not None else "not_initialized",
        "ollama": "ok" if getattr(request.app.state, "llm", None) is not None else "not_initialized",
        "storage": "ok" if getattr(request.app.state, "storage", None) is not None else "not_initialized",
    }
    all_ok = all(v == "ok" for v in checks.values())
    http_status = status.HTTP_200_OK if all_ok else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(
        {"status": "ready" if all_ok else "degraded", "checks": checks},
        status_code=http_status,
    )


@router.get("/health/version")
async def version(request: Request) -> dict:
    return {"app": "marketmind", "version": request.app.version}


@router.get("/health/corpus")
async def corpus_health() -> dict:
    """
    Corpus composition — evidence counts by source classification and source name.
    No auth required. Used by the Signal Map footer (Sprint 15 corpus health indicator).
    """
    from app.db.models import Evidence
    from app.db.session import get_session_factory

    session_factory = get_session_factory()
    async with session_factory() as session:

        by_classification = (
            await session.execute(
                select(Evidence.source_classification, func.count(Evidence.id).label("cnt"))
                .group_by(Evidence.source_classification)
                .order_by(text("cnt DESC"))
            )
        ).all()

        by_source = (
            await session.execute(
                select(Evidence.source_name, func.count(Evidence.id).label("cnt"))
                .group_by(Evidence.source_name)
                .order_by(text("cnt DESC"))
            )
        ).all()

        last_date = (
            await session.execute(select(func.max(Evidence.document_date)))
        ).scalar_one_or_none()

    return {
        "evidence_total":       sum(r.cnt for r in by_classification),
        "by_classification":    {r.source_classification: r.cnt for r in by_classification},
        "by_source":            [{"source_name": r.source_name, "count": r.cnt} for r in by_source],
        "last_document_date":   last_date.isoformat() if last_date else None,
    }
