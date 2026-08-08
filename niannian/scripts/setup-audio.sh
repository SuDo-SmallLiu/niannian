#!/usr/bin/env bash
# CC0 配乐库目录初始化 + 从 SoundSafari 导入说明
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MUSIC="$ROOT/public/audio/music"

echo "==> 确保配乐目录存在"
mkdir -p "$MUSIC"/{warm,nostalgic,happy,emotional,calm}
mkdir -p "$ROOT/public/audio/narration"/{cache,movies}

echo "==> MVP 占位曲已位于 public/audio/music/"
echo "    配置文件: src/data/music-library.json"
echo ""
echo "==> 从 SoundSafari CC0 库替换（推荐人工精选 10–20 首）:"
echo "    git clone --depth 1 https://github.com/SoundSafari/CC0-1.0-Music.git /tmp/cc0-music"
echo "    挑选后复制到 public/audio/music/{warm,nostalgic,happy,emotional,calm}/"
echo "    并更新 src/data/music-library.json 中的 title/source/license 字段"
echo ""
echo "✓ 配乐库结构就绪"
