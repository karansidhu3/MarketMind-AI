"""
Daily ingestion scheduler.

Runs ingest.py once per day at INGEST_HOUR_UTC (default 06:00 UTC).
Designed to run as a long-lived Docker container — restarts pick up the
correct next-run time automatically.

Logs appear in: docker compose logs ingestor --tail=50
"""
import asyncio
import logging
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("scheduler")

INGEST_HOUR_UTC = int(os.getenv("INGEST_HOUR_UTC", "6"))


def _next_run() -> datetime:
    now = datetime.now(timezone.utc)
    candidate = now.replace(hour=INGEST_HOUR_UTC, minute=0, second=0, microsecond=0)
    if candidate <= now:
        candidate += timedelta(days=1)
    return candidate


async def main() -> None:
    logger.info("Scheduler started — daily ingestion at %02d:00 UTC", INGEST_HOUR_UTC)

    while True:
        next_run = _next_run()
        wait_seconds = (next_run - datetime.now(timezone.utc)).total_seconds()
        logger.info("Next ingestion run: %s (in %.0f minutes)", next_run.isoformat(), wait_seconds / 60)

        await asyncio.sleep(wait_seconds)

        logger.info("Starting scheduled ingestion run")
        try:
            import ingest
            # Re-import forces a fresh run each time
            import importlib
            importlib.reload(ingest)
            result = await ingest.main()
            logger.info("Scheduled ingestion complete — %d document(s) ingested", result)
        except Exception:
            logger.exception("Scheduled ingestion failed — will retry tomorrow")


if __name__ == "__main__":
    asyncio.run(main())
