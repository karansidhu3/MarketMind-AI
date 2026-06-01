"""
Targeted SEC EDGAR connector — fetches filings for specific companies by ticker.

The generic EDGAR daily RSS feed returns whatever happens to be filed that day,
which is mostly noise (random industries, unrelated sectors). This connector
fetches filings for a curated list of companies that are actually relevant to
our tracked theses, dramatically improving the signal-to-noise ratio.

EDGAR company-specific Atom feed URL:
  /cgi-bin/browse-edgar?action=getcompany&CIK={ticker}&type={filing_type}&output=atom

The CIK param accepts ticker symbols directly — EDGAR resolves them.

The connector fetches ACTUAL filing text, not just the EDGAR index entry.
Each Atom feed entry only contains 150–200 chars of metadata ("Filed: 2026-05-20
AccNo: ... Size: ... Item 2.02: Results of Operations"). The real document is one
HTTP hop further. We follow the index link, find the primary .htm file, and fetch
that text so the keyword-gate and LLM scoring have real content to work with.
"""
from __future__ import annotations

import asyncio
import logging
import re

import feedparser
import httpx

from app.ingestion.connectors.base import BaseConnector
from app.ingestion.schema import Document, SourceClassification, SourceType

logger = logging.getLogger(__name__)

_EDGAR_BASE = "https://www.sec.gov/cgi-bin/browse-edgar"
_SEC_ROOT   = "https://www.sec.gov"
_HEADERS = {
    "User-Agent": "MarketMind-AI/0.1 (research; contact@marketmind.ai)",
    "Accept-Encoding": "gzip, deflate",
}
# EDGAR rate-limits aggressive scrapers — 0.5s between requests keeps us safe.
# We now make up to 3 requests per filing (feed → index → document), so this
# matters more than before.
_REQUEST_DELAY = 0.5

# How much filing text to keep. Larger than worker's MAX_EMBED_CHARS (4000)
# so the keyword gate has enough text to find matches — especially for 10-Qs
# where the cover page / TOC precedes the substantive business content.
_MAX_FILING_CHARS = 8_000


class TargetedSECConnector(BaseConnector):
    """
    Fetch SEC filings for a specific list of tickers and extract actual text.

    Each ticker gets its own EDGAR company feed request, so results are
    company-specific rather than whatever the daily EDGAR fire hose returns.

    For each filing, we follow the EDGAR index link and fetch the primary
    .htm document so the keyword-threshold gate has real content to evaluate.
    """

    source_type: SourceType = "rss"
    source_name: str = "SEC EDGAR (Targeted)"
    source_credibility_score: float = 0.95
    # Sprint 12: targeted company filings are the primary disclosure source (ADR-032)
    source_classification: SourceClassification = "PRIMARY_DISCLOSURE"

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
                        await asyncio.sleep(_REQUEST_DELAY)

                        for entry in feed.entries:
                            # Follow the index link to get actual filing text.
                            # Falls back to feed summary if the fetch fails.
                            index_url = entry.get("link", "")
                            primary_text = await self._fetch_primary_text(
                                client, index_url
                            )

                            doc = self._entry_to_document(
                                entry, filing_type, ticker, primary_text
                            )
                            if doc.id not in seen_ids:
                                seen_ids.add(doc.id)
                                all_docs.append(doc)

                    except Exception as exc:
                        logger.warning(
                            "TargetedSEC: failed %s %s — %s", ticker, filing_type, exc
                        )
                    await asyncio.sleep(_REQUEST_DELAY)

        logger.info(
            "TargetedSEC: fetched %d unique documents for %d tickers",
            len(all_docs),
            len(self._tickers),
        )
        return all_docs

    async def _fetch_primary_text(
        self, client: httpx.AsyncClient, index_url: str
    ) -> str:
        """
        Fetch the actual SEC filing text from an EDGAR index URL.

        The Atom feed entry link points to the filing INDEX page, not the
        document itself. We:
          1. Fetch the index HTML and find .htm document links
          2. Fetch the first (primary) document
          3. Strip HTML tags + entities and collapse whitespace

        Returns empty string on any failure (caller falls back to feed summary).
        """
        if not index_url:
            return ""
        try:
            # Step 1: fetch the filing index
            idx_resp = await client.get(index_url)
            await asyncio.sleep(_REQUEST_DELAY)

            # Extract all .htm file paths listed in the index
            # Pattern: href="/Archives/edgar/data/.../filename.htm"
            hrefs = re.findall(
                r'href="(/Archives/edgar/data/[^"]+\.htm)"',
                idx_resp.text,
            )
            if not hrefs:
                logger.debug("TargetedSEC: no .htm documents in index %s", index_url)
                return ""

            # Step 2: fetch the primary filing document
            # The first href is typically the primary document (the 8-K, 10-Q, etc.)
            doc_url = f"{_SEC_ROOT}{hrefs[0]}"
            doc_resp = await client.get(doc_url)
            await asyncio.sleep(_REQUEST_DELAY)

            # Step 3: strip HTML — SEC filings use XBRL inline tags, standard
            # HTML, and HTML entities. Strip all of them for clean plain text.
            text = re.sub(r"<[^>]+>", " ", doc_resp.text)       # remove tags
            text = re.sub(r"&#?\w+;", " ", text)                 # remove entities
            text = re.sub(r"\s+", " ", text).strip()             # normalise whitespace

            return text[:_MAX_FILING_CHARS]

        except Exception as exc:
            logger.debug(
                "TargetedSEC: could not fetch filing text from %s: %s", index_url, exc
            )
            return ""

    def _entry_to_document(
        self,
        entry: feedparser.FeedParserDict,
        filing_type: str,
        ticker: str,
        primary_text: str = "",
    ) -> Document:
        import calendar
        from datetime import datetime, timezone

        seed = entry.get("link") or entry.get("id") or entry.get("title", "")

        # Fall back to feed summary when we couldn't fetch the actual filing.
        # This preserves UUID dedup — the same filing always gets the same ID
        # regardless of whether text extraction succeeded.
        fallback = ""
        if entry.get("content"):
            fallback = entry["content"][0].get("value", "")
        fallback = fallback or entry.get("summary", "") or entry.get("title", "")

        content = primary_text if primary_text else fallback

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
            source_classification=self.source_classification,
            # filing_ticker = the company that submitted this SEC document.
            # Used by TrajectoryService to compute ICR (distinct citing companies).
            filing_ticker=ticker,
        )
