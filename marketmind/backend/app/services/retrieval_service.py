"""
Retrieval Service — the only file that may import qdrant-client.

Vector dimension is 768 to match nomic-embed-text output.
This is a hard schema constraint — changing it requires dropping and
re-creating the Qdrant collection.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass

from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    VectorParams,
)

VECTOR_DIMENSION = 768

COLLECTION = "marketmind_documents"


@dataclass
class SearchResult:
    id: str
    score: float
    payload: dict


class RetrievalService(ABC):
    @abstractmethod
    async def ensure_collection(self, collection_name: str) -> None:
        """Create the collection if it does not already exist."""

    @abstractmethod
    async def search(
        self,
        collection: str,
        query_embedding: list[float],
        top_k: int = 10,
        filters: dict | None = None,
    ) -> list[SearchResult]:
        """Return the top_k most similar vectors from the collection."""

    @abstractmethod
    async def upsert(
        self,
        collection: str,
        point_id: str,
        embedding: list[float],
        payload: dict,
    ) -> None:
        """Insert or update a single vector point."""


class QdrantRetrievalService(RetrievalService):
    def __init__(self, url: str) -> None:
        self._client = AsyncQdrantClient(url=url)

    async def ensure_collection(self, collection_name: str) -> None:
        existing = {c.name for c in (await self._client.get_collections()).collections}
        if collection_name not in existing:
            await self._client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(size=VECTOR_DIMENSION, distance=Distance.COSINE),
            )

    async def upsert(
        self,
        collection: str,
        point_id: str,
        embedding: list[float],
        payload: dict,
    ) -> None:
        await self._client.upsert(
            collection_name=collection,
            points=[PointStruct(id=point_id, vector=embedding, payload=payload)],
        )

    async def search(
        self,
        collection: str,
        query_embedding: list[float],
        top_k: int = 10,
        filters: dict | None = None,
    ) -> list[SearchResult]:
        qdrant_filter = None
        if filters:
            qdrant_filter = Filter(
                must=[
                    FieldCondition(key=k, match=MatchValue(value=v))
                    for k, v in filters.items()
                ]
            )
        results = await self._client.search(
            collection_name=collection,
            query_vector=query_embedding,
            limit=top_k,
            query_filter=qdrant_filter,
        )
        return [
            SearchResult(id=str(r.id), score=r.score, payload=r.payload or {})
            for r in results
        ]

    async def close(self) -> None:
        await self._client.close()
