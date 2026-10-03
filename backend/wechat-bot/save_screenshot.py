# -*- coding: utf-8 -*-
"""截图会话列表保存到桌面，方便用户确认"""
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
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')

from wxauto411 import WeChat
from wxauto411.ocr import capture_screen_region, extract_text_with_positions_from_image, _upscale_image, _ocr_image_with_positions_via_powershell

try:
    wx = WeChat(debug=False, resize=False)
except Exception as e:
    print(f"初始化失败: {e}")
    sys.exit(1)

region = wx._get_session_list_region()
print(f"会话列表区域: {region}")

# 截图原始图片
img_path = capture_screen_region(region)
if not img_path:
    print("截图失败")
    sys.exit(1)

# 复制到项目目录
desktop = os.path.join(SCRIPT_DIR, "debug_screenshots")
os.makedirs(desktop, exist_ok=True)
dest = os.path.join(desktop, "wechat_session_list.png")
import shutil
shutil.copy2(img_path, dest)
print(f"原始截图已保存到: {dest}")

# 放大 3 倍再 OCR
img_path_3x = capture_screen_region(region)
_upscale_image(img_path_3x, scale=3.0)
dest_3x = os.path.join(desktop, "wechat_session_list_3x.png")
shutil.copy2(img_path_3x, dest_3x)
print(f"3倍放大截图已保存到: {dest_3x}")

# OCR 识别（用 3 倍放大的图）
results = _ocr_image_with_positions_via_powershell(img_path_3x)
print(f"\n3倍放大 OCR 识别到 {len(results)} 行文字:")
for i, r in enumerate(results):
    text = r.get('text', '')
    x = r.get('x', 0)
    y = r.get('y', 0)
    # 3倍放大后的坐标，缩回原图
    orig_x = x / 3.0 if isinstance(x, (int, float)) else 0
    orig_y = y / 3.0 if isinstance(y, (int, float)) else 0
    screen_x = int(region[0] + orig_x)
    screen_y = int(region[1] + orig_y)
    print(f"  [{i}] {text!r} 相对({orig_x:.0f},{orig_y:.0f}) 屏幕({screen_x},{screen_y})")

# 清理临时文件
for p in [img_path, img_path_3x]:
    try:
        os.remove(p)
    except Exception:
        pass
