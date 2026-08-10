#!/usr/bin/env bash
# 导出可分享的源代码包：不含 node_modules、数据库、上传文件、真实 .env
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$(cd "$ROOT/.." && pwd)"
STAMP="$(date +%Y%m%d)"
OUT_DIR="${1:-$HOME/下载/niannian-source-sanitized-$STAMP}"
ZIP_PATH="${OUT_DIR}.zip"

rm -rf "$OUT_DIR" "$ZIP_PATH"
mkdir -p "$OUT_DIR/niannian"

rsync -a \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude 'out' \
  --exclude 'data' \
  --exclude '.env.local' \
  --exclude '.env' \
  --exclude 'public/uploads' \
  --exclude 'public/audio/narration' \
  --exclude 'public/video/movies' \
  --exclude 'services/narration/.venv' \
  --exclude 'services/mcp-niannian/.venv' \
  --exclude '**/__pycache__' \
  --exclude '.cache' \
  --exclude 'deploy.log' \
  --exclude '.git' \
  "$ROOT/" "$OUT_DIR/niannian/"

# 根目录 README（若存在 AGENTS 等）
for f in AGENTS.md CLAUDE.md; do
  [ -f "$REPO/$f" ] && cp "$REPO/$f" "$OUT_DIR/" 2>/dev/null || true
done

cat > "$OUT_DIR/README-EXPORT.txt" <<'EOF'
念念年年 · 脱敏源代码包

已排除：
- .env.local / 真实 API Key
- node_modules、.next
- data/niannian.db、用户上传照片、旁白缓存、已渲染 MP4

使用前：
1. cd niannian && cp .env.example .env.local
2. 编辑 .env.local 填入你自己的 API Key
3. npm ci && npm run build && npm run start

切勿将填好密钥的 .env.local 上传到公开平台。
EOF

(cd "$OUT_DIR/.." && zip -rq "$ZIP_PATH" "$(basename "$OUT_DIR")")
rm -rf "$OUT_DIR"
echo "✓ 已生成: $ZIP_PATH"
du -h "$ZIP_PATH"
