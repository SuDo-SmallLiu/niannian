#!/usr/bin/env python3
"""
批量 MeloTTS — 单次加载模型，生成多条旁白（避免每句冷启动 ~40s）
用法: python melo-tts-batch.py tasks.json
JSON: [{ "text": "...", "output": "/path/to/out.wav" }, ...]
"""
from __future__ import annotations

import json
import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) < 2:
        print("USAGE: melo-tts-batch.py tasks.json", file=sys.stderr)
        return 1

    tasks_path = Path(sys.argv[1])
    if not tasks_path.is_file():
        print(f"MISSING_FILE: {tasks_path}", file=sys.stderr)
        return 1

    try:
        tasks = json.loads(tasks_path.read_text(encoding="utf-8"))
    except Exception as err:
        print(f"JSON_ERROR: {err}", file=sys.stderr)
        return 1

    if not isinstance(tasks, list) or not tasks:
        print("OK")
        return 0

    try:
        from melo.api import TTS
    except ImportError as err:
        print(f"MELO_NOT_INSTALLED: {err}", file=sys.stderr)
        return 2

    try:
        model = TTS(language="ZH", device="cpu")
        speaker_ids = model.hps.data.spk2id
        spk = getattr(speaker_ids, "ZH", None)
        if spk is None and "ZH" in speaker_ids:
            spk = speaker_ids["ZH"]
        if spk is None:
            spk = next(iter(speaker_ids.values()))

        for item in tasks:
            text = str(item.get("text", "")).strip()
            output = str(item.get("output", "")).strip()
            if not text or not output:
                continue
            Path(output).parent.mkdir(parents=True, exist_ok=True)
            model.tts_to_file(text, spk, output, speed=0.95)
    except Exception as err:
        print(f"TTS_ERROR: {err}", file=sys.stderr)
        return 3

    print("OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
