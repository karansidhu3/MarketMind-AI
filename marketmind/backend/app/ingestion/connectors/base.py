from __future__ import annotations

from abc import ABC, abstractmethod

from app.ingestion.schema import Document


class BaseConnector(ABC):
    @abstractmethod
    async def fetch(self) -> list[Document]:
        """Fetch documents from the source and return normalized Document objects."""
