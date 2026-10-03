# -*- coding: utf-8 -*-
"""调试 OCR 带坐标函数"""
import sys
import os
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

import ctypes
try:
    import pythoncom
    pythoncom.CoInitialize()
except ImportError:
    ctypes.windll.ole32.CoInitialize(None)

import logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s [%(levelname)s] %(message)s')

from wxauto411.ocr import (
    capture_screen_region,
    _ocr_image_via_powershell,
    _ocr_image_with_positions_via_powershell,
    extract_text_with_positions_from_image,
    _upscale_image,
)

# 截图会话列表区域
region = (427, 217, 727, 922)
img_path = capture_screen_region(region)
print(f"截图: {img_path}")

if img_path and os.path.exists(img_path):
    print(f"文件大小: {os.path.getsize(img_path)} bytes")

    # 测试1: 原始 OCR（不带坐标）
    print("\n--- 测试1: 原始 OCR（不带坐标）---")
    text = _ocr_image_via_powershell(img_path)
    print(f"结果: {text!r}")

    # 测试2: 先放大，再原始 OCR
    print("\n--- 测试2: 放大后原始 OCR ---")
    _upscale_image(img_path, scale=2.0)
    text2 = _ocr_image_via_powershell(img_path)
    print(f"结果: {text2!r}")

    # 重新截图（因为上一个被放大覆盖了）
    img_path2 = capture_screen_region(region)
    print(f"\n重新截图: {img_path2}")

    # 测试3: 带坐标 OCR
    print("\n--- 测试3: 带坐标 OCR ---")
    results = _ocr_image_with_positions_via_powershell(img_path2)
    print(f"结果: {results}")

    # 测试4: 完整的 extract_text_with_positions_from_image
    print("\n--- 测试4: 完整 extract_text_with_positions_from_image ---")
    img_path3 = capture_screen_region(region)
    results2 = extract_text_with_positions_from_image(img_path3, upscale=2.0)
    print(f"结果: {results2}")

    # 清理
    for p in [img_path, img_path2, img_path3]:
        try:
            if p and os.path.exists(p):
                os.remove(p)
        except Exception:
            pass
else:
    print("截图失败")
