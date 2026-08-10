#!/usr/bin/env python3
"""念念年年 MCP — stdio（Claude Desktop / 本地 IDE）"""
from __future__ import annotations

import logging

from niannian_tools import mcp

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

if __name__ == "__main__":
    mcp.run(transport="stdio")
