# -*- coding: utf-8 -*-
"""测试不同放大倍数对 RapidOCR 识别的影响"""
import sys
import os

try:
    sys.stdin.reconfigure(encoding="utf-8")
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

msg_path = r"C:\Users\Administrator\AppData\Temp\wx_msg_region.png"
if not os.path.exists(msg_path):
    print(f"截图不存在: {msg_path}")
    sys.exit(1)

from wxauto411.ocr import extract_text_with_positions_from_image

print(f"测试图片: {msg_path}")
print(f"文件大小: {os.path.getsize(msg_path)} bytes")

for upscale in [1.0, 1.5, 2.0, 3.0, 4.0]:
    results = extract_text_with_positions_from_image(msg_path, upscale=upscale)
    texts = [r.get('text', '') for r in results]
    print(f"\nupscale={upscale}: 识别到 {len(results)} 行文字")
    for i, t in enumerate(texts):
        print(f"  [{i}] {t!r}")
