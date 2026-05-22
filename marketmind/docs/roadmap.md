# MarketMind Roadmap

## Vision

MarketMind is a persistent investment intelligence platform designed to help users move from beginner-level investing to evidence-based, thesis-driven investing.

Rather than replacing LLMs, MarketMind combines:

- Persistent knowledge storage
- Historical evidence tracking
- Automated information ingestion
- LLM reasoning
- Long-term trend discovery

**Goal:** move from _"What stock should I buy?"_ to _"What emerging trends, bottlenecks, and evidence support a thesis?"_

---

## Completed

### Sprint 1 — Foundation

**Status:** Complete

- FastAPI backend
- Next.js frontend
- Docker infrastructure
- Redis, Qdrant, Ollama integration
- Health endpoints

---

### Sprint 2 — Knowledge Ingestion

**Status:** Complete

- SEC EDGAR ingestion
- Yahoo Finance ingestion
- Generic RSS ingestion
- Embedding generation
- Qdrant storage
- UUID5 deduplication

---

### Sprint 3 — Research Workflow

**Status:** Complete

- Research endpoint
- Retrieval pipeline
- Query expansion
- Reranking
- Evidence generation
- Structured responses

---

## Current Focus — Research Quality

**Status:** In progress

- Better query expansion
- Confidence scoring improvements
- Source weighting
- Retrieval tuning

---

## Near-Term

### Sprint 4 — Daily Intelligence Feed

Generate a daily report containing:

- Major market events
- Repeated themes
- Investor sentiment
- Unusual opportunities
- "Nothing significant today" when appropriate

---

### Sprint 5 — Thesis Tracking

Track investment ideas over time:

- Thesis creation
- Confidence tracking
- Supporting and opposing evidence
- Historical changes

---

### Sprint 6 — Trend Discovery

Detect repeated emerging signals. Examples:

- AI power demand
- Nuclear infrastructure
- Semiconductor bottlenecks
- Data center cooling

---

### Sprint 7 — Investor Tracking

Track credible investor opinions. Sources:

- Blossom
- Selected creators
- Investor newsletters

---

## Long-Term

- Personalized learning system
- Opportunity surfacing
- Evidence graph
- Long-term market memory
- Intelligent research workspace
