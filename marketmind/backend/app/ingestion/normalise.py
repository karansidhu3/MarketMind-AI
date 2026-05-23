"""
Company name normalisation.

Goal: treat "Eaton Corporation plc", "Eaton Corporation", and "Eaton Corp"
as the same entity, and "Quanta" as the same as "Quanta Services" (abbreviated
extraction from LLM).

Two public functions:
  normalise(name)          → lowercase, suffix-stripped form used for DB lookup
  is_same_company(a, b)    → True if two names refer to the same entity
  pick_canonical(names)    → return the longest (most complete) form for display
"""
from __future__ import annotations

import re

# Legal entity suffixes that carry no meaningful information
_LEGAL_RE = re.compile(
    r"\s*\b(plc|corp|corporation|inc|incorporated|ltd|limited|llc|l\.l\.c|co)\b\.?",
    re.IGNORECASE,
)
_PUNCT_RE = re.compile(r"[^\w\s]")
_SPACE_RE = re.compile(r"\s+")

# Minimum length for prefix matching — prevents short names like "GE" (2 chars)
# from incorrectly matching "GE Vernova" (a different, separately listed company)
_MIN_PREFIX_LEN = 5


def normalise(name: str) -> str:
    """
    Return a lowercase, punctuation-free, legal-suffix-stripped form.
    Used as the canonical key for DB lookup and comparison.

    Examples:
      "Eaton Corporation plc" → "eaton"
      "Eaton Corporation"     → "eaton"
      "Quanta Services"       → "quanta services"
      "Quanta"                → "quanta"
    """
    name = _LEGAL_RE.sub("", name)
    name = _PUNCT_RE.sub(" ", name)
    return _SPACE_RE.sub(" ", name).strip().lower()


def is_same_company(a: str, b: str) -> bool:
    """
    True if two company name strings refer to the same entity.

    Handles two cases:
    1. Legal suffix variants — "Eaton Corporation" == "Eaton Corporation plc"
       (both normalise to "eaton")
    2. Abbreviated LLM extractions — "Quanta" == "Quanta Services"
       (prefix match: "quanta" is a prefix of "quanta services")

    The prefix match requires the shorter form to be >= _MIN_PREFIX_LEN chars
    to prevent false positives from short ticker-like names.
    """
    na, nb = normalise(a), normalise(b)
    if not na or not nb:
        return False
    if na == nb:
        return True
    shorter, longer = (na, nb) if len(na) <= len(nb) else (nb, na)
    if len(shorter) >= _MIN_PREFIX_LEN and longer.startswith(shorter + " "):
        return True
    return False


def pick_canonical(names: list[str]) -> str:
    """
    Given several name variants for the same company, return the longest
    (most complete and informative) form for display.

    "Quanta Services" is preferred over "Quanta".
    "Eaton Corporation" is preferred over "Eaton Corp".
    """
    if not names:
        return ""
    return max(names, key=len)
