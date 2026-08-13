#!/usr/bin/env bash
# 443 NAT 就绪后：申请 LE 证书 + 更新 Nginx + 验证 MCP
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NGINX_SRC="$ROOT/deploy/nginx-production.conf"
NGINX_DST="/etc/nginx/sites-enabled/default"
DOMAINS=(-d niannian-years.top -d www.niannian-years.top)

echo "==> 1/5 防火墙放行 80/443"
ufw allow 80/tcp 2>/dev/null || true
ufw allow 443/tcp 2>/dev/null || true

echo "==> 2/5 申请 Let's Encrypt 证书"
# nginx 插件不支持 tls-alpn-01；外网 80 未 NAT 时改用 standalone + 443
ensure_nginx() {
  systemctl start nginx 2>/dev/null || true
}
trap ensure_nginx EXIT

if [ -f /etc/letsencrypt/live/niannian-years.top/fullchain.pem ]; then
  echo "已有 LE 证书，跳过申请"
else
  echo "停止 Nginx，使用 standalone + tls-alpn-01（仅 443）..."
  systemctl stop nginx

  if ! certbot certonly --standalone \
    "${DOMAINS[@]}" \
    --preferred-challenges tls-alpn-01 \
    --non-interactive --agree-tos --register-unsafely-without-email; then
    echo ""
    echo "standalone tls-alpn-01 失败。请确认 NAT：外网 443 → 10.30.30.189:443"
    echo "若仍失败，请额外 NAT 外网 80 → 10.30.30.189:80 后重试："
    echo "  sudo certbot certonly --nginx ${DOMAINS[*]} --preferred-challenges http-01 --non-interactive --agree-tos --register-unsafely-without-email"
    exit 1
  fi
fi

echo "==> 3/5 启动 Nginx"
systemctl start nginx
trap - EXIT

echo "==> 4/5 更新 Nginx 使用 LE 证书"
cp "$NGINX_SRC" "$NGINX_DST"
sed -i 's|^#\s*ssl_certificate /etc/letsencrypt|ssl_certificate /etc/letsencrypt|' "$NGINX_DST"
sed -i 's|^#\s*ssl_certificate_key /etc/letsencrypt|ssl_certificate_key /etc/letsencrypt|' "$NGINX_DST"
sed -i 's|^\(\s*ssl_certificate /etc/nginx/ssl/selfsigned|#\1|' "$NGINX_DST"
sed -i 's|^\(\s*ssl_certificate_key /etc/nginx/ssl/selfsigned|#\1|' "$NGINX_DST"

nginx -t
systemctl reload nginx

echo "==> 5/5 公网 MCP 验证"
python3 "$ROOT/scripts/verify-mcp-public.py" https://niannian-years.top/mcp

echo ""
echo "✓ 完成！投稿链接: https://niannian-years.top/mcp"
