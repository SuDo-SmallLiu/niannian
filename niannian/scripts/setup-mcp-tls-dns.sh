#!/usr/bin/env bash
# 通过 Cloudflare DNS-01 申请 LE 证书（无需外网 80/443 验证）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NGINX_SRC="$ROOT/deploy/nginx-production.conf"
NGINX_DST="/etc/nginx/sites-enabled/default"
CF_CRED="/etc/letsencrypt/cloudflare.ini"
DOMAINS=(-d niannian-years.top -d www.niannian-years.top)

echo "==> 1/4 检查 Cloudflare API 凭据"
if [ ! -f "$CF_CRED" ]; then
  cat <<'EOF'

未找到 /etc/letsencrypt/cloudflare.ini

请先在 Cloudflare 创建 API Token：
  1. 登录 https://dash.cloudflare.com/profile/api-tokens
  2. Create Token → Edit zone DNS（限定 niannian-years.top）
  3. 创建凭据文件：

sudo tee /etc/letsencrypt/cloudflare.ini > /dev/null <<INI
dns_cloudflare_api_token = 你的Cloudflare_API_Token
INI
sudo chmod 600 /etc/letsencrypt/cloudflare.ini

然后重新运行本脚本。
EOF
  exit 1
fi

echo "==> 2/4 DNS-01 申请证书"
if [ -f /etc/letsencrypt/live/niannian-years.top/fullchain.pem ]; then
  echo "已有 LE 证书，跳过申请"
else
  certbot certonly --dns-cloudflare \
    --dns-cloudflare-credentials "$CF_CRED" \
    "${DOMAINS[@]}" \
    --non-interactive --agree-tos --register-unsafely-without-email
fi

echo "==> 3/4 更新 Nginx 使用 LE 证书"
cp "$NGINX_SRC" "$NGINX_DST"
sed -i 's|^#\s*ssl_certificate /etc/letsencrypt|ssl_certificate /etc/letsencrypt|' "$NGINX_DST"
sed -i 's|^#\s*ssl_certificate_key /etc/letsencrypt|ssl_certificate_key /etc/letsencrypt|' "$NGINX_DST"
sed -i 's|^\(\s*ssl_certificate /etc/nginx/ssl/selfsigned|#\1|' "$NGINX_DST"
sed -i 's|^\(\s*ssl_certificate_key /etc/nginx/ssl/selfsigned|#\1|' "$NGINX_DST"

nginx -t
systemctl reload nginx

echo "==> 4/4 公网 MCP 验证"
python3 "$ROOT/scripts/verify-mcp-public.py" https://niannian-years.top/mcp

echo ""
echo "✓ 完成！投稿链接: https://niannian-years.top/mcp"
