"""
Daily ingestion scheduler.

Smart catch-up behaviour:
  On startup, checks if today's ingestion has already run (via Redis).
  If not, runs immediately rather than waiting for the next scheduled slot.
  This means the Mac just needs to be on once per day — not at a specific time.

Schedule: once per day. Configurable via INGEST_HOUR_UTC (used as the
preferred time when the machine is already on, not a hard requirement).

Logs: docker compose logs ingestor --tail=50
"""
import asyncio
import importlib
import logging
import os
import sys
from datetime import datetime, date, timedelta, timezone
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("scheduler")

INGEST_HOUR_UTC = int(os.getenv("INGEST_HOUR_UTC", "6"))
REDIS_URL       = os.getenv("REDIS_URL", "redis://redis:6379")
BACKEND_URL     = os.getenv("BACKEND_INTERNAL_URL", "http://localhost:8000")
_DONE_KEY_PREFIX = "ingest:done:"  # ingest:done:2026-05-23


def _done_key(for_date: date | None = None) -> str:
    d = for_date or date.today()
    return f"{_DONE_KEY_PREFIX}{d.isoformat()}"


async def _already_ran_today(redis) -> bool:
    return bool(await redis.exists(_done_key()))


async def _mark_done(redis) -> None:
    # TTL of 25h so the key expires naturally after tomorrow's run
    await redis.set(_done_key(), "1", ex=25 * 3600)


async def _run_ingestion() -> int:
    import ingest
    importlib.reload(ingest)
    return await ingest.main()


async def _regenerate_feed() -> None:
    """Invalidate today's feed cache so the next GET /feed call regenerates it."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(f"{BACKEND_URL}/feed/regenerate")
            if resp.status_code in (200, 202):
                logger.info("Feed cache invalidated — will regenerate on next request")
            else:
                logger.warning("Feed regenerate returned %d — feed may be stale", resp.status_code)
    except Exception:
        logger.warning("Could not reach backend to regenerate feed — cache will expire naturally")


def _next_scheduled() -> datetime:
    """Next occurrence of INGEST_HOUR_UTC, always in the future."""
    now = datetime.now(timezone.utc)
    candidate = now.replace(hour=INGEST_HOUR_UTC, minute=0, second=0, microsecond=0)
    if candidate <= now:
        candidate += timedelta(days=1)
    return candidate


async def main() -> None:
    import redis.asyncio as aioredis
    redis = aioredis.from_url(REDIS_URL, decode_responses=True)

    logger.info("Scheduler started (preferred run time: %02d:00 UTC)", INGEST_HOUR_UTC)

    try:
        while True:
            # ── Catch-up check ───────────────────────────────────────────────
            # Run immediately if today's ingestion hasn't happened yet.
            # This handles the case where the Mac was off at the scheduled time.
            if not await _already_ran_today(redis):
                logger.info("Today's ingestion has not run yet — starting now")
                try:
                    count = await _run_ingestion()
                    await _mark_done(redis)
                    logger.info("Ingestion complete — %d document(s) ingested", count)
                    # Invalidate feed cache so it regenerates with today's signals
                    await _regenerate_feed()
                except Exception:
                    logger.exception("Ingestion failed — will retry in 1 hour")
                    await asyncio.sleep(3600)
                    continue
                # Loop back to the top immediately after a successful run.
                # If the run spanned midnight, today's date has changed and
                # _already_ran_today() will return False for the new day,
                # triggering a catch-up run rather than skipping it.
                continue

            # ── Wait for next scheduled slot ─────────────────────────────────
            # Loop back immediately after a run completes so we re-check the
            # date. If a run spanned midnight, today's date has changed and we
            # need to run again for the new day rather than waiting until
            # tomorrow's scheduled slot.
            next_run = _next_scheduled()
            wait_seconds = (next_run - datetime.now(timezone.utc)).total_seconds()
            logger.info(
                "Next run: %s (in %.0f minutes)",
                next_run.strftime("%Y-%m-%d %H:%M UTC"),
                wait_seconds / 60,
            )
            await asyncio.sleep(wait_seconds)
            # After waking, loop back to the top — _already_ran_today() checks
            # the current date, so if we slept past midnight a catch-up run
            # fires immediately.

    finally:
        await redis.aclose()


if __name__ == "__main__":
    asyncio.run(main())
