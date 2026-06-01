"""
Ingestion script — populates marketmind_documents from targeted sources,
then scores every document against active theses.

Run inside the backend container:
    docker exec infrastructure-backend-1 python scripts/ingest.py

Re-running is safe: document IDs are deterministic (UUID5 from source URL),
so Qdrant upsert and Postgres evidence inserts are both idempotent.

Corpus strategy (ADR-026, ADR-033):
  Only two source classes are ingested:
    1. PRIMARY_DISCLOSURE — TargetedSECConnector for ~60 tickers across 5 sectors.
       These are company-specific 8-K and 10-Q filings from companies known to
       operate in our thesis areas. High signal, high credibility.
    2. TRADE_PRESS — Breaking Defense, Utility Dive, EE Times. Sector-specific
       publications that surface headwinds, budget pressure, and capacity constraints
       before they appear in company filings.

  Removed (Phase 0 cleanse, ADR-033):
    - Generic EDGAR fire hose (SECEdgarConnector) — random sector, adds noise
    - Form 4 insider transactions (Form4Connector) — commodity signal (ADR-025)
    - Yahoo Finance (YahooFinanceConnector) — news aggregator, low signal
    - MarketWatch, Seeking Alpha, The Register, Ars Technica — financial/tech media
"""
import asyncio
import logging
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import get_settings
from app.db.session import close_db, create_tables, get_session_factory, init_db
from app.ingestion.connectors.rss import GenericRSSConnector
from app.ingestion.connectors.sec_edgar_targeted import TargetedSECConnector
from app.ingestion.worker import IngestionWorker
from app.services.llm_service import OllamaLLMService
from app.services.retrieval_service import QdrantRetrievalService
from app.services.storage_service import LocalStorageService
# SupplyChainExtractor import retained for reference — not used (ADR-024)
# from app.supply_chain.extractor import SupplyChainExtractor
from app.thesis.service import ThesisService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("ingest")

# ── Targeted company lists — mapped to thesis areas ───────────────────────────
#
# These are companies known to operate in our tracked thesis sectors.
# Pulling their filings directly gives us high-quality, on-thesis documents
# instead of relying on the generic EDGAR daily fire hose.
#
# Thesis: AI Infrastructure Bottlenecks
_AI_INFRA = [
    "NVDA", "AMD", "AVGO", "MRVL", "QCOM",       # chip designers
    "SMCI", "DELL", "HPE", "NTAP",                 # server/storage
    "CSCO", "ANET", "JNPR",                        # networking
    "VRT", "GTLS",                                  # power/cooling for AI
]

# Thesis: Semiconductor Supply Chain
_SEMI_SUPPLY = [
    "AMAT", "KLAC", "LRCX", "TER", "ONTO",        # fab equipment
    "ENTG", "MKSI", "WOLF", "AZTA",                # materials/process
    "MU", "WDC", "NXPI",                           # memory/storage chips
    "INTC", "TSM",                                  # foundry/IDM
]

# Thesis: Energy Grid Modernization
_GRID = [
    "ETN", "HUBB", "REZI", "NVT", "EMR",          # electrical equipment
    "PWR", "AMPS", "MYR", "PIKE",                  # grid contractors
    "GE", "ABB",                                    # large industrial (US-listed)
    "AEE", "ED", "SO", "NEE", "DUK",              # utilities
]

# Thesis: Defense Production Ramp
_DEFENSE = [
    "LMT", "RTX", "NOC", "GD", "BA",              # primes
    "LDOS", "CACI", "BAH", "SAIC",                 # defense IT
    "KTOS", "AXON", "HII", "TXT",                  # platforms / shipbuilding
    "HEICO", "TDG",                                 # defense aero parts
]

# Thesis: Data Center Physical Infrastructure
_DC_INFRA = [
    "DLR", "EQIX", "AMT", "CCI",                  # REITs / colocation
    "VRT", "SMCI", "GTLS",                          # cooling / power density
    "IR", "JCI", "TT",                              # HVAC / thermal mgmt
    "CARR",                                          # building tech
]

SOURCES = [
    # ── PRIMARY_DISCLOSURE — targeted 8-K and 10-Q filings ───────────────────
    # ~60 curated tickers across 5 thesis sectors. These are the companies we
    # are actually watching. Targeted pull guarantees relevance; the generic
    # EDGAR fire hose (removed ADR-033) returned random-sector filings.
    (
        "SEC EDGAR — AI Infrastructure (targeted)",
        TargetedSECConnector(tickers=_AI_INFRA, filing_types=["8-K", "10-Q"], count_per_company=3),
    ),
    (
        "SEC EDGAR — Semiconductor Supply Chain (targeted)",
        TargetedSECConnector(tickers=_SEMI_SUPPLY, filing_types=["8-K", "10-Q"], count_per_company=3),
    ),
    (
        "SEC EDGAR — Energy Grid (targeted)",
        TargetedSECConnector(tickers=_GRID, filing_types=["8-K", "10-Q"], count_per_company=3),
    ),
    (
        "SEC EDGAR — Defense (targeted)",
        TargetedSECConnector(tickers=_DEFENSE, filing_types=["8-K", "10-Q"], count_per_company=3),
    ),
    (
        "SEC EDGAR — Data Center Infrastructure (targeted)",
        TargetedSECConnector(tickers=_DC_INFRA, filing_types=["8-K", "10-Q"], count_per_company=3),
    ),

    # ── TRADE_PRESS — sector-specific publications ────────────────────────────
    # These surface headwinds, capacity constraints, and supply-side pressure
    # before they show up in company filings. Weight 0.4 in ICR (vs 1.0 for
    # primary disclosures) because they are secondary, not primary, sources.
    (
        "Breaking Defense — defense industry news",
        GenericRSSConnector(
            "https://breakingdefense.com/feed/",
            source_name="Breaking Defense",
            credibility_score=0.78,
        ),
    ),
    (
        "Utility Dive — energy grid news",
        GenericRSSConnector(
            "https://www.utilitydive.com/feeds/news/",
            source_name="Utility Dive",
            credibility_score=0.78,
        ),
    ),
    (
        "EE Times — semiconductor industry",
        GenericRSSConnector(
            "https://www.eetimes.com/feed/",
            source_name="EE Times",
            credibility_score=0.78,
        ),
    ),
]


async def main() -> int:
    import redis.asyncio as aioredis

    settings = get_settings()

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
    # Supply chain extraction is deprioritised (ADR-024) — the LLM call runs on
    # every scored document and consistently returns 0 relationships, burning
    # ~50 seconds per doc for no signal value. The extractor code is retained
    # for reference but not invoked during ingestion.
    # supply_chain = SupplyChainExtractor(session_factory=session_factory, llm=llm)

    seeded = await thesis_svc.seed_system_theses()
    if seeded:
        logger.info("Seeded %d system theses", seeded)

    # Per-connector checkpointing — survives lid-close restarts.
    # Each connector sets a Redis key when it finishes. On restart, completed
    # connectors are skipped instantly. Keys expire after 25h so each new day
    # starts fresh.
    redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    today = date.today().isoformat()

    total = 0
    try:
        for label, connector in SOURCES:
            checkpoint_key = f"ingest:connector:{today}:{label}"
            if await redis.exists(checkpoint_key):
                logger.info("── Skipping (already done today): %s", label)
                continue

            logger.info("── Starting: %s", label)
            worker = IngestionWorker(
                connector=connector,
                llm=llm,
                storage=storage,
                retrieval=retrieval,
                thesis_service=thesis_svc,
                supply_chain_extractor=None,  # ADR-024: disabled, see comment above
            )
            count = await worker.run()
            logger.info("── Finished: %s — %d document(s) ingested", label, count)
            await redis.set(checkpoint_key, str(count), ex=25 * 3600)
            total += count
    finally:
        await redis.aclose()
        await llm.close()
        await retrieval.close()
        await close_db()

    logger.info("══ Total ingested: %d document(s)", total)
    return total


if __name__ == "__main__":
    result = asyncio.run(main())
    sys.exit(0 if result >= 0 else 1)
