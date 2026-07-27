"""
Valuation Service — the only file that may call Finnhub.

Sprint 17 (ADR-038): a second signal, deliberately kept separate from ICR.
Confirmed by a live test call (not assumed from documentation) that
Finnhub's free tier includes PEG ratio, P/E, and 52-week range via
`stock/metric`. Forward EPS/revenue *estimates* are paywalled on the free
tier — this service never calls that endpoint, and nothing here depends
on it.
"""
from __future__ import annotations

from abc import ABC, abstractmethod

import httpx


class ValuationService(ABC):
    @abstractmethod
    async def get_metrics(self, ticker: str) -> dict:
        """Return {price, forward_pe, forward_peg, price_52w_high, price_52w_low}.

        Any field may be None if Finnhub doesn't have it for this ticker —
        that's a real 'unknown', not an error. Raises on a failed HTTP call.
        """

    @abstractmethod
    async def close(self) -> None:
        ...


class FinnhubValuationService(ValuationService):
    _BASE_URL = "https://finnhub.io/api/v1"

    def __init__(self, api_key: str) -> None:
        self._api_key = api_key
        self._client = httpx.AsyncClient(base_url=self._BASE_URL, timeout=15.0)

    async def get_metrics(self, ticker: str) -> dict:
        quote_resp = await self._client.get(
            "/quote", params={"symbol": ticker, "token": self._api_key}
        )
        quote_resp.raise_for_status()
        quote = quote_resp.json()

        metric_resp = await self._client.get(
            "/stock/metric",
            params={"symbol": ticker, "metric": "all", "token": self._api_key},
        )
        metric_resp.raise_for_status()
        metric = metric_resp.json().get("metric", {})

        return {
            "price": quote.get("c"),
            "forward_pe": metric.get("forwardPE"),
            "forward_peg": metric.get("forwardPEG"),
            "price_52w_high": metric.get("52WeekHigh"),
            "price_52w_low": metric.get("52WeekLow"),
        }

    async def close(self) -> None:
        await self._client.aclose()
