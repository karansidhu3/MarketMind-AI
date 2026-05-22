from app.ingestion.schema import Document


def test_make_id_is_deterministic():
    assert Document.make_id("https://example.com/a") == Document.make_id("https://example.com/a")


def test_make_id_differs_for_different_seeds():
    assert Document.make_id("https://a.com") != Document.make_id("https://b.com")


def test_make_id_is_valid_uuid():
    import uuid
    doc_id = Document.make_id("https://example.com")
    uuid.UUID(doc_id)  # raises if invalid


def test_to_payload_contains_required_fields():
    doc = Document(
        id="test-id",
        title="Test Title",
        source_name="Test Source",
        source_type="rss",
        source_credibility_score=0.8,
        content="Some content",
        metadata={"url": "https://example.com"},
    )
    payload = doc.to_payload()
    for field in ("id", "title", "source_name", "source_type", "source_credibility_score", "content", "metadata", "created_at"):
        assert field in payload, f"Missing field: {field}"


def test_to_payload_truncates_long_content():
    doc = Document(
        id="test-id",
        title="Test",
        source_name="Test",
        source_type="rss",
        source_credibility_score=0.5,
        content="x" * 3000,
        metadata={},
    )
    assert len(doc.to_payload()["content"]) <= 2000


def test_to_payload_preserves_short_content():
    doc = Document(
        id="test-id",
        title="Test",
        source_name="Test",
        source_type="rss",
        source_credibility_score=0.5,
        content="short",
        metadata={},
    )
    assert doc.to_payload()["content"] == "short"


def test_created_at_defaults_to_utc_now():
    from datetime import timezone
    doc = Document(
        id="test-id",
        title="T",
        source_name="S",
        source_type="rss",
        source_credibility_score=0.5,
        content="c",
        metadata={},
    )
    assert doc.created_at.tzinfo == timezone.utc
