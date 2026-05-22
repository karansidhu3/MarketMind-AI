from unittest.mock import AsyncMock

import pytest

from app.ingestion.schema import Document
from app.ingestion.worker import IngestionWorker


def _make_doc(seed: str, title: str = "Test") -> Document:
    return Document(
        id=Document.make_id(seed),
        title=title,
        source_name="Test Source",
        source_type="rss",
        source_credibility_score=0.75,
        content="Test content for " + title,
        metadata={"url": seed},
    )


@pytest.fixture
def services():
    connector = AsyncMock()
    llm = AsyncMock()
    storage = AsyncMock()
    retrieval = AsyncMock()
    llm.embed = AsyncMock(return_value=[0.1] * 768)
    storage.write = AsyncMock(return_value="/data/raw/2024/01/doc.txt")
    retrieval.upsert = AsyncMock()
    retrieval.ensure_collection = AsyncMock()
    return connector, llm, storage, retrieval


@pytest.mark.asyncio
async def test_worker_ingests_all_documents(services):
    connector, llm, storage, retrieval = services
    docs = [_make_doc("https://example.com/1"), _make_doc("https://example.com/2")]
    connector.fetch = AsyncMock(return_value=docs)

    worker = IngestionWorker(connector, llm, storage, retrieval)
    count = await worker.run()

    assert count == 2
    assert storage.write.await_count == 2
    assert llm.embed.await_count == 2
    assert retrieval.upsert.await_count == 2


@pytest.mark.asyncio
async def test_worker_returns_zero_on_empty_feed(services):
    connector, llm, storage, retrieval = services
    connector.fetch = AsyncMock(return_value=[])

    count = await IngestionWorker(connector, llm, storage, retrieval).run()

    assert count == 0
    storage.write.assert_not_awaited()
    llm.embed.assert_not_awaited()


@pytest.mark.asyncio
async def test_worker_passes_correct_document_id_to_storage(services):
    connector, llm, storage, retrieval = services
    doc = _make_doc("https://example.com/unique")
    connector.fetch = AsyncMock(return_value=[doc])

    await IngestionWorker(connector, llm, storage, retrieval).run()

    storage.write.assert_awaited_once_with(doc.id, doc.content)


@pytest.mark.asyncio
async def test_worker_passes_payload_to_retrieval(services):
    connector, llm, storage, retrieval = services
    doc = _make_doc("https://example.com/payload-test")
    connector.fetch = AsyncMock(return_value=[doc])

    await IngestionWorker(connector, llm, storage, retrieval).run()

    call_args = retrieval.upsert.call_args
    assert call_args.args[0] == "marketmind_documents"
    assert call_args.args[1] == doc.id
    assert len(call_args.args[2]) == 768


@pytest.mark.asyncio
async def test_worker_continues_after_single_document_failure(services):
    connector, llm, storage, retrieval = services
    doc1 = _make_doc("https://example.com/fail")
    doc2 = _make_doc("https://example.com/success")
    connector.fetch = AsyncMock(return_value=[doc1, doc2])
    llm.embed = AsyncMock(side_effect=[Exception("Ollama timeout"), [0.1] * 768])

    count = await IngestionWorker(connector, llm, storage, retrieval).run()

    assert count == 1
    assert retrieval.upsert.await_count == 1


@pytest.mark.asyncio
async def test_worker_embed_text_combines_title_and_content(services):
    connector, llm, storage, retrieval = services
    doc = _make_doc("https://example.com/1", title="Important Headline")
    connector.fetch = AsyncMock(return_value=[doc])

    await IngestionWorker(connector, llm, storage, retrieval).run()

    embed_call_text = llm.embed.call_args.args[0]
    assert "Important Headline" in embed_call_text
    assert doc.content in embed_call_text
