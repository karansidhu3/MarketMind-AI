"""
Targeted SEC EDGAR connector — fetches filings for specific companies by ticker.

The generic EDGAR daily RSS feed returns whatever happens to be filed that day,
which is mostly noise (random industries, unrelated sectors). This connector
fetches filings for a curated list of companies that are actually relevant to
our tracked theses, dramatically improving the signal-to-noise ratio.

EDGAR company-specific Atom feed URL:
  /cgi-bin/browse-edgar?action=getcompany&CIK={ticker}&type={filing_type}&output=atom

The CIK param accepts ticker symbols directly — EDGAR resolves them.
"""
from __future__ import annotations

import asyncio
import logging

import feedparser
import httpx

from app.ingestion.connectors.base import BaseConnector
from app.ingestion.schema import Document, SourceType

logger = logging.getLogger(__name__)

_EDGAR_BASE = "https://www.sec.gov/cgi-bin/browse-edgar"
_HEADERS = {
    "User-Agent": "MarketMind-AI/0.1 (research; contact@marketmind.ai)",
    "Accept-Encoding": "gzip, deflate",
}
# EDGAR rate-limits aggressive scrapers — 0.4s between requests keeps us safe
_REQUEST_DELAY = 0.4


class TargetedSECConnector(BaseConnector):
    """
    Fetch SEC filings for a specific list of tickers.

    Each ticker gets its own EDGAR company feed request, so results are
    company-specific rather than whatever the daily EDGAR fire hose returns.
    """

    source_type: SourceType = "rss"
    source_name: str = "SEC EDGAR (Targeted)"
    source_credibility_score: float = 0.95

    def __init__(
        self,
        tickers: list[str],
        filing_types: list[str] | None = None,
        count_per_company: int = 5,
    ) -> None:
        self._tickers = tickers
        self._filing_types = filing_types or ["8-K", "10-Q"]
        self._count = count_per_company

    async def fetch(self) -> list[Document]:
        all_docs: list[Document] = []
        seen_ids: set[str] = set()

        async with httpx.AsyncClient(
            headers=_HEADERS, timeout=30.0, follow_redirects=True
        ) as client:
            for ticker in self._tickers:
                for filing_type in self._filing_types:
                    url = (
                        f"{_EDGAR_BASE}"
                        f"?action=getcompany&CIK={ticker}"
                        f"&type={filing_type}&dateb=&owner=include"
                        f"&count={self._count}&search_text=&output=atom"
                    )
                    try:
                        resp = await client.get(url)
                        resp.raise_for_status()
                        feed = feedparser.parse(resp.text)
                        for entry in feed.entries:
                            doc = self._entry_to_document(entry, filing_type, ticker)
                            if doc.id not in seen_ids:
                                seen_ids.add(doc.id)
                                all_docs.append(doc)
                    except Exception as exc:
                        logger.warning(
                            "TargetedSEC: failed %s %s — %s", ticker, filing_type, exc
                        )
                    # Respect EDGAR rate limits
                    await asyncio.sleep(_REQUEST_DELAY)

        logger.info(
            "TargetedSEC: fetched %d unique documents for %d tickers",
            len(all_docs),
            len(self._tickers),
        )
        return all_docs

    def _entry_to_document(
        self,
        entry: feedparser.FeedParserDict,
        filing_type: str,
        ticker: str,
    ) -> Document:
        import calendar
        from datetime import datetime, timezone

        seed = entry.get("link") or entry.get("id") or entry.get("title", "")
        content = ""
        if entry.get("content"):
            content = entry["content"][0].get("value", "")
        content = content or entry.get("summary", "") or entry.get("title", "")

        created_at = datetime.now(timezone.utc)
        for key in ("published_parsed", "updated_parsed"):
            parsed = entry.get(key)
            if parsed:
                try:
                    created_at = datetime.fromtimestamp(
                        calendar.timegm(parsed), tz=timezone.utc
                    )
                    break
                except Exception:
                    pass

        return Document(
            id=Document.make_id(seed),
            title=entry.get("title", ""),
            source_name=self.source_name,
            source_type=self.source_type,
            source_credibility_score=self.source_credibility_score,
            content=content,
            metadata={
                "url": entry.get("link", ""),
                "guid": entry.get("id", ""),
                "filing_type": filing_type,
                "target_ticker": ticker,
            },
            created_at=created_at,
        )
