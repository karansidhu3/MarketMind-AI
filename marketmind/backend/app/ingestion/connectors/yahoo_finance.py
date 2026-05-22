from __future__ import annotations

import logging

import feedparser
import httpx

from app.ingestion.connectors.rss import GenericRSSConnector, _HEADERS
from app.ingestion.schema import Document

logger = logging.getLogger(__name__)

_TOP_STORIES_URL = "https://finance.yahoo.com/rss/topfinstories"
_TICKER_FEED_URL = "https://feeds.finance.yahoo.com/rss/2.0/headline?s={ticker}&region=US&lang=en-US"


class YahooFinanceConnector(GenericRSSConnector):
    source_name = "Yahoo Finance"
    source_credibility_score = 0.75

    def __init__(self, tickers: list[str] | None = None) -> None:
        self._tickers = tickers or []
        url = _TOP_STORIES_URL if not self._tickers else _TICKER_FEED_URL.format(ticker=self._tickers[0])
        super().__init__(url)

    async def fetch(self) -> list[Document]:
        if not self._tickers:
            return await super().fetch()

        all_docs: list[Document] = []
        async with httpx.AsyncClient(headers=_HEADERS, timeout=30.0, follow_redirects=True) as client:
            for ticker in self._tickers:
                url = _TICKER_FEED_URL.format(ticker=ticker)
                try:
                    resp = await client.get(url)
                    resp.raise_for_status()
                    feed = feedparser.parse(resp.text)
                    for entry in feed.entries:
                        doc = self._entry_to_document(entry)
                        doc.metadata["ticker"] = ticker
                        all_docs.append(doc)
                except httpx.HTTPError as exc:
                    logger.error("Failed to fetch Yahoo Finance feed for %s: %s", ticker, exc)
        return all_docs
