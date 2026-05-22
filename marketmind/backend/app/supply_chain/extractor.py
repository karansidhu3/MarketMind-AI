"""
Supply chain relationship extractor.

Runs on 10-K and 10-Q filings (and any document scoring above credibility threshold)
to extract supplier/customer/partner relationships and store them as graph edges.

This is how MarketMind finds unknown companies — if enough 10-Ks mention
"Preformed Line Products" as a grid hardware supplier, it surfaces in the radar
before any analyst covers it.
"""
from __future__ import annotations

import json
import logging
import re

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db.models import SupplyChainLink
from app.ingestion.schema import Document
from app.services.llm_service import LLMService

logger = logging.getLogger(__name__)

_FILING_TYPES_IN_SCOPE = {"10-K", "10-Q"}
_MIN_CREDIBILITY = 0.85
_MIN_CONTENT_LENGTH = 400

_EXTRACT_PROMPT = """\
Extract supply chain relationships and bottleneck signals from this document.
Return ONLY valid JSON — no explanation, no markdown fences.

Document: {title}
Text: {text}

JSON format:
{{
  "relationships": [
    {{"parent": "Company A", "child": "Company B", "type": "supplier|customer|partner", "evidence": "short quote", "confidence": 0.0-1.0}}
  ],
  "bottlenecks": [
    {{"description": "brief description", "companies": ["name1"]}}
  ]
}}

If nothing found, return {{"relationships": [], "bottlenecks": []}}"""

_JSON_RE = re.compile(r"\{.*\}", re.DOTALL)


class SupplyChainExtractor:
    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession],
        llm: LLMService,
    ) -> None:
        self._factory = session_factory
        self._llm = llm

    def should_extract(self, doc: Document) -> bool:
        filing_type = doc.metadata.get("filing_type", "")
        if filing_type in _FILING_TYPES_IN_SCOPE:
            return True
        if doc.source_credibility_score >= _MIN_CREDIBILITY and len(doc.content) >= _MIN_CONTENT_LENGTH:
            return True
        return False

    async def extract_and_store(self, doc: Document) -> int:
        """Extract relationships from doc and store new links. Returns count stored."""
        if not self.should_extract(doc):
            return 0

        raw = await self._call_llm(doc)
        if not raw:
            return 0

        stored = 0
        async with self._factory() as session:
            for rel in raw.get("relationships", []):
                parent = rel.get("parent", "").strip()
                child = rel.get("child", "").strip()
                rel_type = rel.get("type", "supplier").strip()
                evidence = rel.get("evidence", "")[:400]
                confidence = float(rel.get("confidence", 0.5))

                if not parent or not child or parent == child:
                    continue
                if rel_type not in ("supplier", "customer", "partner"):
                    rel_type = "supplier"

                # Deduplicate: same pair + type already exists for this document
                exists = (
                    await session.execute(
                        select(SupplyChainLink).where(
                            SupplyChainLink.parent_company == parent,
                            SupplyChainLink.child_company == child,
                            SupplyChainLink.source_document_id == doc.id,
                        )
                    )
                ).scalar_one_or_none()

                if not exists:
                    session.add(
                        SupplyChainLink(
                            parent_company=parent,
                            child_company=child,
                            relationship_type=rel_type,
                            evidence_text=evidence,
                            source_document_id=doc.id,
                            confidence=confidence,
                        )
                    )
                    stored += 1

            await session.commit()

        logger.info(
            "Supply chain: %d relationship(s) stored from '%s'",
            stored,
            doc.title[:60],
        )
        return stored

    async def _call_llm(self, doc: Document) -> dict | None:
        try:
            response = await self._llm.generate(
                _EXTRACT_PROMPT.format(
                    title=doc.title,
                    text=doc.content[:2000],
                )
            )
            match = _JSON_RE.search(response)
            if not match:
                return None
            return json.loads(match.group())
        except (json.JSONDecodeError, Exception):
            logger.warning("Supply chain extraction failed for doc %s", doc.id)
            return None
