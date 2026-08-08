#!/usr/bin/env bash
# 安装 MeloTTS 旁白引擎（中文 CPU 推理，MIT License）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENV="$ROOT/services/narration/.venv"

echo "==> 创建 Python 虚拟环境: $VENV"
python3 -m venv "$VENV"
source "$VENV/bin/activate"

echo "==> 安装 PyTorch (CPU)..."
pip install -U pip wheel
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu

echo "==> 克隆 MeloTTS..."
TMP="/tmp/MeloTTS-setup-$$"
rm -rf "$TMP"
if ! git clone --depth 1 https://github.com/myshell-ai/MeloTTS.git "$TMP" 2>/dev/null; then
  echo "GitHub 不可达，改用镜像下载..."
  curl -fsSL -o "$TMP.zip" "https://ghproxy.net/https://github.com/myshell-ai/MeloTTS/archive/refs/heads/main.zip"
  unzip -q "$TMP.zip" -d /tmp
  mv /tmp/MeloTTS-main "$TMP"
fi
pip install -e "$TMP"
pip install unidic-lite mecab-python3

echo "==> 配置 MeCab 词典 (unidic-lite fallback)..."
SITE="$VENV/lib/python3.10/site-packages"
UNIDIC_DIR="$SITE/unidic/dicdir"
LITE_DIR="$SITE/unidic_lite/dicdir"
if [ ! -f "$UNIDIC_DIR/mecabrc" ] && [ -d "$LITE_DIR" ]; then
  rm -rf "$UNIDIC_DIR"
  cp -a "$LITE_DIR" "$UNIDIC_DIR"
  echo '# dummy mecabrc' > "$UNIDIC_DIR/mecabrc"
fi

echo "==> 下载 unidic 词典..."
python -m unidic download || python -m unidic_lite download || true

export HF_ENDPOINT="${HF_ENDPOINT:-https://hf-mirror.com}"
echo "==> 预下载 HuggingFace 模型 (HF_ENDPOINT=$HF_ENDPOINT)..."
python << 'PY'
import os
os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")
from huggingface_hub import snapshot_download
for repo in [
    "myshell-ai/MeloTTS-Chinese",
    "bert-base-multilingual-uncased",
    "tohoku-nlp/bert-base-japanese-v3",
    "bert-base-uncased",
]:
    print("  downloading", repo)
    snapshot_download(repo_id=repo)
PY

echo "==> 测试 MeloTTS..."
OUT="$ROOT/services/narration/output/test.wav"
mkdir -p "$(dirname "$OUT")"
python "$ROOT/services/narration/melo-tts-service.py" \
  "你好，我是念念，陪你记录家庭的美好时光。" "$OUT" -l ZH

echo "✓ MeloTTS 安装完成，测试音频: $OUT"
echo ""
echo "生产环境请确保 pm2 进程能调用: $VENV/bin/python3"
echo "或设置环境变量 MELO_PYTHON=$VENV/bin/python3"
