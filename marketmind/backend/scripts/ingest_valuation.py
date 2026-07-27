"""
Valuation ingestion — populates valuation_snapshots from Finnhub.

Sprint 17 (ADR-038). Deliberately independent of the document/ICR pipeline:
no Ollama, no embedding, no LLM call anywhere in this script. It can run
even while the remote Ollama PC is unreachable — the two pipelines share
nothing except the Postgres database and the tracked ticker list.

Run inside the backend container:
    docker exec infrastructure-backend-1 python scripts/ingest_valuation.py

Re-running the same week is safe: (ticker, week_start) is a unique
constraint, so this upserts rather than duplicating.
"""
from __future__ import annotations

import asyncio
import logging
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy.dialects.postgresql import insert as pg_insert

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import get_settings
from app.db.models import ValuationSnapshot
from app.db.session import close_db, create_tables, get_session_factory, init_db
from app.services.valuation_service import FinnhubValuationService
from scripts.ingest import ALL_TRACKED_TICKERS

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("ingest_valuation")

# Finnhub free tier: 60 calls/minute. Two calls per ticker (quote + metric).
_REQUEST_DELAY = 1.1


def _week_start(d: date) -> date:
    return d - timedelta(days=d.weekday())


async def main() -> int:
    settings = get_settings()
    if not settings.finnhub_api_key:
        logger.error("FINNHUB_API_KEY is not set — nothing to do. See ADR-038.")
        return 0

    init_db(settings.database_url)
    await create_tables()
    session_factory = get_session_factory()

    valuation = FinnhubValuationService(api_key=settings.finnhub_api_key)

    today = datetime.now(timezone.utc).date()
    week_start = _week_start(today)

    ok_count = 0
    error_count = 0

    try:
        async with session_factory() as session:
            for ticker in ALL_TRACKED_TICKERS:
                status = "ok"
                metrics: dict = {}
                try:
                    metrics = await valuation.get_metrics(ticker)
                except Exception as exc:
                    logger.warning("  %s: lookup failed — %s", ticker, exc)
                    status = "error"
                    error_count += 1
                else:
                    ok_count += 1
                    logger.info(
                        "  %s: price=%s peg=%s 52w_high=%s",
                        ticker, metrics.get("price"), metrics.get("forward_peg"),
                        metrics.get("price_52w_high"),
                    )

                stmt = pg_insert(ValuationSnapshot).values(
                    ticker=ticker,
                    week_start=week_start,
                    price=metrics.get("price"),
                    forward_pe=metrics.get("forward_pe"),
                    forward_peg=metrics.get("forward_peg"),
                    price_52w_high=metrics.get("price_52w_high"),
                    price_52w_low=metrics.get("price_52w_low"),
                    status=status,
                )
                stmt = stmt.on_conflict_do_update(
                    index_elements=["ticker", "week_start"],
                    set_={
                        "price": stmt.excluded.price,
                        "forward_pe": stmt.excluded.forward_pe,
                        "forward_peg": stmt.excluded.forward_peg,
                        "price_52w_high": stmt.excluded.price_52w_high,
                        "price_52w_low": stmt.excluded.price_52w_low,
                        "status": stmt.excluded.status,
                    },
                )
                await session.execute(stmt)
                await session.commit()

                await asyncio.sleep(_REQUEST_DELAY)
    finally:
        await valuation.close()
        await close_db()

    logger.info("== Valuation ingestion done: %d ok, %d failed", ok_count, error_count)
    return ok_count


if __name__ == "__main__":
    result = asyncio.run(main())
    sys.exit(0 if result >= 0 else 1)
