#!/usr/bin/env bash
# 生成主题背景音乐（ambient 循环，约 45s）
set -euo pipefail

OUT_DIR="$(dirname "$0")/../public/audio"
mkdir -p "$OUT_DIR"

generate() {
  local name=$1 f1=$2 f2=$3 vol=$4
  ffmpeg -y -hide_banner -loglevel error \
    -f lavfi -i "sine=frequency=${f1}:duration=45" \
    -f lavfi -i "sine=frequency=${f2}:duration=45" \
    -filter_complex "[0:a][1:a]amix=inputs=2:duration=first,volume=${vol},afade=t=in:st=0:d=3,afade=t=out:st=42:d=3" \
    -t 45 -q:a 6 "${OUT_DIR}/${name}.mp3"
  echo "✓ ${name}.mp3"
}

# 温暖：C + E
generate warm 261.63 329.63 0.12
# 成长：G + B
generate growth 392.00 493.88 0.11
# 探索：A + C#
generate explore 440.00 554.37 0.10
# 庆祝：D + F#
generate celebrate 293.66 369.99 0.13
# 告别：E + G（偏低）
generate farewell 164.81 196.00 0.09
# 传承：F + A
generate heritage 174.61 220.00 0.10
# 默认：G + D
generate default 392.00 587.33 0.10

echo "Done: ${OUT_DIR}"
