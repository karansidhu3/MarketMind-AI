"""
LLM Gateway — the only file in the codebase that may import Ollama or any
model SDK. All embedding and generation calls go through this interface.
"""
from __future__ import annotations

from abc import ABC, abstractmethod

import httpx


class LLMService(ABC):
    @abstractmethod
    async def embed(self, text: str) -> list[float]:
        """Return a 768-dimensional embedding vector for the given text."""

    @abstractmethod
    async def generate(self, prompt: str, system: str | None = None) -> str:
        """Send a generation request. Returns the model's text response."""


class OllamaLLMService(LLMService):
    def __init__(
        self,
        base_url: str,
        embed_model: str = "nomic-embed-text",
        generate_model: str = "llama3.2",
    ) -> None:
        self._client = httpx.AsyncClient(base_url=base_url, timeout=120.0)
        self._embed_model = embed_model
        self._generate_model = generate_model

    async def embed(self, text: str) -> list[float]:
        resp = await self._client.post(
            "/api/embed",
            json={"model": self._embed_model, "input": text},
        )
        resp.raise_for_status()
        return resp.json()["embeddings"][0]

    async def generate(self, prompt: str, system: str | None = None) -> str:
        body: dict = {"model": self._generate_model, "prompt": prompt, "stream": False}
        if system:
            body["system"] = system
        resp = await self._client.post("/api/generate", json=body)
        resp.raise_for_status()
        return resp.json()["response"]

    async def close(self) -> None:
        await self._client.aclose()
