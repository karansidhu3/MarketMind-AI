"""
Initial ingestion script — populates marketmind_documents from all configured sources.

Run inside the backend container:
    docker exec infrastructure-backend-1 python scripts/ingest.py

Re-running is safe: document IDs are deterministic (UUID5 from source URL),
so Qdrant upsert overwrites existing points rather than creating duplicates.
"""
import asyncio
import logging
import sys
from pathlib import Path

# Ensure the backend root is on sys.path whether the script is run directly
# or via `docker exec ... python scripts/ingest.py` from /app.
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import get_settings
from app.ingestion.connectors.rss import GenericRSSConnector
from app.ingestion.connectors.sec_edgar import SECEdgarConnector
from app.ingestion.connectors.yahoo_finance import YahooFinanceConnector
from app.ingestion.worker import IngestionWorker
from app.services.llm_service import OllamaLLMService
from app.services.retrieval_service import QdrantRetrievalService
from app.services.storage_service import LocalStorageService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("ingest")

SOURCES = [
    (
        "SEC EDGAR — 8-K filings",
        SECEdgarConnector(filing_type="8-K", count=20),
    ),
    (
        "Yahoo Finance — top tickers",
        YahooFinanceConnector(tickers=["NVDA", "AAPL", "MSFT", "GOOGL", "AMZN"]),
    ),
    (
        "Reuters — business news",
        GenericRSSConnector(
            "https://feeds.reuters.com/reuters/businessNews",
            source_name="Reuters",
            credibility_score=0.85,
        ),
    ),
]


async def main() -> int:
    settings = get_settings()

    llm = OllamaLLMService(
        base_url=settings.ollama_url,
        embed_model=settings.ollama_embed_model,
    )
    storage = LocalStorageService(base_path=settings.storage_path)
    retrieval = QdrantRetrievalService(url=settings.qdrant_url)

    total = 0
    try:
        for label, connector in SOURCES:
            logger.info("── Starting: %s", label)
            worker = IngestionWorker(connector, llm, storage, retrieval)
            count = await worker.run()
            logger.info("── Finished: %s — %d document(s) ingested", label, count)
            total += count
    finally:
        await llm.close()
        await retrieval.close()

    logger.info("══ Total ingested: %d document(s)", total)
    return total


if __name__ == "__main__":
    result = asyncio.run(main())
    sys.exit(0 if result >= 0 else 1)
