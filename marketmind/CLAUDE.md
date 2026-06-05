# MarketMind AI — Claude Context

Read this first. Single source of truth for project state, constraints, and decisions.
Sprint history lives in `docs/roadmap.md`. Full ADR detail in `docs/decisions.md`.

---

## What this product is

MarketMind is a **corpus memory platform** that tracks how often independent
companies cite each other in primary legal disclosures over time. It runs
entirely locally (no paid APIs).

**The primary intelligence primitive is ICR — Independent Citation Rate:**
how many structurally independent companies referenced an entity in primary
SEC filings (8-K, 10-Q, 10-K) this week, versus prior weeks. A company cited
by 9 independent supply chain companies in one week is a different category of
signal from one mentioned 9 times in one document.

**The moat is temporal:** A company going from 0 → 2 → 9 independent citations
over 8 weeks is a signal no search engine, terminal, or LLM can surface. It
requires a system that has been running and accumulating. That trajectory —
when it started, how fast it grew, which independent companies are driving it —
is what this product produces.

**Daily use case:** Open the Signal Map. See which company trajectories have
inflected since yesterday. Check which accelerating trajectories you don't hold.

**Portfolio goal:** Surface trajectory gaps — companies with accelerating ICR
in your investment contexts that you have no position in.

**ICR rebuild complete (2026-06-01). Sprint 16 (demo alignment) complete (2026-06-02).** Phase 0 + Sprints 12–16 shipped. See
`docs/roadmap.md` for full sprint history. ADR-031 through ADR-037 govern the
architecture. The Signal Map is live at `/signals`. Company pages live at
`/companies/[name]`. Feed and Themes remain as legacy routes; Themes is no longer
linked from nav.

---

## What NOT to build

- Confidence scores — inflates toward 70–80% by construction, misleads (ADR-031)
- Momentum labels from evidence volume — volume ≠ direction (see ICR instead)
- Supply chain extraction — LLM errors compound as false positives (ADR-024)
- Insider transaction clustering — commodity signal, no differentiation (ADR-025)
- Buy/sell recommendations — trajectory framing only (ADR-023)
- Gamification, streaks, usage counts, rankings, cost visibility
- Generic EDGAR fire hose — dominated by targeted connector, adds noise (ADR-033)
- Yahoo Finance, MarketWatch, Seeking Alpha, The Register, Ars Technica — removed (ADR-033)
- New ingestion sources without adding to ADR-033 — quality over volume
- Keyword edits that silently re-score historical evidence (C-009)
- Alembic migrations without user awareness — schema changes affect existing data

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI (Python 3.12), async throughout |
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS |
| Vector DB | Qdrant — document embeddings |
| Relational DB | Postgres (SQLAlchemy async + asyncpg) |
| Cache | Redis |
| LLM / Embeddings | Ollama — qwen3:8b (reasoning), nomic-embed-text (embeddings) |
| Infrastructure | Docker Compose |

Visual identity: Accent: violet (`#7C3AED` / `124 58 237`). Chosen for this product; not prescribed by doctrine.
Everything runs locally. Zero API costs.

---

## Information architecture

Three primary surfaces — **Signals / Companies / Portfolio**:

**Signals** (`/signals`) — the Signal Map. Primary surface. Companies ranked by
ICR acceleration. Each row: 12-week ICR sparkline, citation count this week,
delta vs 4w avg, amber "Accelerating" badge when inflecting. Filter: All /
Accelerating. Corpus health footer (classification breakdown + last filing date).
ICR data populates after each 6am PT ingestion run.

**Companies** (`/companies/[name]`) — full company page. ICR card (12-week
sparkline, current ICR, 4w avg, inflecting badge). Corpus trajectory (4-week
doc bar chart). Thesis exposure (by doc count, no confidence %). Full evidence
trail (40 excerpts, filterable by sentiment). No confidence score. No verdict card.

**Portfolio** (`/portfolio`) — Holdings CRUD + gap detection. Gap rows link to
company pages. No confidence %, no alignment score display.

**Legacy surfaces (still live, not linked from primary nav):** `/feed` (daily
briefing + radar-first), `/thesis` (themes list). Feed remains in nav during
transition. Themes removed from nav in Sprint 15.

**Demo** — `/demo` (Signal Map) and `/demo/portfolio`. Public-facing, no auth, static data.
`/demo` mirrors the Signal Map: 12-week ICR bar sparklines, All / Accelerating filter,
same layout as `/signals`. Company deep-dives use CompanyPanel drawer with ICR card
(not the full company page — drawer is intentional in demo context). Sprint 16.

---

## Ingestion pipeline

Daily at 6am PT via scheduler container. Compute runs on remote PC (RTX 3060,
12GB VRAM) via `OLLAMA_URL` in `.env`. Scheduler polls Ollama until ready before
starting (`_wait_for_ollama()`). After ingestion, calls `POST /feed/regenerate`
to pre-warm caches while Ollama is still up.

**Mac must be awake at 6am PT** for the container to fire. Set scheduled wake:
`sudo pmset repeat wakeorpoweron MTWRFSU 05:45:00`

**Sources (post-Phase-0 cleanse):**
- Targeted (TargetedSECConnector): 60 curated tickers across 5 sectors
  - AI Infra (NVDA, AMD, AVGO, MRVL, SMCI, DELL, CSCO, ANET, VRT…)
  - Semiconductor Supply Chain (AMAT, KLAC, LRCX, MU, INTC, TSM…)
  - Energy Grid (ETN, HUBB, PWR, AMPS, GE, NEE…)
  - Defense (LMT, RTX, NOC, GD, KTOS…)
  - Data Center Physical (DLR, EQIX, VRT, IR, JCI…)
- Sector RSS (TRADE_PRESS): Breaking Defense, Utility Dive, EE Times

**Removed (ADR-033):** Generic EDGAR fire hose, Form 4, Yahoo Finance,
MarketWatch, Seeking Alpha, The Register, Ars Technica.

Smart catch-up: if `ingest:done:{date}` Redis key is missing on startup, runs
immediately rather than waiting for the scheduled slot.

---

## Hard constraints

- Frontend changes require Docker image rebuild — no live reload in production container
- Evidence is immutable — re-evaluation is explicit user action (ADR-017)
- ICR is the primary metric — do not re-introduce confidence scores (ADR-031)
- Only PRIMARY_DISCLOSURE and TRADE_PRESS sources are ingested (ADR-033)
- `/no_think` prefix on all latency-sensitive LLM calls — do not remove (ADR-021)
- Constraint vocabulary gate required before creating evidence rows (ADR-034)

---

## How to run

```bash
cd marketmind/infrastructure
export DOCKER_HOST=unix:///Users/karansidhu/.docker/run/docker.sock

# Rebuild backend after code changes
docker compose build backend && docker compose up -d backend

# Rebuild frontend after ANY frontend change (no hot reload — build baked into image)
docker compose build frontend && docker compose up -d frontend

# Check logs
docker compose logs backend --tail=10
docker compose logs ingestor --tail=20

# Manual ingestion
docker exec infrastructure-backend-1 python scripts/ingest.py

# Check evidence counts
docker exec infrastructure-postgres-1 psql -U marketmind -c \
  "SELECT t.name, COUNT(e.id) FROM theses t LEFT JOIN evidence e ON e.thesis_id=t.id GROUP BY t.name;"
```

Login: http://localhost:3001 → admin@marketmind.local / marketmind

---

## Key files

```
marketmind/
  docs/
    roadmap.md                       ← sprint history, near-term plan
    decisions.md                     ← ADR-001 through ADR-030
    concerns.md                      ← C-001 through C-011
  backend/
    app/
      config.py                      ← Settings, model names, admin credentials
      db/models.py                   ← All ORM models
      thesis/
        service.py                   ← ThesisService: CRUD, scoring, radar
        schema.py                    ← ThesisOut, CompanyRadarItem
        seed.py                      ← 5 pre-seeded system theses (keywords critical — C-009)
        delta.py                     ← LanguageDeltaService (30-day window, 6h cache)
        decay.py                     ← weighted_confidence() — 90-day half-life
      feed/service.py                ← FeedService, explain caches, pre-warm logic
      portfolio/service.py           ← Holdings CRUD, alignment scoring, gap detection
      ingestion/
        worker.py                    ← embed → store → score pipeline
        normalise.py                 ← normalise(), is_same_company(), pick_canonical()
        connectors/
          sec_edgar.py               ← generic EDGAR daily feed
          sec_edgar_targeted.py      ← TargetedSECConnector — ticker-specific feeds
          yahoo_finance.py, rss.py
      services/
        llm_service.py               ← OllamaLLMService (/no_think prefix, 300s timeout)
        retrieval_service.py         ← QdrantRetrievalService
        cache_service.py             ← RedisCacheService
      api/
        thesis.py                    ← /theses CRUD, /radar, /confidence-history, /language-delta
        feed.py                      ← /feed, /feed/dates, /feed/regenerate (fires pre-warm)
        companies.py                 ← /companies/{normalised_name}
        portfolio.py                 ← /portfolio/holdings CRUD, /portfolio/alignment
        dependencies.py              ← shared FastAPI dependencies
    scripts/
      ingest.py                      ← manual ingestion
      scheduler.py                   ← daily scheduler, Ollama wait, catch-up, pre-warm call
  frontend/
    app/
      globals.css                    ← CSS vars as RGB triplets (required for Tailwind opacity)
      feed/page.tsx                  ← daily briefing, Explain toggle (SSE), timeline scrubber
      thesis/page.tsx                ← thesis grid
      thesis/[id]/page.tsx           ← thesis detail
      portfolio/page.tsx             ← holdings, alignment, gaps
      demo/page.tsx                  ← public demo, no auth
    components/
      layout/AppShell.tsx            ← auth guard, CompanyPanel mount
      company/CompanyPanel.tsx       ← slide-out drawer (ADR-027)
      feed/SignalCard.tsx            ← signal card, company tag → panel
      feed/CompanyRadar.tsx          ← radar rows, sparklines, alert popover
      thesis/ThesisGridCard.tsx      ← grid card with auto-fetched sparkline
    contexts/CompanyContext.tsx      ← openCompany/closeCompany global state
    lib/
      api.ts                         ← all API calls
      types.ts                       ← all TypeScript interfaces
      utils.ts                       ← formatConfidence, formatDate, timeAgo, cn
  infrastructure/
    docker-compose.yml               ← all containers, restart: unless-stopped
  .env                               ← DATABASE_URL, REDIS_URL, QDRANT_URL, OLLAMA_URL, JWT_SECRET
```

---

## Architecture decisions

- **ADR-005** — nomic-embed-text (embeddings), qwen3:8b (reasoning)
- **ADR-010** — Postgres (state), Qdrant (vectors), Redis (cache)
- **ADR-011** — 15% keyword threshold gates LLM calls — avoids O(docs × theses) cost
- **ADR-012** — Confidence = supporting / total evidence (interpretable)
- **ADR-015** — Epistemic tiers: Primary / Derived / Synthesized
- **ADR-017** — Evidence immutable; re-evaluation is explicit user action
- **ADR-019** — Company name normalisation via normalise.py + pick_canonical()
- **ADR-020** — Radar ranks by unique source documents, not mention count
- **ADR-021** — `/no_think` prefix disables qwen3 chain-of-thought on hot paths
- **ADR-022** — Explain/Data mode: interpretation toggle, not density toggle
- **ADR-023** — Portfolio: thesis alignment framing, never buy/sell
- **ADR-024** — Supply chain extraction deprioritised (code retained)
- **ADR-025** — Insider transaction tracking deprioritised (code retained)
- **ADR-026** — Corpus targeting is highest-leverage infrastructure investment
- **ADR-027** — Company deep-dive: global React context (deprecated in Sprint 14, see ADR-036)
- **ADR-028** — Timeline scrubber: radar always live, feed content is historical
- **ADR-029** — Ingestor invalidates feed via direct Redis key deletion (not HTTP)
- **ADR-030** — Multi-thesis LLM scoring planned (deferred pending ICR rebuild)
- **ADR-031** — ICR replaces confidence score as primary intelligence metric
- **ADR-032** — Source type: PRIMARY_DISCLOSURE vs TRADE_PRESS
- **ADR-033** — Corpus quality cleanse: noisy sources removed
- **ADR-034** — Constraint vocabulary gate: constraint language required, not just topic presence
- **ADR-035** — Signal Map replaces Feed + Radar as primary surface
- **ADR-036** — Company surface as full page, not slide-out panel
- **ADR-037** — Trajectory inflection alerts replace static threshold alerts

---

## Known concerns

| ID | Severity | Status | Issue |
|----|----------|--------|-------|
| C-001 | High | Partial | Corpus relevance — targeted ingestion live, still growing |
| C-003 | High | Open | Relationship extraction reliability (deprioritised ADR-024) |
| C-004 | Medium | Partial | Large-cap radar dominance |
| C-008 | High | Open | Uncertainty propagation: inference chain errors compound silently |
| C-009 | High | Open | Thesis semantic drift: keyword edits silently inflate confidence |
| C-002 | Medium | Open | Discovery gap: signals outside defined theses invisible |
| C-005 | Medium | Open | Signal inflation: LLM summarises even when nothing happened |
| C-007 | — | ✅ | Company name normalisation |
| C-010 | — | ✅ | Temporal decay (90-day half-life) |
| C-011 | — | ✅ | Feed provenance (evidence_ids in ThesisSignal) |
