"""
Ingestion script — populates marketmind_documents from all configured sources,
then scores every document against active theses and extracts supply chain relationships.

Run inside the backend container:
    docker exec infrastructure-backend-1 python scripts/ingest.py

Re-running is safe: document IDs are deterministic (UUID5 from source URL),
so Qdrant upsert and Postgres evidence inserts are both idempotent.
"""
import asyncio
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import get_settings
from app.db.session import close_db, create_tables, get_session_factory, init_db
from app.ingestion.connectors.form4 import Form4Connector
from app.ingestion.connectors.rss import GenericRSSConnector
from app.ingestion.connectors.sec_edgar import SECEdgarConnector
from app.ingestion.connectors.yahoo_finance import YahooFinanceConnector
from app.ingestion.worker import IngestionWorker
from app.services.llm_service import OllamaLLMService
from app.services.retrieval_service import QdrantRetrievalService
from app.services.storage_service import LocalStorageService
from app.supply_chain.extractor import SupplyChainExtractor
from app.thesis.service import ThesisService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("ingest")

SOURCES = [
    # SEC filings — highest credibility, richest supply chain detail
    ("SEC EDGAR — 8-K (material events)", SECEdgarConnector(filing_type="8-K", count=40)),
    ("SEC EDGAR — 10-Q (quarterly reports)", SECEdgarConnector(filing_type="10-Q", count=20)),
    ("SEC EDGAR — 10-K (annual reports)", SECEdgarConnector(filing_type="10-K", count=10)),
    ("SEC EDGAR — Form 4 (insider transactions)", Form4Connector(count=40)),

    # Yahoo Finance — sector-specific tickers
    (
        "Yahoo Finance — AI/infrastructure tickers",
        YahooFinanceConnector(tickers=[
            "NVDA", "AAPL", "MSFT", "GOOGL", "AMZN",   # hyperscalers
            "ETN", "VRT", "PWR", "AMPS", "MTRN",        # power/grid
            "INTC", "AMD", "AMAT", "LRCX", "KLAC",      # semis
            "CDNS", "SNPS", "MRVL",                      # EDA/chips
        ]),
    ),

    # RSS feeds that reliably resolve inside Docker
    (
        "MarketWatch — market bulletins",
        GenericRSSConnector(
            "https://feeds.content.dowjones.io/public/rss/mw_bulletins",
            source_name="MarketWatch",
            credibility_score=0.80,
        ),
    ),
    (
        "Seeking Alpha — market currents",
        GenericRSSConnector(
            "https://seekingalpha.com/market_currents.xml",
            source_name="Seeking Alpha",
            credibility_score=0.70,
        ),
    ),
]


async def main() -> int:
    settings = get_settings()

    # Init Postgres (creates tables if needed, seeds theses if first run)
    init_db(settings.database_url)
    await create_tables()
    session_factory = get_session_factory()

    llm = OllamaLLMService(
        base_url=settings.ollama_url,
        embed_model=settings.ollama_embed_model,
        generate_model=settings.ollama_generate_model,
    )
    storage = LocalStorageService(base_path=settings.storage_path)
    retrieval = QdrantRetrievalService(url=settings.qdrant_url)

    thesis_svc = ThesisService(session_factory=session_factory, llm=llm)
    supply_chain = SupplyChainExtractor(session_factory=session_factory, llm=llm)

    # Seed theses on first run
    seeded = await thesis_svc.seed_system_theses()
    if seeded:
        logger.info("Seeded %d system theses", seeded)

    total = 0
    try:
        for label, connector in SOURCES:
            logger.info("── Starting: %s", label)
            worker = IngestionWorker(
                connector=connector,
                llm=llm,
                storage=storage,
                retrieval=retrieval,
                thesis_service=thesis_svc,
                supply_chain_extractor=supply_chain,
            )
            count = await worker.run()
            logger.info("── Finished: %s — %d document(s) ingested", label, count)
            total += count
    finally:
        await llm.close()
        await retrieval.close()
        await close_db()

    logger.info("══ Total ingested: %d document(s)", total)
    return total


if __name__ == "__main__":
    result = asyncio.run(main())
    sys.exit(0 if result >= 0 else 1)
