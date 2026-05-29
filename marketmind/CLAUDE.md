# MarketMind AI — Claude Context

Read this first. Single source of truth for project state, constraints, and decisions.
Sprint history lives in `docs/roadmap.md`. Full ADR detail in `docs/decisions.md`.

---

## What this product is

MarketMind is a **persistent investment intelligence platform** that runs entirely
locally (no paid APIs). Core goal: surface unknown companies and track investment
thesis confidence **before signals become mainstream** — not after.

Key differentiator from a one-shot LLM query: **memory across time**. A company
appearing in 2 filings in March → 8 in April → 19 in May is a signal no search
can surface. MarketMind ingests SEC filings and news daily, scores them against
tracked theses, and builds a compounding corpus.

**Daily use case:** 2-minute morning check. What changed in thesis trajectories.
Which unknown companies are accelerating. How that maps to the portfolio.

**Portfolio goal:** Link holdings so MarketMind can surface alignment gaps —
"Power Grid thesis rising, you have minimal exposure; Powell Industries has
appeared in 12 independent filings and you don't hold it."

---

## What NOT to build

- Supply chain extraction — LLM errors compound as false positives (ADR-024)
- Insider transaction clustering — commodity signal, no differentiation (ADR-025)
- Buy/sell recommendations — thesis alignment framing only (ADR-023)
- Gamification, streaks, usage counts, rankings, cost visibility
- New ingestion sources without checking C-001 — relevance > volume
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

Three primary surfaces — **Feed / Themes / Portfolio**:

**Feed** — daily briefing. Thesis signals ranked by confidence, company radar
(acceleration-first), Explain narrative (SSE streaming, pre-warmed post-ingestion).
Defaults to Explain mode. Timeline scrubber reveals historical dates.

**Themes** — 2-column grid of thesis cards with 14-day confidence sparklines and
health badges. Thesis detail: evidence list, opposing signals, language delta,
corpus search tab, re-evaluate button.

**Portfolio** — holdings with ticker autocomplete, thesis alignment scores,
exposure gap detection, momentum narrative per holding.

**Company panel** — global slide-out drawer (ADR-027) accessible from any company
name across all surfaces. Shows trajectory, thesis breakdown, evidence list.

**Demo** — `/demo` route, no auth, static sample data. Public-facing.

---

## Ingestion pipeline

Daily at 6am PT via scheduler container. Compute runs on remote PC (RTX 3060,
12GB VRAM) via `OLLAMA_URL` in `.env`. Scheduler polls Ollama until ready before
starting (`_wait_for_ollama()`). After ingestion, calls `POST /feed/regenerate`
to pre-warm all Explain caches while Ollama is still up.

**Sources:**
- Generic: SEC EDGAR 8-K (40), 10-Q (20), 10-K (10), Form 4 (40)
- Yahoo Finance (~60 tickers), MarketWatch RSS, Seeking Alpha RSS
- Targeted (TargetedSECConnector): 60 curated tickers across 5 sectors
  - AI Infra (NVDA, AMD, AVGO, MRVL, SMCI, DELL, CSCO, ANET, VRT…)
  - Semiconductor Supply Chain (AMAT, KLAC, LRCX, MU, INTC, TSM…)
  - Energy Grid (ETN, HUBB, PWR, AMPS, GE, NEE…)
  - Defense (LMT, RTX, NOC, GD, KTOS…)
  - Data Center Physical (DLR, EQIX, VRT, IR, JCI…)
- Sector RSS: Breaking Defense, Utility Dive, EE Times, The Register, Ars Technica

Smart catch-up: if `ingest:done:{date}` Redis key is missing on startup, runs
immediately rather than waiting for the scheduled slot.

---

## Hard constraints

- Frontend changes require Docker image rebuild — no live reload in production container
- Evidence is immutable — re-evaluation is explicit user action (ADR-017)
- Confidence formula: `supporting / total_evidence_count` — changing it requires updating ADR-012
- `/no_think` prefix on all latency-sensitive LLM calls — do not remove (ADR-021)
- Company radar ranks by unique source documents, not mention count (ADR-020)

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
- **ADR-027** — Company deep-dive: global React context; hook inside provider tree
- **ADR-028** — Timeline scrubber: radar always live, feed content is historical
- **ADR-029** — Ingestor invalidates feed via direct Redis key deletion (not HTTP)
- **ADR-030** — Multi-thesis LLM scoring planned (one generate call per doc, all theses)

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
