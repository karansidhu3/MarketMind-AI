from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Literal

SourceType = Literal["rss", "api"]


@dataclass
class Document:
    id: str
    title: str
    source_name: str
    source_type: SourceType
    source_credibility_score: float
    content: str
    metadata: dict
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @staticmethod
    def make_id(seed: str) -> str:
        """Deterministic UUID5 so re-ingesting the same URL never creates duplicates."""
        return str(uuid.uuid5(uuid.NAMESPACE_URL, seed))

    def to_payload(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "source_name": self.source_name,
            "source_type": self.source_type,
            "source_credibility_score": self.source_credibility_score,
            "content": self.content[:2000],
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat(),
        }
