from __future__ import annotations

import logging
import re

from app.research.schema import ResearchResponse, SourceRef
from app.services.llm_service import LLMService
from app.services.retrieval_service import COLLECTION, RetrievalService, SearchResult

logger = logging.getLogger(__name__)

RETRIEVE_K = 15
RETURN_K = 5
MAX_EVIDENCE_CHARS = 500

_STOP_WORDS = frozenset({
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "what", "why", "how", "who", "which", "that",
    "this", "these", "those", "and", "or", "but", "in", "on", "at", "to",
    "for", "of", "with", "by", "from", "about",
})

_EXPANSION_SYSTEM = (
    "You are a financial search assistant. "
    "Given a user query, output up to 5 related financial concepts or keywords. "
    "Rules: short noun phrases only, maximum 3 words each, one per line, "
    "no punctuation, no numbering, no explanation."
)

_EXPANSION_PROMPT = "Query: {query}\n\nRelated terms:"

_SYNTHESIS_SYSTEM = (
    "You are a financial research assistant. "
    "Answer questions using only the provided context. "
    "Be concise and factual. "
    "If the context lacks sufficient information, say so explicitly."
)

_SYNTHESIS_PROMPT = """\
Question: {query}

Context:
{context}

Answer the question based solely on the context above."""


_PUNCT_RE = re.compile(r"[^\w\s]")


def _clean_expansion(raw: str) -> str:
    """
    Parse raw LLM expansion output and enforce quality constraints:
    - strip punctuation from each line
    - discard phrases longer than 3 words
    - deduplicate (case-insensitive)
    - cap at 5 terms
    Returns a single space-joined string ready to append to the query.
    """
    terms: list[str] = []
    seen: set[str] = set()
    for line in raw.strip().splitlines():
        term = _PUNCT_RE.sub("", line).strip()
        if not term:
            continue
        if len(term.split()) > 3:
            continue
        key = term.lower()
        if key in seen:
            continue
        seen.add(key)
        terms.append(term)
        if len(terms) == 5:
            break
    return " ".join(terms)


def _keyword_overlap(query: str, document: str) -> float:
    """Fraction of meaningful query tokens that appear in the document."""
    tokens = set(re.findall(r"\b\w+\b", query.lower())) - _STOP_WORDS
    if not tokens:
        return 0.0
    doc_lower = document.lower()
    matches = sum(1 for t in tokens if t in doc_lower)
    return matches / len(tokens)


class ResearchService:
    def __init__(self, llm: LLMService, retrieval: RetrievalService) -> None:
        self._llm = llm
        self._retrieval = retrieval

    async def plan(self, query: str) -> str:
        """
        Expand the query with related financial concepts before retrieval.
        Appends LLM-generated terms to the original query so the embedding
        captures a broader semantic neighbourhood. Falls back to the original
        query if generation fails.
        """
        query = query.strip()
        try:
            expansion = await self._llm.generate(
                _EXPANSION_PROMPT.format(query=query),
                system=_EXPANSION_SYSTEM,
            )
            terms = _clean_expansion(expansion)
            return f"{query} {terms}" if terms else query
        except Exception:
            logger.warning("Query expansion failed, using original query")
            return query

    async def retrieve(self, query: str, top_k: int = RETRIEVE_K, days_back: int | None = None) -> list[SearchResult]:
        await self._retrieval.ensure_collection(COLLECTION)
        embedding = await self._llm.embed(query)
        return await self._retrieval.search(COLLECTION, embedding, top_k=top_k, days_back=days_back)

    def rerank(self, query: str, results: list[SearchResult]) -> list[SearchResult]:
        """
        Rerank retrieved results by:
            weighted_score = similarity × source_credibility × keyword_overlap

        `query` should be the original user query (not the expanded form) so
        keyword matching reflects the user's actual intent.
        Returns the top RETURN_K results.
        """
        scored: list[tuple[float, SearchResult]] = []
        for r in results:
            content = r.payload.get("title", "") + " " + r.payload.get("content", "")
            credibility = float(r.payload.get("source_credibility_score", 0.5))
            overlap = _keyword_overlap(query, content)
            weighted = r.score * credibility * overlap
            scored.append((weighted, r))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [r for _, r in scored[:RETURN_K]]

    async def synthesize(self, query: str, results: list[SearchResult]) -> ResearchResponse:
        if not results:
            return ResearchResponse(
                query=query,
                answer="No relevant documents found in the knowledge base.",
                evidence=[],
                sources=[],
                confidence=0.0,
            )

        context_parts: list[str] = []
        evidence: list[str] = []
        sources: list[SourceRef] = []

        for i, r in enumerate(results, 1):
            p = r.payload
            title = p.get("title", "Untitled")
            content = p.get("content", "")
            snippet = content[:MAX_EVIDENCE_CHARS]
            metadata = p.get("metadata") or {}
            url = metadata.get("url", "") if isinstance(metadata, dict) else ""

            context_parts.append(f"[{i}] {title}: {snippet}")
            evidence.append(snippet)
            sources.append(SourceRef(
                title=title,
                source_name=p.get("source_name", ""),
                url=url,
                source_credibility_score=p.get("source_credibility_score", 0.0),
            ))

        prompt = _SYNTHESIS_PROMPT.format(
            query=query,
            context="\n\n".join(context_parts),
        )
        answer = await self._llm.generate(prompt, system=_SYNTHESIS_SYSTEM)
        confidence = round(
            min(1.0, max(0.0, sum(r.score for r in results) / len(results))),
            3,
        )

        return ResearchResponse(
            query=query,
            answer=answer,
            evidence=evidence,
            sources=sources,
            confidence=confidence,
        )
