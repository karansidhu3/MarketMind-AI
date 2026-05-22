from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, feed, health, learn, research, thesis, trends
from app.config import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: nothing to initialise in Sprint 1.
    # Sprint 2: open DB pool, Redis connection, Qdrant client.
    yield
    # Shutdown: nothing to close in Sprint 1.


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="MarketMind AI",
        version="0.1.0",
        docs_url="/docs" if settings.environment == "development" else None,
        redoc_url=None,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router)
    app.include_router(auth.router)
    app.include_router(feed.router)
    app.include_router(research.router)
    app.include_router(thesis.router)
    app.include_router(learn.router)
    app.include_router(trends.router)

    return app


app = create_app()
