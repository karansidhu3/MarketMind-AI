from __future__ import annotations

import asyncio
import logging
import re

import feedparser
import httpx

from app.ingestion.connectors.base import BaseConnector
from app.ingestion.schema import Document, SourceType

logger = logging.getLogger(__name__)

_EDGAR_BASE = "https://www.sec.gov/cgi-bin/browse-edgar"
_SEC_ROOT   = "https://www.sec.gov"
_HEADERS = {
    "User-Agent": "MarketMind-AI/0.1 (research; contact@marketmind.ai)",
    "Accept-Encoding": "gzip, deflate",
}
_REQUEST_DELAY   = 0.5
_MAX_FILING_CHARS = 8_000


class SECEdgarConnector(BaseConnector):
    """
    Generic EDGAR daily-feed connector.

    Fetches recent filings of a given type from the EDGAR 'getcurrent' feed
    (all companies, not targeted), then follows each index link to retrieve
    the actual filing text rather than the 150-char index metadata.
    """

    source_type: SourceType = "rss"
    source_name: str = "SEC EDGAR"
    source_credibility_score: float = 0.95

    def __init__(self, filing_type: str = "8-K", count: int = 20) -> None:
        self._filing_type = filing_type
        self._url = (
            f"{_EDGAR_BASE}?action=getcurrent"
            f"&type={filing_type}"
            f"&dateb=&owner=include"
            f"&count={count}"
            f"&search_text=&output=atom"
        )

    async def fetch(self) -> list[Document]:
        async with httpx.AsyncClient(
            headers=_HEADERS, timeout=30.0, follow_redirects=True
        ) as client:
            try:
                resp = await client.get(self._url)
                resp.raise_for_status()
            except httpx.HTTPError as exc:
                logger.error("SECEdgar: failed to fetch feed %s: %s", self._url, exc)
                return []

            await asyncio.sleep(_REQUEST_DELAY)
            feed = feedparser.parse(resp.text)

            docs: list[Document] = []
            for entry in feed.entries:
                index_url = entry.get("link", "")
                primary_text = await self._fetch_primary_text(client, index_url)
                docs.append(self._entry_to_document(entry, primary_text))

        logger.info(
            "SECEdgar: fetched %d documents (%s)", len(docs), self._filing_type
        )
        return docs

    async def _fetch_primary_text(
        self, client: httpx.AsyncClient, index_url: str
    ) -> str:
        if not index_url:
            return ""
        try:
            idx_resp = await client.get(index_url)
            await asyncio.sleep(_REQUEST_DELAY)

            hrefs = re.findall(
                r'href="(/Archives/edgar/data/[^"]+\.htm)"',
                idx_resp.text,
            )
            if not hrefs:
                return ""

            doc_resp = await client.get(f"{_SEC_ROOT}{hrefs[0]}")
            await asyncio.sleep(_REQUEST_DELAY)

            text = re.sub(r"<[^>]+>", " ", doc_resp.text)
            text = re.sub(r"&#?\w+;", " ", text)
            text = re.sub(r"\s+", " ", text).strip()
            return text[:_MAX_FILING_CHARS]
        except Exception as exc:
            logger.debug("SECEdgar: could not fetch text from %s: %s", index_url, exc)
            return ""

    def _entry_to_document(
        self,
        entry: feedparser.FeedParserDict,
        primary_text: str = "",
    ) -> Document:
        import calendar
        from datetime import datetime, timezone

        seed = entry.get("link") or entry.get("id") or entry.get("title", "")

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
                "filing_type": self._filing_type,
            },
            created_at=created_at,
        )
