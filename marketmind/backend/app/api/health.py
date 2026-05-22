from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def liveness() -> dict:
    """
    Liveness probe.
    Returns 200 as long as the process is running.
    Used by Docker healthcheck and load balancers.
    """
    return {"status": "ok"}


@router.get("/health/ready")
async def readiness() -> dict:
    """
    Readiness probe.
    Sprint 1: always returns 200. Dependency checks (postgres, redis,
    qdrant, ollama) are wired in Sprint 2 once the service layer is
    implemented.
    """
    return {"status": "ready"}


@router.get("/health/version")
async def version() -> dict:
    return {"app": "marketmind", "version": "0.1.0"}
