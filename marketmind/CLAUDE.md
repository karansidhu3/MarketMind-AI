# MarketMind AI — Claude Context

Read this first. It gives you everything needed to continue working on this project
without asking the user to re-explain context.

---

## What this project is

MarketMind is a **persistent investment intelligence platform** that runs entirely
locally (no paid APIs). The core goal: find investment opportunities — specifically
supply chain bottlenecks and unknown companies — **before they become obvious**.

The key differentiator from asking Claude or ChatGPT directly:
**memory across time**. MarketMind ingests SEC filings, news, and insider
transactions daily, scores them against tracked investment theses, extracts supply
chain relationships, and builds a compounding corpus that no one-shot LLM query
can replicate. It knows what signals appeared six weeks ago versus today.

The user's actual goal: identify bottlenecks (power, semiconductors, grid
infrastructure, defense) and surface unknown companies in those supply chains
before analysts write about them.

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

## Current sprint: Sprint 5 — Thesis Deepening (in progress)

### What has been built (Sprints 1–5)

**Sprint 1** — Infrastructure: FastAPI, Next.js, Docker, Qdrant, Redis, Ollama, health endpoints.

**Sprint 2** — Knowledge ingestion: SEC EDGAR (8-K), Yahoo Finance, RSS connectors.
Embeddings via nomic-embed-text. Qdrant storage. UUID5 deduplication.

**Sprint 3** — Research workflow: query expansion, retrieval, reranking
(similarity × credibility × keyword overlap), LLM synthesis, structured responses.

**Sprint 4** — Bottleneck intelligence:
- Postgres live — tables: theses, evidence, company_signals, supply_chain_links,
  insider_transactions, daily_feeds, confidence_snapshots
- 5 system theses seeded at startup
- Thesis scoring pipeline (keyword overlap → LLM sentiment classification)
- Supply chain extractor (LLM extracts supplier/customer/partner from 10-K/10-Q)
- Form 4 connector (SEC insider transaction filings, buy clusters in feed)
- Company radar (`GET /theses/radar`) — ranked by unique source documents
- Daily feed (`GET /feed`) — thesis momentum, new companies, insider clusters, LLM summary
- Daily ingestor container — scheduler.py triggers ingest.py at INGEST_HOUR_UTC (default 06:00 UTC)
- Redis cache (RedisCacheService)
- Model corrected: llama3.2 → qwen3:8b

**Sprint 4 completions (pre-Sprint 5):**
- `/no_think` prefix on LLM prompts disables qwen3 chain-of-thought (cuts 60–180s → 5–20s)
- httpx.Timeout(300.0, connect=10.0) — separate connect/read timeouts
- Date-scoped research: `days_back` param on `/research` filters Qdrant by created_at
- Auto-regenerate feed after ingestion (scheduler.py calls `POST /feed/regenerate`)
- Confidence snapshots: one row per thesis per day written after each feed generation
- Supply chain query endpoint: `GET /supply-chain/{company}` (case-insensitive partial match)
- Full frontend: login, feed, thesis list + create, thesis detail, research pages

**Sprint 5 — Thesis Deepening (current):**
- ✅ Opposing evidence surfacing: top 2 opposing records pinned with ShieldAlert in thesis detail
- ✅ Confidence sparkline: 30-day SVG trend shown in thesis stats row
- ✅ Radar ranking fixed: `COUNT(DISTINCT document_id)` replaces raw mention sum
- ✅ Company name normalisation: radar groups by `normalised_name`, uses `pick_canonical()`
  so "Eaton Corporation plc" + "Eaton Corporation" → single entry, correct counts
- ✅ Language shift detector: `GET /theses/{id}/language-delta` — compares two 30-day windows,
  returns appeared/disappeared/intensified themes + summary. Cached 6h. Returns
  `insufficient_data` until corpus spans 60 days (auto-activates, no code change needed)
- ✅ On-demand corpus re-evaluation: `POST /theses/{id}/evaluate` rescores entire Qdrant
  corpus against one thesis as a FastAPI BackgroundTask (returns 202 immediately)
- ✅ Supply chain tab on thesis detail: search any company, see extracted relationships
- ✅ Dark/light mode toggle (next-themes, CSS custom properties as RGB triplets)

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

# Check company radar (no auth needed for this curl trick)
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
    decisions.md                     ← ADR-001 through ADR-021
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
        extractor.py                 ← LLM supply chain relationship extraction
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
      layout.tsx                     ← ThemeProvider, suppressHydrationWarning on <html>
      globals.css                    ← CSS vars as RGB triplets (enables bg-green/10 etc.)
      (auth)/login/page.tsx          ← JWT login → localStorage mm_token
      feed/page.tsx                  ← SignalCard feed + CompanyRadar
      thesis/
        page.tsx                     ← thesis list + inline create form
        [id]/page.tsx                ← full thesis detail (sparkline, counter-arg, delta,
                                        supply chain tab, re-evaluate button)
      research/page.tsx              ← query + time filters + elapsed timer + results
    components/
      layout/AppShell.tsx            ← auth guard + sidebar wrapper
      layout/Sidebar.tsx             ← nav links + Sun/Moon theme toggle
      feed/SignalCard.tsx            ← color-coded signal card (green/amber/red by momentum)
      feed/CompanyRadar.tsx          ← relative-strength bars, doc_count as primary metric
      ThemeProvider.tsx              ← next-themes, defaultTheme="dark", attribute="class"
    lib/
      api.ts                         ← all API calls including getSupplyChain,
                                        getConfidenceHistory, getLanguageDelta, evaluateThesis
      types.ts                       ← all TypeScript interfaces
      utils.ts                       ← formatConfidence, formatDate, formatDateShort, cn
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
- **ADR-013** — Supply chain extraction only on 10-K/10-Q and credibility ≥ 0.85 docs
- **ADR-015** — Epistemic tiers (Primary / Derived / Synthesized) not numeric propagation
- **ADR-017** — Evidence is immutable; re-evaluation is explicit user action
- **ADR-018** — Relationships need 3+ independent sources to be treated as established
- **ADR-019** — Company name normalisation: normalise.py + radar groups by normalised_name
- **ADR-020** — Radar ranks by unique source documents, not raw mention count (ADR-019 companion)
- **ADR-021** — `/no_think` prefix disables qwen3 chain-of-thought on latency-sensitive paths

---

## Known concerns (summary — full detail in docs/concerns.md)

High severity — open:
- **C-003** Relationship extraction reliability: systematic LLM errors compound silently
- **C-008** Uncertainty propagation: inference chain errors compound into confident wrong signals
- **C-009** Thesis semantic drift: expanding keywords silently inflates confidence scores

High severity — partially addressed:
- **C-004** Company radar large-cap dominance: doc_count ranking + normalisation helps;
  large-cap exclusion list still outstanding

Medium severity — open:
- **C-002** Discovery gap: signals outside defined theses are invisible
- **C-005** Signal inflation: LLM forced to summarise even when nothing meaningful happened
- **C-006** Data model brittleness: keyword scoring, sentiment enum, supply chain model
- **C-010** Temporal decay missing: old evidence weighted same as recent
- **C-011** Feed provenance gap: feed signals don't link back to specific evidence record IDs

Resolved:
- **C-007** Company name normalisation ✅

---

## Next priorities (Sprint 5 remaining)

1. **Feed provenance** (C-011) — thesis signals in daily feed should carry the specific
   evidence record IDs that produced them. Small backend change, high value for traceability.

2. **Temporal decay** (C-010) — evidence older than N months should contribute less to
   confidence. Critical before corpus spans multiple years.

3. **Counter-thesis enforcement** (ADR-016) — separate stable hypothesis statement from
   evolving keyword list. Currently description serves informally, no hard separation.

4. **Language delta — data** — `GET /theses/{id}/language-delta` already built. Will
   auto-activate after ~30 days of ingestion. No code change needed; just wait.

Then Sprint 6: automatic bottleneck detection without user-defined theses (unsupervised
clustering over ingested documents to surface candidate new thesis areas).

---

## What not to do without discussion

- Do not add new ingestion sources without checking C-001 — relevance > volume
- Do not change the confidence formula without updating ADR-012 and concerns.md
- Do not allow keyword edits to silently re-score historical evidence (C-009)
- Do not surface supply chain relationships as established facts until C-003 is addressed
- Do not run Alembic migrations without user awareness — schema changes affect existing data
- Frontend changes require Docker image rebuild — there is no live reload in production container
