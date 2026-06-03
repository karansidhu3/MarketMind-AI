"""
Daily ingestion scheduler.

Smart catch-up behaviour:
  On startup, checks if today's ingestion has already run (via Redis).
  If not, runs immediately rather than waiting for the next scheduled slot.
  This means the Mac just needs to be on once per day — not at a specific time.

Schedule: once per day. Configurable via INGEST_HOUR_PT (Pacific Time, default 6 AM).
Handles DST automatically — no manual UTC offset needed.

Ollama readiness check:
  Before starting ingestion, polls OLLAMA_URL/api/tags until Ollama responds.
  This handles the case where a remote Ollama host (e.g. a PC waking from sleep)
  hasn't finished loading yet when the scheduler fires.

Logs: docker compose logs ingestor --tail=50
"""
import asyncio
import importlib
import logging
import os
import sys
from datetime import datetime, date, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import httpx

sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("scheduler")

# Schedule in Pacific Time (America/Vancouver) — handles PST/PDT automatically.
# Set INGEST_HOUR_PT in docker-compose.yml or .env; default is 6 AM PT.
INGEST_HOUR_PT  = int(os.getenv("INGEST_HOUR_PT", "6"))
PT              = ZoneInfo("America/Vancouver")
REDIS_URL        = os.getenv("REDIS_URL", "redis://redis:6379")
OLLAMA_URL       = os.getenv("OLLAMA_URL", "http://ollama:11434")
BACKEND_URL      = os.getenv("BACKEND_URL", "http://backend:8000")
ADMIN_EMAIL      = os.getenv("ADMIN_EMAIL", "admin@marketmind.local")
ADMIN_PASSWORD   = os.getenv("ADMIN_PASSWORD", "marketmind")
_DONE_KEY_PREFIX = "ingest:done:"  # ingest:done:2026-05-23

# How long to wait for Ollama to become ready before giving up
_OLLAMA_WAIT_SECONDS = int(os.getenv("OLLAMA_WAIT_SECONDS", "300"))  # 5 minutes


def _done_key(for_date: date | None = None) -> str:
    d = for_date or date.today()
    return f"{_DONE_KEY_PREFIX}{d.isoformat()}"


async def _already_ran_today(redis) -> bool:
    return bool(await redis.exists(_done_key()))


async def _mark_done(redis) -> None:
    # TTL of 25h so the key expires naturally after tomorrow's run
    await redis.set(_done_key(), "1", ex=25 * 3600)


async def _wait_for_ollama() -> bool:
    """Poll Ollama until it responds or timeout is reached.

    Returns True if Ollama is ready, False if it timed out.
    Useful when Ollama runs on a remote host (e.g. a PC waking from sleep)
    and needs a moment to load before the first embed/generate call.
    """
    url = f"{OLLAMA_URL}/api/tags"
    deadline = asyncio.get_event_loop().time() + _OLLAMA_WAIT_SECONDS
    attempt = 0
    async with httpx.AsyncClient(timeout=10.0) as client:
        while asyncio.get_event_loop().time() < deadline:
            try:
                r = await client.get(url)
                if r.status_code == 200:
                    if attempt > 0:
                        logger.info("Ollama ready after %d attempt(s)", attempt + 1)
                    return True
            except Exception:
                pass
            attempt += 1
            logger.info("Waiting for Ollama to be ready (attempt %d)…", attempt)
            await asyncio.sleep(10)
    logger.error("Ollama did not respond within %ds — aborting ingestion", _OLLAMA_WAIT_SECONDS)
    return False


async def _prewarm_explain_caches() -> None:
    """Call POST /feed/regenerate to pre-generate all explain caches.

    Fires immediately after ingestion while Ollama (PC) is still on.
    By the time the user opens the app in the morning, Explain mode loads
    instantly from Redis rather than waiting for a fresh LLM call.
    """
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            # Get JWT token
            r = await client.post(
                f"{BACKEND_URL}/auth/login",
                json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            )
            r.raise_for_status()
            token = r.json()["access_token"]

            # Trigger feed regeneration — backend fires _warm_explain_caches
            # as a background task (unified explain + per-thesis narratives)
            r = await client.post(
                f"{BACKEND_URL}/feed/regenerate",
                headers={"Authorization": f"Bearer {token}"},
            )
            r.raise_for_status()
            logger.info("Feed regenerated — explain caches pre-warming in background")
    except Exception:
        logger.warning("Could not pre-warm explain caches — Explain will generate on first open")


async def _run_ingestion() -> int:
    import ingest
    importlib.reload(ingest)
    return await ingest.main()


async def _invalidate_feed_cache(redis, for_date: date | None = None) -> None:
    """Delete today's feed cache keys directly via Redis.

    Avoids the HTTP + auth round-trip to the backend. The next time any user
    loads the feed, the backend will regenerate it from the freshly ingested corpus.
    Also clears the explain-summary and unified-explain caches so the LLM
    narratives are re-synthesised from the new data.
    """
    d = (for_date or date.today()).isoformat()
    keys = [
        f"feed:generated:{d}",
        f"feed:explain-summary:{d}",
        f"feed:unified-explain:{d}",
    ]
    deleted = await redis.delete(*keys)
    logger.info("Feed cache invalidated — %d key(s) cleared for %s", deleted, d)


def _next_scheduled() -> datetime:
    """Next occurrence of INGEST_HOUR_PT (Pacific Time), returned as UTC datetime."""
    now_pt = datetime.now(PT)
    candidate_pt = now_pt.replace(hour=INGEST_HOUR_PT, minute=0, second=0, microsecond=0)
    if candidate_pt <= now_pt:
        candidate_pt += timedelta(days=1)
    return candidate_pt.astimezone(timezone.utc)


async def main() -> None:
    import redis.asyncio as aioredis
    redis = aioredis.from_url(REDIS_URL, decode_responses=True)

    logger.info("Scheduler started (preferred run time: %02d:00 PT / America/Vancouver)", INGEST_HOUR_PT)

    try:
        while True:
            # ── Catch-up check ───────────────────────────────────────────────
            # Run immediately if today's ingestion hasn't happened yet.
            # This handles the case where the Mac was off at the scheduled time.
            if not await _already_ran_today(redis):
                logger.info("Today's ingestion has not run yet — starting now")
                try:
                    if not await _wait_for_ollama():
                        logger.error("Skipping ingestion — Ollama unreachable. Will retry in 1 hour")
                        await asyncio.sleep(3600)
                        continue
                    count = await _run_ingestion()
                    await _mark_done(redis)
                    logger.info("Ingestion complete — %d document(s) ingested", count)
                    # Invalidate feed cache so it regenerates with today's signals,
                    # then pre-warm all explain caches while Ollama is still running.
                    await _invalidate_feed_cache(redis)
                    await _prewarm_explain_caches()
                except (Exception, BaseException) as exc:
                    # Catch BaseException too — asyncio.CancelledError and other
                    # non-Exception base classes can propagate through network failures
                    # (DNS timeouts, connection resets mid-run) and kill the process.
                    # Log the crash type so the cause is visible in `docker logs ingestor`.
                    logger.exception(
                        "Ingestion failed (%s) — will retry in 1 hour",
                        type(exc).__name__,
                    )
                    await asyncio.sleep(3600)
                    continue
                # Loop back to the top immediately after a successful run.
                # If the run spanned midnight, today's date has changed and
                # _already_ran_today() will return False for the new day,
                # triggering a catch-up run rather than skipping it.
                continue

            # ── Wait for next scheduled slot ─────────────────────────────────
            # Poll every 60 seconds instead of one long sleep — asyncio.sleep()
            # with multi-hour durations is unreliable in Docker for Mac (the
            # event loop can stall and never wake up). Short sleeps keep the
            # loop responsive and ensure we don't miss the scheduled window.
            next_run = _next_scheduled()
            next_run_pt = next_run.astimezone(PT)
            wait_seconds = (next_run - datetime.now(timezone.utc)).total_seconds()
            logger.info(
                "Next run: %s PT (%s UTC, in %.0f minutes)",
                next_run_pt.strftime("%Y-%m-%d %H:%M %Z"),
                next_run.strftime("%H:%M"),
                wait_seconds / 60,
            )
            while datetime.now(timezone.utc) < next_run:
                await asyncio.sleep(60)
            # After waking, loop back to the top — _already_ran_today() checks
            # the current date, so if we slept past midnight a catch-up run
            # fires immediately.

    finally:
        await redis.aclose()


if __name__ == "__main__":
    asyncio.run(main())
