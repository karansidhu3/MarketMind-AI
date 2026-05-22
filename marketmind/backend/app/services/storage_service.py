"""
Storage Service — local filesystem access for raw document text.

Sprint 1: abstract interface defined. No implementation.
Sprint 2: implement with pathlib.

Default path layout: {base}/{YYYY}/{MM}/{document_id}.txt
The interface is identical to what an S3 implementation would expose,
so migrating to object storage requires only re-implementing this class.
"""
from __future__ import annotations

from abc import ABC, abstractmethod


class StorageService(ABC):
    @abstractmethod
    async def write(self, document_id: str, content: str) -> str:
        """Persist content. Returns the path stored in documents.raw_text_path."""

    @abstractmethod
    async def read(self, path: str) -> str:
        """Read content from path. Raises FileNotFoundError if absent."""
