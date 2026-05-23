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

---

## Current — Sprint 5 — Thesis Deepening

### Completed this sprint
- **Opposing evidence surfacing** — top 2 highest-scoring opposing records pinned
  above evidence list on thesis detail page with ShieldAlert callout
- **Confidence sparkline** — 30-day SVG trend chart in thesis stats row (green/red
  trend line + dot at latest value, auto-hides if insufficient history)
- **Radar ranking fix** — changed from `SUM(mention_count)` to
  `COUNT(DISTINCT document_id)` so a company mentioned 40× in one 10-K doesn't
  outrank one mentioned once each in 5 independent filings
- **Company name normalisation** — radar now groups by `normalised_name` using
  Python-side aggregation with `pick_canonical()` for display name;
  "Eaton Corporation plc" + "Eaton Corporation" → single entry with correct counts
- **Language shift detector** — `GET /theses/{id}/language-delta` compares evidence
  language between two rolling 30-day windows; returns appeared/disappeared/intensified
  themes + LLM summary; cached 6h; returns `insufficient_data` gracefully until
  corpus spans 60+ days (will auto-activate as data accumulates)
- **On-demand corpus re-evaluation** — `POST /theses/{id}/evaluate` rescores entire
  Qdrant corpus against one thesis as a FastAPI BackgroundTask; returns 202 immediately;
  useful when creating a new thesis or updating keywords
- **Supply chain tab** — thesis detail page has Evidence | Supply Chain tabs;
  supply chain tab has company search box querying `GET /supply-chain/{company}`
- **Re-evaluate button** — one-click corpus rescore from thesis detail page header
- **Dark/light mode** — Sun/Moon toggle in sidebar; next-themes; CSS custom properties
  as RGB triplets; `suppressHydrationWarning` on `<html>`

### Remaining this sprint
- **Feed provenance** (C-011) — thesis signals in daily feed should carry the evidence
  record IDs that produced them (traceability from feed → evidence → source)
- **Temporal decay** (C-010) — older evidence should contribute less to confidence
- **Counter-thesis enforcement** — separate stable hypothesis statement from evolving
  keyword list (ADR-016 design, not yet reflected in data model)

---

## Near-Term

### Sprint 6 — Trend Discovery

- Automatic bottleneck detection without user-defined thesis keywords
- Cross-company signal clustering: "8 companies from 4 sectors all mention X"
- Emerging signal alerts: new keyword clusters appearing for the first time
- Source targeting: connectors aimed at specific sectors rather than global feeds

### Sprint 7 — Investor Tracking

- Track credible investor newsletters and public commentary
- Surface when a known investor starts or exits a thesis

---

## Long-Term

- Personalized learning system
- Evidence graph visualisation (supply chain as interactive graph)
- Long-term market memory (multi-year corpus)
- Intelligent research workspace
- Earnings surprise pattern detection
- Corroboration UI: show how many independent sources support each relationship
