# MarketMind Roadmap

## Vision

MarketMind is a persistent investment intelligence platform that finds bottlenecks
and early signals **before they become obvious** — surfacing unknown companies,
tracking thesis confidence over time, and detecting supply chain relationships
that analysts haven't written about yet.

The core advantage over one-shot LLM queries: **memory across time**.
MarketMind knows what signals appeared 6 weeks ago versus today.
It builds a corpus that compounds.

---

## Completed

### Sprint 1 — Foundation
- FastAPI backend, Next.js frontend, Docker infrastructure
- Redis, Qdrant, Ollama integration, health endpoints

### Sprint 2 — Knowledge Ingestion
- SEC EDGAR (8-K), Yahoo Finance, generic RSS ingestion
- Embedding generation, Qdrant storage, UUID5 deduplication

### Sprint 3 — Research Workflow
- Research endpoint, query expansion, retrieval pipeline
- Reranking (similarity × credibility × keyword overlap)
- Evidence generation, structured responses

---

## Current — Sprint 4 — Bottleneck Intelligence

**Status:** In progress

### What was built

**Thesis tracking**
- 5 pre-seeded system theses: AI Infrastructure, Semiconductor Supply Chain,
  Energy Grid Modernization, Defense Production Ramp, Data Center Physical Infrastructure
- Every ingested document is scored against all active theses (keyword overlap → LLM sentiment)
- Evidence stored in Postgres with sentiment (supporting/opposing/neutral) and source
- Confidence = supporting / total evidence (interpretable, not a cosine mean)
- Users can create their own theses in addition to system theses

**Supply chain graph**
- LLM extracts supplier/customer/partner relationships from 10-K and 10-Q filings
- Stored as directed graph edges in `supply_chain_links` table
- Enables second-order queries: "AI demand → who supplies the suppliers?"

**Company radar**
- Companies mentioned in bottleneck contexts are tracked by name + thesis
- `GET /theses/radar` returns companies appearing across multiple documents —
  surfaces unknowns before analysts cover them

**Form 4 insider tracking**
- SEC Form 4 filings ingested alongside financial news
- Clusters of insider buying at the same company flagged in daily feed

**Daily feed**
- `GET /feed` generates today's signal report: thesis momentum, new companies, insider clusters
- Cached in Redis for 25h (key: `feed:generated:{date}`)
- Momentum computed over rolling 7-day window

**Infrastructure**
- Postgres (SQLAlchemy async) live with all tables
- Redis (RedisCacheService) implemented
- Model corrected: llama3.2 → qwen3:8b (ADR-005)
- Ingestion sources expanded: 8-K, 10-Q, 10-K, Form 4, MarketWatch, Seeking Alpha

---

## Near-Term

### Sprint 5 — Thesis Deepening

- Counter-thesis enforcement: prominently surface strongest opposing evidence
- Earnings call language delta: flag language changes across consecutive filings
- Thesis confidence history chart (track confidence score over time)
- `POST /theses/{id}/evaluate` — on-demand re-evaluation against full corpus

### Sprint 6 — Trend Discovery

- Automatic bottleneck detection without user-defined thesis keywords
- Cross-company signal clustering: "8 companies from 4 sectors all mention X"
- Emerging signal alerts: new keyword clusters appearing for the first time

### Sprint 7 — Investor Tracking

- Track credible investor newsletters and public commentary
- Surface when a known investor starts or exits a thesis

---

## Long-Term

- Personalized learning system
- Evidence graph visualisation
- Long-term market memory (multi-year corpus)
- Intelligent research workspace
- Earnings surprise pattern detection
