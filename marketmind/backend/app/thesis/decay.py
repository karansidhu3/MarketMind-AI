"""
Temporal decay weighting for thesis confidence scores.

Evidence from 3 months ago should not count equally with evidence from yesterday.
A thesis strongly supported in 2024 should lose confidence if 2025 filings show
the narrative is reversing — not maintain high confidence indefinitely.

Decay model: exponential, half-life of 90 days.
  weight = max(MIN_WEIGHT, 2^(-age_days / HALF_LIFE_DAYS))

  0 days   → 1.00
  30 days  → 0.79
  90 days  → 0.50
  180 days → 0.25
  270 days → 0.13
  360 days → 0.10  (floor)

The floor (MIN_WEIGHT) ensures very old evidence never fully disappears — it
should still be possible to build a long-term thesis — but it can no longer
dominate confidence the way fresh evidence does.
"""

from __future__ import annotations

from datetime import datetime, timezone

HALF_LIFE_DAYS: int = 90    # evidence halves in weight every 3 months
MIN_WEIGHT: float = 0.10    # very old evidence retains a 10% vote


def recency_weight(created_at: datetime) -> float:
    """Return a [MIN_WEIGHT, 1.0] decay weight based on evidence age."""
    now = datetime.now(timezone.utc)
    # Ensure both datetimes are timezone-aware for subtraction
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    age_days = max(0, (now - created_at).days)
    weight = 2.0 ** (-age_days / HALF_LIFE_DAYS)
    return max(MIN_WEIGHT, weight)


def weighted_confidence(evidence_rows: list) -> tuple[float, int, int, int]:
    """
    Compute temporally-weighted confidence from a list of Evidence ORM rows.

    Returns
    -------
    confidence      : float  — weighted supporting / weighted total, in [0, 1]
    supporting_count: int    — raw count of supporting records (for display)
    opposing_count  : int    — raw count of opposing records (for display)
    total_count     : int    — raw total evidence records (for display)

    The raw counts are preserved for display purposes so the UI can still show
    "12 supporting / 4 opposing" accurately. Only the confidence percentage uses
    the decay weights.
    """
    w_supporting = 0.0
    w_total = 0.0
    supporting = 0
    opposing = 0

    for ev in evidence_rows:
        w = recency_weight(ev.created_at)
        w_total += w
        if ev.sentiment == "supporting":
            w_supporting += w
            supporting += 1
        elif ev.sentiment == "opposing":
            opposing += 1

    total = len(evidence_rows)
    confidence = round(w_supporting / w_total, 3) if w_total > 0 else 0.0
    return confidence, supporting, opposing, total
