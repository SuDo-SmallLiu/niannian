"""MCP contract tests — initialize, tools/list, tool errors."""
from __future__ import annotations

import asyncio
import os
import sys

import pytest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "services", "mcp-niannian"))

from mcp.server.mcpserver.exceptions import ToolError
from niannian_tools import get_ai_status, get_story, mcp


@pytest.fixture
def anyio_backend():
    return "asyncio"


def test_tools_count():
    tools = asyncio.run(mcp.list_tools())
    names = sorted(t.name for t in tools)
    assert len(names) == 8
    assert "get_ai_status" in names
    assert "get_story" in names


@pytest.mark.asyncio
async def test_get_ai_status_without_session(monkeypatch):
    monkeypatch.delenv("NIANNIAN_SESSION", raising=False)
    monkeypatch.setenv("NIANNIAN_BASE_URL", os.environ.get("NIANNIAN_BASE_URL", "http://127.0.0.1:3000"))
    try:
        result = await get_ai_status()
    except ToolError:
        pytest.skip("Next.js API unavailable")
    assert isinstance(result, dict)
    assert "configured" in result
    assert "visionModels" in result
    assert "textModels" in result
    assert "keyPrefix" not in result
    assert "baseURL" not in result


@pytest.mark.asyncio
async def test_get_story_empty_id_is_error():
    with pytest.raises(ToolError, match="invalid_input"):
        await get_story("")
