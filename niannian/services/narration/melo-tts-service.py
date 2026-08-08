#!/usr/bin/env python3
"""
MeloTTS 旁白生成 CLI
用法: python melo-tts-service.py "旁白文本" output.wav -l ZH

依赖安装（首次）:
  cd services/narration && pip install -r requirements.txt
  python -m unidic download
"""
from __future__ import annotations

import argparse
import sys


def synthesize(text: str, output_path: str, lang: str = "ZH", speed: float = 0.95) -> None:
    from melo.api import TTS

    model = TTS(language=lang, device="cpu")
    speaker_ids = model.hps.data.spk2id
    spk = getattr(speaker_ids, lang, None)
    if spk is None and lang in speaker_ids:
        spk = speaker_ids[lang]
    if spk is None:
        spk = next(iter(speaker_ids.values()))
    model.tts_to_file(text, spk, output_path, speed=speed)


def main() -> int:
    parser = argparse.ArgumentParser(description="MeloTTS narration for NianNian")
    parser.add_argument("text", help="旁白文本")
    parser.add_argument("output", help="输出 WAV 路径")
    parser.add_argument("-l", "--lang", default="ZH", help="语言代码，默认 ZH")
    parser.add_argument("--speed", type=float, default=0.95, help="语速")
    args = parser.parse_args()

    text = args.text.strip()
    if not text:
        print("EMPTY_TEXT", file=sys.stderr)
        return 1

    try:
        synthesize(text, args.output, lang=args.lang, speed=args.speed)
    except ImportError as err:
        print(f"MELO_NOT_INSTALLED: {err}", file=sys.stderr)
        return 2
    except Exception as err:
        print(f"TTS_ERROR: {err}", file=sys.stderr)
        return 3

    print("OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
