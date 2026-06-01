"""
Constraint vocabulary gate — Sprint 12 (ADR-034).

A company mention in a PRIMARY_DISCLOSURE document only counts as an ICR-meaningful
cross-citation if the document discusses the subject company in the context of
supply chain constraint language.

Without this gate, ICR over-counts: a company that appears in 30 SEC filings as
a passing customer reference ("our customers include NVIDIA") would score the same
as one that appears in 30 filings explicitly as a supply bottleneck. The constraint
gate ensures we're counting structurally significant mentions, not passing references.

Usage:
    from app.ingestion.constraint import passes_constraint_gate

    # Gate company extraction in ThesisService.score_document()
    if passes_constraint_gate(doc.content):
        companies = await self._extract_companies(doc)
"""
from __future__ import annotations

# Supply chain constraint language. These terms indicate that a document discusses
# capacity, supply availability, procurement stress, or production constraints —
# the conditions under which a company *being mentioned* by another company's filing
# carries signal about the mentioned company's position in the supply chain.
#
# Terms are matched case-insensitively against the full document text.
# A single match is sufficient to pass — we want sensitivity over specificity here.
# The key insight: any of these terms in a PRIMARY_DISCLOSURE document means the
# filing company is discussing supply-side conditions, which is exactly when
# a mention of another company carries cross-citation signal.
CONSTRAINT_TERMS: tuple[str, ...] = (
    # Lead time language
    "lead time",
    "lead-time",
    "lead times",
    # Inventory / backlog
    "backlog",
    "backlogs",
    "backorder",
    "inventory",
    # Supply availability
    "shortage",
    "shortages",
    "allocation",
    "allocations",
    "constrained",
    "constraint",
    "constraints",
    "supply chain",
    "supply disruption",
    "supply shortage",
    # Capacity
    "capacity",
    "bottleneck",
    "bottlenecks",
    "throughput",
    # Production / manufacturing
    "production ramp",
    "manufacturing capacity",
    "procurement",
    "sole source",
    "single source",
    "component shortage",
    "wafer",
    "foundry",
    # Demand-side pressure
    "demand surge",
    "demand exceeds",
    "waitlist",
    # Delivery / timing
    "delivery delay",
    "delivery time",
    "extended delivery",
    "deferred",
    "order book",
    "queue time",
)

# Lower-cased once at module load so the hot path is a simple substring scan.
_TERMS_LOWER: tuple[str, ...] = tuple(t.lower() for t in CONSTRAINT_TERMS)


def passes_constraint_gate(text: str) -> bool:
    """
    Return True if the document text contains at least one constraint-language term.

    Called once per PRIMARY_DISCLOSURE document during thesis scoring.
    If False: Evidence is still created (for thesis scoring / confidence history),
              but no CompanySignals are generated from this document.
              That means the document will not contribute to ICR for any entity.
    If True:  Company extraction runs and CompanySignals are created, making
              those companies eligible for ICR cross-citation counting.

    The text passed should be the full document content — up to MAX_EMBED_CHARS
    (8000 chars for targeted EDGAR). Passing only the 600-char excerpt would miss
    constraint language that appears later in the filing body.
    """
    if not text:
        return False
    text_lower = text.lower()
    return any(term in text_lower for term in _TERMS_LOWER)
