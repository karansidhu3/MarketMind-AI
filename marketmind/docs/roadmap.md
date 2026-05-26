# MarketMind Roadmap

## Vision

MarketMind is a persistent investment intelligence platform that surfaces unknown
companies and tracks investment thesis confidence **before signals become mainstream**.

The core advantage over one-shot LLM queries: **memory across time**.
MarketMind knows what signals appeared 6 weeks ago versus today. It builds a
corpus that compounds. The longer it runs, the more meaningful every new signal
becomes.

**The daily use case:** Open it for 2 minutes each morning. See what changed in
your thesis trajectories, which unknown companies are accelerating, and how that
maps to your portfolio — in plain English, without jargon.

---

## Product Direction (post product review)

After a product reduction exercise, the following decisions were made:

**Deprioritised (won't build further):**
- Supply chain extraction graph — systematic LLM errors compound as false positives;
  graph grows but doesn't get more accurate; impressive in demos, maintenance
  liability in production (C-003 unresolved)
- Insider transaction clustering (Form 4) — commodity signal available on every
  terminal; no differentiation; adds ingestion complexity for zero unique value
- Research endpoint — stateless synthesis; doesn't use the temporal layer that
  makes MarketMind different from asking Claude directly
- Per-thesis evidence list as primary UX — nobody browses 15,000 records daily;
  useful for debugging, not for daily intelligence use

**Core compounding features (double down on these):**
- Company radar with trajectory (not just rank — velocity of emergence matters)
- Thesis confidence trends over time (direction and duration, not the point-in-time %)
- Language delta auto-surfaced in feed (not buried behind a click in thesis detail)
- Plain English interpretation layer — the feed should explain what's happening,
  not just report numbers

**New direction:**
- Portfolio layer: connect holdings to theses, surface alignment gaps, let MarketMind
  tell you what your corpus is saying about companies you hold or don't hold yet
- Explain mode: LLM synthesises the trend narrative, not today's documents

---

## Completed

### Sprint 8 — Intelligence UX (partial) ✅
Items completed so far:

- **UI overhaul** — sidebar replaced with glassmorphism top nav (h-14, frosted glass,
  hairline accent). Login page redesigned with ambient blobs + glassmorphism card.
  Dual-color confidence bars (green/red split). Dark/light mode fully stable.
- **Corpus targeting** — `TargetedSECConnector` fetches company-specific EDGAR
  filings by ticker (not the daily fire-hose). 60 curated tickers across 5 thesis
  sectors (AI Infra, Semiconductor Supply Chain, Energy Grid, Defense, Data Center).
  Five targeted connectors run per thesis alongside generic feeds. Addresses C-001.
- **Company deep-dive panel** — click any company name anywhere in the app
  (radar, feed signal tags, "New on Radar", portfolio gaps) to open a slide-out
  drawer. Shows 4-week bar chart trajectory, stats, per-thesis breakdown with
  sentiment bars, and full evidence list with source links. `GET /companies/{normalised_name}`.
  Global `CompanyContext` + `CompanyPanel` mounted once in `AppShell`.
- **Feed timeline scrubber** — prev/next arrows + date dropdown on the feed page.
  Radar stays live (always current); only feed content changes for historical dates.
  Historical mode shows archived badge, hides Regenerate and Explain (which uses
  today's corpus, not the archived date). `GET /feed/dates` returns available dates.

### Sprint 7 — Portfolio Layer ✅
- Holdings CRUD — ticker, company_name, shares, optional cost basis. Stored in
  local Postgres. Never leaves the machine (ADR-001, ADR-023).
- Thesis alignment scoring — each holding matched against company_signals by
  ticker / normalised_name. Per-thesis coverage computed as held / total companies.
- Gap detection — uncovered radar companies ranked by doc_count × thesis_confidence.
  `normalised_name` included so gap rows open the company deep-dive panel on click.
- Portfolio page — holdings table with inline add/edit/delete; overall coverage
  banner (color-coded by coverage %); per-thesis exposure cards with coverage
  bars; ranked gap list. Portfolio nav item added to header.
- `GET /portfolio/holdings`, `POST`, `PATCH`, `DELETE`, `GET /portfolio/alignment`.

### Sprint 6 — Intelligence Surfacing ✅
- Feed provenance (C-011) — `evidence_ids` in feed signals → thesis detail deep-links
  with "Showing N signals from today's feed" banner + auto-scroll + highlight.
- Temporal decay (C-010) — `decay.py` exponential half-life 90 days. Applied in
  `ThesisService._enrich()` and `FeedService._thesis_signals()`.
- Explain/Data mode (ADR-022) — Data = technical cards. Explain = per-thesis LLM
  narrative from corpus history. Toggle lives inside the hero card header.
- Auto language delta in feed — `language_shift` field on `ThesisSignal` surfaces
  one meaningful term shift per thesis inline, no click required.
- Company alert thresholds — bell icon on radar rows, threshold popover, triggered
  section in feed when company crosses doc_count threshold.
- Radar trajectory view — 4-week sparkline SVG on every radar row.

### Sprint 1 — Foundation
- FastAPI backend, Next.js frontend, Docker infrastructure
- Redis, Qdrant, Ollama integration, health endpoints

### Sprint 2 — Knowledge Ingestion
- SEC EDGAR (8-K, 10-Q, 10-K, Form 4), Yahoo Finance, generic RSS ingestion
- Embedding generation, Qdrant storage, UUID5 deduplication

### Sprint 3 — Research Workflow
- Research endpoint with query expansion and retrieval pipeline
- Reranking (similarity × credibility × keyword overlap)
- Evidence generation, structured responses with sources

### Sprint 4 — Bottleneck Intelligence ✅
- Postgres live with all tables (theses, evidence, company_signals,
  supply_chain_links, insider_transactions, daily_feeds, confidence_snapshots)
- 5 system theses seeded at startup
- Thesis scoring pipeline: keyword overlap → LLM sentiment classification
- Supply chain extractor: LLM extracts supplier/customer/partner from 10-K/10-Q
- Form 4 connector: SEC insider transaction filings, buy cluster detection
- Company radar: surfaces companies appearing across multiple documents
- Daily feed: thesis momentum, new companies, insider clusters, LLM summary
- Daily ingestor container: scheduler.py triggers ingest.py at INGEST_HOUR_UTC
- Redis cache for feed (25h TTL, `POST /feed/regenerate` for invalidation)
- Model corrected: llama3.2 → qwen3:8b (ADR-005)

**Pre-Sprint 5 completions (all done):**
- `/no_think` prefix disables qwen3 chain-of-thought (60–180s → 5–20s per call)
- httpx.Timeout(300.0, connect=10.0) — separate timeouts prevent research read timeouts
- Date-scoped research: `days_back` param filters Qdrant by created_at
- Auto-regenerate feed after ingestion (scheduler.py calls POST /feed/regenerate)
- Confidence snapshots: one row per thesis per day for history charts
- Supply chain query endpoint: `GET /supply-chain/{company}`
- Full frontend built: login, feed, thesis list + detail, research

### Sprint 5 — Thesis Deepening + UI Overhaul ✅
- Opposing evidence surfacing — top 2 opposing records pinned with ShieldAlert callout
- Confidence sparkline — 30-day SVG trend in thesis stats row
- Radar ranking fixed — COUNT(DISTINCT document_id) not raw mention sum
- Company name normalisation — groups by normalised_name, pick_canonical() for display
- Language shift detector — GET /theses/{id}/language-delta, 30-day window comparison,
  6h Redis cache, insufficient_data graceful handling
- On-demand corpus re-evaluation — POST /theses/{id}/evaluate as BackgroundTask (202)
- Supply chain tab on thesis detail page
- Dark/light mode — next-themes, CSS vars as RGB triplets
- Toast notification system — ToastProvider + useToast() hook wired into layout
- Feed hero section — LLM summary as full-width briefing with stat pills
- Skeleton loading — HeroSkeleton, SignalCardSkeleton, RadarRowSkeleton
- Brief/Full toggle — feed page only; compact vs full signal cards
- "NEW" badge on radar — companies first seen within 7 days
- Improved empty states with guidance text
- Re-evaluate action uses toast, not inline status text

---

## Sprint 8 — Resume Ready + Demo Polish ✅

Goal: make the product demonstrable to people who haven't built it, and make the
daily experience polished enough to use as a live portfolio tool.

### Completed ✅
- UI overhaul — glassmorphism nav, login redesign, dual-color confidence bars
- Corpus targeting — TargetedSECConnector, 60 curated tickers across 5 sectors
- Company deep-dive panel — slide-out drawer, ADR-027
- Feed timeline scrubber — prev/next + date picker, ADR-028
- Intelligence Briefing redesign — activity badge, ThesisPulseCards, top-signal
  quote, SSE streaming Explain mode, pre-warm caches after regeneration
- Per-connector Redis checkpointing — restarts skip completed connectors
- Public demo mode — /demo route, static sample data, no login, Vercel deployed
- Mobile-responsive feed — stacked layout on small screens, sticky radar on desktop

### Deferred
- **Theme export** — one-click PDF/text summary per theme. Low priority; moved to
  Sprint 10 backlog.

---

## Sprint 9 — Intelligence UX Overhaul + Portfolio Depth ✅

**Theme:** Close the gap between what the system knows and what the user sees.

### Completed ✅
- **Accent colour** — blue → violet (#7C3AED), globals.css `--accent: 124 58 237`
- **Ticker autocomplete** — `lib/tickers.ts` (~280 entries), `TickerSearch` component,
  wired into `HoldingForm` with fallback manual entry
- **Themes list → 2-column grid** — `ThesisGridCard` with auto-fetched mini sparklines
  (14-day confidence history, trend badge), replaces flat list
- **Nav** — Research removed from primary nav (Feed / Themes / Portfolio)
- **Corpus search on theme detail** — 3rd tab replaces dead supply chain tab for
  contextual corpus queries; pre-seeded starter queries from thesis keywords
- **Feed: lead-story hierarchy** — first signal card gets `featured` prop (larger
  type, 3-line highlight, Lead Story badge, thicker bar)
- **Feed: support rate delta** — `confidence_delta` field, 7-day history from
  ConfidenceSnapshot, shown as "↑+Xpts 7d" in SignalCard
- **Feed: unified Explain narrative** — single cross-theme SSE narrative replacing
  5 per-thesis ExplainCards; `GET /feed/unified-explain/stream`
- **Feed: portfolio signals** — "Portfolio Gaps · Active Today" section below signal
  cards; gap companies with new corpus activity since midnight UTC
- **Radar: acceleration-first sort** — week-over-week growth rate, tie-break by doc_count
- **Radar: bigger sparklines** — 64×28px, colour-coded by growth rate
- **Radar: velocity callout** — `isSurge` badge (↑N× this week) in accent colour
  for companies with ≥2× week-over-week growth
- **Portfolio: theme-to-holding narrative** — each holding row shows primary theme,
  momentum icon (rising/flat/falling from ConfidenceSnapshot), corpus doc count
- **Portfolio: exposure card momentum** — ExposureCard shows momentum badge
- **Portfolio: optimistic delete** — holding disappears immediately on click,
  alignment refreshes silently in background
- **Supply chain disabled** — `supply_chain_extractor=None` in ingest.py (ADR-024),
  ~50s saved per scored document

---

## Current — Sprint 10 — Verdict Language + Signal Clarity

**Theme:** Make the system opinionated. Right now MarketMind reports data — confidence
percentages, doc counts, coverage bars. A user can stare at "67% support rate, 14 docs,
8% coverage" and still not know what to think. This sprint adds a verdict layer on top
of the existing data: the system should *conclude*, not just *report*.

Inspired by a structured stock analysis framework (Bear Case → Conviction Score →
Catalyst Test) where every output ends in a hard verdict — AVOID, HYPE, PRICED IN.
The key difference for MarketMind: verdicts are grounded in months of real corpus
data, not a one-shot LLM prompt against training knowledge.

### Verdict language (anchor feature)

- **Company verdict in deep-dive panel** — when the panel opens, run a structured
  prompt against the company's actual corpus evidence (doc count, recency, thesis
  breadth, source diversity) and surface:
  - Signal strength: STRONG / MODERATE / THIN / NOISE
  - Consensus check: EMERGING (few sources, recent) / WIDENING / CONSENSUS (large cap, everywhere)
  - One verdict sentence: *"12 filings across 3 themes, all since February. Early signal,
    not yet consensus."* or *"8 mentions but from 2 sources only. Thin corpus."*
  - Cached per company per day — not re-generated on every panel open

- **Radar verdict badges** — replace or augment the raw doc count bar with a badge:
  ACCELERATING / EMERGING / ESTABLISHED / STALLING. Derived from sparkline slope +
  doc count, no LLM needed. Scannable at a glance.

- **Gap company one-liner on portfolio page** — each exposure gap gets a corpus-grounded
  sentence instead of just "14 docs, 0.72 conf". *"Powell Industries — 19 filings, 3
  themes, all Q1 2025. Fast emergence, no position."*

- **Theme health label** — surface STRENGTHENING / STALLING / WEAKENING / EARLY on
  theme cards, derived from ConfidenceSnapshot slope. Already computed for momentum
  field — just needs to be shown prominently.

### Feed clarity

- **Reduce information density** — the feed hero currently shows briefing text,
  toggle, timeline scrubber, pulse cards, and signal cards all at once. Collapse
  or hide the pulse cards by default; let the lead story dominate the first screen.

- **"What to watch today" callout** — one highlighted sentence above the signal
  cards: the single most actionable signal from today's feed. Not a summary of
  everything — one thing.

### UI / aesthetic

- **Light/editorial mode** — add a cream/warm light theme alongside the existing
  dark mode. Feels like a research note, not a trading terminal. Cream background,
  serif or semi-serif headers for thesis names, dark red/charcoal text. Makes the
  verdict language feel more like a real analyst report.

- **Remove dead supply chain tab** — still shows on thesis detail in some builds.
  Replace with a clean empty state or remove the tab entirely.

### Watchlist (lighter than portfolio)

- **Company watchlist** — a `watched_companies` table (normalised_name, added_at).
  No shares or cost basis — just "I'm watching this". Alert when doc count crosses
  a user-set threshold (infrastructure already exists via CompanyAlert).
  Fills the gap between passive radar (everything) and committed portfolio (holdings).
  Visible as a section on the portfolio page or as a filter on the radar.

### Conviction score (stretch)

- **Structured stock analysis** — Bear Case + Quality Gate + Catalyst Test against
  a company's corpus, rendered as a verdict card in the deep-dive panel.
  Bear Case: what do opposing-sentiment signals say? What risks appear repeatedly?
  Quality Gate: pass/fail on corpus-derived signals (revenue trend, margin mentions).
  Catalyst Test: what upcoming catalysts appear in recent filings?
  Verdict: BUY WATCH / MONITOR / AVOID — explicitly framed as corpus opinion, not
  financial advice (ADR-023).

---

## Sprint 11 — Track Record + Prediction

- **Theme vs reality tracking** — add "predicted outcome" and "target date" to
  each theme. At target date, mark: did it play out? After 12 months: 7 themes
  tracked, 4 correct calls, 2 wrong, 1 pending. Turns MarketMind from a
  monitoring tool into a track record builder. Strong interview story.

- **Comparable period detection** — "this pattern resembles what we saw in AI
  Infrastructure 3 months before it accelerated." Requires multi-month corpus.

- **Earnings calendar overlay** — flag when radar companies report next earnings.
  "Powell Industries, 12 docs on radar, reports Q2 in 8 days." Actionable.

---

## Long-Term

- Multi-year corpus with temporal query ("what was the narrative around power grid
  in Q3 2024 vs now?")
- Collaborative mode — share theses and corpus with a team
- Corpus targeting automation — auto-discover companies in thesis sectors and add
  their filings to a priority ingestion queue

---

## Backlog / Ideas

Unscheduled ideas worth keeping. Revisit when relevant sprint arrives.

- **Corpus targeting** (do before portfolio layer) — compile 50-100 specific
  companies known to operate in thesis sectors. Pull their 10-K/10-Q directly
  instead of relying on EDGAR's generic daily feed. One afternoon of work,
  dramatically better corpus quality. Addresses C-001. Must happen before portfolio
  alignment is meaningful — alignment built on a noisy corpus gives noisy answers.

- **First appearance prominence** — when a company crosses the radar threshold for
  the first time, it deserves its own visual treatment in the feed, not buried in
  a list. This moment is the core value proposition of the product.

- **Radar trajectory view** — show the 4-week doc_count trend curve alongside the
  current number. A company at 12 docs with acceleration is more interesting than
  one at 20 docs that's been flat for 6 weeks. The curve is the intelligence.

- **Terminology audit** — small rename pass for clarity without code changes:
  "Evidence" → "Signals" in user-facing layer; "Confidence score" → "Signal
  strength"; momentum badges should show duration ("Rising — 11 days" not just
  "Rising"); thesis list should explain what theses are on first visit.

- **Company alert threshold** — user sets doc_count threshold per radar company.
  Feed shows notification when crossed. Turns passive radar into active watchlist.

- **Auto language delta in feed** — surface one language shift per thesis in the
  feed automatically, no click required. Currently buried in thesis detail page.
