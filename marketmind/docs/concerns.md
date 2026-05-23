# MarketMind — Known Concerns and Proposed Solutions

This document is a living record of identified architectural and product concerns.
It is updated as new issues are identified or existing ones are resolved.

Each entry has:
- **Severity** — High / Medium / Low
- **Status** — Open / Partially addressed / Resolved
- **Root cause** — why the problem exists structurally
- **Proposed solution** — the design-level response (not necessarily implemented yet)

---

## C-001 — Knowledge quality vs retrieval quality

**Severity:** High
**Status:** Partially addressed

**Root cause:**
The retrieval pipeline (query expansion, reranking, synthesis) is more
sophisticated than the current corpus warrants. Improving retrieval logic
produces diminishing returns when the bottleneck is what has been ingested,
not how it is ranked. EDGAR's public feed returns whatever companies filed
that day — mostly retail, healthcare, and financial services — not the AI
infrastructure or power grid companies the theses care about.

**Proposed solution:**
Source targeting, not volume. Ingesting more irrelevant documents does not
help. The fix is connectors aimed at filings from specific sectors and
companies known to operate in thesis-relevant areas. Retrieval improvements
should be paused until corpus relevance improves. Meaningful improvement in
research quality is unlikely below 300-400 genuinely on-topic documents per
thesis area.

---

## C-002 — Confirmation bias from seeded theses

**Severity:** Medium
**Status:** Open

**Root cause:**
The system only generates evidence for documents that match an existing thesis.
A document about rare earth supply chain constraints is ingested and embedded
in Qdrant but never scores against any thesis, generates no evidence, and
never appears in the feed. Genuinely new emerging themes are invisible until
someone creates a thesis for them. This is a discovery gap rather than classic
confirmation bias — the seeded theses are grounded in verifiable physical
constraints, not opinions, so the bias risk is lower than it first appears.
The real risk is that the system is blind to signals outside its defined scope.

**Proposed solution:**
A separate unsupervised clustering pass over ingested documents that identifies
recurring themes not covered by any active thesis. This would surface candidate
new theses rather than requiring the user to anticipate them. Distinct from the
existing thesis tracking pipeline — this is a discovery mechanism, not a
scoring mechanism.

---

## C-003 — Relationship extraction reliability

**Severity:** High
**Status:** Open

**Root cause:**
The supply chain extractor asks the LLM to simultaneously identify two companies,
classify the relationship type, determine directionality (who is supplier,
who is customer), and extract a supporting quote. Each step has independent
failure probability. Specific false positives that will occur in practice:

- "We face competition from Company B" → stored as partner relationship
- "We were acquired by Company B" → stored as supplier relationship
- Two companies mentioned in the same paragraph with no actual relationship → stored as related
- Correct relationship that has since ended → still present in graph as current

The deeper problem is systematic errors. If the model consistently
misclassifies competitive mentions as partnerships, that bias accumulates
in one direction across every document and is invisible because the data
looks internally consistent. Random errors cancel out over time; systematic
errors compound.

The confidence float the LLM returns is uncalibrated and should not be
treated as a probability.

**Proposed solution:**
- Apply the corroboration threshold from ADR-018: single-document extractions
  are candidates, not facts. Three independent sources make a relationship established.
- Add relationship type validation: before storing, check the evidence text
  contains language consistent with the relationship type.
- Flag relationships as stale if the source document is older than 18 months
  with no corroboration from more recent filings.
- Surface low-confidence or single-source relationships for user confirmation
  rather than treating them as established facts.

---

## C-004 — Unknown company surfacing quality

**Severity:** High
**Status:** Open

**Root cause:**
NVIDIA, Microsoft, Apple, and Amazon will appear in almost every ingested
document. The company radar ranks by mention count, which means large caps
will permanently dominate the top positions regardless of how many documents
are ingested. The radar's stated purpose — surfacing unknown companies before
analysts cover them — is structurally undermined by the current design.

**Proposed solution:**
The radar needs a reference set of known/prominent companies to filter or
discount. Two practical approaches:

1. Maintain a static exclusion list of large caps (S&P 500 or similar) that
   are discounted or hidden from the radar by default.
2. Weight by mention specificity rather than mention count — a company
   mentioned as the central subject of a filing is more interesting than a
   company mentioned in passing alongside 20 others.

Both approaches require some notion of company prominence that doesn't
currently exist in the data model.

---

## C-005 — Signal inflation risk

**Severity:** Medium
**Status:** Open

**Root cause:**
The daily feed synthesis prompt always requests 3-4 sentences. When 2-3
documents weakly matched a thesis on a quiet day, the LLM will write a
summary that makes them sound like meaningful signals. The framing becomes
disproportionate to the evidence. The keyword threshold (15% overlap) is
also low enough that most ingestion days will produce some evidence records
even from tangential documents.

The system cannot currently determine "nothing important changed today"
because it has no baseline for what constitutes signal vs noise.

**Proposed solution:**
- Introduce minimum evidence thresholds before a thesis signal appears in
  the feed at all (e.g. at least 2 supporting records with score > 0.3).
- The momentum calculation (this week vs prior week) is the right structural
  approach — comparing against recent baseline rather than absolute counts.
  Extend it: if both this week and prior week are low absolute counts, flag
  as low-confidence regardless of the ratio.
- Allow the feed summary to explicitly say "no meaningful signals today"
  rather than forcing synthesis when evidence is thin.

---

## C-006 — Data model evolution risk

**Severity:** Medium
**Status:** Open

**Root cause:**
Several current structures will become painful to change as the product matures:

- `keywords` on theses — the entire scoring pipeline depends on keyword overlap.
  If thesis matching moves toward embedding similarity, all existing scoring
  logic needs replacing and the keyword column becomes misleading.
- `evidence.sentiment` as a string — adding sentiment gradation (weakly
  supporting, strongly opposing) requires migrating all existing records.
- `supply_chain_links` parent/child model — too flat. Relationships have
  temporal context, magnitude, and confidence decay that the current
  structure discards entirely.
- `company_signals.company_name` as unstructured text — see C-007.

Structures that can safely remain flexible:
- `daily_feeds` (JSON snapshot, schema changes don't matter)
- `evidence.excerpt` (plain text, no structure)
- Qdrant document ID references (loosely coupled by design)

**Proposed solution:**
Schema migrations should be planned before the corpus grows large enough
that re-ingestion becomes expensive. The keyword column should have a
schema version marker so the scoring logic knows how to interpret it.
Sentiment values should be an explicit enum from the start rather than
free text.

---

## C-007 — Company name normalisation

**Severity:** High
**Status:** Open

**Root cause:**
"NVIDIA Corp", "Nvidia Corporation", and "NVIDIA" are stored as three
separate rows in `company_signals`. Mention counts fragment across name
variants silently. No error is thrown. The company radar shows lower counts
for every company than actually exist, and different variants of the same
company may appear as separate entries.

This is the most concrete near-term data quality issue. It compounds with
every ingestion run and cannot be retroactively fixed without re-processing
all existing company signals.

**Proposed solution:**
A normalisation step before writing to `company_signals`:
1. Strip legal suffixes (Corp, Inc, Ltd, LLC, Holdings, etc.)
2. Normalise casing and punctuation
3. Optionally maintain a canonical name table mapping variants to a primary name

The canonical name table becomes more valuable over time and could eventually
map to tickers for companies where a match is known.

---

## C-008 — Uncertainty propagation through inference layers

**Severity:** High
**Status:** Partially addressed (by ADR-015)

**Root cause:**
The system treats progressively inferred objects as progressively stronger
knowledge. Document → extracted sentiment → extracted relationship →
supply chain graph → opportunity signal. Each layer adds probabilistic error.
Small extraction errors compound into highly confident but incorrect signals.

Numeric confidence propagation (multiplying floats across layers) creates
false precision — LLM-generated confidence scores are uncalibrated and
multiplying them produces a precise-looking number that means nothing.

The more dangerous failure mode is systematic errors rather than random ones.
If the LLM consistently misclassifies a relationship type, that bias
accumulates in one direction and is invisible in aggregated scores.

**Proposed solution:**
Apply the epistemic tier framework from ADR-015. Every object carries its
tier (Primary / Derived / Synthesized) throughout the system. Downstream
signals explicitly show how many primary sources underlie them. Users can
distinguish what a document stated from what the system inferred. Provenance
should be bidirectionally traversable — from any signal back to the exact
document passage that contributed to it.

---

## C-009 — Thesis semantic drift and confidence inflation

**Severity:** High
**Status:** Open

**Root cause:**
When thesis keywords are edited, the scope silently changes. Evidence scored
under the original keyword set coexists with evidence scored under the
expanded set. The confidence score (supporting / total) becomes a blend of
two different measurement instruments without any indication that this has
happened.

The inflation mechanism: as scope expands, more documents match, and the
system tends to classify ambiguous matches as supporting. The denominator
grows and the numerator tends to grow with it. Confidence rises — not because
the thesis is better supported, but because it now covers more ground.

This failure mode is uniquely dangerous because it is silent. The confidence
number looks healthy. Evidence count grows. The feed continues to generate
signals. Nothing breaks. The user's conviction in the thesis increases based
on a metric that is measuring something different from what it measured six
months earlier.

**Proposed solution:**
Apply ADR-016 and ADR-017:
- Separate the hypothesis statement (stable investment claim) from the capture
  scope (evolving keyword list). Keyword edits alone do not change the hypothesis.
- Scope fingerprinting: each evidence record carries a snapshot of the keyword
  set under which it was scored. Drift becomes visible rather than silent.
- Re-scoring historical evidence against a changed scope is an explicit action,
  not automatic. Old scores are preserved alongside new ones.
- Thesis confidence should be computable per-scope-version, not just in aggregate.

---

## C-010 — Temporal decay of evidence and stale relationships

**Severity:** Medium
**Status:** Open

**Root cause:**
Evidence from 18 months ago is weighted identically to evidence from yesterday.
Supply chain relationships extracted from 2023 filings may no longer be current
— contracts end, suppliers change, companies exit markets — but the system has
no mechanism to detect this. The absence of a relationship being mentioned is
not evidence the relationship ended, so stale relationships accumulate silently.

For theses, this means a thesis that was strongly supported during peak AI hype
in 2024 will maintain high confidence even if 2025 filings show the buildout
is decelerating. Confidence can only go up as evidence accumulates; it has no
natural decay.

**Proposed solution:**
- Evidence records should carry a recency weight that decays over a configurable
  window (e.g. half-weight after 6 months, quarter-weight after 12 months).
- Supply chain relationships should be flagged as stale if the source document
  is older than 18 months with no corroborating mention in more recent filings.
- Contradiction detection: if later filings explicitly contradict an earlier
  relationship or evidence record, flag the conflict rather than letting both
  sit in the system simultaneously. Contradictions are often more informative
  than confirmations.

---

## C-011 — Feed does not link to specific evidence records

**Severity:** Medium
**Status:** Open

**Root cause:**
The daily feed thesis signals show aggregated counts ("4 new supporting signals
for AI Infrastructure") but do not reference the specific evidence record IDs
that produced them. Provenance is broken at the feed layer. A user cannot
trace a feed signal back to the exact document passage that generated it.

**Proposed solution:**
Feed thesis signals should carry a list of evidence record IDs alongside the
count. This enables bidirectional traversal from signal to source without
requiring the feed to store the full content of each evidence record.

---

## Summary Table

| ID | Concern | Severity | Status |
|----|---------|----------|--------|
| C-001 | Knowledge quality vs retrieval quality | High | Partially addressed |
| C-002 | Confirmation bias / discovery gap | Medium | Open |
| C-003 | Relationship extraction reliability | High | Open |
| C-004 | Unknown company surfacing quality | High | Open |
| C-005 | Signal inflation risk | Medium | Open |
| C-006 | Data model evolution risk | Medium | Open |
| C-007 | Company name normalisation | High | Open |
| C-008 | Uncertainty propagation | High | Partially addressed |
| C-009 | Thesis semantic drift | High | Open |
| C-010 | Temporal decay / stale relationships | Medium | Open |
| C-011 | Feed provenance gap | Medium | Open |
