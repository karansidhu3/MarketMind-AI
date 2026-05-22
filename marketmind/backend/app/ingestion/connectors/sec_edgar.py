from __future__ import annotations

import feedparser

from app.ingestion.connectors.rss import GenericRSSConnector
from app.ingestion.schema import Document

_EDGAR_BASE = "https://www.sec.gov/cgi-bin/browse-edgar"


class SECEdgarConnector(GenericRSSConnector):
    source_name = "SEC EDGAR"
    source_credibility_score = 0.95

    def __init__(self, filing_type: str = "8-K", count: int = 20) -> None:
        url = (
            f"{_EDGAR_BASE}?action=getcurrent"
            f"&type={filing_type}"
            f"&dateb=&owner=include"
            f"&count={count}"
            f"&search_text=&output=atom"
        )
        super().__init__(url)
        self._filing_type = filing_type

    def _entry_to_document(self, entry: feedparser.FeedParserDict) -> Document:
        doc = super()._entry_to_document(entry)
        doc.metadata["filing_type"] = self._filing_type
        return doc
