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

## ADR-029 — Ingestor feed invalidation via direct Redis key deletion

**Decision:** After each daily ingestion run, the scheduler invalidates the feed
cache by directly deleting the three Redis keys rather than calling
`POST /feed/regenerate` via HTTP.

**Keys deleted:**
```
feed:generated:{date}
feed:explain-summary:{date}
feed:unified-explain:{date}
```

**Reason:**
- The original approach called `http://localhost:8000/feed/regenerate` from inside
  the ingestor container. This fails silently: `localhost` inside a Docker container
  refers to the container itself, not the backend service. The correct hostname is
  `backend`, but even with that fix the endpoint requires a JWT auth token that the
  ingestor doesn't hold.
- Direct Redis key deletion is simpler, has no network dependency, requires no auth,
  and achieves the same result: the next page load triggers fresh feed synthesis
  from the newly ingested corpus.
- The backend's `FeedService.get_feed()` checks for the Redis key first; if absent,
  it regenerates and re-caches. No changes to the backend were needed.

**Implementation:** `scripts/scheduler.py` `_invalidate_feed_cache()`. Called
immediately after a successful ingestion run completes and `_mark_done()` is set.

---

## ADR-030 — Multi-thesis LLM scoring (planned, not yet implemented)

**Decision (planned):** Replace the current per-thesis LLM scoring loop with a
single LLM call per document that scores all theses simultaneously.

**Current behaviour:** `ThesisService.score_document()` iterates over all active
theses, checks the keyword gate (15% threshold) per thesis, and for each passing
thesis makes a separate `api/generate` call to classify sentiment. A document
relevant to 3 theses makes 3 serial LLM calls, each taking 30–60 seconds.

**Proposed change:** After keyword gating, collect all theses that passed for a
given document and issue a single prompt:
```
Given this document, classify the sentiment for each of the following investment
theses as SUPPORTING, OPPOSING, or NEUTRAL. Return JSON.

Thesis 1: <name> — <description>
Thesis 2: ...

Document: <text>
```
Parse the structured response and write one evidence record per thesis in one pass.

**Expected impact:**
- A document triggering 3 theses goes from 3 × ~45s = 135s → 1 × ~60s = 60s.
- At 280 targeted docs per connector with ~40% keyword hit rate across multiple
  theses, this could cut the 5–7hr daily ingestion run to ~2hrs.
- No change to data quality — same model, same classification task, same evidence
  schema.

**Tradeoffs:**
- Prompt engineering required — structured JSON output with per-thesis verdicts
  needs reliable parsing. One malformed response drops scoring for all theses on
  that document.
- Slightly longer per-call latency as the prompt is larger.
- Needs fallback: if the combined response fails to parse, retry as individual calls.

**Status:** Planned. Implement after observing data quality from the first full
targeted ingestion run (2026-05-26). See also: `KEYWORD_THRESHOLD` in
`app/thesis/service.py` (currently 0.15) — raising to 0.25 is a secondary lever
if multi-thesis scoring alone is insufficient.

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

---

## ADR-031 — ICR replaces confidence score as the primary intelligence metric

**Decision:** The primary metric surfaced to users is the **Independent Citation
Rate (ICR)** — the number of structurally independent companies that have
referenced an entity in primary legal disclosures, per week, tracked over time.
Confidence score (supporting / total evidence, ADR-012) is removed from all
primary product surfaces.

**Definition of ICR:**
- One *independent citation* = one company filing (8-K, 10-Q, 10-K) from a
  company that is not the entity being cited, referencing the entity in a context
  relevant to a signal context (constraint language present)
- ICR is measured as independent citation count per week, tracked as a time series
- The trajectory of ICR — its slope, acceleration, and first-appearance date —
  is the primary signal

**Why confidence score fails:**
- Computed from LLM sentiment labels applied to 600-char excerpts
- The 15% keyword pre-filter biases inputs toward relevance — documents that pass
  are likely to be labeled "supporting" regardless of actual content
- Inflates toward 70–80% by construction for any active thesis over time
- Measures evidence accumulation, not thesis correctness
- Cannot distinguish "this company is a genuine supply chain bottleneck" from
  "this company is mentioned frequently in tech press"

**Why ICR is better:**
- Objective: count of independent filings, no LLM classification involved
- Self-correcting: if a company stops being cited, ICR falls
- Interpretable: "Vertiv was cited by 9 independent companies this week" is
  a fact, not an inference
- Accumulates genuine signal: the 12-week trajectory requires historical corpus
  and cannot be replicated by a one-shot query
- Distinguishes confirmation (multiple independent companies) from noise
  (one company mentioned repeatedly)

**What was built:**
- `Evidence` gets `source_classification` field: PRIMARY_DISCLOSURE or TRADE_PRESS
- `Evidence` gets `filing_ticker` field: the ticker of the company that filed the document
  (NULL for TRADE_PRESS; populated for targeted SEC filings from Sprint 12 onward)
- ICR computed dynamically by `TrajectoryService` as `COUNT(DISTINCT filing_ticker)`
  from PRIMARY_DISCLOSURE Evidence rows joined to CompanySignal on document_id
- Note: `CompanySignal.independent_citation_count` was planned but not implemented;
  ICR is always computed at query time, never stored as a field
- Confidence score retained in DB for backward compatibility but not surfaced
- All UI components showing confidence % are removed or replaced with ICR trajectory

---

## ADR-032 — Source type classification: PRIMARY_DISCLOSURE vs TRADE_PRESS

**Decision:** Every ingested document is classified at ingest time as either
`PRIMARY_DISCLOSURE` or `TRADE_PRESS`. These types are stored on the Evidence
record and used to weight ICR computation.

**PRIMARY_DISCLOSURE** (weight: 1.0)
- SEC EDGAR targeted filings (8-K, 10-Q, 10-K) for curated watchlist tickers
- Legally required, filed under SEC liability, highest factual reliability
- Cross-company citations in these filings carry maximum signal weight

**TRADE_PRESS** (weight: 0 for ICR)
- Breaking Defense, Utility Dive, EE Times
- Editorial content from vertical trade publications
- Higher precision than general press; includes opposing signals
- Does NOT count toward ICR — `TrajectoryService` filters `source_classification = 'PRIMARY_DISCLOSURE'` exclusively
- TRADE_PRESS evidence still ingested: contributes to radar doc_count, evidence trail, and thesis scoring
- Rationale: editorial coverage follows filings; counting it would inflate ICR with derivative signal

**REMOVED (not ingested):**
- Generic EDGAR daily feed (any industry) — dominated by targeted connector
- Form 4 (insider transactions) — commodity signal, ADR-025
- Yahoo Finance, MarketWatch, Seeking Alpha — always late, low precision
- The Register, Ars Technica — broad tech, low thesis precision

**Implementation:** `source_type` field on Evidence. `IngestionWorker` sets
source_type from connector metadata at ingest time. ICR queries filter by
source_type and apply weights.

---

## ADR-033 — Corpus quality cleanse: selective removal of low-precision sources

**Decision:** Evidence rows generated from generic EDGAR, Form 4, Yahoo Finance,
MarketWatch, Seeking Alpha, The Register, and Ars Technica are deleted from the
corpus in a one-time surgical cleanse. Company signal rows with no remaining
evidence after cleanse are also deleted.

**What is retained:**
- All evidence from Targeted EDGAR (source_name = 'SEC EDGAR (Targeted)')
- All evidence from sector trade press (Breaking Defense, Utility Dive, EE Times)
- All trajectory history computed from retained sources

**What is lost:**
- Phantom company signals generated by keyword coincidence from noisy sources
- Inflated doc_counts from generic EDGAR fire hose
- Large-cap dominance artifacts (NVIDIA appearing in every AI article)

**Why this is acceptable:**
- The genuine trajectory data — companies that appeared repeatedly in targeted
  filings and sector trade press — survives intact
- Phantom signals created by noise are not a loss; they are a liability
- A cleaner corpus of 2,000 high-quality documents produces more reliable
  trajectories than 10,000 documents with 6,000 off-topic

**How to run:** `scripts/corpus_cleanse.py` (to be implemented in Phase 0).
Steps: delete evidence by source_name, delete orphaned company_signals,
recompute trajectory snapshots from retained evidence.

**Ongoing quality rule:** Only PRIMARY_DISCLOSURE and TRADE_PRESS sources
are ingested going forward. No new noisy sources without explicit ADR amendment.

---

## ADR-034 — Constraint vocabulary gate replaces topic keyword gate

**Decision:** The keyword threshold gate (`KEYWORD_THRESHOLD = 0.15`) is replaced
by a two-layer filter:

**Layer 1 — Entity presence check (existing):**
Is a watchlist company mentioned in this document? If not, skip.

**Layer 2 — Constraint signal check (new):**
Does the document contain constraint language — words indicating a binding
operational constraint, not just topic presence?

Constraint vocabulary (applies across all signal contexts):
```
lead time, delivery timeline, backlog, constrained, allocation, shortage,
supply constraint, capacity constraint, sold out, production limit,
extended delivery, procurement challenge, cannot meet demand, order backlog,
limited availability, supply chain disruption, fulfilment delay
```

A document that mentions Vertiv (entity present) and "backlog has extended
to 14 weeks" (constraint language present) scores as a constraint citation.

A document that mentions Vertiv in passing without constraint language does
not advance ICR, even if it passes the keyword threshold.

**Reason:**
- The current keyword gate detects topic presence, not signal quality
- A 10-Q mentioning "data center cooling" neutrally is not evidence of a
  supply constraint thesis
- Constraint vocabulary is the signal: it indicates that an operational limit
  is being acknowledged in a legal disclosure
- This reduces false positive ICR inflation significantly

**Implementation:** New `constraint_check(text, entity_name)` function in
`app/ingestion/normalise.py` or a new `app/ingestion/constraint.py`.
Returns True if entity is present AND constraint vocabulary matches.
A document failing constraint check is still embedded in Qdrant (for corpus
search) but does not create an Evidence row or advance ICR.

---

## ADR-035 — Signal Map replaces Feed + Radar as primary product surface

**Decision:** The opening surface of the product is the Signal Map — a single
ranked view of all tracked companies sorted by ICR acceleration (steepest
week-over-week growth rate). The separate Feed and Radar surfaces are removed.

**Signal Map shows:**
- Companies ranked by ICR acceleration (not absolute count, not doc_count)
- Per company: 12-week ICR sparkline (trajectory is the primary visual)
- Per company: independent citation count this week + change from last week
- Per company: first appeared date + most recent primary filing excerpt
- Filter chips at top: one per signal context (AI Infra, Semis, Grid, Defense, DC)

**What is removed:**
- Daily Feed as a primary surface (LLM narrative moves to secondary toggle)
- Separate Radar page/section (merged into Signal Map)
- Thesis grid / Themes page as a primary surface (becomes filter lenses)
- Confidence score display everywhere
- Momentum badges (rising/flat/falling) everywhere

**LLM narrative status:** available behind an "Analysis" toggle at the bottom
of the Signal Map. Never auto-expanded. Never the first thing rendered.

**Reason:**
- The moat is trajectory. The first screen should show trajectories.
- Separating Feed and Radar created two surfaces that competed for the same
  user attention without clear distinction
- The LLM narrative was the dominant visual element on the Feed, crowding out
  the signals that were actually informative
- Acceleration rate (slope) is more actionable than absolute count (height):
  a company going 0→9 this week is more interesting than one that has been
  at 20/week for 3 months

---

## ADR-036 — Company surface becomes a full page, not a slide-out panel

**Decision:** Company deep-dives are rendered as full `/companies/[name]` pages,
not as a slide-out drawer. The `CompanyPanel` component and `CompanyContext`
are deprecated.

**Full company page contains:**
1. **Trajectory timeline** — full history since first_seen, weekly ICR,
   x-axis is time, y-axis is independent citation count. Annotations at
   major acceleration events.
2. **Citation sources** — which companies filed documents citing this entity,
   with filing type, date, and excerpt. Sorted by recency. Independent source
   count is the key number displayed.
3. **Signal context membership** — which signal contexts include this company,
   with independent citation count per context (not confidence %).
4. **Portfolio status** — one line: held / not held.

**Why full page:**
- A slide-out panel has ~420px width. The trajectory timeline needs full width
  to communicate the historical story — the entire reason the company matters.
- The citation network (which companies are independently citing this entity)
  cannot be legibly rendered in a narrow panel.
- URL-routable company pages are shareable, bookmarkable, and testable.
- The panel architecture (global CompanyContext, React portal) is complex
  infrastructure for a component that should be a page.

**Migration:** Existing company name links update from `openCompany()` to
`router.push('/companies/[normalised_name]')` via `CompanyNavigator` in `AppShell`.

**Exception — Demo:** `CompanyPanel` and `CompanyContext` are intentionally
preserved in `DemoShell`. The demo uses a slide-out drawer with static company
data (`DEMO_COMPANY_DETAIL`) — the drawer pattern is correct for the demo context
(no routing, no auth, static payload). `CompanyPanel` should not be deleted from
the codebase while the demo route exists.

---

## ADR-037 — Trajectory inflection alerts replace static threshold alerts

**Decision:** Company alerts trigger on **ICR inflection** — a significant
week-over-week acceleration in independent citation rate — rather than a
static document count threshold.

**Inflection definition:**
- Company ICR this week is ≥ 2× the 4-week average ICR for that company
- AND this week's ICR is ≥ 3 independent citations (prevents noise on
  companies with a near-zero baseline)
- AND the company was not already in an accelerating state last week
  (prevents re-alerting on sustained acceleration)

**Why static thresholds fail:**
- A threshold of "alert me when doc_count reaches 20" is set once and becomes
  stale. A company that has been at doc_count 18 for three months and ticks to
  20 is not a signal. A company that went from 2 to 11 in one week is.
- Static thresholds require manual calibration per company and do not adapt
  to the company's own baseline.
- ICR inflection is self-normalizing: the baseline is the company's own
  4-week average, so a company with naturally high citation frequency needs
  a proportionally larger spike to trigger.

**User-facing change:** Users no longer set a numeric threshold. They mark
companies for alert monitoring. The system detects inflection automatically.
A single alert type: "[Company] — ICR inflected: [N] independent citations
this week vs. [avg] average (4-week baseline)."

---

## ADR-038 — Valuation axis, kept permanently separate from ICR

**Decision:** Add a second signal — PEG ratio and price relative to 52-week
high — as its own axis, computed and displayed independently from ICR.
Never combined into a single score.

**Reason:**
ICR answers "is this company becoming more structurally load-bearing." It
has no concept of price. A company can show a textbook-perfect ICR
inflection while already being priced as if that inflection is guaranteed
to continue for years — the "already priced for perfection" case, not the
"still has room" case. ICR alone cannot distinguish these, and treating an
inflection as automatically actionable without checking valuation would be
a real, not hypothetical, failure mode of this product's own stated goal
(finding companies early, not after the market already has).

**Why not blend it into one number:**
ADR-031 already established that a single confidence score inflates
misleadingly by construction. The identical failure mode applies to a
blended "opportunity score" combining ICR and valuation: it would launder
away the one distinction — real momentum vs. already priced in — that this
axis exists to preserve. Two labels, shown side by side, never merged.

**Data source:** Finnhub free tier. Confirmed directly (live test call, not
assumed from documentation) that `stock/metric` returns `forwardPEG`,
`forwardPE`, and 52-week high/low with no paid plan required. Forward
EPS/revenue *estimates* are paywalled on the free tier — this axis
deliberately does not depend on them.

**Scope boundary:** This is not a price-tracking feature. No live price,
no charting, no news. The user already has a brokerage app for that
(Wealthsimple, in practice). This axis exists only to answer whether an
ICR signal is still actionable, nothing more — matching the same
minimalism standard the rest of the product already holds itself to
(no confidence scores, no momentum from volume, no buy/sell framing).

**Label logic (first pass, expect tuning once real data accumulates):**
- `Room left` — PEG < 1.0 and price < 90% of 52-week high
- `Priced in` — PEG < 1.0 and price ≥ 90% of 52-week high
- `Stretched` — PEG > 2.0 and price ≥ 90% of 52-week high
- `Unclear` — anything else, including missing data

Every label carries the literal numbers behind it in its reasoning string.
No label is ever shown without the PEG value and price-vs-high percentage
that produced it — same "show your work" standard ICR's evidence trail
already holds.
