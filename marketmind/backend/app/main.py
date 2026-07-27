from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import alerts, auth, companies, feed, health, learn, portfolio, research, supply_chain, thesis, trajectory, trends, valuation, watchlist
from app.config import get_settings
from app.db.session import close_db, create_tables, get_session_factory, init_db
from app.feed.service import FeedService
from app.services.cache_service import RedisCacheService
from app.services.llm_service import OllamaLLMService
from app.services.retrieval_service import QdrantRetrievalService
from app.services.storage_service import LocalStorageService
from app.supply_chain.extractor import SupplyChainExtractor
from app.thesis.service import ThesisService


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()

    # Infrastructure
    init_db(settings.database_url)
    await create_tables()

    llm = OllamaLLMService(
        base_url=settings.ollama_url,
        embed_model=settings.ollama_embed_model,
        generate_model=settings.ollama_generate_model,
    )
    storage = LocalStorageService(base_path=settings.storage_path)
    retrieval = QdrantRetrievalService(url=settings.qdrant_url)
    cache = RedisCacheService(redis_url=settings.redis_url)

    session_factory = get_session_factory()

    thesis_svc = ThesisService(session_factory=session_factory, llm=llm)
    supply_chain = SupplyChainExtractor(session_factory=session_factory, llm=llm)
    feed_svc = FeedService(session_factory=session_factory, llm=llm, cache=cache)

    # Seed pre-built theses if first run
    seeded = await thesis_svc.seed_system_theses()
    if seeded:
        import logging
        logging.getLogger(__name__).info("Seeded %d system theses", seeded)

    app.state.llm = llm
    app.state.storage = storage
    app.state.retrieval = retrieval
    app.state.cache = cache
    app.state.thesis = thesis_svc
    app.state.supply_chain = supply_chain
    app.state.feed = feed_svc
    app.state.session_factory = session_factory

    yield

    await llm.close()
    await retrieval.close()
    await cache.close()
    await close_db()


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="MarketMind AI",
        version="0.4.0",
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
    app.include_router(alerts.router)
    app.include_router(feed.router)
    app.include_router(research.router)
    app.include_router(thesis.router)
    app.include_router(supply_chain.router)
    app.include_router(learn.router)
    app.include_router(trends.router)
    app.include_router(portfolio.router)
    app.include_router(watchlist.router)
    app.include_router(companies.router)
    app.include_router(trajectory.router)
    app.include_router(valuation.router)

    return app


app = create_app()
