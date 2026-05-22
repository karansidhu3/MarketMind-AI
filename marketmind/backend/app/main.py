from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, feed, health, learn, research, thesis, trends
from app.config import get_settings
from app.services.llm_service import OllamaLLMService
from app.services.retrieval_service import QdrantRetrievalService
from app.services.storage_service import LocalStorageService


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()

    llm = OllamaLLMService(
        base_url=settings.ollama_url,
        embed_model=settings.ollama_embed_model,
        generate_model=settings.ollama_generate_model,
    )
    storage = LocalStorageService(base_path=settings.storage_path)
    retrieval = QdrantRetrievalService(url=settings.qdrant_url)

    app.state.llm = llm
    app.state.storage = storage
    app.state.retrieval = retrieval

    yield

    await llm.close()
    await retrieval.close()


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="MarketMind AI",
        version="0.3.0",
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
