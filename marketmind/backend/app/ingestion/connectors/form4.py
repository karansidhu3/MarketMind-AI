"""
Form 4 connector — SEC EDGAR insider transaction filings.

Form 4 is filed within 2 days of an insider buy or sell. Clusters of Form 4
filings from executives at the same company are one of the strongest free
early signals available.

RSS entry title format: "4 - COMPANY NAME (CIK) (Issuer)"
"""
from __future__ import annotations

import re

import feedparser

from app.ingestion.connectors.rss import GenericRSSConnector
from app.ingestion.schema import Document

_EDGAR_BASE = "https://www.sec.gov/cgi-bin/browse-edgar"
_COMPANY_RE = re.compile(r"^4\s*-\s*(.+?)\s*\(\d+\)", re.IGNORECASE)


class Form4Connector(GenericRSSConnector):
    source_name = "SEC EDGAR Form 4"
    source_credibility_score = 0.95

    def __init__(self, count: int = 40) -> None:
        url = (
            f"{_EDGAR_BASE}?action=getcurrent"
            f"&type=4"
            f"&dateb=&owner=include"
            f"&count={count}"
            f"&search_text=&output=atom"
        )
        super().__init__(url)

    def _entry_to_document(self, entry: feedparser.FeedParserDict) -> Document:
        doc = super()._entry_to_document(entry)
        doc.metadata["filing_type"] = "4"

        # Parse company name from title — "4 - Tesla Inc (0000046080) (Issuer)"
        title = entry.get("title", "")
        match = _COMPANY_RE.match(title)
        if match:
            doc.metadata["issuer_name"] = match.group(1).strip()

        # Enrich content so thesis scoring has something to work with
        summary = entry.get("summary", "")
        doc.content = f"Insider transaction filing (Form 4)\nCompany: {doc.metadata.get('issuer_name', 'Unknown')}\n{summary}"

        return doc
