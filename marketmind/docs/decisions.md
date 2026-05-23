# Architecture Decisions

---

## ADR-001 — Local-first architecture

**Decision:** Use local models and local infrastructure whenever possible.

**Reason:**
- Minimise operating cost
- Avoid API dependency
- Allow experimentation

---

## ADR-002 — FastAPI backend

**Decision:** Use FastAPI.

**Reason:**
- Async support
- Strong typing
- Clean API structure

---

## ADR-003 — Next.js frontend

**Decision:** Use Next.js App Router.

**Reason:**
- Modern React ecosystem
- Simple routing
- Scalable structure

---

## ADR-004 — Ollama for local LLM execution

**Decision:** Use Ollama.

**Reason:**
- Local inference
- Simple deployment
- Model flexibility

---

## ADR-005 — Standard model selection

**Decision:** Use the following models:

| Role | Model |
|---|---|
| Embeddings | `nomic-embed-text` |
| Reasoning | `qwen3:8b` |

**Reason:**
- Strong local performance
- Low cost
- Acceptable hardware requirements

**Note:** codebase defaulted to `llama3.2` during Sprint 3 — corrected in Sprint 4.

---

## ADR-006 — Qdrant vector storage

**Decision:** Use Qdrant.

**Reason:**
- Vector search
- Scalable design
- Better production path than Chroma

---

## ADR-007 — UUID5 document deduplication

**Decision:** Generate deterministic document IDs from source URLs.

**Reason:**
- Idempotent ingestion
- Safe re-ingestion
- Avoids duplicate vectors

---

## ADR-008 — Single Qdrant collection

**Decision:** Use a single Qdrant collection: `marketmind_documents`.

**Reason:**
- Reduces MVP complexity
- Avoids premature structure

---

## ADR-009 — Docker-first workflow

**Decision:** Use Docker for development.

**Reason:**
- Consistent environments
- Easier setup
- Avoids machine-specific issues

---

## ADR-010 — Postgres for persistent state

**Decision:** Use Postgres (SQLAlchemy async + asyncpg) for theses, evidence,
company signals, supply chain links, insider transactions, and daily feeds.

**Reason:**
- Qdrant stores vectors; Postgres stores the intelligence layer on top
- Thesis confidence, momentum, and company radar all require relational queries
- Redis is for caching; Postgres is the source of truth

**Schema:** `create_all()` at startup. Alembic migrations deferred until schema stabilises.

---

## ADR-011 — Keyword threshold before LLM scoring

**Decision:** Only call the LLM for sentiment classification when a document's
keyword overlap with a thesis exceeds 15% (`KEYWORD_THRESHOLD = 0.15`).

**Reason:**
- Running LLM sentiment on every document × every thesis is O(docs × theses) expensive
- Keyword pre-filter keeps LLM calls proportional to actual signal density
- Threshold tunable without changing architecture

---

## ADR-012 — Thesis confidence as supporting / total evidence ratio

**Decision:** Confidence = `supporting_count / total_evidence_count`, not cosine similarity mean.

**Reason:**
- Cosine mean is meaningless to an investor
- Supporting ratio is interpretable: "74% of evidence supports this thesis"
- Naturally degrades as opposing evidence accumulates (fights confirmation bias)

---

## ADR-013 — Supply chain extraction scope

**Decision:** Run supply chain LLM extraction only on 10-K/10-Q filings and documents
with credibility ≥ 0.85 and content length ≥ 400 chars.

**Reason:**
- 10-K/10-Q contain the most detailed supplier/customer language
- Running on every document wastes LLM compute with low yield
- Credibility + length filters approximate "worth extracting from"

---

## ADR-014 — Feed caching strategy

**Decision:** Cache daily feed in Redis with key `feed:generated:{date}`, TTL 25h.

**Reason:**
- Feed generation requires multiple DB queries + one LLM call
- 25h TTL ensures yesterday's feed is still readable after midnight until new one generates
- `POST /feed/regenerate` allows manual invalidation without restart

---

## ADR-015 — Epistemic tiers instead of numeric uncertainty propagation

**Decision:** Classify all objects as Primary, Derived, or Synthesized rather than
propagating numeric confidence scores through inference layers.

**Reason:**
- LLM-generated confidence floats are uncalibrated — multiplying them produces
  precise-looking numbers that mean nothing
- Systematic model errors compound in one direction and are invisible in aggregated scores
- Epistemic tiers travel with every object and survive into the presentation layer
  so users can always distinguish what a document explicitly stated from what
  the system inferred across documents

**Tiers:**
- **Primary** — what a document explicitly states, anchored to a source filing
- **Derived** — extracted from a document by inference (sentiment, relationship, entity)
- **Synthesized** — inferred across multiple derived records (thesis signals, opportunities)

---

## ADR-016 — Thesis capture scope vs hypothesis statement are separate concepts

**Decision:** A thesis has two distinct components that must not be conflated:
a stable **hypothesis statement** (the investment claim in plain language) and
an evolving **capture scope** (keywords used to find relevant evidence).

**Reason:**
- Expanding keywords to find more evidence is different from expanding the
  investment claim being made
- Conflating them causes silent scope drift and confidence inflation
- Evidence should always be evaluated against the hypothesis, not just
  matched by the keyword list

**Implication:** Keyword edits alone do not change the hypothesis. The hypothesis
statement requires deliberate, versioned revision.

---

## ADR-017 — Evidence immutability and scope fingerprinting

**Decision:** Evidence records are immutable. Each evidence record carries a
snapshot of the keyword set (scope fingerprint) under which it was scored.
Re-scoring the historical corpus against a changed thesis is an explicit
user-initiated action, not automatic.

**Reason:**
- Retroactively re-interpreting historical evidence under a new scope changes
  what the confidence score measures without changing the number
- The scope fingerprint makes drift visible — you can see exactly which keyword
  set produced each evidence record
- Overwriting old scores destroys the ability to ask "how confident was I in
  this thesis as I originally defined it?"

---

## ADR-018 — Corroboration threshold before relationships are treated as established

**Decision:** A supply chain relationship extracted from one document is a
candidate. The same relationship independently extracted from three or more
documents across different companies or quarters is established.

**Reason:**
- Single-document extraction false positive rate is too high to trust immediately
- Independent corroboration is the most reliable signal that the relationship
  is real rather than a model hallucination or misclassification
- Corroboration count is more meaningful than any LLM-generated confidence float

**Status:** Architecture decision only — not yet reflected in data model.

---

## ADR-019 — Company name normalisation is required before radar is trustworthy

**Decision:** Company signals must be normalised to a canonical name before
being stored. "NVIDIA Corp", "Nvidia Corporation", and "NVIDIA" are the same
company and must resolve to the same record.

**Reason:**
- Without normalisation, mention counts fragment across name variants silently
- The company radar's core value (surfacing companies by accumulated signal)
  is directly undermined by fragmented counts
- This is a data quality issue that compounds over time and cannot be
  retroactively fixed without a full re-ingestion

**Status:** Implemented. `ingestion/normalise.py` provides `normalise()`,
`is_same_company()`, and `pick_canonical()`. `_upsert_company_signal()` deduplicates
per-thesis using `is_same_company`. The radar query groups by `normalised_name`
in Python and applies `pick_canonical()` for the display name.

---

## ADR-020 — Radar ranks by unique source documents, not raw mention count

**Decision:** The company radar sorts by `COUNT(DISTINCT document_id)` per
normalised company name, not `SUM(mention_count)`.

**Reason:**
- Raw mention count is trivially inflated by a single verbose document. A 10-K
  that mentions NVIDIA 40 times produces a `mention_count` of 40 from one filing.
  A small grid hardware supplier mentioned once each in 5 independent 10-Ks has
  `mention_count=5` but `doc_count=5`.
- The radar's purpose is to surface companies appearing across *independent*
  sources — each unique document is one independent observation.
- Large caps will always have high raw mention counts. `doc_count` doesn't
  eliminate them but it raises the bar: they need to be the *subject* of many
  filings, not just a passing reference in one.

**Implementation:** `ThesisService.get_company_radar()` fetches all company_signals,
groups by `normalised_name` in Python, and aggregates `len({s.document_id for s in signals})`
as `doc_count`. The frontend radar component uses `doc_count` for the relative-strength
bar width and as the primary displayed metric.

---

## ADR-021 — `/no_think` prefix disables qwen3 chain-of-thought on latency-sensitive paths

**Decision:** Prepend `/no_think\n\n` to all LLM prompts where `think=False`
(the default). Pass `think=True` only for tasks that explicitly benefit from
extended reasoning.

**Reason:**
- qwen3:8b uses extended chain-of-thought reasoning by default, generating hundreds
  of tokens of internal reasoning before the actual response. This adds 60–180 seconds
  per call — unacceptable for feed summaries, sentiment classification, company
  extraction, and research synthesis.
- Ollama 0.24.0 does not support `{"think": false}` in the API options object.
  The `/no_think` prefix in the prompt text is qwen3's documented mechanism for
  disabling chain-of-thought at the prompt level.
- With `/no_think`, generation time drops to 5–20 seconds for most tasks while
  maintaining acceptable quality for classification and summarization.

**Implementation:** `OllamaLLMService.generate()` prepends `/no_think\n\n` when
`think=False` (default). All current callers use the default. Reserved for future
use: pass `think=True` for tasks like deep thesis analysis where reasoning quality
matters more than latency.
