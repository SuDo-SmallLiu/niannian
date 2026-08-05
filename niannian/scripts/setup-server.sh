#!/usr/bin/env bash
#
# 念念年年 (niannian) 服务器一键初始化脚本
# 适用系统：Ubuntu / Debian（apt 系）
# 用法：在服务器上以「有 sudo 权限的普通用户」运行：
#   bash scripts/setup-server.sh
#
set -euo pipefail

# ===== 可在运行前通过环境变量覆盖，或运行后按提示输入 =====
DEPLOY_PATH="${DEPLOY_PATH:-/var/www/niannian}"
REPO_URL="${REPO_URL:-https://github.com/SuDo-SmallLiu/niannian.git}"
APP_NAME="niannian"

echo ">>> 开始初始化 $APP_NAME 部署环境"
echo "    部署目录: $DEPLOY_PATH"
echo "    仓库地址: $REPO_URL"

# 1. 系统依赖（better-sqlite3 需要编译，故包含 build-essential / python3）
echo ">>> [1/6] 安装系统依赖 (git, curl, 编译工具)..."
sudo apt-get update
sudo apt-get install -y git curl build-essential python3

# 2. Node.js 20
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
  echo ">>> [2/6] 安装 Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
else
  echo ">>> [2/6] Node.js 已满足要求: $(node -v)"
fi

# 3. pm2 守护进程
echo ">>> [3/6] 安装 pm2..."
if ! command -v pm2 >/dev/null 2>&1; then
  sudo npm install -g pm2
else
  echo ">>> pm2 已安装: $(pm2 -v)"
fi

# 4. 拉取代码
echo ">>> [4/6] 准备代码目录 $DEPLOY_PATH ..."
if [ -d "$DEPLOY_PATH/.git" ]; then
  echo "    目录已存在，执行 git pull..."
  git -C "$DEPLOY_PATH" pull origin main
else
  sudo mkdir -p "$(dirname "$DEPLOY_PATH")"
  sudo git clone "$REPO_URL" "$DEPLOY_PATH"
fi

# 5. 安装依赖并构建
echo ">>> [5/6] 安装依赖并构建..."
cd "$DEPLOY_PATH"
npm ci --omit=dev
npm run build

# 6. 环境变量与启动
echo ">>> [6/6] 配置环境变量并启动..."
ENV_FILE="$DEPLOY_PATH/.env.local"
if [ ! -f "$ENV_FILE" ]; then
  echo "    未检测到 .env.local，请根据提示填写（直接回车 = 演示模式）："
  read -r -p "    ARK_API_KEY (留空=演示模式): " ARK_API_KEY
  read -r -p "    ARK_BASE_URL [https://ark.cn-beijing.volces.com/api/v3]: " ARK_BASE_URL
  read -r -p "    ARK_VISION_MODEL [doubao-vision-pro-32k]: " ARK_VISION_MODEL
  read -r -p "    ARK_TEXT_MODEL [doubao-pro-32k]: " ARK_TEXT_MODEL
  ARK_BASE_URL="${ARK_BASE_URL:-https://ark.cn-beijing.volces.com/api/v3}"
  ARK_VISION_MODEL="${ARK_VISION_MODEL:-doubao-vision-pro-32k}"
  ARK_TEXT_MODEL="${ARK_TEXT_MODEL:-doubao-pro-32k}"
  cat > "$ENV_FILE" <<EOF
ARK_API_KEY=$ARK_API_KEY
ARK_BASE_URL=$ARK_BASE_URL
ARK_VISION_MODEL=$ARK_VISION_MODEL
ARK_TEXT_MODEL=$ARK_TEXT_MODEL
EOF
  echo "    已写入 $ENV_FILE"
else
  echo "    已存在 .env.local，跳过。"
fi

pm2 start npm --name "$APP_NAME" -- run start
pm2 save
echo ">>> 完成！应用已在 pm2 中以 '$APP_NAME' 运行（默认端口 3000）。"
echo ">>> 建议继续："
echo "    1) 配置 Nginx 反向代理到 localhost:3000；"
echo "    2) 设置 pm2 开机自启："
echo "       sudo env PATH=\$PATH:\$(which node) \$(which pm2) startup"
