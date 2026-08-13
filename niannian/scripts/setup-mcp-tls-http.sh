#!/usr/bin/env bash
# 外网 80 NAT 就绪后：standalone http-01 申请 LE 证书
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NGINX_SRC="$ROOT/deploy/nginx-production.conf"
NGINX_DST="/etc/nginx/sites-enabled/default"
DOMAINS=(-d niannian-years.top -d www.niannian-years.top)

ensure_nginx() { systemctl start nginx 2>/dev/null || true; }
trap ensure_nginx EXIT

echo "==> 1/5 申请 LE 证书（standalone http-01，需 NAT 外网80→本机80）"
if [ -f /etc/letsencrypt/live/niannian-years.top/fullchain.pem ]; then
  echo "已有 LE 证书，跳过申请"
else
  systemctl stop nginx
  certbot certonly --standalone \
    "${DOMAINS[@]}" \
    --preferred-challenges http-01 \
    --non-interactive --agree-tos --register-unsafely-without-email
fi

systemctl start nginx
trap - EXIT

echo "==> 2/5 更新 Nginx"
cp "$NGINX_SRC" "$NGINX_DST"
sed -i 's|^#\s*ssl_certificate /etc/letsencrypt|ssl_certificate /etc/letsencrypt|' "$NGINX_DST"
sed -i 's|^#\s*ssl_certificate_key /etc/letsencrypt|ssl_certificate_key /etc/letsencrypt|' "$NGINX_DST"
sed -i 's|^\(\s*ssl_certificate /etc/nginx/ssl/selfsigned|#\1|' "$NGINX_DST"
sed -i 's|^\(\s*ssl_certificate_key /etc/nginx/ssl/selfsigned|#\1|' "$NGINX_DST"
nginx -t && systemctl reload nginx

echo "==> 3/5 公网 MCP 验证"
python3 "$ROOT/scripts/verify-mcp-public.py" https://niannian-years.top/mcp
echo "✓ 完成！"
