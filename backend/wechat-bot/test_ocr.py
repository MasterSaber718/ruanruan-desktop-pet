# -*- coding: utf-8 -*-
"""测试 OCR 功能：截图微信会话列表并用 RapidOCR 识别"""
import sys
import os

# 添加路径
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

# 强制 UTF-8 输出
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

from wxauto411.ocr import capture_screen_region, extract_text_with_positions_from_image
from wxauto411.wechat import WeChat

print("=" * 60)
print("测试 OCR 功能")
print("=" * 60)

try:
    # 连接微信
    print("\n[1] 连接微信窗口...")
    wx = WeChat(debug=False, resize=False)
    print(f"    微信连接成功: {wx.my_info}")

    # 获取会话列表区域
    print("\n[2] 获取会话列表区域...")
    region = wx._get_session_list_region()
    if not region:
        print("    失败：无法获取会话列表区域")
        sys.exit(1)
    print(f"    会话列表区域: {region}")

    # 截图
    print("\n[3] 截图会话列表区域...")
    img_path = capture_screen_region(region)
    if not img_path:
        print("    失败：截图失败")
        sys.exit(1)
    print(f"    截图保存到: {img_path}")

    # OCR 识别
    print("\n[4] RapidOCR 识别（3倍放大）...")
    results = extract_text_with_positions_from_image(img_path, upscale=3.0)
    print(f"    识别到 {len(results)} 行文字")

    for i, r in enumerate(results):
        text = r.get('text', '')
        x = r.get('x', 0)
        y = r.get('y', 0)
        w = r.get('w', 0)
        h = r.get('h', 0)
        print(f"    [{i}] text={text!r} x={x:.1f} y={y:.1f} w={w:.1f} h={h:.1f}")

    # 匹配 "主人"
    print("\n[5] 匹配 '主人'...")
    match = None
    for r in results:
        text = (r.get('text') or '').strip()
        if text == '主人':
            match = r
            break
    if match:
        print(f"    精确匹配成功: {match}")
    else:
        # 模糊匹配
        for r in results:
            text = (r.get('text') or '').strip()
            if '主人' in text or text in '主人':
                match = r
                break
    if match:
        print(f"    匹配结果: {match}")
    else:
        print("    未匹配到 '主人'")

    # 清理临时文件
    try:
        os.remove(img_path)
    except Exception:
        pass

    print("\n" + "=" * 60)
    print("测试完成")
    print("=" * 60)

except Exception as e:
    import traceback
    print(f"\n测试失败: {e}")
    traceback.print_exc()
    sys.exit(1)
