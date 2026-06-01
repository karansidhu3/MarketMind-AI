from __future__ import annotations

import calendar
import logging
from datetime import datetime, timezone

import feedparser
import httpx

from app.ingestion.connectors.base import BaseConnector
from app.ingestion.schema import Document, SourceClassification, SourceType

logger = logging.getLogger(__name__)

_HEADERS = {"User-Agent": "MarketMind-AI/0.1 (research; contact@marketmind.ai)"}


class GenericRSSConnector(BaseConnector):
    source_type: SourceType = "rss"
    source_name: str = "RSS"
    source_credibility_score: float = 0.50
    # Sprint 12: sector trade press is TRADE_PRESS; subclasses may override (ADR-032)
    source_classification: SourceClassification = "TRADE_PRESS"

    def __init__(
        self,
        url: str,
        *,
        source_name: str | None = None,
        credibility_score: float | None = None,
    ) -> None:
        self._url = url
        if source_name is not None:
            self.source_name = source_name
        if credibility_score is not None:
            self.source_credibility_score = credibility_score

    async def fetch(self) -> list[Document]:
        async with httpx.AsyncClient(headers=_HEADERS, timeout=30.0, follow_redirects=True) as client:
            try:
                resp = await client.get(self._url)
                resp.raise_for_status()
            except httpx.HTTPError as exc:
                logger.error("Failed to fetch RSS feed %s: %s", self._url, exc)
                return []
        feed = feedparser.parse(resp.text)
        return [self._entry_to_document(entry) for entry in feed.entries]

    def _entry_to_document(self, entry: feedparser.FeedParserDict) -> Document:
        seed = entry.get("link") or entry.get("id") or entry.get("title", "")
        return Document(
            id=Document.make_id(seed),
            title=entry.get("title", ""),
            source_name=self.source_name,
            source_type=self.source_type,
            source_credibility_score=self.source_credibility_score,
            content=self._extract_content(entry),
            metadata={
                "url": entry.get("link", ""),
                "guid": entry.get("id", ""),
                "author": entry.get("author", ""),
            },
            created_at=self._parse_date(entry),
            source_classification=self.source_classification,
            # TRADE_PRESS sources have no filing company — filing_ticker stays None
        )

    @staticmethod
    def _extract_content(entry: feedparser.FeedParserDict) -> str:
        if entry.get("content"):
            return entry["content"][0].get("value", "")
        return entry.get("summary", "") or entry.get("title", "")

    @staticmethod
    def _parse_date(entry: feedparser.FeedParserDict) -> datetime:
        for key in ("published_parsed", "updated_parsed"):
            parsed = entry.get(key)
            if parsed:
                try:
                    return datetime.fromtimestamp(calendar.timegm(parsed), tz=timezone.utc)
                except Exception:
                    pass
        return datetime.now(timezone.utc)
