"""
Valuation label computation — pure functions, no I/O. ADR-038.

Deliberately mirrors the "show your work" standard ICR's evidence trail
already holds: no label is returned without the literal numbers that
produced it in the reasoning string. Thresholds are a first pass — expect
tuning once real weekly data accumulates across tracked tickers.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ValuationLabel:
    label: str
    reasoning: str


def compute_valuation_label(
    forward_peg: float | None,
    price: float | None,
    price_52w_high: float | None,
) -> ValuationLabel:
    if forward_peg is None or price is None or not price_52w_high:
        return ValuationLabel("Unclear", "Not enough valuation data available to assess this one.")

    price_ratio = price / price_52w_high
    off_high_pct = round((1 - price_ratio) * 100)

    # Room left / Priced in partition the full price_ratio range for any
    # PEG under 1.0 — no gap between them.
    if forward_peg < 1.0 and price_ratio < 0.9:
        return ValuationLabel(
            "Room left",
            f"PEG of {forward_peg:.2f} is under 1.0 (cheap relative to growth), and the "
            f"price is {off_high_pct}% below its 52-week high — the market hasn't fully "
            "priced this in yet.",
        )
    if forward_peg > 2.0 and price_ratio >= 0.9:
        return ValuationLabel(
            "Stretched",
            f"PEG of {forward_peg:.2f} is over 2.0 (expensive relative to growth) and the "
            "price is near its highs — already priced for a lot of future growth.",
        )
    if forward_peg < 1.0 and price_ratio >= 0.9:
        return ValuationLabel(
            "Priced in",
            f"PEG of {forward_peg:.2f} is still cheap on paper, but the price is already "
            "near its 52-week high — the market may have already caught up.",
        )
    return ValuationLabel(
        "Unclear",
        f"PEG of {forward_peg:.2f} and a price {off_high_pct}% off the 52-week high "
        "don't clearly signal either case.",
    )
