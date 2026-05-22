from __future__ import annotations

import logging

from app.ingestion.connectors.base import BaseConnector
from app.ingestion.schema import Document
from app.services.llm_service import LLMService
from app.services.retrieval_service import COLLECTION, RetrievalService
from app.services.storage_service import StorageService

logger = logging.getLogger(__name__)
MAX_EMBED_CHARS = 4000


class IngestionWorker:
    def __init__(
        self,
        connector: BaseConnector,
        llm: LLMService,
        storage: StorageService,
        retrieval: RetrievalService,
        thesis_service=None,       # app.thesis.service.ThesisService | None
        supply_chain_extractor=None,  # app.supply_chain.extractor.SupplyChainExtractor | None
    ) -> None:
        self._connector = connector
        self._llm = llm
        self._storage = storage
        self._retrieval = retrieval
        self._thesis_svc = thesis_service
        self._sc_extractor = supply_chain_extractor

    async def run(self) -> int:
        await self._retrieval.ensure_collection(COLLECTION)
        docs = await self._connector.fetch()
        ingested = 0
        for doc in docs:
            try:
                await self._ingest(doc)
                ingested += 1
            except Exception:
                logger.exception("Failed to ingest document %s (%s)", doc.id, doc.title[:60])
        logger.info("Ingested %d/%d documents from %s", ingested, len(docs), self._connector.__class__.__name__)
        return ingested

    async def _ingest(self, doc: Document) -> None:
        await self._storage.write(doc.id, doc.content)

        embed_text = f"{doc.title}\n\n{doc.content}"[:MAX_EMBED_CHARS]
        embedding = await self._llm.embed(embed_text)
        await self._retrieval.upsert(COLLECTION, doc.id, embedding, doc.to_payload())

        if self._thesis_svc is not None:
            try:
                await self._thesis_svc.score_document(doc)
            except Exception:
                logger.warning("Thesis scoring failed for doc %s", doc.id)

        if self._sc_extractor is not None:
            try:
                await self._sc_extractor.extract_and_store(doc)
            except Exception:
                logger.warning("Supply chain extraction failed for doc %s", doc.id)
