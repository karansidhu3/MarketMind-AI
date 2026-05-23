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

## Current sprint: Sprint 6 — Intelligence Surfacing

Sprint 5 is complete. Sprint 6 starts now.

### What has been built (Sprints 1–5 complete)

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
- Brief/Full toggle on feed page (compact vs full signal cards)
- "NEW" badge on radar (companies first seen within 7 days)
- Improved empty states with guidance text

### Sprint 6 priorities (in order)

1. **Feed provenance** (C-011) — evidence record IDs in feed signals. Small backend
   change, high traceability value. Completes Sprint 5 remaining.

2. **Temporal decay** (C-010) — recency weighting so evidence from 18 months ago
   doesn't count the same as evidence from yesterday.

3. **Explain / Data mode** (ADR-022) — replaces Brief/Full. "Data" = current technical
   cards. "Explain" = LLM generates 2-3 plain English sentences per thesis interpreting
   the trend using corpus history (not today's documents). Toggle scoped to feed page.

4. **Auto language delta in feed** — surface one meaningful language shift per thesis
   directly in the feed, no click required. Currently buried in thesis detail.

5. **Company alert threshold** — user sets doc_count threshold per radar company,
   gets notified in feed when it's crossed.

6. **Radar trajectory view** — show 4-week doc_count trend alongside current count.
   The curve is more informative than the number.

### Sprint 7 (next)

Portfolio layer: holdings input → thesis alignment score → exposure gap detection →
portfolio-aware feed. See ADR-023 for framing decisions (alignment gaps, not buy/sell).

---

### Ingestion sources (scripts/ingest.py)
- SEC EDGAR: 8-K (40), 10-Q (20), 10-K (10), Form 4 (40)
- Yahoo Finance: ~20 tickers across AI/infrastructure sectors
- MarketWatch RSS, Seeking Alpha RSS

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
    decisions.md                     ← ADR-001 through ADR-026
    concerns.md                      ← C-001 through C-011, known issues + status
  backend/
    app/
      config.py                      ← Settings (model names, URLs, admin creds default)
      main.py                        ← FastAPI lifespan, registers all routers
      db/
        session.py                   ← SQLAlchemy engine + session factory
        models.py                    ← all ORM models
      thesis/
        service.py                   ← ThesisService: CRUD, scoring, radar (normalised),
                                        evaluate_against_corpus (background)
        schema.py                    ← ThesisOut, CompanyRadarItem (has doc_count field)
        seed.py                      ← 5 pre-seeded system theses
        delta.py                     ← LanguageDeltaService (30-day window comparison, 6h cache)
      feed/
        service.py                   ← FeedService (feed generation, Redis cache, _write_snapshots)
      supply_chain/
        extractor.py                 ← LLM supply chain extraction (not extending — ADR-024)
      ingestion/
        worker.py                    ← IngestionWorker (embed → store → score → extract)
        normalise.py                 ← normalise(), is_same_company(), pick_canonical()
        connectors/
          sec_edgar.py, form4.py, yahoo_finance.py, rss.py
      services/
        llm_service.py               ← OllamaLLMService: /no_think prefix, 300s timeout
        retrieval_service.py         ← QdrantRetrievalService: search + scroll_all()
        cache_service.py             ← RedisCacheService
      api/
        thesis.py                    ← /theses CRUD + /radar + /evidence + /confidence-history
                                        + /language-delta + /evaluate (BackgroundTasks)
        feed.py                      ← /feed endpoints
        research.py                  ← /research (days_back param)
        supply_chain.py              ← /supply-chain/{company}
        dependencies.py              ← get_llm, get_retrieval, get_thesis_service,
                                        get_feed_service, get_cache, get_session_factory
    scripts/
      ingest.py                      ← manual ingestion (runs all connectors)
      scheduler.py                   ← daily scheduler + calls POST /feed/regenerate after ingest
    requirements.txt
  frontend/
    app/
      layout.tsx                     ← ThemeProvider + ToastProvider, suppressHydrationWarning
      globals.css                    ← CSS vars as RGB triplets (enables bg-green/10 etc.)
      (auth)/login/page.tsx          ← JWT login → localStorage mm_token
      feed/page.tsx                  ← hero section, skeleton loading, Brief/Full toggle,
                                        SignalCard feed, CompanyRadar
      thesis/
        page.tsx                     ← thesis list + inline create form
        [id]/page.tsx                ← thesis detail (sparkline, counter-arg, delta,
                                        supply chain tab, re-evaluate button with toast)
      research/page.tsx              ← query + time filters + elapsed timer + results
    components/
      layout/AppShell.tsx            ← auth guard + sidebar wrapper
      layout/Sidebar.tsx             ← nav links + Sun/Moon theme toggle
      feed/SignalCard.tsx            ← signal card with compact prop (Brief/Full mode)
      feed/CompanyRadar.tsx          ← relative-strength bars, doc_count, NEW badge
      ui/Toast.tsx                   ← ToastProvider + useToast hook + ToastItem
      ThemeProvider.tsx              ← next-themes, defaultTheme="dark", attribute="class"
    lib/
      api.ts                         ← all API calls
      types.ts                       ← all TypeScript interfaces
      utils.ts                       ← formatConfidence, formatDate, formatDateShort, cn, greet
    tailwind.config.js               ← rgb(var(--color) / <alpha-value>) pattern throughout
    next.config.js                   ← output: "standalone" (required for Docker build)
  infrastructure/
    docker-compose.yml               ← postgres, redis, qdrant, ollama, backend, ingestor, frontend
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

---

## Known concerns (summary — full detail in docs/concerns.md)

High severity — open:
- **C-003** Relationship extraction reliability (deprioritised per ADR-024)
- **C-008** Uncertainty propagation: inference chain errors compound silently
- **C-009** Thesis semantic drift: expanding keywords silently inflates confidence

High severity — partially addressed:
- **C-004** Company radar large-cap dominance: doc_count + normalisation helps;
  static exclusion list still outstanding

Medium severity — open:
- **C-001** Corpus relevance: EDGAR public feed returns wrong sectors (existential)
- **C-002** Discovery gap: signals outside defined theses are invisible
- **C-005** Signal inflation: LLM forced to summarise even when nothing happened
- **C-010** Temporal decay: old evidence weighted same as recent
- **C-011** Feed provenance: feed signals don't link to specific evidence IDs

Resolved:
- **C-007** Company name normalisation ✅

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
