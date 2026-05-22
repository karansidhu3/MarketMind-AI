# Architecture Decisions

---

## ADR-001 — Local-first architecture

**Decision:** Use local models and local infrastructure whenever possible.

**Reason:**
- Minimise operating cost
- Avoid API dependency
- Allow experimentation

---

## ADR-002 — FastAPI backend

**Decision:** Use FastAPI.

**Reason:**
- Async support
- Strong typing
- Clean API structure

---

## ADR-003 — Next.js frontend

**Decision:** Use Next.js App Router.

**Reason:**
- Modern React ecosystem
- Simple routing
- Scalable structure

---

## ADR-004 — Ollama for local LLM execution

**Decision:** Use Ollama.

**Reason:**
- Local inference
- Simple deployment
- Model flexibility

---

## ADR-005 — Standard model selection

**Decision:** Use the following models:

| Role | Model |
|---|---|
| Embeddings | `nomic-embed-text` |
| Reasoning | `qwen3:8b` |

**Reason:**
- Strong local performance
- Low cost
- Acceptable hardware requirements

**Note:** codebase defaulted to `llama3.2` during Sprint 3 — corrected in Sprint 4.

---

## ADR-006 — Qdrant vector storage

**Decision:** Use Qdrant.

**Reason:**
- Vector search
- Scalable design
- Better production path than Chroma

---

## ADR-007 — UUID5 document deduplication

**Decision:** Generate deterministic document IDs from source URLs.

**Reason:**
- Idempotent ingestion
- Safe re-ingestion
- Avoids duplicate vectors

---

## ADR-008 — Single Qdrant collection

**Decision:** Use a single Qdrant collection: `marketmind_documents`.

**Reason:**
- Reduces MVP complexity
- Avoids premature structure

---

## ADR-009 — Docker-first workflow

**Decision:** Use Docker for development.

**Reason:**
- Consistent environments
- Easier setup
- Avoids machine-specific issues

---

## ADR-010 — Postgres for persistent state

**Decision:** Use Postgres (SQLAlchemy async + asyncpg) for theses, evidence,
company signals, supply chain links, insider transactions, and daily feeds.

**Reason:**
- Qdrant stores vectors; Postgres stores the intelligence layer on top
- Thesis confidence, momentum, and company radar all require relational queries
- Redis is for caching; Postgres is the source of truth

**Schema:** `create_all()` at startup. Alembic migrations deferred until schema stabilises.

---

## ADR-011 — Keyword threshold before LLM scoring

**Decision:** Only call the LLM for sentiment classification when a document's
keyword overlap with a thesis exceeds 15% (`KEYWORD_THRESHOLD = 0.15`).

**Reason:**
- Running LLM sentiment on every document × every thesis is O(docs × theses) expensive
- Keyword pre-filter keeps LLM calls proportional to actual signal density
- Threshold tunable without changing architecture

---

## ADR-012 — Thesis confidence as supporting / total evidence ratio

**Decision:** Confidence = `supporting_count / total_evidence_count`, not cosine similarity mean.

**Reason:**
- Cosine mean is meaningless to an investor
- Supporting ratio is interpretable: "74% of evidence supports this thesis"
- Naturally degrades as opposing evidence accumulates (fights confirmation bias)

---

## ADR-013 — Supply chain extraction scope

**Decision:** Run supply chain LLM extraction only on 10-K/10-Q filings and documents
with credibility ≥ 0.85 and content length ≥ 400 chars.

**Reason:**
- 10-K/10-Q contain the most detailed supplier/customer language
- Running on every document wastes LLM compute with low yield
- Credibility + length filters approximate "worth extracting from"

---

## ADR-014 — Feed caching strategy

**Decision:** Cache daily feed in Redis with key `feed:generated:{date}`, TTL 25h.

**Reason:**
- Feed generation requires multiple DB queries + one LLM call
- 25h TTL ensures yesterday's feed is still readable after midnight until new one generates
- `POST /feed/regenerate` allows manual invalidation without restart
