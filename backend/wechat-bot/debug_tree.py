# -*- coding: utf-8 -*-
"""
调试微信 4.1.11.55 控件树结构
检查会话列表是否暴露给 UIAutomation
"""
import sys
import os
import time

# 添加 wxauto411 路径
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

import ctypes
try:
    import pythoncom
    pythoncom.CoInitialize()
except ImportError:
    ctypes.windll.ole32.CoInitialize(None)

import uiautomation as ua
import win32gui
import win32process
import subprocess


def find_weixin_hwnd():
    """查找微信主窗口 HWND"""
    weixin_pids = set()
    try:
        result = subprocess.run(
            ['tasklist', '/fi', 'IMAGENAME eq Weixin.exe', '/fo', 'csv', '/nh'],
            capture_output=True, text=True, timeout=5, encoding='gbk'
        )
        for line in result.stdout.strip().splitlines():
            parts = line.strip().strip('"').split('","')
            if len(parts) >= 2 and parts[0].lower() == 'weixin.exe':
                try:
                    weixin_pids.add(int(parts[1]))
                except ValueError:
                    pass
    except Exception as e:
        print(f"获取 PID 失败: {e}")

    print(f"Weixin.exe PIDs: {weixin_pids}")

    found_hwnds = []

    def enum_callback(hwnd, _):
        try:
            _, pid = win32process.GetWindowThreadProcessId(hwnd)
            if pid not in weixin_pids:
                return True
            cls_name = win32gui.GetClassName(hwnd)
            title = win32gui.GetWindowText(hwnd)
            if title == "微信" and ("Qt" in cls_name and "WindowIcon" in cls_name):
                rect = win32gui.GetWindowRect(hwnd)
                w = rect[2] - rect[0]
                h = rect[3] - rect[1]
                if w > 100 and h > 100:
                    found_hwnds.append((hwnd, pid, cls_name, title, (w, h), rect))
        except Exception:
            pass
        return True

    win32gui.EnumWindows(enum_callback, None)
    return found_hwnds


def dump_control_tree(ctrl, depth=0, max_depth=4):
    """递归打印控件树"""
    if depth > max_depth or ctrl is None:
        return
    try:
        indent = "  " * depth
        cls = ctrl.ClassName or ""
        aid = getattr(ctrl, "AutomationId", "") or ""
        name = (ctrl.Name or "")[:50]
        ctype = ctrl.ControlType if hasattr(ctrl, 'ControlType') else ""
        rect = ctrl.BoundingRectangle
        rect_str = f"({rect.left},{rect.top},{rect.right},{rect.bottom})" if rect else "None"
        print(f"{indent}[{depth}] type={ctype} cls={cls!r} aid={aid!r} name={name!r} rect={rect_str}")
        try:
            children = ctrl.GetChildren()
            for child in children:
                dump_control_tree(child, depth + 1, max_depth)
        except Exception as e:
            print(f"{indent}  <获取子控件失败: {e}>")
    except Exception as e:
        print(f"{indent}<错误: {e}>")


def main():
    print("=" * 80)
    print("微信 4.1.11.55 控件树调试")
    print("=" * 80)

    hwnds = find_weixin_hwnd()
    if not hwnds:
        print("未找到微信主窗口")
        return

    # 取最大的窗口
    hwnds.sort(key=lambda x: x[4][0] * x[4][1], reverse=True)
    best = hwnds[0]
    hwnd, pid, cls_name, title, size, rect = best
    print(f"\n微信主窗口: HWND={hwnd} PID={pid} ClassName={cls_name!r} Title={title!r} Size={size} Rect={rect}")

    # 显示窗口
    if not win32gui.IsWindowVisible(hwnd) or win32gui.IsIconic(hwnd):
        import win32con
        win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
        time.sleep(0.3)
        win32gui.ShowWindow(hwnd, win32con.SW_SHOW)
        time.sleep(0.3)
    try:
        win32gui.SetForegroundWindow(hwnd)
    except Exception:
        pass
    time.sleep(0.5)

    # 用 uiautomation 连接
    main_win = ua.ControlFromHandle(hwnd)
    if not main_win:
        print("ControlFromHandle 失败")
        return

    print(f"\nUIAutomation 连接成功:")
    print(f"  ClassName = {main_win.ClassName!r}")
    print(f"  Name = {main_win.Name!r}")
    print(f"  AutomationId = {getattr(main_win, 'AutomationId', '')!r}")
    print(f"  BoundingRectangle = {main_win.BoundingRectangle}")

    print(f"\n--- 控件树 (max_depth=4) ---")
    dump_control_tree(main_win, depth=0, max_depth=4)

    # 尝试查找会话列表相关控件
    print(f"\n--- 搜索关键控件 ---")
    searches = [
        {"ClassName": "mmui::ChatSessionList"},
        {"ClassName": "mmui::ChatSessionCell"},
        {"AutomationId": "session_list"},
        {"ClassName": "mmui::MainTabBar"},
        {"ClassName": "mmui::ChatInputView"},
        {"ClassName": "mmui::ChatInputField"},
        {"AutomationId": "chat_input_field"},
        {"ClassName": "mmui::MessageView"},
        {"ClassName": "mmui::ChatTextItemView"},
        {"Name": "微信"},
        {"Name": "搜索"},
    ]

    for cond in searches:
        try:
            # 在整个窗口树中查找
            found = _find_control_recursive(main_win, cond, max_depth=8)
            if found:
                cls = found.ClassName or ""
                aid = getattr(found, "AutomationId", "") or ""
                name = (found.Name or "")[:50]
                rect = found.BoundingRectangle
                print(f"  ✓ 找到 {cond}: cls={cls!r} aid={aid!r} name={name!r} rect=({rect.left},{rect.top},{rect.right},{rect.bottom})")
            else:
                print(f"  ✗ 未找到 {cond}")
        except Exception as e:
            print(f"  ✗ 查找 {cond} 异常: {e}")


def _find_control_recursive(ctrl, conditions, max_depth=8):
    """递归查找控件"""
    def walk(c, depth):
        if depth > max_depth or c is None:
            return None
        if depth > 0:
            ok = True
            for k, v in conditions.items():
                try:
                    if k == "ClassName" and (c.ClassName or "") != v:
                        ok = False
                        break
                    elif k == "AutomationId" and (getattr(c, "AutomationId", "") or "") != v:
                        ok = False
                        break
                    elif k == "Name" and (c.Name or "") != v:
                        ok = False
                        break
                except Exception:
                    ok = False
                    break
            if ok:
                return c
        try:
            for child in c.GetChildren():
                r = walk(child, depth + 1)
                if r is not None:
                    return r
        except Exception:
            pass
        return None
    return walk(ctrl, 0)


if __name__ == "__main__":
    main()
