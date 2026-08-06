#!/usr/bin/env bash
#
# 安装 niannian 自动部署 cron（每 5 分钟 git fetch + 有更新则部署）
# 用法：bash scripts/install-auto-deploy-cron.sh
#
set -euo pipefail

SCRIPT="/home/clawdbot/niannian/niannian/scripts/auto-deploy.sh"
CRON_LINE="*/5 * * * * $SCRIPT >> /home/clawdbot/niannian/deploy.log 2>&1"

chmod +x "$SCRIPT"

if crontab -l 2>/dev/null | grep -Fq "$SCRIPT"; then
  echo ">>> cron 已存在，跳过"
else
  (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
  echo ">>> 已添加 cron：每 5 分钟检查并自动部署"
fi

echo ">>> 立即执行一次..."
bash "$SCRIPT"
