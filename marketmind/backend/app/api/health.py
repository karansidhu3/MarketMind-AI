from fastapi import APIRouter, Request

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
async def version() -> dict:
    return {"app": "marketmind", "version": "0.2.0"}
