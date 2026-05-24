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

---

## ADR-022 — Explain/Data mode replaces Brief/Full density toggle

**Decision:** The feed's two-mode toggle is "Explain" and "Data", not "Brief" and
"Full". The difference is interpretation, not information density.

**Data mode:** current technical cards — confidence %, evidence counts, momentum
label, company tags.

**Explain mode:** per-thesis LLM-generated narrative interpreting the trend using
corpus history, not just today's documents. Output is 2-3 plain English sentences
that a non-finance reader would understand. The LLM synthesises direction and
duration ("rising for two weeks, not weakening") rather than summarising today's
filings.

**Reason:**
- "Brief" just makes cards smaller — same jargon, less space. Not useful.
- The real gap is interpretation: most users opening the feed don't know what
  "74% confidence, momentum rising, 12↑ 4↓" means in practice.
- Explain mode uses the temporal data that accumulates over months — it cannot
  be produced on day 1. This makes it a compounding feature, not a display option.
- Scoped to feed page only. Thesis detail page retains full data view.

---

## ADR-023 — Portfolio integration uses thesis alignment framing, not buy/sell

**Decision:** When portfolio holdings are connected, MarketMind surfaces thesis
alignment scores and exposure gaps. It does not generate buy or sell recommendations.

**Alignment framing:** "Your portfolio is 68% aligned with your active theses.
Power Grid thesis rising but you have minimal exposure in this sector. Powell
Industries has appeared in 12 independent documents — you don't hold this."

**Reason:**
- Buy/sell recommendations require precision the confidence score does not have
  (C-009, C-010 both unresolved). Generating "buy this" from an imprecise signal
  erodes trust in everything else.
- Alignment gaps are accurate and honest: the corpus *is* showing something about
  a sector. Whether to act on it is the user's decision.
- Thesis alignment framing is unique — no financial terminal maps your holdings
  to an independently tracked corpus of sector signals. This is the differentiation.
- Local-first (ADR-001): holdings are stored in Postgres on the user's machine.
  No data leaves the local environment.

---

## ADR-024 — Supply chain extraction deprioritised

**Decision:** No further development on supply chain LLM extraction or the
supply chain graph. Existing code is retained but not extended.

**Reason:**
- C-003 (relationship extraction reliability) remains unresolved. Systematic LLM
  errors accumulate in one direction and are invisible because the data looks
  internally consistent.
- The graph grows with every ingestion cycle but has no mechanism to remove false
  positives or flag stale relationships. After 12 months it is larger and less
  trustworthy simultaneously.
- The relationships with genuine value (unknown tier-2 supplier to 4 thesis-relevant
  OEMs) require both corpus quality (C-001 unresolved) and extraction precision
  (C-003 unresolved) that the system cannot currently provide.
- The relationships that are reliably extracted (NVIDIA → TSMC) are public knowledge.
- Development time is better invested in the portfolio layer and Explain mode,
  both of which compound cleanly.

**What stays:** The supply chain tab on thesis detail page, the supply chain
endpoint, and the extractor code remain in place. They are not actively broken.
They just won't be extended.

---

## ADR-025 — Insider transaction tracking deprioritised

**Decision:** Form 4 ingestion and insider cluster detection are not extended.
Existing code is retained.

**Reason:**
- Commodity signal — available on every financial terminal and data provider.
- Zero differentiation from existing products.
- The companies MarketMind aims to surface (unknown sector suppliers) are not
  generating Form 4 filings that create novel signals.
- Infrastructure complexity (separate connector, cluster detection logic, feed
  section) for no unique value.

---

## ADR-027 — Company deep-dive uses global React context, not prop drilling

**Decision:** The company detail panel is mounted once inside `AppShell` and
controlled via a global `CompanyContext`. Any component anywhere in the app
calls `openCompany(normalisedName)` to trigger it. Company names are not
wrapped in routable links — they open the panel in-place.

**Reason:**
- Company names appear in at least four places: radar rows, feed signal company
  tags, "New on Radar" cards, and portfolio gap rows. Prop-drilling an
  `onCompanyClick` callback through every component tree that contains a company
  name is fragile and couples unrelated components.
- A global context mounted once in `AppShell` makes any component a potential
  trigger point with a single import. Adding a new click target requires one line.
- `normalised_name` (the DB key from `company_signals`) is the stable identifier
  passed through context. Display names and tickers are fetched from the API and
  should not be used as keys (they vary across name variants).

**Critical implementation note:**
`useCompany()` must be called inside a component that renders *within* the
`CompanyProvider` tree — i.e., inside `AppShell`'s children. Page-level
components (`FeedPage`, `PortfolioPage`) are the *parents* of `AppShell` in
JSX, so calling `useCompany()` at the page level gets the default no-op context.
The fix: call the hook in leaf components (`GapRow`, `SignalCard`, `NewCompanyName`)
which render inside the provider, not in the page component that wraps `AppShell`.

---

## ADR-028 — Feed timeline scrubber keeps radar live while feed is historical

**Decision:** When viewing a historical feed date, the company radar on the right
always reflects the current corpus state. Only the feed content (thesis signals,
new companies, summary) changes with the selected date.

**Reason:**
- The radar is a live view of everything MarketMind has ever ingested. It answers
  "what companies are accumulating signal right now?" Historical radar snapshots
  are not stored and would be expensive to reconstruct.
- The feed answers "what changed on a given day?" These are two different questions.
  Mixing historical feed content with a historical radar would require storing the
  full radar state daily — not worth the storage cost for a feature used occasionally.
- Practically: users browsing historical feeds want to compare thesis signals
  across days, not reconstruct what the radar looked like. The current radar
  provides context for what companies are now significant, which is additive.

**Historical mode behaviour:**
- Regenerate button hidden (no point regenerating a past date)
- Explain toggle hidden (explain uses today's corpus, not the archived snapshot)
- Hero shows amber "archived" badge instead of cached/live indicator
- `GET /feed/dates` returns available dates; scrubber only steps to existing dates

---

## ADR-026 — Corpus targeting is the highest-leverage infrastructure investment

**Decision:** Future ingestion work should prioritise targeted sector connectors
over volume. Ingesting more irrelevant documents does not improve intelligence
quality.

**Reason:**
- C-001 (knowledge quality vs retrieval quality) is the existential concern.
  All thesis tracking, radar, confidence scoring, and portfolio alignment run on
  the corpus. If the corpus is mostly irrelevant documents, all downstream
  intelligence is built on noise.
- EDGAR's public feed returns whatever companies filed that day — mostly retail,
  healthcare, and financial services — not AI infrastructure or power grid companies.
- 300-400 genuinely on-topic documents per thesis area produce meaningfully better
  intelligence than 10,000 documents of which 5% are relevant.
- Targeted connectors: specific company 10-K/10-Q filing RSS feeds, sector-specific
  ETF constituent lists as ingestion targets, curated company watchlists.
