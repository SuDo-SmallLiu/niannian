#!/usr/bin/env bash
#
# 为 GitHub Actions SSH 自动部署生成密钥，并输出需填入仓库 Secrets 的值。
# 用法（在部署服务器上，以运行 pm2 的用户执行，例如 clawdbot）：
#   bash scripts/setup-github-deploy.sh
#
set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-$(whoami)}"
DEPLOY_HOME="$(eval echo "~$DEPLOY_USER")"
REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}"
KEY_PATH="$DEPLOY_HOME/.ssh/github_actions_deploy"
SSH_DIR="$DEPLOY_HOME/.ssh"

echo ">>> GitHub Actions SSH 部署初始化"
echo "    用户: $DEPLOY_USER"
echo "    仓库根目录: $REPO_ROOT"

mkdir -p "$SSH_DIR"
chmod 700 "$SSH_DIR"

if [ ! -f "$KEY_PATH" ]; then
  echo ">>> 生成部署专用密钥 $KEY_PATH ..."
  ssh-keygen -t ed25519 -N "" -C "github-actions-deploy-niannian" -f "$KEY_PATH"
else
  echo ">>> 已存在部署密钥，跳过生成"
fi

AUTH_KEYS="$SSH_DIR/authorized_keys"
PUB="$(cat "${KEY_PATH}.pub")"
if [ -f "$AUTH_KEYS" ] && grep -Fq "$PUB" "$AUTH_KEYS"; then
  echo ">>> authorized_keys 已包含该公钥"
else
  echo ">>> 写入 authorized_keys ..."
  echo "$PUB github-actions-deploy-niannian" >> "$AUTH_KEYS"
  chmod 600 "$AUTH_KEYS"
fi

# 探测可被 GitHub Runner 访问的 SSH 地址
SSH_HOST="${SSH_HOST:-}"
if [ -z "$SSH_HOST" ]; then
  SSH_HOST="$(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || true)"
fi
if [ -z "$SSH_HOST" ]; then
  SSH_HOST="$(hostname -I 2>/dev/null | awk '{print $1}')"
fi

echo ""
echo "=========================================="
echo "请在 GitHub 仓库 Settings → Secrets → Actions 中配置："
echo ""
echo "SSH_HOST"
echo "$SSH_HOST"
echo ""
echo "SSH_USERNAME"
echo "$DEPLOY_USER"
echo ""
echo "DEPLOY_PATH"
echo "$REPO_ROOT"
echo ""
echo "SSH_KEY（整段私钥，含 BEGIN/END 行）"
cat "$KEY_PATH"
echo ""
echo "=========================================="
echo "配置完成后，在 Actions 页手动 Run workflow「Deploy niannian」验证。"
echo "确保服务器 sshd 允许 $DEPLOY_USER 登录，且防火墙放行 22 端口。"
