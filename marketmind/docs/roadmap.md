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

## Current — Sprint 8 — Resume Ready + Demo Polish

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
- /about page — plain English purpose, scope, how-it-works, tech stack
- UX terminology pass — "Theses" → "Themes", "confidence" → "support rate"
- Contextual tooltips — momentum, support rate, language shift, radar ranking

### Remaining
- **Mobile-responsive feed** — minimum viable mobile layout for morning check
- **Theme export** — one-click PDF/text summary: hypothesis, trend, top companies,
  key evidence excerpts

---

## Sprint 9 — Intelligence UX Overhaul + Portfolio Depth

**Theme:** Close the gap between what the system knows and what the user sees.
The corpus is strong after weeks of ingestion. The UI doesn't yet communicate
the intelligence it contains. This sprint fixes the disconnected feeling.

### Feed redesign

- **Top story hierarchy** — replace equal-weight signal cards with a dominant
  "lead story" card (full width, larger type, expanded highlight) with smaller
  secondary cards below. The system already picks the top signal — surface it
  visually. Every good briefing has a lede.

- **Support rate delta** — show the 7-day change next to every support rate
  number: "67% ↑+9pts". Point-in-time % tells nothing. Direction tells a story.
  One extra field per ThesisSignal, computed from ConfidenceSnapshot history.

- **Unified Explain narrative** — in Explain mode, replace 5 separate per-theme
  paragraphs with a single LLM-generated narrative connecting all themes for the
  day. "Here's the thread running through everything today." More like a real
  analyst note, less like 5 separate reports.

- **Portfolio signals on feed** — add a small "Your portfolio" section to the
  feed: gap companies that had new signals today, themes aligned with your
  holdings. Connects corpus to holdings without requiring a page visit.

### Company Radar redesign

- **Acceleration-first ranking** — sort by week-over-week growth rate, not total
  count. A company going 0→5 this week is more interesting than one at 23 that's
  been flat. Show "↑4× this week" as the primary metric alongside total.

- **Bigger sparkline** — the current 40px sparkline is unreadable. Make it the
  visual centrepiece of each row, not a decoration. The curve IS the insight.

- **Velocity callout** — companies with >2× week-over-week growth get a distinct
  visual treatment (not just the NEW badge for first appearance).

### Themes list redesign

- **Inline health at a glance** — show mini confidence sparkline + 7-day signal
  count directly on the list page. Should not require clicking into each theme
  to know what's happening. Grid layout, not a flat list.

### Navigation

- **Remove Research from primary nav** — stateless synthesis; doesn't use the
  temporal layer; weakens the product story. Move to a "Search corpus" input
  inside the theme detail page where it's contextually useful.

### Portfolio depth

- **Ticker search/autocomplete** — replace manual ticker entry with a searchable
  dropdown backed by a bundled list of S&P 500 + Russell 1000 + thesis-sector
  companies (JSON, no external API). Type "Apple" or "AAPL", get the match.
  Eliminates the biggest friction in adding holdings.

- **Holdings value + P&L** — if cost basis is entered, show current value and
  unrealised gain/loss using daily price data (Yahoo Finance, free). Turns the
  portfolio page from a list into a real portfolio tracker.

- **Theme-to-holding narrative** — for each held company, show which themes it
  appears in and whether those themes are strengthening or weakening. "You hold
  ETN. Energy Grid theme is accelerating (+12 signals this week). ETN appears in
  14 independent filings." Closes the loop between intelligence and portfolio.

### Visual identity

- **Accent colour change** — current blue is generic (every SaaS uses it).
  Replace with deep violet (#7C3AED) or teal (#0D9488). Violet reads as
  sophisticated/analytical; teal reads as data/intelligence. Either is more
  distinctive than blue for a financial tool. Requires updating CSS vars only —
  no component changes needed.

---

## Sprint 10 — Track Record + Prediction

- **Theme vs reality tracking** — add "predicted outcome" and "target date" to
  each theme. At target date, mark: did it play out? After 12 months: 7 themes
  tracked, 4 correct calls, 2 wrong, 1 pending. Turns MarketMind from a
  monitoring tool into a track record builder. Very strong interview story.

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
