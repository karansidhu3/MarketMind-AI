from unittest.mock import AsyncMock

import pytest

from app.research.service import (
    ResearchService,
    RETRIEVE_K,
    RETURN_K,
    _clean_expansion,
    _keyword_overlap,
)
from app.services.retrieval_service import SearchResult


def _make_result(
    score: float,
    title: str = "Test Article",
    content: str = "Test content.",
    credibility: float = 0.95,
) -> SearchResult:
    return SearchResult(
        id="some-uuid",
        score=score,
        payload={
            "title": title,
            "content": content,
            "source_name": "SEC EDGAR",
            "source_credibility_score": credibility,
            "metadata": {"url": "https://example.com/article"},
        },
    )


@pytest.fixture
def services():
    llm = AsyncMock()
    retrieval = AsyncMock()
    llm.embed = AsyncMock(return_value=[0.1] * 768)
    llm.generate = AsyncMock(return_value="data centers\nelectricity\ncooling")
    retrieval.ensure_collection = AsyncMock()
    retrieval.search = AsyncMock(return_value=[])
    return llm, retrieval


# ── plan() ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_plan_strips_original_query(services):
    llm, retrieval = services
    svc = ResearchService(llm, retrieval)
    result = await svc.plan("  hello world  ")
    assert result.startswith("hello world")


@pytest.mark.asyncio
async def test_plan_appends_expansion_terms(services):
    llm, retrieval = services
    llm.generate = AsyncMock(return_value="data centers\nelectricity\ncooling")
    svc = ResearchService(llm, retrieval)
    result = await svc.plan("AI power demand")
    assert result.startswith("AI power demand")
    assert "data centers" in result
    assert "electricity" in result


@pytest.mark.asyncio
async def test_plan_falls_back_on_llm_error(services):
    llm, retrieval = services
    llm.generate = AsyncMock(side_effect=Exception("timeout"))
    svc = ResearchService(llm, retrieval)
    result = await svc.plan("AI power demand")
    assert result == "AI power demand"


@pytest.mark.asyncio
async def test_plan_falls_back_on_empty_expansion(services):
    llm, retrieval = services
    llm.generate = AsyncMock(return_value="   ")
    svc = ResearchService(llm, retrieval)
    result = await svc.plan("AI power demand")
    assert result == "AI power demand"


# ── retrieve() ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_retrieve_embeds_then_searches(services):
    llm, retrieval = services
    retrieval.search = AsyncMock(return_value=[_make_result(0.9)])
    svc = ResearchService(llm, retrieval)
    results = await svc.retrieve("Nvidia")
    llm.embed.assert_awaited_once_with("Nvidia")
    retrieval.search.assert_awaited_once()
    assert len(results) == 1


@pytest.mark.asyncio
async def test_retrieve_uses_retrieve_k(services):
    llm, retrieval = services
    svc = ResearchService(llm, retrieval)
    await svc.retrieve("query")
    assert retrieval.search.call_args.kwargs.get("top_k") == RETRIEVE_K


# ── _clean_expansion() ───────────────────────────────────────────────────────

def test_clean_expansion_strips_punctuation():
    assert _clean_expansion("data center, power.") == "data center power"


def test_clean_expansion_discards_phrases_over_three_words():
    result = _clean_expansion("data center power\nadvanced AI infrastructure ecosystem")
    assert "advanced AI infrastructure ecosystem" not in result
    assert "data center power" in result


def test_clean_expansion_deduplicates_case_insensitive():
    result = _clean_expansion("data center\nData Center\nelectricity")
    assert result.lower().count("data center") == 1


def test_clean_expansion_caps_at_five_terms():
    raw = "\n".join(f"term{i}" for i in range(10))
    assert len(_clean_expansion(raw).split()) == 5


def test_clean_expansion_returns_empty_when_all_invalid():
    result = _clean_expansion("this phrase is far too long to be accepted here\nalso this one too")
    assert result == ""


def test_clean_expansion_skips_blank_lines():
    result = _clean_expansion("\ndata centers\n\nelectricity\n")
    assert result == "data centers electricity"


def test_clean_expansion_accepts_single_word_terms():
    assert _clean_expansion("utilities\nnuclear") == "utilities nuclear"


# ── _keyword_overlap() ────────────────────────────────────────────────────────

def test_keyword_overlap_full_match():
    assert _keyword_overlap("nvidia data center", "nvidia data center revenue") == 1.0


def test_keyword_overlap_partial_match():
    score = _keyword_overlap("nvidia power demand", "nvidia reported strong results")
    assert 0.0 < score < 1.0


def test_keyword_overlap_no_match():
    assert _keyword_overlap("nvidia chips", "apple revenue grew") == 0.0


def test_keyword_overlap_ignores_stop_words():
    # "what", "are", "the" are stop words — only "benefits" is meaningful
    score = _keyword_overlap("what are the benefits", "significant benefits reported")
    assert score == 1.0


def test_keyword_overlap_empty_query_after_stop_removal():
    # query is all stop words
    assert _keyword_overlap("what is the", "some document text") == 0.0


# ── rerank() ─────────────────────────────────────────────────────────────────

def test_rerank_returns_at_most_return_k():
    llm = AsyncMock()
    retrieval = AsyncMock()
    svc = ResearchService(llm, retrieval)
    results = [_make_result(0.9, content=f"nvidia power {i}") for i in range(RETRIEVE_K)]
    reranked = svc.rerank("nvidia power", results)
    assert len(reranked) <= RETURN_K


def test_rerank_orders_by_weighted_score():
    llm = AsyncMock()
    retrieval = AsyncMock()
    svc = ResearchService(llm, retrieval)

    # High credibility, keyword match — should rank first
    strong = _make_result(0.8, content="nvidia power demand electricity", credibility=0.95)
    # Low credibility, no keyword match — should rank last
    weak = _make_result(0.9, content="apple quarterly results", credibility=0.50)

    reranked = svc.rerank("nvidia power demand", [weak, strong])
    assert reranked[0] is strong


def test_rerank_uses_credibility_in_score():
    llm = AsyncMock()
    retrieval = AsyncMock()
    svc = ResearchService(llm, retrieval)

    high_cred = _make_result(0.7, content="nvidia power demand", credibility=0.95)
    low_cred = _make_result(0.7, content="nvidia power demand", credibility=0.50)

    reranked = svc.rerank("nvidia power demand", [low_cred, high_cred])
    assert reranked[0] is high_cred


def test_rerank_all_zero_scores_returns_results():
    # When nothing matches keyword-wise, rerank still returns results (score = 0 for all)
    llm = AsyncMock()
    retrieval = AsyncMock()
    svc = ResearchService(llm, retrieval)
    results = [_make_result(0.8, content="unrelated content")]
    reranked = svc.rerank("nvidia power", results)
    assert len(reranked) == 1


# ── synthesize() ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_synthesize_empty_results_returns_no_documents_response(services):
    llm, retrieval = services
    svc = ResearchService(llm, retrieval)
    response = await svc.synthesize("Why is Nvidia bullish?", [])
    assert response.confidence == 0.0
    assert response.evidence == []
    assert response.sources == []
    assert "No relevant documents" in response.answer
    llm.generate.assert_not_awaited()


@pytest.mark.asyncio
async def test_synthesize_calls_generate_with_context(services):
    llm, retrieval = services
    results = [_make_result(0.85, title="Nvidia Report", content="AI chip demand is soaring.")]
    svc = ResearchService(llm, retrieval)
    await svc.synthesize("Why is Nvidia bullish?", results)
    prompt_arg = llm.generate.call_args.args[0]
    assert "Why is Nvidia bullish?" in prompt_arg
    assert "Nvidia Report" in prompt_arg
    assert "AI chip demand is soaring." in prompt_arg


@pytest.mark.asyncio
async def test_synthesize_confidence_is_mean_of_scores(services):
    llm, retrieval = services
    results = [_make_result(0.8), _make_result(0.6)]
    svc = ResearchService(llm, retrieval)
    response = await svc.synthesize("query", results)
    assert response.confidence == round((0.8 + 0.6) / 2, 3)


@pytest.mark.asyncio
async def test_synthesize_populates_sources(services):
    llm, retrieval = services
    results = [_make_result(0.9, title="AAPL 8-K")]
    svc = ResearchService(llm, retrieval)
    response = await svc.synthesize("query", results)
    assert response.sources[0].title == "AAPL 8-K"
    assert response.sources[0].source_name == "SEC EDGAR"
    assert response.sources[0].url == "https://example.com/article"
    assert response.sources[0].source_credibility_score == 0.95


@pytest.mark.asyncio
async def test_synthesize_answer_comes_from_llm(services):
    llm, retrieval = services
    llm.generate = AsyncMock(return_value="Investors are bullish because of AI.")
    results = [_make_result(0.9)]
    svc = ResearchService(llm, retrieval)
    response = await svc.synthesize("query", results)
    assert response.answer == "Investors are bullish because of AI."


# ── full flow ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_full_flow_matches_endpoint_order(services):
    llm, retrieval = services
    llm.generate = AsyncMock(return_value="data centers\nelectricity")
    retrieval.search = AsyncMock(return_value=[
        _make_result(0.88, content="nvidia power data center electricity", credibility=0.95),
    ])
    svc = ResearchService(llm, retrieval)

    original = "Why Nvidia?"
    planned = await svc.plan(f"  {original}  ")
    results = await svc.retrieve(planned)
    reranked = svc.rerank(original, results)
    response = await svc.synthesize(original, reranked)

    assert response.query == original
    assert len(response.sources) == 1
    assert 0.0 <= response.confidence <= 1.0
