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
| Frontend | Next.js (App Router) |
| Vector DB | Qdrant — stores document embeddings |
| Relational DB | Postgres (SQLAlchemy async + asyncpg) |
| Cache | Redis |
| LLM / Embeddings | Ollama (local) — qwen3:8b for reasoning, nomic-embed-text for embeddings |
| Infrastructure | Docker Compose |

Everything runs locally. Zero API costs.

---

## Current sprint: Sprint 4 — Bottleneck Intelligence (in progress)

### What has been built (Sprints 1–4)

**Sprint 1** — Infrastructure: FastAPI, Next.js, Docker, Qdrant, Redis, Ollama, health endpoints.

**Sprint 2** — Knowledge ingestion: SEC EDGAR (8-K), Yahoo Finance, RSS connectors.
Embeddings via nomic-embed-text. Qdrant storage. UUID5 deduplication.

**Sprint 3** — Research workflow: query expansion, retrieval, reranking
(similarity × credibility × keyword overlap), LLM synthesis, structured responses.

**Sprint 4** — Bottleneck intelligence (current):
- **Postgres live** — 6 tables: theses, evidence, company_signals, supply_chain_links,
  insider_transactions, daily_feeds
- **5 system theses seeded** at startup: AI Infrastructure Bottlenecks, Semiconductor
  Supply Chain, Energy Grid Modernization, Defense Production Ramp, Data Center
  Physical Infrastructure
- **Thesis scoring pipeline** — every ingested document scored against all active
  theses via keyword overlap → LLM sentiment classification
- **Supply chain extractor** — LLM extracts supplier/customer/partner relationships
  from 10-K and 10-Q filings
- **Form 4 connector** — SEC insider transaction filings ingested, buy clusters
  flagged in daily feed
- **Company radar** (`GET /theses/radar`) — companies appearing across multiple
  documents ranked by mention count
- **Daily feed** (`GET /feed`) — thesis momentum, new companies, insider clusters,
  LLM summary, cached 25h in Redis
- **Daily ingestor container** — `docker-compose ingestor` service runs scheduler.py,
  triggers ingest.py daily at INGEST_HOUR_UTC (default 06:00 UTC)
- **Model corrected** — config default changed from llama3.2 → qwen3:8b (per ADR-005)
- **Redis** — RedisCacheService implemented (was abstract-only since Sprint 1)

### Ingestion sources (scripts/ingest.py)
- SEC EDGAR: 8-K (40), 10-Q (20), 10-K (10), Form 4 (40)
- Yahoo Finance: ~20 tickers across AI/infrastructure sectors
- MarketWatch RSS, Seeking Alpha RSS

---

## Key file locations

```
marketmind/
  CLAUDE.md                          ← this file
  docs/
    roadmap.md                       ← vision, sprint history, near-term plan
    decisions.md                     ← ADR-001 through ADR-019
    concerns.md                      ← C-001 through C-011, known issues + proposed solutions
  backend/
    app/
      config.py                      ← Settings (model names, URLs)
      main.py                        ← FastAPI lifespan, wires all services
      db/
        session.py                   ← SQLAlchemy engine + session factory
        models.py                    ← all ORM models
      thesis/
        service.py                   ← ThesisService (CRUD + document scoring)
        seed.py                      ← 5 pre-seeded system theses
      feed/
        service.py                   ← FeedService (daily signal generation + Redis cache)
      supply_chain/
        extractor.py                 ← LLM supply chain relationship extraction
      ingestion/
        worker.py                    ← IngestionWorker (embed → store → score → extract)
        connectors/
          sec_edgar.py               ← 8-K, 10-K, 10-Q
          form4.py                   ← Form 4 insider transactions
          yahoo_finance.py           ← per-ticker RSS
          rss.py                     ← generic RSS base
      services/
        llm_service.py               ← OllamaLLMService (embed + generate)
        retrieval_service.py         ← QdrantRetrievalService
        cache_service.py             ← RedisCacheService
      api/
        thesis.py                    ← /theses endpoints (implemented)
        feed.py                      ← /feed endpoints (implemented)
        research.py                  ← /research endpoint (implemented)
        dependencies.py              ← FastAPI deps (llm, retrieval, thesis, feed, cache)
    scripts/
      ingest.py                      ← manual ingestion script
      scheduler.py                   ← daily scheduler (runs inside ingestor container)
    requirements.txt                 ← fastapi, sqlalchemy, asyncpg, redis, qdrant-client, etc.
  infrastructure/
    docker-compose.yml               ← all services including ingestor container
  .env                               ← DATABASE_URL, REDIS_URL, QDRANT_URL, OLLAMA_URL, JWT_SECRET
```

---

## How to rebuild and run

```bash
cd marketmind/infrastructure

# Pull correct model (first time only)
docker exec infrastructure-ollama-1 ollama pull qwen3:8b

# Rebuild backend after code changes
docker compose down
docker compose build backend
docker compose up -d

# Check backend started cleanly (should see "Seeded 5 system theses" on first run)
docker compose logs backend --tail=30

# Run ingestion manually (takes 20-40 min first time)
docker exec infrastructure-backend-1 python scripts/ingest.py

# Check ingestor schedule
docker compose logs ingestor --tail=10

# Check Qdrant document count
curl http://localhost:6333/collections/marketmind_documents

# Check thesis evidence via Postgres
docker exec infrastructure-postgres-1 psql -U marketmind -c \
  "SELECT t.name, COUNT(e.id) FROM theses t LEFT JOIN evidence e ON e.thesis_id = t.id GROUP BY t.name;"
```

---

## Architecture decisions (summary — full detail in docs/decisions.md)

- **ADR-005** — Models: nomic-embed-text (embeddings), qwen3:8b (reasoning)
- **ADR-010** — Postgres for persistent state; Qdrant for vectors; Redis for cache
- **ADR-011** — Keyword threshold (15%) gates LLM calls to avoid O(docs × theses) cost
- **ADR-012** — Confidence = supporting / total evidence (interpretable, not cosine mean)
- **ADR-013** — Supply chain extraction only on 10-K/10-Q and credibility ≥ 0.85 docs
- **ADR-015** — Epistemic tiers (Primary / Derived / Synthesized) not numeric propagation
- **ADR-016** — Thesis has two parts: stable hypothesis statement + evolving capture scope
- **ADR-017** — Evidence is immutable; scope fingerprinting tracks keyword set at scoring time
- **ADR-018** — Relationships need corroboration from 3+ independent sources to be trusted
- **ADR-019** — Company name normalisation required before radar is trustworthy

---

## Known concerns (summary — full detail in docs/concerns.md)

High severity — open:
- **C-003** Relationship extraction reliability: systematic LLM errors compound silently
- **C-004** Company radar dominated by large caps (NVIDIA problem): mention count alone is wrong metric
- **C-007** Company name normalisation missing: "NVIDIA Corp" and "Nvidia" are separate rows
- **C-008** Uncertainty propagation: inference chain errors compound into confident wrong signals
- **C-009** Thesis semantic drift: expanding keywords silently inflates confidence scores

Medium severity — open:
- **C-002** Discovery gap: signals outside defined theses are invisible
- **C-005** Signal inflation: LLM forced to summarise even when nothing meaningful happened
- **C-006** Data model brittleness: keyword scoring, sentiment enum, supply chain model will all need migration
- **C-010** Temporal decay missing: 18-month-old evidence weighted same as yesterday's
- **C-011** Feed provenance gap: feed signals don't link back to specific evidence record IDs

---

## Next priorities (before Sprint 5)

In order:
1. Supply chain query endpoint (`GET /supply-chain/{company}` — data exists, no API yet)
2. Auto-regenerate feed after ingestion (scheduler.py should call POST /feed/regenerate)
3. Thesis confidence snapshots (daily history table for charting confidence over time)
4. Date-scoped research (add `days_back` param to /research — created_at filter already in Qdrant)
5. Opposing evidence surfacing (thesis detail should always show strongest opposing record)

Then Sprint 5: thesis deepening (counter-thesis enforcement, confidence history charts,
earnings call language delta).

---

## What not to do without discussion

- Do not add new ingestion sources without checking C-001 — more irrelevant documents
  do not help; source targeting matters more than volume
- Do not change the confidence formula without updating ADR-012 and concerns.md
- Do not allow keyword edits to silently re-score historical evidence (C-009)
- Do not surface supply chain relationships to users as facts until C-003 is addressed
- Do not run Alembic migrations without user awareness — schema changes affect existing data
