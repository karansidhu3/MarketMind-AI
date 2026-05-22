"""
LLM Gateway.

This is the only file in the codebase that may import Ollama or any
model SDK. All generation and embedding calls throughout the application
go through this interface.

Sprint 1: abstract interface defined. No implementation.
Sprint 2: implement generate() and embed() with httpx calls to Ollama.
"""
from __future__ import annotations

from abc import ABC, abstractmethod


class LLMService(ABC):
    @abstractmethod
    async def generate(self, prompt: str, system: str | None = None) -> str:
        """Send a generation request. Returns the model's text response."""

    @abstractmethod
    async def embed(self, text: str) -> list[float]:
        """Return a 768-dimensional embedding vector for the given text."""
