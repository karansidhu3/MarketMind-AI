"""
Cache Service — the only file that may import redis.asyncio.

Sprint 1: abstract interface defined. No implementation.
Sprint 2: implement with redis.asyncio.

Key conventions (from spec §4.3):
  llm:cache:{hash}                  TTL 1h
  feed:generated:{user_id}:{date}   TTL 25h
  session:{user_id}                 TTL 30m
"""
from __future__ import annotations

from abc import ABC, abstractmethod


class CacheService(ABC):
    @abstractmethod
    async def get(self, key: str) -> str | None:
        """Return the value at key, or None if absent or expired."""

    @abstractmethod
    async def set(self, key: str, value: str, ttl_seconds: int | None = None) -> None:
        """Set key to value with an optional TTL."""

    @abstractmethod
    async def delete(self, key: str) -> None:
        """Delete a key. No-op if it does not exist."""

    @abstractmethod
    async def exists(self, key: str) -> bool:
        """Return True if the key exists and has not expired."""
