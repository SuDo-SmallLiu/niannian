"""念念年年 MCP — stdio 入口（魔搭 uvx 托管 / Claude Desktop）"""
from __future__ import annotations

import logging

from niannian_mcp.tools import mcp

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


def main() -> None:
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
