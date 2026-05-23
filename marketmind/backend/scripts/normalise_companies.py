"""
One-time migration: company name normalisation.

What this does:
  1. Adds normalised_name column to company_signals if it doesn't exist
  2. Populates normalised_name for all existing rows
  3. Merges duplicate rows (same thesis + normalised_name)
     — keeps the longest company_name as canonical display name
     — sums mention_counts, keeps earliest first_seen, latest last_seen

Run once inside the backend container:
    docker exec infrastructure-backend-1 python scripts/normalise_companies.py

Safe to re-run — steps are idempotent.
"""
import asyncio
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("normalise_companies")

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.config import get_settings
from app.db.models import CompanySignal
from app.ingestion.normalise import is_same_company, normalise, pick_canonical


async def main() -> None:
    settings = get_settings()
    engine = create_async_engine(settings.database_url, echo=False)
    factory = async_sessionmaker(engine, expire_on_commit=False)

    # ── Step 1: add column if missing ───────────────────────────────────────
    async with engine.begin() as conn:
        await conn.execute(text("""
            ALTER TABLE company_signals
            ADD COLUMN IF NOT EXISTS normalised_name TEXT NOT NULL DEFAULT ''
        """))
        logger.info("Step 1: normalised_name column ensured")

    # ── Step 2: populate normalised_name for all rows ────────────────────────
    async with factory() as session:
        from sqlalchemy import select, update
        rows = (await session.execute(select(CompanySignal))).scalars().all()

        updated = 0
        for row in rows:
            norm = normalise(row.company_name)
            if row.normalised_name != norm:
                row.normalised_name = norm
                updated += 1

        await session.commit()
        logger.info("Step 2: populated normalised_name for %d row(s)", updated)

    # ── Step 3: merge duplicates using is_same_company ───────────────────────
    # Groups companies per thesis using the full similarity check (prefix match
    # + legal suffix stripping), not just normalised_name equality.
    async with factory() as session:
        from sqlalchemy import select
        rows = (await session.execute(select(CompanySignal))).scalars().all()

        # Build groups per thesis using union-find style matching
        # For each thesis, cluster rows where is_same_company() is True
        thesis_rows: dict[str, list[CompanySignal]] = {}
        for row in rows:
            thesis_rows.setdefault(str(row.thesis_id), []).append(row)

        merged = 0
        for thesis_id_str, t_rows in thesis_rows.items():
            # Build clusters: each row starts in its own cluster, then merge
            clusters: list[list[CompanySignal]] = []
            for row in t_rows:
                matched = False
                for cluster in clusters:
                    if any(is_same_company(row.company_name, r.company_name) for r in cluster):
                        cluster.append(row)
                        matched = True
                        break
                if not matched:
                    clusters.append([row])

            for cluster in clusters:
                if len(cluster) == 1:
                    continue

                canonical_name = pick_canonical([r.company_name for r in cluster])
                survivor = max(cluster, key=lambda r: len(r.company_name))
                duplicates = [r for r in cluster if r.id != survivor.id]

                survivor.mention_count = sum(r.mention_count for r in cluster)
                survivor.first_seen = min(r.first_seen for r in cluster)
                survivor.last_seen = max(r.last_seen for r in cluster)
                survivor.company_name = canonical_name
                survivor.normalised_name = normalise(canonical_name)

                for dup in duplicates:
                    logger.info(
                        "Merging '%s' → '%s' (thesis %s, combined mentions: %d)",
                        dup.company_name,
                        survivor.company_name,
                        thesis_id_str[:8],
                        survivor.mention_count,
                    )
                    await session.delete(dup)
                    merged += 1

        await session.commit()
        logger.info("Step 3: merged %d duplicate row(s)", merged)

    await engine.dispose()
    logger.info("Done. Company signals are now normalised.")


if __name__ == "__main__":
    asyncio.run(main())
