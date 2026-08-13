#!/usr/bin/env bash
# 用户级 Cloudflare DNS 证书 + 生成 nginx 配置（最后一步需 sudo reload）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CF_CRED="${HOME}/.config/letsencrypt/cloudflare.ini"
LE_DIR="${HOME}/.config/letsencrypt"
NGINX_LE="/home/clawdbot/niannian/niannian/deploy/nginx-le.conf"
DOMAINS=(-d niannian-years.top -d www.niannian-years.top)

if [ ! -f "$CF_CRED" ]; then
  echo "缺少 $CF_CRED"
  exit 1
fi

mkdir -p "$LE_DIR"/{work,logs}

echo "==> DNS 申请证书"
certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials "$CF_CRED" \
  "${DOMAINS[@]}" \
  --config-dir "$LE_DIR" \
  --work-dir "$LE_DIR/work" \
  --logs-dir "$LE_DIR/logs" \
  --non-interactive --agree-tos --register-unsafely-without-email

CERT="$LE_DIR/live/niannian-years.top/fullchain.pem"
KEY="$LE_DIR/live/niannian-years.top/privkey.pem"

echo "==> 生成 nginx 配置: $NGINX_LE"
cat > "$NGINX_LE" <<NGINX
server {
	listen 80;
	listen [::]:80;
	listen 443 ssl;
	listen [::]:443 ssl;
	listen 8799 ssl;
	listen [::]:8799 ssl;
	server_name niannian-years.top www.niannian-years.top 39.170.98.199 _;

	client_max_body_size 200m;
	client_body_timeout 300s;
	client_body_buffer_size 128k;

	ssl_certificate $CERT;
	ssl_certificate_key $KEY;

	location /.well-known/acme-challenge/ {
		root /var/www/certbot;
	}

	location /mcp {
		proxy_pass http://127.0.0.1:8080/mcp;
		proxy_http_version 1.1;
		proxy_set_header Host \$host;
		proxy_set_header Connection "";
		proxy_buffering off;
		proxy_read_timeout 86400s;
		proxy_send_timeout 86400s;
	}

	location / {
		proxy_pass http://127.0.0.1:3000;
		proxy_http_version 1.1;
		proxy_request_buffering off;
		proxy_set_header Upgrade \$http_upgrade;
		proxy_set_header Connection "upgrade";
		proxy_set_header Host \$host;
		proxy_set_header X-Real-IP \$remote_addr;
		proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
		proxy_set_header X-Forwarded-Proto \$scheme;
		proxy_read_timeout 86400;
		proxy_send_timeout 86400;
		proxy_connect_timeout 300s;
	}
}
NGINX

echo ""
echo "证书已就绪。请执行（需 sudo 密码一次）："
echo "  sudo cp $NGINX_LE /etc/nginx/sites-enabled/default"
echo "  sudo chmod 644 $CERT $KEY && sudo nginx -t && sudo systemctl reload nginx"
echo "  python3 $ROOT/scripts/verify-mcp-public.py https://niannian-years.top/mcp"
