#!/usr/bin/env python3
"""Verify public MCP endpoint with default TLS validation (no verify=False)."""
from __future__ import annotations

import json
import ssl
import sys
import time
import urllib.error
import urllib.request
from typing import Any


def _post(url: str, payload: dict[str, Any], session_id: str | None = None) -> tuple[dict[str, Any], float]:
    body = json.dumps(payload).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
    }
    if session_id:
        headers["Mcp-Session-Id"] = session_id

    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    started = time.perf_counter()
    with urllib.request.urlopen(req, context=ssl.create_default_context(), timeout=30) as resp:
        raw = resp.read().decode("utf-8", errors="replace")
    elapsed_ms = (time.perf_counter() - started) * 1000

    # Streamable HTTP may return SSE; take last JSON line if needed
    data: dict[str, Any] | None = None
    for line in raw.splitlines():
        line = line.strip()
        if line.startswith("data:"):
            line = line[5:].strip()
        if line.startswith("{"):
            try:
                data = json.loads(line)
            except json.JSONDecodeError:
                continue
    if data is None:
        data = json.loads(raw)
    return data, elapsed_ms


def _rpc(url: str, method: str, params: dict[str, Any] | None, req_id: int, session_id: str | None) -> tuple[dict[str, Any], float]:
    payload = {
        "jsonrpc": "2.0",
        "id": req_id,
        "method": method,
        "params": params or {},
    }
    return _post(url, payload, session_id)


def main() -> int:
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <mcp-url>", file=sys.stderr)
        return 2

    url = sys.argv[1].rstrip("/")
    timings: list[tuple[str, float]] = []

    try:
        init_resp, init_ms = _rpc(
            url,
            "initialize",
            {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "verify-mcp-public", "version": "1.0.0"},
            },
            1,
            None,
        )
        timings.append(("initialize", init_ms))

        if "error" in init_resp:
            print(f"FAIL initialize: {init_resp['error']}")
            return 1

        session_id = init_resp.get("result", {}).get("sessionId") or init_resp.get("sessionId")

        tools_resp, tools_ms = _rpc(url, "tools/list", {}, 2, session_id)
        timings.append(("tools/list", tools_ms))
        if "error" in tools_resp:
            print(f"FAIL tools/list: {tools_resp['error']}")
            return 1

        tools = tools_resp.get("result", {}).get("tools") or tools_resp.get("tools") or []
        tool_names = sorted(t.get("name", "") for t in tools)
        print(f"tools ({len(tool_names)}): {', '.join(tool_names)}")
        if len(tool_names) != 8:
            print(f"FAIL expected 8 tools, got {len(tool_names)}")
            return 1

        call_resp, call_ms = _rpc(
            url,
            "tools/call",
            {"name": "get_ai_status", "arguments": {}},
            3,
            session_id,
        )
        timings.append(("tools/call get_ai_status", call_ms))
        if "error" in call_resp:
            print(f"FAIL tools/call: {call_resp['error']}")
            return 1

        result = call_resp.get("result", {})
        if result.get("isError") is True:
            print(f"FAIL get_ai_status returned isError: {result}")
            return 1

        protocol = init_resp.get("result", {}).get("protocolVersion", "unknown")
        print(f"PASS protocol={protocol} tools={len(tool_names)}")
        for name, ms in timings:
            print(f"  {name}: {ms:.0f}ms")
        return 0

    except urllib.error.URLError as exc:
        reason = getattr(exc, "reason", exc)
        print(f"FAIL connection error: {reason}")
        return 1
    except ssl.SSLError as exc:
        print(f"FAIL TLS: {exc}")
        return 1
    except Exception as exc:
        print(f"FAIL unexpected: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
