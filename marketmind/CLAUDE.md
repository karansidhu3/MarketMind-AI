# MarketMind AI — Claude Context

Read this first. It gives you everything needed to continue working on this project
without asking the user to re-explain context.

---

## What this project is

MarketMind is a **persistent investment intelligence platform** that runs entirely
locally (no paid APIs). Core goal: surface unknown companies and track investment
thesis confidence **before signals become mainstream** — not after.

The key differentiator from asking Claude or ChatGPT directly:
**memory across time**. MarketMind ingests SEC filings and news daily, scores
them against tracked investment theses, and builds a compounding corpus that no
one-shot LLM query can replicate. It knows what signals appeared six weeks ago
versus today. A company appearing in 2 filings in March → 8 in April → 19 in May
is a signal you cannot get from a search.

**The daily use case:** 2-minute morning check. What changed in my thesis
trajectories. Which unknown companies are accelerating. How that maps to my
portfolio. In plain English, without jargon.

**The user's portfolio goal:** eventually link holdings so MarketMind can surface
alignment gaps — "Power Grid thesis rising, you have minimal exposure in this sector;
Powell Industries has appeared in 12 independent filings and you don't hold it."

---

## Product direction (post product review — Sprint 6 onwards)

**Deprioritised (not extending further):**
- Supply chain extraction — systematic LLM errors compound as false positives;
  see ADR-024. Code exists but won't be extended.
- Insider transaction clustering (Form 4) — commodity signal, no differentiation;
  see ADR-025. Code exists but won't be extended.
- Research endpoint — stateless synthesis, doesn't use the temporal layer.
  Retained but not a focus.

**Core compounding features (all effort goes here):**
- Company radar with trajectory (velocity of emergence, not just current rank)
- Thesis confidence trends over time (direction and duration)
- Explain mode: LLM interprets trend narrative from corpus history (not today's docs)
- Language delta auto-surfaced in feed (not buried in thesis detail)
- Portfolio layer: holdings → thesis alignment scores → exposure gaps

**Resume framing for interviews:**
- Local LLM pipeline at production scale (Ollama, Docker, daily ingestion scheduler)
- Temporal intelligence: not retrieval, but signal tracking across months
- Architecture decisions defensible in interview (see docs/decisions.md ADR-001 through ADR-026)
- Portfolio integration connecting personal holdings to an independently built corpus

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI (Python 3.12), async throughout |
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS |
| Vector DB | Qdrant — stores document embeddings |
| Relational DB | Postgres (SQLAlchemy async + asyncpg) |
| Cache | Redis |
| LLM / Embeddings | Ollama (local) — qwen3:8b for reasoning, nomic-embed-text for embeddings |
| Infrastructure | Docker Compose |

Everything runs locally. Zero API costs.

---

## Current sprint: Sprint 8 — Resume Ready + Demo Polish

Sprints 1–7 complete. Sprint 8 in progress.

### What has been built (Sprints 1–8 partial)

**Sprint 1** — Infrastructure: FastAPI, Next.js, Docker, Qdrant, Redis, Ollama.

**Sprint 2** — Knowledge ingestion: SEC EDGAR (8-K, 10-Q, 10-K, Form 4), Yahoo Finance,
RSS connectors. Embeddings via nomic-embed-text. Qdrant storage. UUID5 deduplication.

**Sprint 3** — Research workflow: query expansion, retrieval, reranking, LLM synthesis.

**Sprint 4** — Bottleneck intelligence:
- Postgres live — all tables created
- 5 system theses seeded at startup
- Thesis scoring pipeline (keyword overlap → LLM sentiment classification)
- Supply chain extractor (not extending further — ADR-024)
- Form 4 connector (not extending further — ADR-025)
- Company radar (GET /theses/radar) — unique source document ranking
- Daily feed with Redis cache (25h TTL)
- Daily ingestor container with scheduler

**Sprint 5** — Thesis deepening + UI overhaul:
- Opposing evidence surfacing (top 2 pinned with ShieldAlert)
- Confidence sparkline (30-day SVG trend)
- Radar ranking fixed (COUNT DISTINCT document_id)
- Company name normalisation (normalise.py + pick_canonical)
- Language shift detector (GET /theses/{id}/language-delta, 6h cache)
- On-demand corpus re-evaluation (POST /theses/{id}/evaluate, BackgroundTask)
- Supply chain tab on thesis detail
- Dark/light mode (next-themes, CSS vars as RGB triplets)
- Toast notification system (ToastProvider + useToast hook in layout)
- Feed hero section (LLM summary as full-width briefing with stat pills)
- Skeleton loading (HeroSkeleton, SignalCardSkeleton, RadarRowSkeleton)
- "NEW" badge on radar (companies first seen within 7 days)

**Sprint 6** — Intelligence surfacing (all complete ✅):
- Feed provenance C-011 — evidence_ids in ThesisSignal, thesis detail highlights feed records
- Temporal decay C-010 — decay.py, 90-day half-life, applied in ThesisService + FeedService
- Explain/Data mode ADR-022 — per-thesis LLM narrative from corpus history, toggle in hero
- Auto language delta in feed — language_shift field surfaced inline per signal
- Company alert thresholds — bell icon on radar, threshold popover, feed triggered section
- Radar 4-week sparkline — SVG trend on every radar row

**Sprint 7** — Portfolio layer (complete ✅):
- Holding model (ticker, shares, cost_basis) — auto-created in Postgres on startup
- PortfolioService — holdings CRUD, thesis alignment, gap detection (doc_count × confidence rank)
- GET/POST /portfolio/holdings, PATCH/DELETE /portfolio/holdings/{id}, GET /portfolio/alignment
- Portfolio page — holdings table, coverage banner, thesis exposure cards, gap list

**Sprint 8** — Resume ready (in progress):
- UI overhaul — sidebar → glassmorphism top nav; login redesign; dual-color confidence bars
- Corpus targeting — TargetedSECConnector + 60 curated tickers across 5 thesis sectors
- Company deep-dive panel — slide-out drawer (ADR-027), GET /companies/{normalised_name}
- Feed timeline scrubber — prev/next arrows, date picker, GET /feed/dates (ADR-028)
- Intelligence Briefing redesign — activity badge, ThesisPulseCards, top-signal quote,
  streaming Explain mode (SSE token-by-token), pre-warm caches after regeneration
- Per-connector Redis checkpointing — restarts skip completed connectors (25h TTL)
- Public demo mode ✅ — /demo route, static sample data, no login required;
  DemoShell + DemoHeader; "Try demo" link on login page (app/demo/page.tsx + data.ts)

### Sprint 8 remaining

- **Mobile-responsive feed** — minimum viable mobile layout for morning check
- **Thesis export** — one-click PDF/text summary per thesis

### Ingestion sources (scripts/ingest.py)
Generic feeds:
- SEC EDGAR: 8-K (40), 10-Q (20), 10-K (10), Form 4 (40)
- Yahoo Finance: ~60 tickers across all thesis sectors
- MarketWatch RSS, Seeking Alpha RSS

Targeted connectors (TargetedSECConnector, added Sprint 8):
- AI Infra (NVDA, AMD, AVGO, MRVL, SMCI, DELL, CSCO, ANET, VRT…)
- Semiconductor Supply Chain (AMAT, KLAC, LRCX, MU, INTC, TSM…)
- Energy Grid (ETN, HUBB, PWR, AMPS, GE, NEE…)
- Defense (LMT, RTX, NOC, GD, KTOS…)
- Data Center Physical (DLR, EQIX, VRT, IR, JCI…)

Daily schedule: ingestor container fires at INGEST_HOUR_UTC (default 06:00 UTC).
Smart catch-up: if today's run hasn't happened (Redis key `ingest:done:{date}` missing),
it runs immediately on container start — no need to be on at 06:00.

---

## How to rebuild and run

```bash
cd marketmind/infrastructure

# Docker socket — needed on some machines
export DOCKER_HOST=unix:///Users/karansidhu/.docker/run/docker.sock

# Pull correct model (first time only)
docker exec infrastructure-ollama-1 ollama pull qwen3:8b

# Rebuild backend after code changes
docker compose build backend && docker compose up -d backend

# Rebuild frontend after code changes (REQUIRED — production build baked into image)
docker compose build frontend && docker compose up -d frontend

# Check both started cleanly
docker compose logs backend --tail=10
docker compose logs frontend --tail=5

# Run ingestion manually (20-40 min first time)
docker exec infrastructure-backend-1 python scripts/ingest.py

# Check ingestor schedule
docker compose logs ingestor --tail=5

# Check thesis evidence counts
docker exec infrastructure-postgres-1 psql -U marketmind -c \
  "SELECT t.name, COUNT(e.id) FROM theses t LEFT JOIN evidence e ON e.thesis_id=t.id GROUP BY t.name;"

# Check company radar
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@marketmind.local","password":"marketmind"}' \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['access_token'])")
curl -s "http://localhost:8000/theses/radar?min_docs=1" -H "Authorization: Bearer $TOKEN"
```

**Login:** http://localhost:3001 → admin@marketmind.local / marketmind

**Critical note:** The frontend is a production build baked into the Docker image.
Any frontend file change requires `docker compose build frontend && docker compose up -d frontend`.
There is no hot-reload in the running container.

---

## Key file locations

```
marketmind/
  CLAUDE.md                          ← this file (always read first)
  docs/
    roadmap.md                       ← vision, sprint history, near-term plan
    decisions.md                     ← ADR-001 through ADR-028
    concerns.md                      ← C-001 through C-011, known issues + status
  backend/
    app/
      config.py                      ← Settings (model names, URLs, admin creds default)
      main.py                        ← FastAPI lifespan, registers all routers
      db/
        session.py                   ← SQLAlchemy engine + session factory
        models.py                    ← all ORM models (Holding added Sprint 7)
      thesis/
        service.py                   ← ThesisService: CRUD, scoring, radar (normalised),
                                        evaluate_against_corpus (background)
        schema.py                    ← ThesisOut, CompanyRadarItem (normalised_name added Sprint 8)
        seed.py                      ← 5 pre-seeded system theses
        delta.py                     ← LanguageDeltaService (30-day window comparison, 6h cache)
        decay.py                     ← weighted_confidence() — 90-day half-life exponential decay
      feed/
        service.py                   ← FeedService (feed generation, Redis cache, _write_snapshots)
      supply_chain/
        extractor.py                 ← LLM supply chain extraction (not extending — ADR-024)
      portfolio/
        service.py                   ← holdings CRUD, alignment scoring, gap detection
        schema.py                    ← HoldingOut, ThesisExposure, GapCompany, PortfolioAlignment
      ingestion/
        worker.py                    ← IngestionWorker (embed → store → score → extract)
        normalise.py                 ← normalise(), is_same_company(), pick_canonical()
        connectors/
          sec_edgar.py               ← generic EDGAR daily feed
          sec_edgar_targeted.py      ← TargetedSECConnector — ticker-specific EDGAR feeds (Sprint 8)
          form4.py, yahoo_finance.py, rss.py
      services/
        llm_service.py               ← OllamaLLMService: /no_think prefix, 300s timeout
        retrieval_service.py         ← QdrantRetrievalService: search + scroll_all()
        cache_service.py             ← RedisCacheService
      api/
        thesis.py                    ← /theses CRUD + /radar + /evidence + /confidence-history
                                        + /language-delta + /evaluate (BackgroundTasks)
        feed.py                      ← /feed, /feed/dates, /feed/{date}, /feed/regenerate
        companies.py                 ← /companies/{normalised_name} — deep-dive panel (Sprint 8)
        portfolio.py                 ← /portfolio/holdings CRUD + /portfolio/alignment
        research.py                  ← /research (days_back param)
        supply_chain.py              ← /supply-chain/{company}
        dependencies.py              ← get_llm, get_retrieval, get_thesis_service,
                                        get_feed_service, get_cache, get_session_factory
    scripts/
      ingest.py                      ← manual ingestion (generic + 5 targeted connectors)
      scheduler.py                   ← daily scheduler, catch-up logic, POST /feed/regenerate
    requirements.txt
  frontend/
    app/
      layout.tsx                     ← ThemeProvider + ToastProvider, suppressHydrationWarning
      globals.css                    ← CSS vars as RGB triplets (enables bg-green/10 etc.)
      (auth)/
        layout.tsx                   ← ambient glow blobs + dot-grid background
        login/page.tsx               ← glassmorphism card, JWT login → localStorage mm_token;
                                        "Try demo" link → /demo
      demo/
        page.tsx                     ← public demo page (no auth), uses DemoShell + static data
        data.ts                      ← DEMO_FEED, DEMO_RADAR, DEMO_NARRATIVES — sample data
      feed/page.tsx                  ← hero, Data/Explain toggle (SSE streaming), timeline scrubber,
                                        SignalCard feed, CompanyRadar, ThesisPulseCards
      thesis/
        page.tsx                     ← thesis list + inline create form
        [id]/page.tsx                ← thesis detail (sparkline, counter-arg, delta,
                                        supply chain tab, re-evaluate button with toast)
      portfolio/page.tsx             ← holdings table, coverage banner, exposure cards, gap list
      research/page.tsx              ← query + time filters + elapsed timer + results
    components/
      layout/
        AppShell.tsx                 ← auth guard, CompanyProvider wrapper, CompanyPanel mount
        DemoShell.tsx                ← public shell (no auth check), DemoHeader with "Sign in" CTA
        Header.tsx                   ← glassmorphism top nav, feed/thesis/portfolio/research links
      company/
        CompanyPanel.tsx             ← slide-out drawer: trajectory chart, thesis breakdown,
                                        evidence list (ADR-027)
      feed/
        SignalCard.tsx               ← full/compact signal card, company tag click → panel
        CompanyRadar.tsx             ← relative-strength bars, sparkline, alert popover
      ui/Toast.tsx                   ← ToastProvider + useToast hook + ToastItem
      ThemeProvider.tsx              ← next-themes, defaultTheme="dark", attribute="class"
    contexts/
      CompanyContext.tsx             ← openCompany/closeCompany global state (ADR-027)
    lib/
      api.ts                         ← all API calls (getCompany, getFeedDates added Sprint 8)
      types.ts                       ← all TypeScript interfaces
      utils.ts                       ← formatConfidence, formatDate, formatDateShort, cn, greet
    tailwind.config.js               ← rgb(var(--color) / <alpha-value>) pattern throughout
    next.config.js                   ← output: "standalone" (required for Docker build)
  infrastructure/
    docker-compose.yml               ← postgres, redis, qdrant, ollama, backend, ingestor, frontend
                                       all containers: restart: unless-stopped
  .env                               ← DATABASE_URL, REDIS_URL, QDRANT_URL, OLLAMA_URL, JWT_SECRET
  .claude/launch.json                ← preview server config (npm --prefix frontend run dev, port 3001)
```

---

## Architecture decisions (summary — full detail in docs/decisions.md)

- **ADR-005** — Models: nomic-embed-text (embeddings), qwen3:8b (reasoning)
- **ADR-010** — Postgres for persistent state; Qdrant for vectors; Redis for cache
- **ADR-011** — Keyword threshold (15%) gates LLM calls to avoid O(docs × theses) cost
- **ADR-012** — Confidence = supporting / total evidence (interpretable, not cosine mean)
- **ADR-015** — Epistemic tiers (Primary / Derived / Synthesized) not numeric propagation
- **ADR-017** — Evidence is immutable; re-evaluation is explicit user action
- **ADR-019** — Company name normalisation: normalise.py + radar groups by normalised_name
- **ADR-020** — Radar ranks by unique source documents, not raw mention count
- **ADR-021** — `/no_think` prefix disables qwen3 chain-of-thought on latency-sensitive paths
- **ADR-022** — Explain/Data mode: interpretation toggle, not density toggle
- **ADR-023** — Portfolio integration: thesis alignment framing, not buy/sell recommendations
- **ADR-024** — Supply chain extraction deprioritised (code retained, not extended)
- **ADR-025** — Insider transaction tracking deprioritised (code retained, not extended)
- **ADR-026** — Corpus targeting is the highest-leverage infrastructure investment
- **ADR-027** — Company deep-dive uses global React context; hook must be called inside provider tree
- **ADR-028** — Timeline scrubber: radar always live, only feed content is historical

---

## Known concerns (summary — full detail in docs/concerns.md)

High severity — open:
- **C-003** Relationship extraction reliability (deprioritised per ADR-024)
- **C-008** Uncertainty propagation: inference chain errors compound silently
- **C-009** Thesis semantic drift: expanding keywords silently inflates confidence

High severity — partially addressed:
- **C-001** Corpus relevance: targeted ingestion live (60 tickers, 5 sectors), corpus growing
- **C-004** Company radar large-cap dominance: doc_count + normalisation helps;
  static exclusion list still outstanding

Medium severity — open:
- **C-002** Discovery gap: signals outside defined theses are invisible
- **C-005** Signal inflation: LLM forced to summarise even when nothing happened

Resolved:
- **C-007** Company name normalisation ✅
- **C-010** Temporal decay ✅ — decay.py, 90-day half-life, applied in thesis + feed services
- **C-011** Feed provenance ✅ — evidence_ids in ThesisSignal, thesis detail deep-links from feed

---

## What not to do without discussion

- Do not add new ingestion sources without checking C-001 — relevance > volume
- Do not change the confidence formula without updating ADR-012 and concerns.md
- Do not allow keyword edits to silently re-score historical evidence (C-009)
- Do not extend supply chain extraction — deprioritised per ADR-024
- Do not extend insider transaction tracking — deprioritised per ADR-025
- Do not generate buy/sell recommendations — thesis alignment framing only (ADR-023)
- Do not run Alembic migrations without user awareness — schema changes affect existing data
- Frontend changes require Docker image rebuild — there is no live reload in production container
