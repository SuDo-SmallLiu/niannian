#!/usr/bin/env bash
# 部署念念 MCP 到生产：PM2 + Nginx /mcp 反代
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MCP_DIR="$ROOT/services/mcp-niannian"
NGINX_SRC="$ROOT/deploy/nginx-production.conf"
NGINX_DST="/etc/nginx/sites-enabled/default"

echo "==> 安装 MCP Python 依赖"
cd "$MCP_DIR"
if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
.venv/bin/pip install -q -r requirements.txt

echo "==> 获取服务用 Session（quick-login）"
SESSION=""
LOGIN_RESP=$(curl -s -X POST http://127.0.0.1:3000/api/auth/quick-login \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800000001"}' -D - -o /tmp/mcp-login-body.json 2>/dev/null || true)
SESSION=$(echo "$LOGIN_RESP" | grep -i 'set-cookie: niannian_session=' | sed 's/.*niannian_session=\([^;]*\).*/\1/' | tr -d '\r' | head -1)
if [ -z "$SESSION" ]; then
  echo "警告: 未能自动获取 NIANNIAN_SESSION，MCP 鉴权工具可能不可用"
  echo "请手动设置: pm2 restart niannian-mcp --update-env 并在 env 中填入 NIANNIAN_SESSION"
fi

echo "==> 启动 PM2: niannian-mcp"
pm2 delete niannian-mcp 2>/dev/null || true
NIANNIAN_BASE_URL=http://127.0.0.1:3000 \
HOST=127.0.0.1 \
PORT=8080 \
MCP_STATELESS=true \
NIANNIAN_SESSION="$SESSION" \
pm2 start "$MCP_DIR/.venv/bin/python" \
  --name niannian-mcp \
  --cwd "$MCP_DIR" \
  --update-env \
  -- mcp_server.py

echo "==> 更新 Nginx /mcp 反代"
sudo cp "$NGINX_SRC" "$NGINX_DST"
sudo nginx -t
sudo systemctl reload nginx

echo "==> 本地验证"
sleep 2
curl -s -X POST http://127.0.0.1:8080/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"deploy-check","version":"1.0"}}}' \
  | head -c 200
echo ""
curl -s -X POST http://127.0.0.1/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
  | head -c 300
echo ""

pm2 list | grep niannian-mcp || true
echo ""
echo "✓ MCP 部署完成"
echo "  公网链接: https://niannian-years.top/mcp"
echo "  备用端口: https://niannian-years.top:8799/mcp"
