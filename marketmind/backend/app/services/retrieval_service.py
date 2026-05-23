"""
Retrieval Service — the only file that may import qdrant-client.

Vector dimension is 768 to match nomic-embed-text output.
This is a hard schema constraint — changing it requires dropping and
re-creating the Qdrant collection.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    DatetimeRange,
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
    async def scroll_all(self, collection: str, batch_size: int = 100) -> list["SearchResult"]:
        """Return all points in the collection (no vector search). Used for corpus re-evaluation."""

    @abstractmethod
    async def search(
        self,
        collection: str,
        query_embedding: list[float],
        top_k: int = 10,
        filters: dict | None = None,
        days_back: int | None = None,
    ) -> list[SearchResult]:
        """Return the top_k most similar vectors from the collection.

        days_back: if set, only return documents ingested within the last N days.
        """

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

    async def scroll_all(self, collection: str, batch_size: int = 100) -> list[SearchResult]:
        """Fetch every point in the collection without vector search (used for re-evaluation)."""
        results: list[SearchResult] = []
        offset = None
        while True:
            points, next_offset = await self._client.scroll(
                collection_name=collection,
                limit=batch_size,
                offset=offset,
                with_payload=True,
                with_vectors=False,
            )
            for p in points:
                results.append(SearchResult(
                    id=str(p.id),
                    score=0.0,
                    payload=p.payload or {},
                ))
            if next_offset is None:
                break
            offset = next_offset
        return results

    async def search(
        self,
        collection: str,
        query_embedding: list[float],
        top_k: int = 10,
        filters: dict | None = None,
        days_back: int | None = None,
    ) -> list[SearchResult]:
        must_conditions = []

        if filters:
            must_conditions.extend(
                FieldCondition(key=k, match=MatchValue(value=v))
                for k, v in filters.items()
            )

        if days_back is not None:
            cutoff = datetime.now(timezone.utc) - timedelta(days=days_back)
            must_conditions.append(
                FieldCondition(
                    key="created_at",
                    range=DatetimeRange(gte=cutoff),
                )
            )

        qdrant_filter = Filter(must=must_conditions) if must_conditions else None

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
