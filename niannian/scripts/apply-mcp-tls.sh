#!/usr/bin/env bash
# 应用 LE 证书 nginx 配置（需 sudo 一次）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CERT_DIR="/home/clawdbot/.config/letsencrypt/live/niannian-years.top"
ARCHIVE_DIR="/home/clawdbot/.config/letsencrypt/archive/niannian-years.top"

# nginx (www-data) 需能读取证书
chmod 755 /home/clawdbot /home/clawdbot/.config /home/clawdbot/.config/letsencrypt /home/clawdbot/.config/letsencrypt/live /home/clawdbot/.config/letsencrypt/archive
chmod 755 "$CERT_DIR" "$ARCHIVE_DIR"
chmod 644 "$CERT_DIR"/*.pem "$ARCHIVE_DIR"/*.pem 2>/dev/null || true

cp "$ROOT/deploy/nginx-le.conf" /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "==> MCP 公网验证"
python3 "$ROOT/scripts/verify-mcp-public.py" https://niannian-years.top/mcp
echo "✓ 投稿链接: https://niannian-years.top/mcp"
