"""
LLM Gateway — the only file in the codebase that may import Ollama or any
model SDK. All embedding calls go through this interface.
"""
from __future__ import annotations

from abc import ABC, abstractmethod

import httpx


class LLMService(ABC):
    @abstractmethod
    async def embed(self, text: str) -> list[float]:
        """Return a 768-dimensional embedding vector for the given text."""


class OllamaLLMService(LLMService):
    def __init__(self, base_url: str, embed_model: str = "nomic-embed-text") -> None:
        self._client = httpx.AsyncClient(base_url=base_url, timeout=60.0)
        self._embed_model = embed_model

    async def embed(self, text: str) -> list[float]:
        resp = await self._client.post(
            "/api/embed",
            json={"model": self._embed_model, "input": text},
        )
        resp.raise_for_status()
        return resp.json()["embeddings"][0]

    async def close(self) -> None:
        await self._client.aclose()
