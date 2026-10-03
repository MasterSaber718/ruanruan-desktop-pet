# -*- coding: utf-8 -*-
"""
测试 ChatWith 坐标+OCR 方案
1. 截图会话列表区域
2. OCR 识别文字及坐标
3. 打印识别结果
4. 测试点击指定联系人
"""
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
from wxauto411.ocr import capture_screen_region, extract_text_with_positions_from_image


def test_ocr_session_list():
    """测试 OCR 识别会话列表"""
    print("=" * 70)
    print("测试 1: OCR 识别会话列表")
    print("=" * 70)

    try:
        wx = WeChat(debug=True, resize=False)
    except Exception as e:
        print(f"初始化 WeChat 失败: {e}")
        return None

    # 获取会话列表区域
    region = wx._get_session_list_region()
    if not region:
        print("无法获取会话列表区域")
        return None

    print(f"会话列表区域: {region}")
    print(f"区域大小: {region[2]-region[0]}x{region[3]-region[1]}")

    # 截图
    img_path = capture_screen_region(region)
    if not img_path:
        print("截图失败")
        return None

    print(f"截图保存到: {img_path}")

    # OCR 识别
    results = extract_text_with_positions_from_image(img_path, upscale=2.0)
    print(f"\nOCR 识别到 {len(results)} 行文字:")
    print("-" * 70)
    for i, r in enumerate(results):
        text = r.get('text', '')
        x = r.get('x', 0)
        y = r.get('y', 0)
        w = r.get('w', 0)
        h = r.get('h', 0)
        # 转换为屏幕坐标
        screen_x = int(region[0] + x + w/2)
        screen_y = int(region[1] + y + h/2)
        print(f"  [{i}] text={text!r} rel=(x={x:.0f},y={y:.0f},w={w:.0f},h={h:.0f}) "
              f"screen=({screen_x},{screen_y})")
    print("-" * 70)

    # 清理
    try:
        os.remove(img_path)
    except Exception:
        pass

    return wx, region, results


def test_chat_with(wx, who="主人"):
    """测试 ChatWith 切换到指定聊天"""
    print(f"\n{'=' * 70}")
    print(f"测试 2: ChatWith 切换到 {who!r}")
    print(f"{'=' * 70}")

    result = wx.ChatWith(who, exact=False)
    print(f"ChatWith 结果: {result}")
    print(f"当前聊天: {wx.current_chat}")
    return result


def test_send_msg(wx, msg="测试消息，请忽略"):
    """测试 SendMsg 发送消息"""
    print(f"\n{'=' * 70}")
    print(f"测试 3: SendMsg 发送消息 {msg!r}")
    print(f"{'=' * 70}")

    result = wx.SendMsg(msg)
    print(f"SendMsg 结果: {result}")
    return result


def main():
    # 测试1: OCR 识别
    ret = test_ocr_session_list()
    if not ret:
        print("OCR 测试失败，退出")
        return

    wx, region, results = ret

    # 列出识别到的所有联系人
    print("\n可切换的联系人:")
    for i, r in enumerate(results):
        text = (r.get('text') or '').strip()
        if text:
            print(f"  [{i}] {text}")

    # 测试2: ChatWith 切换
    # 尝试切换到第一个识别到的联系人（通常是置顶的）
    target = None
    for r in results:
        text = (r.get('text') or '').strip()
        if text and len(text) <= 20:  # 排除过长的文字（可能是消息预览）
            target = text
            break

    if target:
        print(f"\n尝试切换到第一个联系人: {target!r}")
        test_chat_with(wx, target)
    else:
        print("未找到可切换的联系人")

    # 询问是否测试发送消息
    print("\n" + "=" * 70)
    print("如需测试发送消息，请手动调用 test_send_msg(wx, '消息内容')")
    print("注意：测试发送消息会真的发送消息，请谨慎操作")
    print("=" * 70)


if __name__ == "__main__":
    main()
