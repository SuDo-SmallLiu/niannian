#!/usr/bin/env bash
#
# 内网自动部署：通过 git SSH 拉取 main，有更新则 build + pm2 restart。
# 适合无法访问 github.com:443 的服务器（self-hosted runner / SSH deploy 均不可用）。
#
# 用法：
#   bash scripts/auto-deploy.sh          # 手动执行
#   bash scripts/auto-deploy.sh --watch  # 每 5 分钟轮询（可配合 cron）
#
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-/home/clawdbot/niannian}"
APP_DIR="$REPO_ROOT/niannian"
BRANCH="${BRANCH:-main}"
LOG_TAG="[niannian-auto-deploy]"

deploy() {
  echo "$LOG_TAG $(date '+%F %T') 开始部署..."

  cd "$REPO_ROOT"
  git fetch origin "$BRANCH"

  LOCAL="$(git rev-parse HEAD)"
  REMOTE="$(git rev-parse "origin/$BRANCH")"

  if [ "$LOCAL" = "$REMOTE" ]; then
    echo "$LOG_TAG $(date '+%F %T') 已是最新 ($LOCAL)"
    return 0
  fi

  echo "$LOG_TAG $(date '+%F %T') 发现更新 $LOCAL -> $REMOTE"
  git reset --hard "origin/$BRANCH"

  cd "$APP_DIR"
  npm ci
  npm run build
  pm2 restart niannian || pm2 start npm --name niannian --cwd "$APP_DIR" -- run start

  echo "$LOG_TAG $(date '+%F %T') 部署完成"
}

if [ "${1:-}" = "--watch" ]; then
  echo "$LOG_TAG 轮询模式启动（每 5 分钟检查一次）"
  while true; do
    deploy || echo "$LOG_TAG $(date '+%F %T') 部署失败，下次重试"
    sleep 300
  done
fi

deploy
