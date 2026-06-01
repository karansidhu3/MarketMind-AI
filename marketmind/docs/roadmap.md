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

## Rebuild — ICR-Based Architecture

Following a deep audit of the intelligence layer (2026-06-01), the product is
being rebuilt around a single primitive: **Independent Citation Rate (ICR)** —
the number of structurally independent companies citing an entity in primary
legal disclosures per week, tracked over time.

**What the audit found:**
- Confidence scores inflate toward 70–80% by construction regardless of thesis validity
- Momentum labels measure volume, not direction
- Generic EDGAR fire hose, Yahoo Finance, MarketWatch, and Seeking Alpha generate
  noise that degrades company signal quality
- The genuine moat is the temporal trajectory of corpus presence, currently buried
  as a secondary chart — not the primary output
- The product's most valuable capability is: showing when a company went from
  background noise to being cited in 9 independent filings in a single week

**ADRs:** ADR-031 through ADR-037 govern this rebuild. Read those before
making architectural changes.

---

### Phase 0 — Corpus Cleanse ✅ (immediate, pre-sprint)

No new features. Clean the existing corpus before building on it.

**Remove from `ingest.py`:**
- `SECEdgarConnector` — generic EDGAR daily fire hose (8-K, 10-Q, 10-K, Form 4)
- `YahooFinanceConnector` — always late, dominated by targeted EDGAR
- `GenericRSSConnector` for MarketWatch, Seeking Alpha, The Register, Ars Technica

**Keep:**
- `TargetedSECConnector` for all 5 sector watchlists
- `GenericRSSConnector` for Breaking Defense, Utility Dive, EE Times

**Surgical corpus cleanse** — `scripts/corpus_cleanse.py`:
1. Delete `Evidence` rows where `source_name IN ('SEC EDGAR', 'Yahoo Finance',
   'MarketWatch', 'Seeking Alpha', 'The Register', 'Ars Technica')`
2. Delete `CompanySignal` rows with no remaining evidence
3. Recompute `CompanySignal.last_seen` and `first_seen` from retained evidence
4. Log before/after counts: documents retained, companies retained, companies lost

**Expected result:** A smaller, higher-quality corpus. Phantom company signals
(large caps appearing due to keyword coincidence in random articles) are removed.
The genuine trajectory history from targeted EDGAR and sector trade press survives.

---

### Sprint 12 — ICR Foundation (backend)

**Goal:** Replace confidence score with ICR as the primary computed metric.
Establish source type classification. Add constraint vocabulary gate.

**Backend changes:**

- **`source_type` on Evidence** — `PRIMARY_DISCLOSURE` | `TRADE_PRESS`. Set
  at ingest time from connector metadata. `TargetedSECConnector` → PRIMARY.
  Sector RSS → TRADE_PRESS.

- **`independent_citation_count` on CompanySignal** — count of distinct
  `citing_company` values from PRIMARY_DISCLOSURE evidence. Replaces
  `mention_count` as the key signal metric. Updated on each new evidence row.

- **Cross-citation tracking** — when Company A's filing mentions Company B,
  record `citing_company = A` on the Evidence row for B. Currently citations
  are not attributed. This is the critical missing piece for ICR.

- **Constraint vocabulary gate** — `app/ingestion/constraint.py`. A document
  only creates an Evidence row and advances ICR if: (a) a watchlist entity is
  present AND (b) constraint vocabulary matches (lead time, backlog, shortage,
  allocation, capacity constraint, delivery timeline, etc.). Documents without
  constraint language are still embedded in Qdrant but do not count as citations.

- **`TrajectoryService`** — new service that computes ICR time series for a
  company: weekly independent citation counts going back to first_seen, using
  only PRIMARY_DISCLOSURE evidence. Replaces the ad-hoc `weekly_counts`
  calculation in `ThesisService.get_company_radar()`.

- **Inflection detection** — `TrajectoryService.detect_inflections()`. Returns
  companies where ICR this week ≥ 2× the 4-week average AND ≥ 3 independent
  citations. These become alert triggers.

- **Remove from backend:** Confidence score removed from `/theses` API response
  as a primary field. Retained in DB, not surfaced in primary endpoints.
  Momentum label removed from `ThesisSignal`. `_classify_sentiment()` repurposed
  as constraint detection — it now asks "does this describe a constraint?" not
  "is this supporting/opposing?"

---

### Sprint 13 — Signal Map (frontend)

**Goal:** Replace Feed + Radar with the Signal Map as the primary surface.
Remove confidence scores from all UI components.

**Frontend changes:**

- **`/signals` page** — new primary surface. Ranked list of companies by
  ICR acceleration (week-over-week slope, not absolute count). Each row:
  company name + ticker, 12-week ICR sparkline (primary visual), citation count
  this week + delta, first appeared date, top excerpt from most recent
  PRIMARY_DISCLOSURE citation.

- **Filter chips** — one per signal context (AI Infra, Semis, Grid, Defense,
  DC Infra). All active by default. Click to filter. No separate Themes page.

- **Watch callout updated** — shows ICR inflection: "[Company] — 9 independent
  citations this week vs. 2-week average of 2." Numbers, not prose.

- **Confidence score removed** from: `ThesisGridCard`, `CompanyPanel`,
  `SignalCard`, `PortfolioPage`, all API response displays.

- **Momentum badges removed** — replaced by trajectory state derived from
  ICR slope: Accelerating / Emerging / Steady / Fading. These are computed
  from ICR, not evidence volume.

- **Narrative toggle** — LLM unified explain narrative moved behind an
  "Analysis" expand button at the bottom of the Signal Map. Never auto-opened.

- **12-week sparklines** — all sparklines extended from 4-week to 12-week.
  The longer window is what makes the trajectory story legible.

- **Navigation update** — `Feed` renamed `Signals`. Themes link becomes a
  filter on the Signal Map, not a separate route. Navigation: Signals | Companies
  | Portfolio.

---

### Sprint 14 — Company Surface (full page)

**Goal:** Replace slide-out CompanyPanel with full `/companies/[name]` page.
Surface the full trajectory history and citation network.

**Frontend changes:**

- **`/companies/[name]` page** — four zones (see ADR-036):
  1. Trajectory timeline — full history, ICR per week, annotated at inflections
  2. Citation sources — which companies filed documents citing this entity
     (independent source list, sortable by recency, filing type, source)
  3. Signal context membership — which contexts, with independent citation
     count per context (not confidence %)
  4. Portfolio status — one line, held / not held

- **`CompanyPanel` deprecated** — existing slide-out drawer removed after
  full page is live. All `openCompany()` calls replaced with
  `router.push('/companies/${normalisedName}')`.

- **`CompanyContext` removed** — global context replaced by standard Next.js
  routing. ADR-027 superseded by ADR-036.

- **Backend: `GET /companies/{name}`** updated to return full ICR history,
  citation source list, and signal context membership. Response shape changes.

---

### Sprint 15 — Portfolio + Cleanup

**Goal:** Simplify portfolio to trajectory gap detection. Remove all legacy
confidence-score surfaces. Add corpus health indicator.

**Frontend changes:**

- **Portfolio simplified** — two sections only:
  1. *Trajectory gaps* — companies with ICR acceleration you don't hold,
     ranked by acceleration rate. Each row: sparkline, citation count this week,
     first appeared, "Not held."
  2. *Holdings* — your positions with 12-week ICR sparklines. No alignment
     score. No coverage percentage. Just: is the trajectory behind this holding
     accelerating, steady, or fading?

- **Themes page removed** — signal contexts are filter chips on the Signal Map,
  not a separate route. The `/thesis` route and `ThesisGridCard` component are
  deleted.

- **Corpus health indicator** — one line in the page footer across all surfaces:
  "Corpus: [N] primary disclosures · [M] trade press · Last run: [Xh] ago."
  Ambient proof that the system is running and accumulating.

- **Legacy cleanup** — remove: `CompanyPanel.tsx`, `CompanyContext.tsx`,
  `feed/page.tsx`, `thesis/page.tsx`, `thesis/[id]/page.tsx`, `SignalCard.tsx`,
  `ThesisGridCard.tsx`. These surfaces no longer exist in the new architecture.

- **Alert system updated** — alert UI changes from "set threshold" input to
  "watch this company" toggle. Alert triggers show ICR inflection data, not
  doc_count.

---

### Sequencing Notes

Phase 0 can be executed immediately — it is data surgery and connector removal,
no new features. Sprint 12 and 13 should proceed in parallel where possible
(backend ICR foundation + frontend Signal Map scaffold). The old surfaces remain
live during the transition; they are deprecated in Sprint 15, not before.

Do not remove the old surfaces before the new ones are validated. Users should
never face a blank screen during the migration.

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
