"""
corpus_cleanse.py — Phase 0 data surgery (ADR-033).

Removes Evidence rows from noisy sources that no longer carry signal value:
  - SEC EDGAR          generic fire hose — random sector filings, no targeting
  - SEC EDGAR Form 4   insider transactions — deprioritised (ADR-025)
  - Yahoo Finance      removed (ADR-033)
  - MarketWatch        removed (ADR-033)
  - Seeking Alpha      removed (ADR-033)
  - The Register       removed (ADR-033)
  - Ars Technica       removed (ADR-033)

Retains:
  - SEC EDGAR (Targeted)  60-ticker watchlist, on-thesis primary disclosures
  - Breaking Defense      sector trade press
  - Utility Dive          sector trade press
  - EE Times              sector trade press

Also removes CompanySignal rows whose document_id no longer appears in any
surviving Evidence row — these signals are structurally orphaned after the
evidence is gone.

Also invalidates cached DailyFeed rows — they embed evidence counts from
noisy sources and will be regenerated on next /feed/regenerate call.

Run inside the backend container:
    docker exec infrastructure-backend-1 python scripts/corpus_cleanse.py

Safe to re-run — all operations check before deleting.
"""
import asyncio
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import delete, func, select, text

from app.config import get_settings
from app.db.models import CompanySignal, DailyFeed, Evidence
from app.db.session import close_db, create_tables, get_session_factory, init_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("corpus_cleanse")

# Sources that are being removed from the ingestion pipeline (ADR-033).
# Evidence from these sources is low-signal or structurally misaligned with ICR.
NOISY_SOURCES = [
    "SEC EDGAR",          # generic fire hose — SECEdgarConnector (8-K, 10-Q, 10-K)
    "SEC EDGAR Form 4",   # insider transactions — Form4Connector (ADR-025)
    "Yahoo Finance",      # news aggregator — YahooFinanceConnector
    "MarketWatch",        # financial media — GenericRSSConnector
    "Seeking Alpha",      # financial media — GenericRSSConnector
    "The Register",       # tech media — GenericRSSConnector
    "Ars Technica",       # tech media — GenericRSSConnector
]


async def main() -> None:
    settings = get_settings()
    init_db(settings.database_url)
    await create_tables()
    session_factory = get_session_factory()

    async with session_factory() as session:

        # ── Inventory: before counts ───────────────────────────────────────────
        total_evidence_before = (
            await session.execute(select(func.count(Evidence.id)))
        ).scalar_one()
        total_signals_before = (
            await session.execute(select(func.count(CompanySignal.id)))
        ).scalar_one()

        logger.info(
            "Before cleanse: %d evidence rows, %d company signal rows",
            total_evidence_before,
            total_signals_before,
        )

        # ── Break down evidence by source so the operator can verify ──────────
        rows = (
            await session.execute(
                select(Evidence.source_name, func.count(Evidence.id).label("cnt"))
                .group_by(Evidence.source_name)
                .order_by(text("cnt DESC"))
            )
        ).all()
        logger.info("Evidence by source (before):")
        to_delete_count = 0
        for source_name, cnt in rows:
            if source_name in NOISY_SOURCES:
                logger.info("  %5d  %-40s  ✗ REMOVE", cnt, source_name)
                to_delete_count += cnt
            else:
                logger.info("  %5d  %-40s  ✓ keep", cnt, source_name)
        logger.info("  ─────")
        logger.info("  %5d  to be removed", to_delete_count)
        logger.info("  %5d  to be retained", total_evidence_before - to_delete_count)

        if to_delete_count == 0:
            logger.info("Nothing to remove — corpus is already clean.")
            await close_db()
            return

        # ── Step 1: collect noisy document_ids before deletion ────────────────
        # We need these to identify orphaned CompanySignal rows afterward.
        noisy_doc_ids: set[str] = set(
            (
                await session.execute(
                    select(Evidence.document_id)
                    .where(Evidence.source_name.in_(NOISY_SOURCES))
                    .distinct()
                )
            )
            .scalars()
            .all()
        )
        logger.info(
            "Collected %d unique document IDs from noisy sources", len(noisy_doc_ids)
        )

        # ── Step 2: delete noisy Evidence rows ────────────────────────────────
        result = await session.execute(
            delete(Evidence).where(Evidence.source_name.in_(NOISY_SOURCES))
        )
        evidence_deleted = result.rowcount
        logger.info("Deleted %d Evidence rows", evidence_deleted)

        # ── Step 3: delete orphaned CompanySignal rows ────────────────────────
        # A CompanySignal is orphaned if its document_id no longer exists in
        # any Evidence row. We only evaluate signals from the noisy doc set —
        # clean signals are untouched regardless.
        if noisy_doc_ids:
            # Which of the noisy doc_ids still have surviving evidence?
            surviving = set(
                (
                    await session.execute(
                        select(Evidence.document_id)
                        .where(Evidence.document_id.in_(noisy_doc_ids))
                        .distinct()
                    )
                )
                .scalars()
                .all()
            )
            orphaned_doc_ids = noisy_doc_ids - surviving
            logger.info(
                "%d document IDs are fully gone; %d had cross-source evidence (retained)",
                len(orphaned_doc_ids),
                len(surviving),
            )

            if orphaned_doc_ids:
                result2 = await session.execute(
                    delete(CompanySignal).where(
                        CompanySignal.document_id.in_(orphaned_doc_ids)
                    )
                )
                signals_deleted = result2.rowcount
                logger.info("Deleted %d CompanySignal rows", signals_deleted)
            else:
                logger.info("No orphaned CompanySignal rows to delete")
                signals_deleted = 0
        else:
            signals_deleted = 0

        # ── Step 4: invalidate DailyFeed cache ────────────────────────────────
        # Cached feeds embed evidence counts from removed sources. Deleting them
        # forces regeneration via /feed/regenerate (which can be called manually
        # or waits for the next ingestion run).
        feed_result = await session.execute(delete(DailyFeed))
        feeds_deleted = feed_result.rowcount
        logger.info("Invalidated %d cached DailyFeed rows", feeds_deleted)

        await session.commit()

        # ── Final inventory ────────────────────────────────────────────────────
        total_evidence_after = (
            await session.execute(select(func.count(Evidence.id)))
        ).scalar_one()
        total_signals_after = (
            await session.execute(select(func.count(CompanySignal.id)))
        ).scalar_one()

        logger.info(
            "After cleanse:  %d evidence rows  (removed %d)",
            total_evidence_after,
            total_evidence_before - total_evidence_after,
        )
        logger.info(
            "                %d signal rows     (removed %d)",
            total_signals_after,
            total_signals_before - total_signals_after,
        )

    await close_db()
    logger.info("Corpus cleanse complete.")


if __name__ == "__main__":
    asyncio.run(main())
