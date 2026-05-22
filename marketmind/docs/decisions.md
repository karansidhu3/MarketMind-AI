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

## ADR-008 — Single collection strategy

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
