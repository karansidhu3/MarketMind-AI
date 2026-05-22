"""
Retrieval Service — the only file that may import qdrant-client.

Sprint 1: abstract interface defined. No implementation.
Sprint 2: implement with qdrant-client.

Vector dimension is 768 to match nomic-embed-text output.
This is a hard schema constraint — changing it requires dropping and
re-creating all Qdrant collections.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


VECTOR_DIMENSION = 768

COLLECTIONS = ("documents", "theses", "trends")


@dataclass
class SearchResult:
    id: str
    score: float
    payload: dict


class RetrievalService(ABC):
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
