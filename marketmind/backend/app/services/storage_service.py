"""
Storage Service — local filesystem access for raw document text.

Path layout: {base}/{YYYY}/{MM}/{document_id}.txt
The interface mirrors what an S3 implementation would expose, so
migrating to object storage requires only re-implementing this class.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime, timezone
from pathlib import Path


class StorageService(ABC):
    @abstractmethod
    async def write(self, document_id: str, content: str) -> str:
        """Persist content. Returns the path stored in documents.raw_text_path."""

    @abstractmethod
    async def read(self, path: str) -> str:
        """Read content from path. Raises FileNotFoundError if absent."""


class LocalStorageService(StorageService):
    def __init__(self, base_path: Path | str) -> None:
        self._base = Path(base_path)

    async def write(self, document_id: str, content: str) -> str:
        now = datetime.now(timezone.utc)
        path = self._base / now.strftime("%Y") / now.strftime("%m") / f"{document_id}.txt"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        return str(path)

    async def read(self, path: str) -> str:
        p = Path(path)
        if not p.exists():
            raise FileNotFoundError(f"Document not found: {path}")
        return p.read_text(encoding="utf-8")
