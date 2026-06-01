"""
migrate_sprint12.py — Sprint 12 schema migration (ADR-031, ADR-032).

Adds two columns to the evidence table:
  source_classification  VARCHAR(30) NOT NULL DEFAULT 'UNKNOWN'
    Semantic classification: PRIMARY_DISCLOSURE | TRADE_PRESS | UNKNOWN.
    New evidence rows are classified at ingestion time (Sprint 12).
    Existing rows are backfilled below based on source_name.

  filing_ticker  VARCHAR(20) NULL
    For PRIMARY_DISCLOSURE evidence: the ticker of the company that filed the
    document (the "citing company" in cross-citation tracking). NULL for
    TRADE_PRESS evidence. Used by TrajectoryService for ICR computation.
    Pre-Sprint-12 rows cannot be backfilled (ticker not stored in evidence).
    They will not contribute to ICR — only new ingestion runs will.

Run inside the backend container (once, after deploying Sprint 12 code):
    docker exec infrastructure-backend-1 python scripts/migrate_sprint12.py

Safe to re-run — uses ADD COLUMN IF NOT EXISTS and UPDATE … WHERE.
"""
import asyncio
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text

from app.config import get_settings
from app.db.session import close_db, get_session_factory, init_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("migrate_sprint12")

# Source names → semantic classification (backfill mapping).
# Only sources that survived the Phase 0 cleanse are present in the DB.
SOURCE_CLASSIFICATION_MAP = {
    "SEC EDGAR (Targeted)": "PRIMARY_DISCLOSURE",
    "Breaking Defense":     "TRADE_PRESS",
    "Utility Dive":         "TRADE_PRESS",
    "EE Times":             "TRADE_PRESS",
}


async def main() -> None:
    settings = get_settings()
    init_db(settings.database_url)
    session_factory = get_session_factory()

    async with session_factory() as session:

        # ── Step 1: add source_classification column ───────────────────────────
        logger.info("Adding source_classification column…")
        await session.execute(text("""
            ALTER TABLE evidence
            ADD COLUMN IF NOT EXISTS source_classification
                VARCHAR(30) NOT NULL DEFAULT 'UNKNOWN'
        """))
        await session.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_evidence_source_classification
            ON evidence(source_classification)
        """))
        logger.info("source_classification column ready.")

        # ── Step 2: add filing_ticker column ──────────────────────────────────
        logger.info("Adding filing_ticker column…")
        await session.execute(text("""
            ALTER TABLE evidence
            ADD COLUMN IF NOT EXISTS filing_ticker
                VARCHAR(20) NULL
        """))
        await session.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_evidence_filing_ticker
            ON evidence(filing_ticker)
        """))
        logger.info("filing_ticker column ready.")

        # ── Step 3: backfill source_classification from source_name ───────────
        logger.info("Backfilling source_classification for known source names…")
        total_backfilled = 0
        for source_name, classification in SOURCE_CLASSIFICATION_MAP.items():
            result = await session.execute(
                text("""
                    UPDATE evidence
                    SET source_classification = :cls
                    WHERE source_name = :name
                      AND source_classification = 'UNKNOWN'
                """),
                {"cls": classification, "name": source_name},
            )
            n = result.rowcount
            logger.info("  %s → %s: %d rows updated", source_name, classification, n)
            total_backfilled += n

        logger.info("Backfilled %d rows total.", total_backfilled)

        # ── Step 4: summary ────────────────────────────────────────────────────
        rows = (await session.execute(text("""
            SELECT source_classification, COUNT(*) AS cnt
            FROM evidence
            GROUP BY source_classification
            ORDER BY cnt DESC
        """))).all()

        logger.info("Evidence classification breakdown after migration:")
        for classification, cnt in rows:
            logger.info("  %5d  %s", cnt, classification)

        await session.commit()

    await close_db()
    logger.info("Sprint 12 migration complete.")
    logger.info("")
    logger.info("Note: filing_ticker for pre-Sprint-12 rows cannot be backfilled.")
    logger.info("ICR will only accumulate from new ingestion runs (next 6am PT).")


if __name__ == "__main__":
    asyncio.run(main())
