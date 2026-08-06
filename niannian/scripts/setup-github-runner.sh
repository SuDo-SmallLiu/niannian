#!/usr/bin/env bash
#
# 在本机注册 GitHub Actions self-hosted runner（内网部署用，无需 SSH Secrets）。
#
# 用法：
#   1. 打开 https://github.com/SuDo-SmallLiu/niannian/settings/actions/runners/new
#   2. 选择 Linux x64，复制页面上的 registration token
#   3. 以 clawdbot 用户运行：
#        RUNNER_TOKEN=xxxx bash scripts/setup-github-runner.sh
#
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/SuDo-SmallLiu/niannian}"
RUNNER_VERSION="${RUNNER_VERSION:-2.327.1}"
RUNNER_DIR="${RUNNER_DIR:-$HOME/actions-runner-niannian}"
RUNNER_NAME="${RUNNER_NAME:-niannian-server}"

if [ -z "${RUNNER_TOKEN:-}" ]; then
  echo "请设置 RUNNER_TOKEN（GitHub → Settings → Actions → Runners → New self-hosted runner）"
  exit 1
fi

mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"

if [ ! -f ./config.sh ]; then
  ARCH="linux-x64"
  TAR="actions-runner-${RUNNER_VERSION}-${ARCH}.tar.gz"
  curl -fsSLO "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/${TAR}"
  tar xzf "$TAR"
fi

./config.sh \
  --url "$REPO_URL" \
  --token "$RUNNER_TOKEN" \
  --name "$RUNNER_NAME" \
  --labels self-hosted,Linux,X64,niannian \
  --unattended \
  --replace

echo ">>> 安装为 systemd 服务（当前用户）..."
sudo ./svc.sh install "$(whoami)"
sudo ./svc.sh start

echo ">>> Runner 已启动。push 到 main 后会自动在本机部署。"
echo ">>> 查看状态: cd $RUNNER_DIR && sudo ./svc.sh status"
