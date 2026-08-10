#!/usr/bin/env python3
"""念念年年 MCP — Streamable HTTP（公网部署 / Cursor / 赛事投稿）"""
from __future__ import annotations

import logging
import os

from mcp.server.transport_security import TransportSecuritySettings

from niannian_tools import mcp

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


def _transport_security() -> TransportSecuritySettings:
    """Allow reverse-proxy Host headers (nginx passes niannian-years.top)."""
    hosts = os.environ.get(
        "MCP_ALLOWED_HOSTS",
        "127.0.0.1:*,localhost:*,[::1]:*,"
        "niannian-years.top,niannian-years.top:*,"
        "www.niannian-years.top,www.niannian-years.top:*",
    )
    origins = os.environ.get(
        "MCP_ALLOWED_ORIGINS",
        "https://niannian-years.top,https://www.niannian-years.top,"
        "http://niannian-years.top,http://www.niannian-years.top,"
        "http://127.0.0.1:*,http://localhost:*",
    )
    return TransportSecuritySettings(
        enable_dns_rebinding_protection=True,
        allowed_hosts=[h.strip() for h in hosts.split(",") if h.strip()],
        allowed_origins=[o.strip() for o in origins.split(",") if o.strip()],
    )


if __name__ == "__main__":
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8080"))
    stateless = os.environ.get("MCP_STATELESS", "true").lower() in ("1", "true", "yes")
    mcp.run(
        transport="streamable-http",
        host=host,
        port=port,
        stateless_http=stateless,
        transport_security=_transport_security(),
    )
