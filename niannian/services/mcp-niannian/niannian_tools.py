"""念念年年 MCP 工具 — 薄包装现有 Next.js API"""
from __future__ import annotations

import logging
import os
import time
import uuid
from typing import Any

import httpx
from mcp.server.mcpserver import MCPServer
from mcp.server.mcpserver.exceptions import ToolError

logger = logging.getLogger("niannian-mcp")

MCP_TIMEOUT_SEC = float(os.environ.get("MCP_UPSTREAM_TIMEOUT", "30"))

mcp = MCPServer(
    name="niannian",
    instructions=(
        "念念年年家庭记忆助手 MCP：搜索记忆、查看家庭/故事/人生电影进度。"
        "需配置 NIANNIAN_SESSION 环境变量（登录后 Cookie 中的 niannian_session 值）。"
    ),
)


def _base_url() -> str:
    return os.environ.get("NIANNIAN_BASE_URL", "http://127.0.0.1:3000").rstrip("/")


def _session_cookie() -> str | None:
    token = os.environ.get("NIANNIAN_SESSION", "").strip()
    return token or None


def _tool_error(code: str, detail: str, *, trace_id: str | None = None) -> ToolError:
    suffix = f" trace_id={trace_id}" if trace_id else ""
    return ToolError(f"{code}: {detail}{suffix}")


async def _request(
    method: str,
    path: str,
    *,
    params: dict[str, Any] | None = None,
    json_body: dict[str, Any] | None = None,
) -> Any:
    trace_id = uuid.uuid4().hex[:12]
    url = f"{_base_url()}{path}"
    headers: dict[str, str] = {"Accept": "application/json"}
    session = _session_cookie()
    if session:
        headers["Cookie"] = f"niannian_session={session}"

    started = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=MCP_TIMEOUT_SEC) as client:
            resp = await client.request(method, url, params=params, json=json_body, headers=headers)
        elapsed_ms = int((time.perf_counter() - started) * 1000)
        logger.info(
            "upstream trace_id=%s %s %s status=%s ms=%s",
            trace_id,
            method,
            path,
            resp.status_code,
            elapsed_ms,
        )
        try:
            data = resp.json()
        except Exception:
            data = {"raw": resp.text[:500]}

        if resp.status_code >= 400:
            detail = str(data.get("error") if isinstance(data, dict) else data)
            raise _tool_error("upstream_error", detail, trace_id=trace_id)
        return data
    except httpx.HTTPError as exc:
        logger.warning("upstream_failed trace_id=%s path=%s err=%s", trace_id, path, exc)
        raise _tool_error("network_error", str(exc), trace_id=trace_id) from exc


@mcp.tool()
async def search_memories(
    q: str = "",
    family_id: str = "",
    location: str = "",
    people: str = "",
    time: str = "",
    analysis_status: str = "all",
    limit: int = 20,
) -> dict[str, Any]:
    """搜索家庭记忆卡。可按关键词、家庭 ID、地点、人物、时间筛选。"""
    params: dict[str, Any] = {
        "limit": max(1, min(limit, 100)),
        "offset": 0,
        "analysisStatus": analysis_status,
    }
    if q:
        params["q"] = q
    if family_id:
        params["familyId"] = family_id
    if location:
        params["location"] = location
    if people:
        params["people"] = people
    if time:
        params["time"] = time
    return await _request("GET", "/api/search", params=params)


@mcp.tool()
async def list_families() -> dict[str, Any]:
    """列出当前登录用户所属的全部家庭空间。"""
    return await _request("GET", "/api/family")


@mcp.tool()
async def get_pipeline_progress(family_id: str = "") -> dict[str, Any]:
    """获取念念 5 步流水线进度（照片数、故事数、电影数、完成度等）。可选 family_id。"""
    params = {"familyId": family_id} if family_id else None
    return await _request("GET", "/api/agent/context", params=params)


@mcp.tool()
async def list_stories(family_id: str, published_only: bool = False) -> dict[str, Any]:
    """列出指定家庭下的所有故事。family_id 必填。"""
    if not family_id.strip():
        raise _tool_error("invalid_input", "family_id 不能为空")
    params: dict[str, Any] = {"familyId": family_id.strip()}
    if published_only:
        params["publishedOnly"] = "1"
    return await _request("GET", "/api/story", params=params)


@mcp.tool()
async def get_story(story_id: str) -> dict[str, Any]:
    """获取单个故事详情，含章节段落与关联记忆卡。"""
    if not story_id.strip():
        raise _tool_error("invalid_input", "story_id 不能为空")
    return await _request("GET", "/api/story", params={"storyId": story_id.strip()})


@mcp.tool()
async def list_movies(family_id: str) -> dict[str, Any]:
    """列出指定家庭下的人生电影。"""
    if not family_id.strip():
        raise _tool_error("invalid_input", "family_id 不能为空")
    return await _request("GET", "/api/movie", params={"familyId": family_id.strip()})


@mcp.tool()
async def get_movie(movie_id: str) -> dict[str, Any]:
    """获取人生电影详情（章节、渲染状态、旁白 manifest）。"""
    if not movie_id.strip():
        raise _tool_error("invalid_input", "movie_id 不能为空")
    return await _request("GET", "/api/movie", params={"movieId": movie_id.strip()})


@mcp.tool()
async def get_ai_status() -> dict[str, Any]:
    """查看 AI 模型配置状态（无需登录）。"""
    return await _request("GET", "/api/ai/status")
