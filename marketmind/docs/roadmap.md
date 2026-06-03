# MarketMind Roadmap

## Vision

MarketMind is a corpus memory platform that tracks Independent Citation Rate (ICR)
— how many structurally independent companies cited an entity in primary SEC filings
each week, tracked over time. The moat is temporal: a company going from 0 → 2 → 9
independent citations over 8 weeks is a signal no search engine, terminal, or LLM
can surface without a system that has been running and accumulating.

**The daily use case:** Open the Signal Map. See which company trajectories have
inflected since yesterday. Check which accelerating trajectories you don't hold.

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

## Sprint 10 — Verdict Language + Signal Clarity ✅

**Theme:** Make the system opinionated. Right now MarketMind reports data — confidence
percentages, doc counts, coverage bars. A user can stare at "67% support rate, 14 docs,
8% coverage" and still not know what to think. This sprint adds a verdict layer on top
of the existing data: the system should *conclude*, not just *report*.

### Completed ✅

- **Radar verdict badges** — ACCELERATING / RISING / EMERGING / STALLING. Derived from
  weekly_counts sparkline slope + doc count, no LLM needed. Replaces separate surge/NEW
  badges. `CompanyRadar.tsx` `getVerdictBadge()`.

- **Theme health labels** — Strengthening / Steady / Weakening badge under thesis name on
  `ThesisGridCard`. Prominent before numbers. Derived from ConfidenceSnapshot slope.

- **Portfolio narrative + FeaturedGap** — `buildNarrative()` deterministic sentence at
  top of portfolio page (`text-lg`). Featured top gap card above the gap list.

- **Feed defaults to Explain mode** — `useState(true)` for explainMode. The brief is the
  first thing you read, not something you unlock.

- **Timeline scrubber behind History button** — prev/next + date picker only visible when
  `showHistory` is true. Reduces clutter on primary use case.

- **Supply chain tab removed** — thesis detail `[id]/page.tsx` no longer renders the tab.

- **Company panel verdict card** — `CompanyPanel.tsx` `VerdictCard` component. STRONG /
  MODERATE / THIN / NOISE signal strength label + ACCELERATING / WIDENING / EMERGING /
  STEADY consensus. One verdict sentence at top of overview tab. Cached per company per day.

- **"What to watch today" callout** — `feed/page.tsx` `WatchCallout` component. Derives
  the single most actionable sentence from feed signals + radar + gap data.

### Deferred to backlog

- **Watchlist** — `watched_companies` table, lighter than portfolio. Deferred to Sprint 13+.
- **Conviction score** — Bear Case + Quality Gate + Catalyst Test verdict card. Stretch
  goal, requires multi-month corpus to be meaningful. Deferred.

---

## Current — Sprint 11 — Design Identity + Information Hierarchy

**Theme:** MarketMind looks like every other 2024 SaaS dashboard — glassmorphism,
violet accent, equal-weight cards, colored percentage bars. The visual language
doesn't match the product's identity as an intelligence tool. This sprint gives it
a real personality and fixes the hierarchy problem: right now numbers dominate,
claims are buried. The system should speak first; data is evidence, not headline.

### Completed ✅

- **`/research` route deleted** — `app/research/` directory removed. Stateless
  synthesis, no temporal layer. Nav entry already removed in Sprint 9.

- **ThesisPulseCards removed** — horizontal scroll row cut from `feed/page.tsx`.
  Intelligence brief + lead signal card carry the weight.

- **Supply chain tab removed** — `thesis/[id]/page.tsx` no longer renders the tab.

- **Timeline scrubber behind History button** — prev/next + date picker only shown
  when `showHistory` is true. Done in Sprint 10, landed here as a Sprint 11 cut.

- **Default to light mode** — `ThemeProvider.tsx` `defaultTheme="light"`.

- **Warm paper light palette** — `globals.css`: `--background: 248 246 242`,
  warm borders + ink-on-paper text, muted semantic colors. Professional, not terminal.

- **Warm charcoal dark palette** — `globals.css` `.dark`: `--background: 14 12 10`,
  warm surfaces, brighter semantic colors for contrast. Desk-lamp, not cold OLED.

- **Theme transition fix** — transition scoped to `html, body` only (was `*`).
  `*` selector caused staggered per-element paint cycles → visible flicker.
  Root-only scoping gives a clean crossfade. 0.3s ease.

- **Portfolio redesign** — stats strip at top (4 colored stat pills), two-column
  layout (holdings left, intelligence right), holding cards with ticker pill +
  top momentum color bar + thesis signal row, narrative sentence in `text-xl`,
  FeaturedGap as primary recommendation.

- **ThesisGridCard hierarchy fix** — confidence % `text-sm font-semibold` (was
  `text-lg`), HealthBadge `text-[11px]`, bar `h-1.5`. Sparkline fixed 80×28px.

- **Share input arrow bug fixed** — `step="1"` `min="0.001"`. Previously
  `step="any"` + `min="0.0001"` snapped to 0.0001 on first arrow click.

- **Ingestor feed auto-invalidation fixed** — `scheduler.py` now directly deletes
  3 Redis cache keys after ingestion instead of broken HTTP call to backend.
  Feed regenerates on next page load without manual Regenerate click. (ADR-029)

**Post product-review overhaul (Phases 1–3, 2026-05-31)**:

- **Phase 1** — Demo moat visible: company panel unlocked in demo with 15 companies
  of static CompanyDetail data (`lib/demo-data.ts`); radar moved above the fold on
  `/demo`; demo notice banner removed; "since [date]" in radar rows makes corpus
  memory visible without explanatory copy.

- **Phase 2** — "You don't hold it": new `/demo/portfolio` route with pull quote
  narrative, 4 gap rows with mini sparklines + "Not held" badge, holdings section.
  Watch callout updated to show actual weekly trajectory numbers (`4 → 8 → 11 → 23`
  in accent monospace). Feed / Portfolio / About nav in DemoShell. `DEMO_HOLDINGS`
  and `DEMO_GAPS` added to `app/demo/data.ts`.

- **Phase 3** — Live app hierarchy: `/feed` restructured — radar above the fold,
  narrative moved below. `TrajectoryChart` 56px → 128px with per-bar spring
  animations and "4-WEEK TRAJECTORY" section label. `WatchCallout` refactored to
  render actual `weekly_counts` in accent monospace. Panel header bug fixed in demo
  mode (now shows `display_name + ticker` from loaded data, not raw normalised string).

- README screenshots retaken (dark mode, Playwright) to reflect current state.

### Remaining

- **Information hierarchy pass** — SignalCard highlight as hero text (`text-sm`
  leading-relaxed, dark), confidence number secondary. Radar de-emphasises raw
  numbers. (TrajectoryChart and WatchCallout addressed in Phase 3; SignalCard
  and radar numbers still pending.)

- **Aesthetic: Intelligence Room** — amber/gold `#D4A843` accent replacing violet
  for signal/alert moments. DM Serif Display or Playfair for headline claims.
  Corpus pulse indicator ("847 docs · updated 6h ago").

- **Framer Motion** — page transitions (180ms fade+8px), card stagger (40ms
  delay), sparkline draw animation, bar fill 0→width, number count-up, signal
  emergence pulse. (Panel spring and trajectory bar spring done in Phase 3.)

- **Portfolio theme coverage zones** — visual field replacing holdings table;
  holdings as chips inside each theme zone; gaps as empty zones.

### Cuts (original plan, recorded for completeness)

- **Insider clusters in feed** — deprioritised per ADR-025. Not yet removed from
  feed template but not actively generating data (Form 4 ingestion deprioritised).

### Information hierarchy pass

The core problem: numbers dominate, claims are buried. Confidence percentages are
large and colored. The insight sentence — the thing that actually matters — is
`text-xs` in light grey. This is backwards.

Rule: **claim → explanation → evidence → numbers**. Each level smaller and lighter
than the one above it.

- **SignalCard** — the highlight sentence becomes the visual hero of the card.
  `text-sm` leading-relaxed, dark/primary text, 3 lines visible. Confidence number
  steps down: smaller, beneath the explanation, not above it.

- **Feed hero brief** — narrative text `text-base`, always expanded by default.
  Explain mode becomes the default. Data mode is the secondary toggle option.
  The brief is the first thing you read, not something you unlock.

- **Theme grid cards** — thesis name `text-base font-semibold`. Health label
  (STRENGTHENING / STALLING) one line below in `text-sm`. Sparkline and numbers
  tertiary. Name and verdict read at a glance, numbers on inspection.

- **Portfolio summary** — a generated one-sentence narrative at the very top in
  `text-lg`: *"Strong in AI Infrastructure. Energy Grid is accelerating and you
  have no exposure."* The entire page's job in one line. Coverage percentage
  and table are detail beneath it.

- **Company deep-dive panel** — company name `text-2xl`. Verdict sentence
  `text-base` immediately below. Evidence as proper block quotes, not `text-xs`
  list items. The panel reads like a short report, not a data table.

- **Radar rows** — company name `text-sm font-semibold`. Velocity badge
  prominent. Doc count de-emphasised to `text-xs text-text-tertiary`.

### Aesthetic direction: Intelligence Room

Current aesthetic (violet glassmorphism on black) reads as "2024 SaaS startup."
Target aesthetic: a senior analyst's workspace. Confident, warm, heavy.

- **Background** — warm charcoal `#141210` instead of pure black `#0A0A0A`.
  Less cold. More like a room with good lighting.

- **Accent colour** — amber/gold `#D4A843` replacing violet for signal/alert
  moments. Gold means *something was found*. Violet is generic tech. Keep violet
  as an option or secondary — gold becomes the primary signal colour. Every
  ACCELERATING badge, every new company ping, every "signal detected" moment
  is amber. The rest of the UI stays neutral.

- **Display serif for headline moments** — load DM Serif Display or Playfair
  Display for: the feed's opening sentence, company names in the deep-dive panel,
  portfolio narrative line, thesis names on the themes list. Not everywhere —
  just at the moments the system is making a claim. Monospace for all data.
  The contrast communicates *this is the important part*.

- **Corpus pulse** — a small ambient indicator on every page showing the system
  is alive: "847 docs · updated 6h ago". One line, `text-xs`, bottom of page
  or corner of header. Not a stats card. Just a heartbeat. Makes the temporal
  value prop visible at all times.

### Motion and transitions (Framer Motion)

Currently navigation is instant and cards appear without animation. The app
feels static. Adding motion makes it feel alive and reinforces the information
hierarchy — important things animate more prominently.

- **Page transitions** — 180ms ease-out fade + 8px upward translate between
  all routes. One `AnimatePresence` wrapper in layout.tsx.

- **Card stagger** — signal cards, radar rows, and theme grid cards stagger in
  with 40ms delay between each. Fade + 6px upward translate on mount.

- **Sparkline draw** — SVG path `stroke-dashoffset` animation, draws left-to-right
  when the row enters the viewport. The curve IS the insight — animate it in.

- **Bar fills** — confidence bars and coverage bars animate their width from 0
  on mount. 500ms ease-out. Currently static.

- **Number count-up** — doc counts and coverage percentages count up to their
  value on first render. Reinforces that these are live numbers, not placeholders.

- **Company panel spring** — panel slides in from right with a spring ease
  (stiffness 400, damping 35), not a CSS transition. Feels physical.

- **Signal emergence pulse** — when a company appears in the feed's "new on radar"
  section, its row gets a brief radial pulse animation (like a sonar ping).
  This is the most important moment in the product — make it visible.

- **Hover lift** — cards lift 2px with shadow change on hover. Company names get
  a faint amber glow on hover in the radar and gap list.

### Portfolio restructure

See the design direction: stop showing it as a holdings table. Restructure as:
1. Generated narrative sentence (large, top) — what your coverage looks like today
2. Theme coverage zones — visual field showing which themes you're in/out of,
   holdings as chips inside each zone, gaps as visually empty zones
3. One primary gap recommendation — the top gap company as a featured card,
   not item 1 in a list of 15
4. Holdings detail — collapsed behind "Your positions (N)", administrative

---

## ICR Rebuild ✅ (2026-06-01)

Following a deep audit of the intelligence layer, the product was rebuilt around
ICR as the sole primary metric. ADR-031 through ADR-037 govern the architecture.

### Phase 0 — Corpus Cleanse ✅

- Removed `SECEdgarConnector`, `Form4Connector`, `YahooFinanceConnector`,
  MarketWatch, Seeking Alpha, The Register, Ars Technica from `ingest.py`
- Kept: `TargetedSECConnector` (5 sector watchlists) + Breaking Defense / Utility
  Dive / EE Times (sector trade press)
- `scripts/corpus_cleanse.py` deleted 127 evidence rows + 105 orphaned company
  signal rows from noisy sources. 154 clean rows retained.

- `source_classification` (`PRIMARY_DISCLOSURE` | `TRADE_PRESS`) and `filing_ticker`
  added to Evidence schema. `migrate_sprint12.py` backfilled all 154 existing rows.
- `app/ingestion/constraint.py` — constraint vocabulary gate (34 terms). PRIMARY_DISCLOSURE
  docs only generate CompanySignals if gate passes. TRADE_PRESS always generates signals
  (radar display, not ICR).
- `app/services/trajectory_service.py` — `TrajectoryService`: `get_icr_series()`,
  `get_top_trajectories()`, `is_inflecting()` (current ≥ 2× 4w avg AND ≥ 3)
- `GET /trajectory/top` and `GET /trajectory/{name}` endpoints live.
- ICR data accumulates from filing_ticker on new ingestion runs (pre-Sprint-12 rows
  have source_classification backfilled but no filing_ticker).

### Sprint 13 — Signal Map (frontend) ✅

- `/signals` page — primary surface. 12-week bar sparklines, acceleration ranking,
  amber "Accelerating" badge for inflecting entities. Filter: All / Accelerating.
- Empty state explains ICR accumulation (shown until first ingestion run populates data).
- Info toggle reveals ICR explanation (collapsed by default).
- Nav: Signals (first) | Feed | Themes | Portfolio. Logo links to /signals.
- Confidence percentage removed from CompanyPanel ThesisCard and VerdictCard sentences.

### Sprint 14 — Company Full Page ✅

- `/companies/[name]` — ICR card (12-week sparkline, current ICR, 4w avg, inflecting
  badge) + corpus trajectory (4-week doc bar chart) + thesis exposure + full evidence
  trail (40 excerpts, filterable by All / Supporting / Opposing).
- `CompanyNavigator` in AppShell: intercepts `openCompany()` and calls
  `router.push('/companies/[name]')`. No call-site changes needed.
- CompanyPanel preserved in DemoShell (demo still uses drawer with static data).
- `GET /trajectory/{name}` fetched alongside company data; graceful 404 handling.

### Sprint 15 — Cleanup ✅

- Themes removed from nav (3-item nav: Signals | Feed | Portfolio). Route preserved.
- `GET /health/corpus` — unauthenticated endpoint: evidence counts by classification
  and source, last document date. Used by Signal Map corpus health footer.
- Signal Map footer: "152 primary disclosures · 2 trade press · 154 total · last filing [date]"
- Portfolio GapRow: `formatConfidence(thesis_confidence)` display removed.
- CompanyPanel `deriveVerdict`: confidence % strings removed from narrative sentences.

### Sprint 16 — Demo Alignment ✅ (2026-06-02)

**Goal:** Demo mirrors the actual product — Signal Map as primary surface, ICR data
model throughout, correct nav, ICR card in company deep-dive.

**Divergences fixed:**
- Demo primary surface was Feed-era (`CompanyRadar` + thesis pills). Replaced with
  Signal Map clone: `DEMO_TRAJECTORIES` static data (10 companies, 12-week ICR
  series), All / Accelerating filter chips, column labels, same layout as `/signals`.
- `DemoShell` header: "Feed / Portfolio / About" → "Signals / Portfolio" with
  active-state styling matching `Header.tsx`. Logo links to `/demo`.
- `CompanyPanel` demo mode: `VerdictCard` (confidence-era, wrong metric) replaced
  with `ICRCard` when `data.icr_series` is present. Matches ICR card on company pages.
- `DemoGapRow` sparkline: SVG polyline (4-point line) → 4-bar chart using the same
  bar language as the Signal Map.
- `CompanyDetail` type: optional `icr_series`, `icr_current`, `icr_4w_avg`,
  `is_inflecting` fields added. All 14 `DEMO_COMPANY_DETAIL` entries populated.
- Demo CTA copy updated to ICR / independent citation framing.

---

## Sprint 12 — Track Record + Prediction (deferred)

*Moved to backlog. The ICR rebuild takes priority.*

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
