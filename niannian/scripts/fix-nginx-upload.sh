#!/usr/bin/env bash
# 修复外网上传照片 413 / 网络错误：提高 nginx 请求体大小限制
set -euo pipefail

CONF_SRC="$(cd "$(dirname "$0")/.." && pwd)/deploy/nginx-default.conf"
CONF_DST="/etc/nginx/sites-enabled/default"

if [ ! -f "$CONF_SRC" ]; then
  echo "缺少配置模板: $CONF_SRC"
  exit 1
fi

sudo cp "$CONF_SRC" "$CONF_DST"
sudo nginx -t
sudo systemctl reload nginx
echo "nginx 已更新: client_max_body_size 200m"
