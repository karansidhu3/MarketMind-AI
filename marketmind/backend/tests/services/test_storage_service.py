from datetime import datetime, timezone
from pathlib import Path

import pytest

from app.services.storage_service import LocalStorageService


@pytest.fixture
def storage(tmp_path: Path) -> LocalStorageService:
    return LocalStorageService(base_path=tmp_path)


@pytest.mark.asyncio
async def test_write_creates_file_with_correct_content(storage: LocalStorageService):
    path = await storage.write("doc-abc", "Hello, world!")
    assert Path(path).exists()
    assert Path(path).read_text(encoding="utf-8") == "Hello, world!"


@pytest.mark.asyncio
async def test_write_filename_matches_document_id(storage: LocalStorageService, tmp_path: Path):
    path = await storage.write("my-document-id", "content")
    assert Path(path).name == "my-document-id.txt"


@pytest.mark.asyncio
async def test_write_creates_date_partitioned_directory(storage: LocalStorageService, tmp_path: Path):
    path = await storage.write("doc-xyz", "content")
    relative = Path(path).relative_to(tmp_path)
    parts = relative.parts
    now = datetime.now(timezone.utc)
    assert parts[0] == now.strftime("%Y")
    assert parts[1] == now.strftime("%m")
    assert parts[2] == "doc-xyz.txt"


@pytest.mark.asyncio
async def test_read_returns_written_content(storage: LocalStorageService):
    path = await storage.write("doc-read", "Retrieve me later.")
    content = await storage.read(path)
    assert content == "Retrieve me later."


@pytest.mark.asyncio
async def test_read_raises_file_not_found_for_missing_path(storage: LocalStorageService):
    with pytest.raises(FileNotFoundError):
        await storage.read("/nonexistent/path/to/doc.txt")


@pytest.mark.asyncio
async def test_write_overwrites_existing_file(storage: LocalStorageService):
    path = await storage.write("doc-overwrite", "first version")
    await storage.write("doc-overwrite", "second version")
    content = await storage.read(path)
    assert content == "second version"


@pytest.mark.asyncio
async def test_write_handles_unicode_content(storage: LocalStorageService):
    content = "Financial data: €1,000 • 日本語 • émoji 🚀"
    path = await storage.write("doc-unicode", content)
    assert await storage.read(path) == content
