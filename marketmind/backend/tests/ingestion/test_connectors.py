from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.ingestion.connectors.rss import GenericRSSConnector
from app.ingestion.connectors.sec_edgar import SECEdgarConnector
from app.ingestion.connectors.yahoo_finance import YahooFinanceConnector

_SAMPLE_RSS = """\
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <item>
      <title>Market Rally Continues</title>
      <link>https://example.com/article-1</link>
      <description>Stocks climbed for a third straight session.</description>
      <pubDate>Mon, 01 Jan 2024 12:00:00 +0000</pubDate>
      <guid>https://example.com/article-1</guid>
    </item>
    <item>
      <title>Fed Holds Rates Steady</title>
      <link>https://example.com/article-2</link>
      <description>The Federal Reserve kept rates unchanged.</description>
      <pubDate>Tue, 02 Jan 2024 09:00:00 +0000</pubDate>
      <guid>https://example.com/article-2</guid>
    </item>
  </channel>
</rss>"""


def _make_mock_response(text: str = _SAMPLE_RSS) -> MagicMock:
    resp = MagicMock()
    resp.text = text
    resp.raise_for_status = MagicMock()
    return resp


def _patch_httpx(mock_response: MagicMock):
    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.get = AsyncMock(return_value=mock_response)
    return patch("app.ingestion.connectors.rss.httpx.AsyncClient", return_value=mock_client)


@pytest.mark.asyncio
async def test_generic_rss_returns_documents():
    with _patch_httpx(_make_mock_response()):
        connector = GenericRSSConnector("https://example.com/rss", source_name="Test Feed")
        docs = await connector.fetch()

    assert len(docs) == 2
    assert docs[0].title == "Market Rally Continues"
    assert docs[0].content == "Stocks climbed for a third straight session."
    assert docs[0].source_name == "Test Feed"
    assert docs[0].source_type == "rss"


@pytest.mark.asyncio
async def test_generic_rss_document_ids_are_deterministic():
    with _patch_httpx(_make_mock_response()):
        connector = GenericRSSConnector("https://example.com/rss")
        docs1 = await connector.fetch()
    with _patch_httpx(_make_mock_response()):
        docs2 = await connector.fetch()

    assert docs1[0].id == docs2[0].id


@pytest.mark.asyncio
async def test_generic_rss_returns_empty_on_http_error():
    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    import httpx
    mock_client.get = AsyncMock(side_effect=httpx.ConnectError("connection refused"))

    with patch("app.ingestion.connectors.rss.httpx.AsyncClient", return_value=mock_client):
        connector = GenericRSSConnector("https://example.com/rss")
        docs = await connector.fetch()

    assert docs == []


@pytest.mark.asyncio
async def test_sec_edgar_sets_credibility_and_source():
    with _patch_httpx(_make_mock_response()):
        connector = SECEdgarConnector(filing_type="8-K")
        docs = await connector.fetch()

    assert all(d.source_credibility_score == 0.95 for d in docs)
    assert all(d.source_name == "SEC EDGAR" for d in docs)


@pytest.mark.asyncio
async def test_sec_edgar_adds_filing_type_to_metadata():
    with _patch_httpx(_make_mock_response()):
        connector = SECEdgarConnector(filing_type="10-Q")
        docs = await connector.fetch()

    assert all(d.metadata.get("filing_type") == "10-Q" for d in docs)


@pytest.mark.asyncio
async def test_yahoo_finance_no_tickers_uses_top_stories():
    with _patch_httpx(_make_mock_response()):
        connector = YahooFinanceConnector()
        docs = await connector.fetch()

    assert all(d.source_credibility_score == 0.75 for d in docs)
    assert all(d.source_name == "Yahoo Finance" for d in docs)


@pytest.mark.asyncio
async def test_yahoo_finance_with_tickers_adds_ticker_to_metadata():
    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.get = AsyncMock(return_value=_make_mock_response())

    with patch("app.ingestion.connectors.yahoo_finance.httpx.AsyncClient", return_value=mock_client):
        connector = YahooFinanceConnector(tickers=["AAPL", "MSFT"])
        docs = await connector.fetch()

    assert all("ticker" in d.metadata for d in docs)
    tickers_seen = {d.metadata["ticker"] for d in docs}
    assert tickers_seen == {"AAPL", "MSFT"}
