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
    async def generate(self, prompt: str, system: str | None = None, think: bool = False) -> str:
        """Send a generation request. Returns the model's text response."""


class OllamaLLMService(LLMService):
    def __init__(
        self,
        base_url: str,
        embed_model: str = "nomic-embed-text",
        generate_model: str = "llama3.2",
    ) -> None:
        # Short connect timeout, generous read timeout — local LLMs are slow
        self._client = httpx.AsyncClient(
            base_url=base_url,
            timeout=httpx.Timeout(300.0, connect=10.0),
        )
        self._embed_model = embed_model
        self._generate_model = generate_model

    async def embed(self, text: str) -> list[float]:
        resp = await self._client.post(
            "/api/embed",
            json={"model": self._embed_model, "input": text},
        )
        resp.raise_for_status()
        return resp.json()["embeddings"][0]

    async def generate(self, prompt: str, system: str | None = None, think: bool = False) -> str:
        """
        Generate a response from the LLM.

        think=False (default): prepend /no_think so qwen3 skips chain-of-thought.
          Use this for summarisation, classification, and extraction tasks where
          reasoning tokens add latency without improving output quality.
        think=True: let the model reason. Use for complex multi-step analysis.
        """
        if not think:
            # qwen3 respects /no_think at the start of the user turn.
            # This typically cuts generation time from 60-180s → 5-20s.
            prompt = f"/no_think\n\n{prompt}"

        body: dict = {"model": self._generate_model, "prompt": prompt, "stream": False}
        if system:
            body["system"] = system
        resp = await self._client.post("/api/generate", json=body)
        resp.raise_for_status()
        return resp.json()["response"]

    async def close(self) -> None:
        await self._client.aclose()
