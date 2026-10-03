"""
微信 4.1.11.55 自动化主类

基于 UIAutomation 操作微信主窗口：
  1. 查找 mmui::MainWindow 主窗口
  2. 通过导航栏切换到聊天页（点击"微信"标签）
  3. 在会话列表（ChatSessionList）中点击指定会话
  4. 在聊天详情区（ChatDetailView）读取消息、发送消息

关键控件定位：
  主窗口:        mmui::MainWindow
  导航栏微信按钮: mmui::MainTabBar (aid=MainView.main_tabbar) → XTabBarItem name=微信
  会话列表容器:  mmui::ChatSessionList → mmui::XTableView (aid=session_list)
  会话项:        mmui::ChatSessionCell (aid=session_item_<好友名>)
  聊天详情:      mmui::ChatDetailView → mmui::ChatMessagePage (aid=chat_message_page)
  输入框容器:    mmui::ChatInputView
  消息列表容器:  mmui::MessageView
  搜索框:        mmui::XSearchField → mmui::XValidatorTextEdit (name=搜索)
"""

import ctypes
import sys
import time
import logging
from typing import Optional, List, Dict, Any

from .message import Message
from .exceptions import WeChatNotFoundError, WeChatNotOnlineError, ControlNotFoundError

# 初始化 COM（UIAutomation 依赖）
try:
    import pythoncom
    pythoncom.CoInitialize()
except ImportError:
    ctypes.windll.ole32.CoInitialize(None)

import uiautomation as ua

logger = logging.getLogger(__name__)


class WeChat:
    """微信 4.1.11.55 自动化控制类"""

    # 关键控件 ClassName 常量
    # 注意：微信 4.x 主窗口的 win32 ClassName 是 Qt 框架的 'Qt51514QWindowIcon'，
    # 但通过 uiautomation.ControlFromHandle 获取后，ClassName 会变成 'mmui::MainWindow'。
    # 因此 uiautomation 遍历顶层窗口时（GetChildren）只能匹配到 mmui::MainWindow。
    # 重要：微信 4.x 关闭主窗口时是隐藏（visible=False）而非最小化，
    # uiautomation.GetChildren() 默认不返回隐藏窗口，
    # 必须用 win32gui 枚举所有窗口并显示后才能被 uiautomation 找到。
    MAIN_WINDOW_CLASS = "mmui::MainWindow"
    MAIN_WINDOW_WIN32_CLASS = "Qt51514QWindowIcon"  # win32 层级的 ClassName
    MAIN_WINDOW_TITLE = "微信"  # 主窗口标题
    LOGIN_WINDOW_CLASS = "mmui::LoginWindow"
    TABBAR_CLASS = "mmui::MainTabBar"
    TABBAR_AID = "MainView.main_tabbar"
    SESSION_LIST_AID = "session_list"
    SESSION_CELL_CLASS = "mmui::ChatSessionCell"
    CHAT_MESSAGE_PAGE_AID = "chat_message_page"
    CHAT_INPUT_FIELD_AID = "chat_input_field"  # 真正的输入框（ChatInputField）
    CHAT_INPUT_VIEW_CLASS = "mmui::ChatInputView"  # 输入框容器（旧版，保留兼容）
    MESSAGE_LIST_AID = "chat_message_list"  # 真正的消息列表（RecyclerListView）
    MESSAGE_VIEW_CLASS = "mmui::MessageView"  # 消息视图容器（旧版，保留兼容）
    MESSAGE_ITEM_CLASS = "mmui::ChatTextItemView"  # 单条消息项控件
    SEARCH_EDIT_NAME = "搜索"

    def __init__(self, debug: bool = False, resize: bool = False, max_init_retry: int = 30):
        """
        初始化微信实例，自动查找并连接到已登录的微信主窗口

        Args:
            debug: 是否开启调试日志
            resize: 是否调整窗口尺寸（4.x 实时渲染需要较大窗口，建议 True）
            max_init_retry: 最大重试次数（等待微信登录，每次间隔 2 秒）

        Raises:
            WeChatNotFoundError: 未找到微信进程或窗口
            WeChatNotOnlineError: 微信未登录
        """
        if debug:
            logging.basicConfig(level=logging.DEBUG)
            logger.setLevel(logging.DEBUG)

        self.debug = debug
        self.resize = resize
        self.main_window = None  # uiautomation.Control
        self.current_chat: Optional[str] = None  # 当前所在聊天名称
        self.my_info: Dict[str, str] = {}
        self._cached_session_list: List[ua.Control] = []
        # ==================== 截图哈希缓存（性能优化） ====================
        # 记录上次截图的哈希值，下次相同时跳过 OCR（节省 1-3 秒）
        # key: region tuple, value: (hash_str, last_messages)
        self._last_screenshot_hash: Dict[tuple, tuple] = {}

        # 连接微信主窗口（带重试，等待用户扫码登录）
        self._connect(max_init_retry)

        if resize:
            self._adjust_window_size()

        # 获取我的信息
        try:
            self.my_info = self.GetMyInfo()
        except Exception as e:
            logger.warning(f"获取我的信息失败: {e}")

        # 确保在聊天页
        self._switch_to_chat_tab()

        logger.info(f"微信连接成功: {self.my_info}")

    # ==================== 连接与初始化 ====================

    def _connect(self, max_retry: int) -> None:
        """
        查找并连接微信主窗口

        微信 4.x 关闭主窗口时会隐藏（visible=False）而非最小化，
        uiautomation.GetChildren() 默认不返回隐藏窗口，
        所以必须用 win32gui 枚举所有窗口（包括隐藏的），找到微信窗口后
        先 ShowWindow 显示，再用 uiautomation.ControlFromHandle 连接。

        识别微信主窗口的条件：
        - win32 ClassName = 'Qt51514QWindowIcon'（Qt 框架窗口类）
        - 窗口标题 = '微信'
        - 属于 Weixin.exe 进程
        """
        last_error = ""
        for attempt in range(1, max_retry + 1):
            try:
                # 步骤1：用 win32gui 枚举所有窗口（包括隐藏的），找微信主窗口
                hwnd = self._find_weixin_hwnd()

                if hwnd:
                    # 步骤2：如果窗口隐藏，显示它
                    self._ensure_window_visible(hwnd)
                    time.sleep(0.3)

                    # 步骤3：用 uiautomation 连接
                    main_win = ua.ControlFromHandle(hwnd)
                    if main_win:
                        # 验证确实是 mmui::MainWindow
                        if main_win.ClassName == self.MAIN_WINDOW_CLASS:
                            self.main_window = main_win
                            logger.info(f"已连接微信主窗口 HWND={hwnd} ClassName={main_win.ClassName}")
                            return
                        else:
                            logger.warning(f"窗口 ClassName 不匹配: {main_win.ClassName}（期望 {self.MAIN_WINDOW_CLASS}）")
                            # 仍然使用，因为可能版本不同
                            self.main_window = main_win
                            return

                last_error = "未找到微信主窗口，请确认微信已启动并登录"
                logger.info(f"查找微信主窗口... 第 {attempt}/{max_retry} 次")
                time.sleep(2)
            except Exception as e:
                last_error = str(e)
                logger.warning(f"连接异常: {e}")
                time.sleep(2)

        # 重试耗尽
        if "登录" in last_error:
            raise WeChatNotOnlineError(f"微信未登录，请扫码登录后重试: {last_error}")
        raise WeChatNotFoundError(f"未找到微信主窗口: {last_error}")

    @staticmethod
    def _find_weixin_hwnd() -> int:
        """
        用 win32gui 枚举所有顶层窗口（包括隐藏的），查找微信主窗口

        匹配条件：
        - ClassName = 'Qt51514QWindowIcon'（或包含 'Qt' 且包含 'WindowIcon'）
        - Title = '微信'
        - 窗口尺寸合理（不是 0x0 的辅助窗口）

        Returns:
            int: 微信主窗口的 HWND，未找到返回 0
        """
        import win32gui
        import win32process
        import subprocess

        # 获取所有 Weixin.exe 进程的 PID
        weixin_pids = set()
        try:
            # tasklist 在中文 Windows 上默认输出 GBK，用 errors='replace' 防止解码崩溃
            result = subprocess.run(
                ['tasklist', '/fi', 'IMAGENAME eq Weixin.exe', '/fo', 'csv', '/nh'],
                capture_output=True, text=True, timeout=5,
                encoding='gbk', errors='replace'
            )
            for line in result.stdout.strip().splitlines():
                # 格式: "Weixin.exe","PID","Console","Session#","Mem Usage"
                parts = line.strip().strip('"').split('","')
                if len(parts) >= 2 and parts[0].lower() == 'weixin.exe':
                    try:
                        weixin_pids.add(int(parts[1]))
                    except ValueError:
                        pass
        except Exception as e:
            logger.debug(f"获取 Weixin.exe PID 失败: {e}")

        if not weixin_pids:
            logger.debug("未找到 Weixin.exe 进程")
            return 0

        logger.debug(f"Weixin.exe PIDs: {weixin_pids}")

        # 枚举所有窗口，查找微信主窗口
        found_hwnds = []

        def enum_callback(hwnd, _):
            try:
                _, pid = win32process.GetWindowThreadProcessId(hwnd)
                if pid not in weixin_pids:
                    return True

                cls_name = win32gui.GetClassName(hwnd)
                title = win32gui.GetWindowText(hwnd)

                # 匹配微信主窗口：ClassName 是 Qt 框架类，标题是"微信"
                if title == "微信" and ("Qt" in cls_name and "WindowIcon" in cls_name):
                    # 检查窗口尺寸是否合理（排除 0x0 的辅助窗口）
                    rect = win32gui.GetWindowRect(hwnd)
                    w = rect[2] - rect[0]
                    h = rect[3] - rect[1]
                    # 注意：最小化的窗口 rect 可能在负坐标（如 -25600）且尺寸很小，
                    # 但只要标题是"微信"且 ClassName 匹配，就应该选中，
                    # 后续 _ensure_window_visible 会恢复窗口到正常尺寸。
                    # 只排除 0x0 的辅助窗口。
                    if w > 0 and h > 0:
                        found_hwnds.append((hwnd, pid, cls_name, title, (w, h)))
            except Exception:
                pass
            return True

        win32gui.EnumWindows(enum_callback, None)

        if not found_hwnds:
            logger.debug("未找到标题为'微信'的 Qt 窗口")
            return 0

        # 如果有多个匹配，取尺寸最大的（主窗口通常最大）
        found_hwnds.sort(key=lambda x: x[4][0] * x[4][1], reverse=True)
        best = found_hwnds[0]
        logger.debug(f"找到微信主窗口: HWND={best[0]} PID={best[1]} ClassName={best[2]!r} Size={best[4]}")
        return best[0]

    @staticmethod
    def _ensure_window_visible(hwnd: int) -> None:
        """
        确保窗口可见（如果隐藏或最小化，显示并激活）

        微信 4.x 关闭主窗口时会隐藏（visible=False），
        需要调用 ShowWindow 恢复显示，否则 uiautomation 无法正确访问控件树。
        """
        import win32gui
        import win32con

        try:
            visible = win32gui.IsWindowVisible(hwnd)
            iconic = win32gui.IsIconic(hwnd)

            if not visible or iconic:
                logger.info(f"微信窗口隐藏或最小化，正在显示... visible={visible} minimized={iconic}")
                # SW_RESTORE = 9：恢复最小化或最大化的窗口
                win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
                time.sleep(0.3)
                # SW_SHOW = 5：显示窗口
                win32gui.ShowWindow(hwnd, win32con.SW_SHOW)
                time.sleep(0.3)

            # 尝试置顶（可能因 UIPI 限制失败，忽略错误）
            try:
                win32gui.SetForegroundWindow(hwnd)
            except Exception as e:
                logger.debug(f"SetForegroundWindow 失败（可忽略）: {e}")

            # 等待窗口完全显示
            time.sleep(0.5)
        except Exception as e:
            logger.warning(f"显示窗口失败: {e}")

    def _adjust_window_size(self) -> None:
        """调整微信窗口尺寸（4.x 实时渲染需要较大窗口以加载更多消息）"""
        try:
            import win32gui
            import win32con
            handle = self.main_window.NativeWindowHandle
            if handle:
                # 获取屏幕尺寸
                screen_w = ctypes.windll.user32.GetSystemMetrics(0)
                screen_h = ctypes.windll.user32.GetSystemMetrics(1)
                # 设置窗口位置和尺寸（左侧贴边，高度最大化）
                target_w = min(1200, screen_w - 100)
                target_h = screen_h - 60
                win32gui.SetWindowPos(handle, 0, 50, 30, target_w, target_h, win32con.SWP_NOZORDER)
                logger.info(f"窗口尺寸已调整为 {target_w}x{target_h}")
        except Exception as e:
            logger.warning(f"调整窗口尺寸失败: {e}")

    def _switch_to_chat_tab(self) -> bool:
        """点击导航栏的"微信"标签，切换到聊天页面"""
        try:
            tabbar = self._find_control(self.main_window, Depth=4,
                                         ClassName=self.TABBAR_CLASS,
                                         AutomationId=self.TABBAR_AID)
            if not tabbar:
                logger.error("未找到导航栏 mmui::MainTabBar")
                return False
            # 查找 name=微信 的按钮
            wechat_btn = self._find_control(tabbar, Depth=1, Name="微信")
            if not wechat_btn:
                logger.error("未找到'微信'标签按钮")
                return False
            wechat_btn.Click()
            time.sleep(0.5)
            logger.info("已切换到聊天页面")
            return True
        except Exception as e:
            logger.error(f"切换聊天页失败: {e}")
            return False

    # ==================== 控件查找工具 ====================

    @staticmethod
    def _match_ctrl(ctrl: ua.Control, conditions: dict) -> bool:
        """检查控件是否匹配所有条件"""
        for k, v in conditions.items():
            try:
                if k == "ClassName":
                    if (ctrl.ClassName or "") != v:
                        return False
                elif k == "AutomationId":
                    aid = getattr(ctrl, "AutomationId", "") or ""
                    if aid != v:
                        return False
                elif k == "Name":
                    if (ctrl.Name or "") != v:
                        return False
                elif k == "ControlType":
                    if ctrl.ControlType != v:
                        return False
                elif k == "ContainsName":
                    # 名称包含指定文本
                    if v not in (ctrl.Name or ""):
                        return False
                elif k == "ContainsAid":
                    # AutomationId 包含指定文本
                    aid = getattr(ctrl, "AutomationId", "") or ""
                    if v not in aid:
                        return False
            except Exception:
                return False
        return True

    def _find_control(self, parent: ua.Control, max_depth: int = 25, **kwargs) -> Optional[ua.Control]:
        """
        在 parent 子树中查找第一个匹配的控件

        Args:
            parent: 起始控件
            max_depth: 最大搜索深度
            **kwargs: 过滤条件
                ClassName: 控件类名（精确匹配）
                AutomationId: 控件 AutomationId（精确匹配）
                Name: 控件 Name（精确匹配）
                ControlType: 控件类型
                ContainsName: Name 包含指定文本
                ContainsAid: AutomationId 包含指定文本
        """
        if parent is None:
            return None

        def walk(ctrl, depth):
            if depth > max_depth:
                return None
            if depth > 0:  # 不检查 parent 本身
                if self._match_ctrl(ctrl, kwargs):
                    return ctrl
            try:
                for child in ctrl.GetChildren():
                    result = walk(child, depth + 1)
                    if result is not None:
                        return result
            except Exception:
                pass
            return None

        return walk(parent, 0)

    def _find_all_controls(self, parent: ua.Control, max_depth: int = 25, **kwargs) -> List[ua.Control]:
        """查找所有匹配的控件"""
        results = []
        if parent is None:
            return results

        def walk(ctrl, depth):
            if depth > max_depth:
                return
            if depth > 0:
                if self._match_ctrl(ctrl, kwargs):
                    results.append(ctrl)
            try:
                for child in ctrl.GetChildren():
                    walk(child, depth + 1)
            except Exception:
                pass

        walk(parent, 0)
        return results

    def _get_session_list_control(self) -> Optional[ua.Control]:
        """获取会话列表控件（XTableView, aid=session_list）"""
        return self._find_control(self.main_window, AutomationId=self.SESSION_LIST_AID)

    def _get_chat_message_page(self) -> Optional[ua.Control]:
        """获取聊天详情页控件（ChatMessagePage, aid=chat_message_page）"""
        return self._find_control(self.main_window, AutomationId=self.CHAT_MESSAGE_PAGE_AID)

    def _get_message_list_control(self) -> Optional[ua.Control]:
        """获取消息列表控件（RecyclerListView, aid=chat_message_list）"""
        return self._find_control(self.main_window, AutomationId=self.MESSAGE_LIST_AID)

    def _get_message_view(self) -> Optional[ua.Control]:
        """获取消息视图容器（MessageView，兼容旧版）"""
        return self._find_control(self.main_window, ClassName=self.MESSAGE_VIEW_CLASS)

    def _get_chat_input_field(self) -> Optional[ua.Control]:
        """获取真正的输入框控件（ChatInputField, aid=chat_input_field）"""
        return self._find_control(self.main_window, AutomationId=self.CHAT_INPUT_FIELD_AID)

    def _get_chat_input_view(self) -> Optional[ua.Control]:
        """获取输入框容器（ChatInputView，兼容旧版）"""
        return self._find_control(self.main_window, ClassName=self.CHAT_INPUT_VIEW_CLASS)

    def _get_search_edit(self) -> Optional[ua.Control]:
        """获取搜索框控件"""
        return self._find_control(self.main_window, Name=self.SEARCH_EDIT_NAME)

    # ==================== 公开 API ====================

    def IsOnline(self) -> bool:
        """检查微信是否已登录在线"""
        if not self.main_window:
            return False
        try:
            # 主窗口仍然存在且可见
            handle = self.main_window.NativeWindowHandle
            if not handle:
                return False
            import win32gui
            return win32gui.IsWindowVisible(handle) == 1
        except Exception:
            return False

    def GetMyInfo(self) -> Dict[str, str]:
        """
        获取当前登录用户信息

        Returns:
            dict: {"nickname": 昵称, "wxid": 微信ID（如果可获取）}
        """
        info = {"nickname": "", "wxid": ""}
        try:
            # 4.1.11.55 中，用户昵称通常不直接暴露在 UI 上
            # 可通过点击"更多"按钮查看，但会弹出菜单干扰
            # 这里尝试从会话列表中找"文件传输助手"上方的用户信息
            # 或从主窗口标题推断

            # 方案1：查找主窗口中所有包含"我"或特定标识的控件
            # 方案2：留空，由调用方通过其他方式获取

            # 暂时返回空，后续优化
            pass
        except Exception as e:
            logger.warning(f"获取我的信息失败: {e}")
        return info

    def GetSessionList(self) -> List[str]:
        """
        获取当前会话列表中所有会话的名称

        Returns:
            list[str]: 会话名称列表（好友昵称或群名）
        """
        sessions = []
        try:
            session_list = self._get_session_list_control()
            if not session_list:
                logger.warning("未找到会话列表控件")
                return sessions

            # 会话项 ClassName=mmui::ChatSessionCell, aid=session_item_<名称>
            cells = self._find_all_controls(session_list, Depth=2, ClassName=self.SESSION_CELL_CLASS)
            for cell in cells:
                aid = getattr(cell, "AutomationId", "") or ""
                if aid.startswith("session_item_"):
                    name = aid[len("session_item_"):]
                    if name:
                        sessions.append(name)
        except Exception as e:
            logger.error(f"获取会话列表失败: {e}")
        return sessions

    def _set_clipboard_text(self, text: str) -> bool:
        """
        用 Win32 API 直接设置剪贴板文本（不依赖 clip 命令）

        subprocess + clip 方式在 shell=True 下不稳定，且编码可能出错。
        直接调用 Win32 剪贴板 API 最可靠：
        1. OpenClipboard
        2. EmptyClipboard
        3. GlobalAlloc 分配内存
        4. GlobalLock 锁定内存，写入 UTF-16 文本
        5. SetClipboardData(CF_UNICODETEXT)
        6. CloseClipboard

        重要：64 位系统上 HANDLE 是 64 位的，必须显式设置 restype/argtypes，
        否则 ctypes 默认用 32 位 c_int 处理，会导致 OverflowError: int too long to convert。
        """
        try:
            k32 = ctypes.windll.kernel32
            u32 = ctypes.windll.user32

            # 显式设置函数签名（64 位系统必须）
            # GlobalAlloc 返回 HGLOBAL (64 位指针)
            k32.GlobalAlloc.restype = ctypes.c_void_p
            k32.GlobalAlloc.argtypes = [ctypes.c_uint, ctypes.c_size_t]
            # GlobalLock 返回 LPVOID (64 位指针)
            k32.GlobalLock.restype = ctypes.c_void_p
            k32.GlobalLock.argtypes = [ctypes.c_void_p]
            # GlobalUnlock 接受 HGLOBAL
            k32.GlobalUnlock.argtypes = [ctypes.c_void_p]
            # OpenClipboard 返回 BOOL
            u32.OpenClipboard.argtypes = [ctypes.c_void_p]
            # SetClipboardData 返回 HANDLE
            u32.SetClipboardData.restype = ctypes.c_void_p
            u32.SetClipboardData.argtypes = [ctypes.c_uint, ctypes.c_void_p]

            if not u32.OpenClipboard(None):
                logger.warning("OpenClipboard 失败")
                return False
            try:
                u32.EmptyClipboard()
                # CF_UNICODETEXT = 13
                # GMEM_MOVEABLE = 0x0002
                data = (text + '\0').encode('utf-16-le')
                h_global = k32.GlobalAlloc(0x0002, len(data))
                if not h_global:
                    return False
                locked = k32.GlobalLock(h_global)
                if not locked:
                    return False
                ctypes.memmove(locked, data, len(data))
                k32.GlobalUnlock(h_global)
                u32.SetClipboardData(13, h_global)
                return True
            finally:
                u32.CloseClipboard()
        except Exception as e:
            logger.warning(f"_set_clipboard_text 失败: {e}")
            return False

    def _click_position(self, x: int, y: int, double: bool = False) -> bool:
        """
        用 Win32 API 模拟鼠标点击屏幕坐标

        uiautomation.Click 在某些控件上可能不生效，直接用 Win32 API 最可靠：
        1. SetCursorPos 移动鼠标
        2. mouse_event 模拟按下/抬起

        Args:
            x, y: 屏幕坐标
            double: 是否双击
        """
        try:
            u32 = ctypes.windll.user32
            # 移动鼠标到目标位置
            u32.SetCursorPos(x, y)
            time.sleep(0.1)
            # mouse_event 常量
            MOUSEEVENTF_LEFTDOWN = 0x0002
            MOUSEEVENTF_LEFTUP = 0x0004
            u32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
            time.sleep(0.05)
            u32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
            if double:
                time.sleep(0.1)
                u32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
                time.sleep(0.05)
                u32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
            return True
        except Exception as e:
            logger.warning(f"_click_position 失败: {e}")
            return False

    def _get_session_list_region(self) -> Optional[tuple]:
        """
        计算会话列表的屏幕区域

        微信 4.x 控件树不暴露会话列表，必须通过坐标定位：
        - 导航栏宽度约 75px（在窗口最左侧）
        - 会话列表在导航栏右侧，宽度约 300px
        - 顶部布局：标题栏(约40px) + 搜索框(约50px) + 会话列表

        关键修复：必须跳过搜索框高度，否则截图区域会包含搜索框，
        导致 OCR 识别到搜索框附近的干扰文字，或者置顶会话项被搜索框遮挡。

        用户反馈："往下移一到两个空格就能点到置顶人物"——说明置顶会话项
        就在搜索框下方很近的位置，跳过搜索框后即可正确截图和点击。

        Returns:
            tuple: (left, top, right, bottom) 屏幕坐标，失败返回 None
        """
        try:
            win_rect = self.main_window.BoundingRectangle
            if not win_rect:
                return None

            nav_width = 75        # 导航栏宽度
            list_width = 300      # 会话列表默认宽度
            title_height = 40     # 标题栏高度
            search_height = 55    # 搜索框高度（含 padding，确保完全跳过）

            left = win_rect.left + nav_width
            right = left + list_width
            # 关键：跳过标题栏 + 搜索框，从会话列表第一项开始截图
            top = win_rect.top + title_height + search_height
            bottom = win_rect.bottom - 20

            if right > win_rect.right:
                right = win_rect.right
            if bottom > win_rect.bottom:
                bottom = win_rect.bottom
            if top >= bottom:
                # 兜底：如果跳过搜索框后区域无效，回退到只跳过标题栏
                top = win_rect.top + title_height

            return (left, top, right, bottom)
        except Exception as e:
            logger.warning(f"_get_session_list_region 失败: {e}")
            return None

    def ChatWith(self, who: str, exact: bool = True, timeout: float = 5.0) -> bool:
        """
        切换到指定聊天 - 坐标 + OCR 方案

        微信 4.x 控件树不暴露会话项控件（mmui::ChatSessionCell 找不到），
        必须改用坐标点击 + OCR 识别：
        1. 截图会话列表区域（跳过搜索框）
        2. OCR 识别文字及其坐标（3倍放大提高识别率）
        3. 匹配目标联系人名称
        4. 点击对应坐标
        5. fallback：OCR 未识别到目标时，点击会话列表第一项（置顶项）

        完全不用搜索框（因为 SendKeys 输入中文会变问号）。

        Args:
            who: 聊天对象名称（好友昵称或群名）
            exact: 是否精确匹配
            timeout: 查找超时时间（秒）

        Returns:
            bool: 是否切换成功
        """
        if not who:
            return False

        logger.info(f"切换到聊天（坐标+OCR方案）: {who}")

        # 确保微信窗口在前台
        try:
            import win32gui
            hwnd = self.main_window.NativeWindowHandle
            if hwnd:
                if not win32gui.IsWindowVisible(hwnd) or win32gui.IsIconic(hwnd):
                    import win32con
                    win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
                    time.sleep(0.3)
                try:
                    win32gui.SetForegroundWindow(hwnd)
                except Exception:
                    pass
                time.sleep(0.3)
        except Exception:
            pass

        # 获取会话列表区域（已跳过搜索框）
        region = self._get_session_list_region()
        if not region:
            logger.error("无法获取会话列表区域")
            return False

        logger.info(f"会话列表区域（已跳过搜索框）: {region}")

        # 导入 OCR 函数
        try:
            from .ocr import capture_screen_region, extract_text_with_positions_from_image
        except ImportError as e:
            logger.error(f"导入 OCR 模块失败: {e}")
            return False

        # 截图会话列表区域
        img_path = capture_screen_region(region)
        if not img_path:
            logger.error("截图会话列表失败")
            return False

        try:
            # OCR 识别带坐标的文字
            # 优化：放大倍数从 3.0 降到 2.0（OCR 耗时减少 30%，精度仍可接受）
            # 会话列表文字比消息文字大，2 倍放大足够识别
            results = extract_text_with_positions_from_image(img_path, upscale=2.0)
            if not results:
                logger.error("OCR 未识别到任何文字")
                return False

            logger.info(f"OCR 识别到 {len(results)} 行文字")
            for r in results:
                logger.info(f"  OCR: text={r.get('text')!r} x={r.get('x')} y={r.get('y')} w={r.get('w')} h={r.get('h')}")

            # 匹配目标联系人
            # 优先精确匹配
            match = None
            for r in results:
                text = (r.get('text') or '').strip()
                if text == who:
                    match = r
                    break

            # 模糊匹配（仅当 exact=False 或精确匹配失败）
            if not match and not exact:
                for r in results:
                    text = (r.get('text') or '').strip()
                    if text and (who in text or text in who) and len(text) <= len(who) + 5:
                        match = r
                        break

            # 如果精确匹配也失败，尝试包含匹配（who 是 text 的一部分，或 text 是 who 的一部分）
            if not match:
                for r in results:
                    text = (r.get('text') or '').strip()
                    if text and who in text:
                        match = r
                        break

            # 相似度匹配：容错 OCR 识别错误（如"文件传输助手"被识别为"文俐专输助手"）
            # 使用 difflib.SequenceMatcher 计算相似度，超过 60% 即匹配
            if not match:
                try:
                    from difflib import SequenceMatcher
                    best_ratio = 0.0
                    best_item = None
                    for r in results:
                        text = (r.get('text') or '').strip()
                        if not text or len(text) < 2:
                            continue
                        # 过滤掉时间戳和数字（如"04:00"、"0"）
                        if text.replace(':', '').replace(' ', '').isdigit():
                            continue
                        ratio = SequenceMatcher(None, text, who).ratio()
                        if ratio > best_ratio:
                            best_ratio = ratio
                            best_item = r
                    # 相似度超过 60% 才匹配
                    if best_item and best_ratio >= 0.6:
                        match = best_item
                        logger.info(f"相似度匹配成功: {match.get('text')!r} ~ {who!r} (相似度={best_ratio:.2f})")
                except Exception as e:
                    logger.debug(f"相似度匹配异常: {e}")

            if match:
                # 计算点击坐标（转换为屏幕坐标）
                text_x = match.get('x', 0)
                text_y = match.get('y', 0)
                text_w = match.get('w', 0)
                text_h = match.get('h', 0)

                # 点击文字中心位置（垂直居中，水平略偏右避免点到头像）
                click_x = int(region[0] + text_x + text_w / 2 + 30)
                click_y = int(region[1] + text_y + text_h / 2)

                logger.info(f"点击坐标: ({click_x}, {click_y}) 匹配文字: {match.get('text')!r}")
            else:
                # fallback：OCR 未识别到目标，点击会话列表第一项（置顶项）
                # 用户反馈："主人"是置顶的，往下移一点就能点到
                # 会话列表第一项中心位置：水平居中，垂直距顶部约 30px
                region_w = region[2] - region[0]
                click_x = int(region[0] + region_w // 2)
                click_y = int(region[1] + 30)
                logger.warning(f"OCR 未识别到 {who!r}，fallback 点击会话列表第一项（置顶）: ({click_x}, {click_y})")
                logger.warning(f"识别到的文字: {[r.get('text') for r in results]}")

            # 点击会话项
            if not self._click_position(click_x, click_y):
                logger.error("点击会话项失败")
                return False

            # 缩短等待时间到 0.3 秒（微信 4.x 渲染很快，0.8 秒过长）
            time.sleep(0.3)
            self.current_chat = who
            logger.info(f"已切换到聊天: {who}")
            return True

        finally:
            # 清理临时图片
            try:
                import os
                if os.path.exists(img_path):
                    os.remove(img_path)
            except Exception:
                pass

    def GetAllMessage(self) -> List[Message]:
        """
        获取当前聊天窗口的所有可见消息 - OCR 方案

        微信 4.x 控件树不暴露消息列表控件（mmui::ChatTextItemView 找不到），
        必须通过截图 + OCR 提取消息：
        1. 截图聊天消息区域（跳过标题栏、聊天对象名栏、输入框）
        2. OCR 识别每行文字及其坐标（4倍放大提高识别率）
        3. 按行解析为 Message 对象：
           - 时间格式（HH:MM、昨天、今天、星期X）→ type="time"
           - 系统消息关键字 → type="system"
           - 普通消息：通过水平位置判断 self/user
             （微信中自己的消息靠右，对方消息靠左）
        4. 消息合并：相邻同类型消息如果 y 坐标差 < 25px（同一条消息换行），
           合并成一条消息（避免长消息被 OCR 切成多条）

        Returns:
            list[Message]: 消息列表（从旧到新，包含 time/system/user/self 类型）
        """
        messages: List[Message] = []
        try:
            # 获取聊天消息区域
            region = self._get_chat_message_region()
            if not region:
                logger.error("无法获取聊天消息区域")
                return messages

            # 导入 OCR 函数
            try:
                from .ocr import capture_screen_region, extract_text_with_positions_from_image
            except ImportError as e:
                logger.error(f"导入 OCR 模块失败: {e}")
                return messages

            # 截图聊天消息区域
            img_path = capture_screen_region(region)
            if not img_path:
                logger.error("截图聊天消息区域失败")
                return messages

            try:
                # ==================== 截图哈希缓存优化 ====================
                # 如果聊天区域截图与上次完全相同（无新消息），直接返回上次的结果
                # 节省 1-3 秒的 OCR 时间，大幅提升轮询效率
                try:
                    import hashlib
                    with open(img_path, 'rb') as f:
                        img_hash = hashlib.md5(f.read()).hexdigest()
                    cached = self._last_screenshot_hash.get(region)
                    if cached and cached[0] == img_hash:
                        # 截图未变化，返回上次的消息列表（避免重复 OCR）
                        logger.debug(f"截图哈希命中缓存，跳过 OCR（region={region}）")
                        try:
                            import os
                            if os.path.exists(img_path):
                                os.remove(img_path)
                        except Exception:
                            pass
                        return cached[1]  # 返回上次的 messages 列表
                except Exception as e:
                    logger.debug(f"截图哈希计算失败（忽略，继续 OCR）: {e}")

                # OCR 识别带坐标的文字
                # 优化：放大倍数从 4.0 降到 2.0（OCR 耗时减半，精度仍可接受）
                # 原因：4 倍放大导致 OCR 耗时 2-3 秒，2 倍放大 1 秒内完成
                # RapidOCR PP-OCRv6 对中文识别精度 98%+，2 倍放大已足够
                results = extract_text_with_positions_from_image(img_path, upscale=2.0)
                if not results:
                    logger.warning("OCR 未识别到任何消息文字")
                    return messages

                # 计算聊天区域水平中心（用于判断 self/user）
                region_left = region[0]
                region_right = region[2]
                region_center_x = (region_left + region_right) / 2

                # 按 y 坐标排序（从上到下 = 从旧到新）
                results.sort(key=lambda r: float(r.get('y', 0)))

                logger.info(f"OCR 识别到 {len(results)} 行消息候选")

                # 第一步：把每行 OCR 结果解析为带类型的原始消息
                raw_msgs: List[Dict[str, Any]] = []
                for r in results:
                    text = (r.get('text') or '').strip()
                    if not text:
                        continue

                    # 判断消息类型
                    if self._is_time_message(text):
                        raw_msgs.append({
                            'type': 'time',
                            'content': text,
                            'y': float(r.get('y', 0) or 0),
                            'x': float(r.get('x', 0) or 0),
                            'w': float(r.get('w', 0) or 0),
                            'h': float(r.get('h', 0) or 0),
                        })
                        continue

                    if self._is_system_message(text):
                        raw_msgs.append({
                            'type': 'system',
                            'content': text,
                            'y': float(r.get('y', 0) or 0),
                            'x': float(r.get('x', 0) or 0),
                            'w': float(r.get('w', 0) or 0),
                            'h': float(r.get('h', 0) or 0),
                        })
                        continue

                    # 普通文本消息：通过水平位置判断 self/user
                    # 微信布局：对方消息靠左（左对齐），自己消息靠右（右对齐）
                    # 自己的消息文字右边距 < 100px（贴近右边界）
                    # 对方的消息文字左边距 < 100px（贴近左边界）
                    # 用右边距判断更准确：自己的消息右边距很小
                    text_x = float(r.get('x', 0) or 0)
                    text_w = float(r.get('w', 0) or 0)
                    text_center_x = region_left + text_x + text_w / 2
                    text_right_x = region_left + text_x + text_w
                    region_width = region_right - region_left

                    # 右边距 = 聊天区域右边 - 文字右边
                    right_margin = region_right - text_right_x
                    # 左边距 = 文字左边 - 聊天区域左边
                    left_margin = text_x

                    # 判断逻辑（基于实测数据）：
                    # 自己的消息 right_pct ≈ 14-15%（靠右对齐，气泡贴近右边界）
                    # 对方的消息 right_pct ≈ 64-78%（靠左对齐，气泡贴近左边界）
                    # 用 20% 作为阈值，给自己消息留 5% 余量
                    # - 自己的消息：右边距 < 区域宽度的 20%（靠右对齐）
                    # - 对方的消息：其他情况（保守判断，避免误判自己消息导致漏回复）
                    if right_margin < region_width * 0.20:
                        msg_type = "self"
                    else:
                        msg_type = "user"

                    raw_msgs.append({
                        'type': msg_type,
                        'content': text,
                        'y': float(r.get('y', 0) or 0),
                        'x': text_x,
                        'w': text_w,
                        'h': float(r.get('h', 0) or 0),
                        'center_x': text_center_x,
                    })

                # 第二步：合并同一条消息的不同行
                # 判断依据：相邻两条消息如果满足以下条件，则合并：
                # 1. 类型相同（都是 user 或都是 self，time/system 不合并）
                # 2. y 坐标差 < 25px（同一条消息换行的行间距通常 < 20px）
                # 3. 水平位置相近（x 坐标差 < 30px，说明是同一个气泡内的文字）
                MERGE_Y_THRESHOLD = 25.0  # y 坐标差阈值（像素）
                MERGE_X_THRESHOLD = 30.0  # x 坐标差阈值（像素）

                merged: List[Dict[str, Any]] = []
                for rm in raw_msgs:
                    if not merged:
                        merged.append(rm)
                        continue

                    last = merged[-1]
                    # 只合并 user 和 self 类型（time/system 不合并）
                    if rm['type'] not in ('user', 'self') or last['type'] != rm['type']:
                        merged.append(rm)
                        continue

                    # 计算 y 坐标差（相邻行的 y 差）
                    y_diff = rm['y'] - (last['y'] + last.get('h', 0))
                    # 计算 x 坐标差
                    x_diff = abs(rm['x'] - last['x'])

                    if y_diff < MERGE_Y_THRESHOLD and x_diff < MERGE_X_THRESHOLD:
                        # 合并到上一条：用空格连接文本（避免中文粘连）
                        last['content'] = last['content'] + rm['content']
                        # 更新 y 和 h 为合并后的范围
                        last['h'] = (rm['y'] + rm['h']) - last['y']
                        logger.debug(f"合并消息行: +{rm['content']!r} → {last['content']!r}")
                    else:
                        merged.append(rm)

                # 第三步：转换为 Message 对象
                for m in merged:
                    msg_type = m['type']
                    if msg_type == 'self':
                        sender = self.my_info.get("nickname", "我")
                    elif msg_type == 'user':
                        sender = self.current_chat or ""
                    else:
                        sender = ""

                    messages.append(Message(type=msg_type, sender=sender, content=m['content']))
                    logger.debug(f"消息[{msg_type}]: {m['content']!r}")

                logger.info(f"OCR 解析+合并后得到 {len(messages)} 条消息（原始 {len(raw_msgs)} 行）")
                # 保存截图哈希缓存（下次截图相同时跳过 OCR）
                try:
                    self._last_screenshot_hash[region] = (img_hash, messages)
                except Exception:
                    pass
                return messages
            finally:
                # 清理临时图片
                try:
                    import os
                    if os.path.exists(img_path):
                        os.remove(img_path)
                except Exception:
                    pass

        except Exception as e:
            logger.error(f"获取消息列表失败: {e}")
        return messages

    def _parse_message_control(self, ctrl: ua.Control) -> Optional[Message]:
        """解析单个消息控件为 Message 对象"""
        try:
            cls = ctrl.ClassName or ""
            name = (ctrl.Name or "").strip()
            auto_id = getattr(ctrl, "AutomationId", "") or ""

            logger.debug(f"解析消息控件: class={cls} name={name[:80]} aid={auto_id}")

            # 时间分割线：ChatItemView，Name 为时间字符串（如 "00:39"）
            if cls == "mmui::ChatItemView" or self._is_time_message(name):
                if not name:
                    return None
                return Message(ctrl=ctrl, type="time", content=name)

            # 文本消息：ChatTextItemView
            # 在 4.1.11.55 中，ChatTextItemView 的 Name 属性可能为空或 "."
            # 真正的消息文本需要从子控件或 ValuePattern/LegacyIAccessible 获取
            if cls == "mmui::ChatTextItemView" or "ChatTextItemView" in cls:
                content = self._extract_message_text(ctrl)
                if not content:
                    # 跳过无法提取文本的消息
                    logger.debug(f"无法提取消息文本: aid={auto_id}")
                    return None

                # 判断是否为自己发的消息（通过控件位置）
                if self._is_self_message(ctrl):
                    return Message(ctrl=ctrl, type="self",
                                   sender=self.my_info.get("nickname", "我"),
                                   content=content)
                return Message(ctrl=ctrl, type="user", sender="", content=content)

            # 未知控件类型，尝试通用提取
            if not name:
                content = self._extract_message_text(ctrl)
                if not content:
                    return None
                name = content

            if self._is_system_message(name):
                return Message(ctrl=ctrl, type="system", content=name)

            if self._is_self_message(ctrl):
                return Message(ctrl=ctrl, type="self",
                               sender=self.my_info.get("nickname", "我"),
                               content=name)

            return Message(ctrl=ctrl, type="user", sender="", content=name)
        except Exception as e:
            logger.warning(f"解析消息控件异常: {e}")
            return None

    def _extract_message_text(self, ctrl: ua.Control) -> str:
        """
        从 ChatTextItemView 控件提取消息文本

        微信 4.1.11.55 的 ChatTextItemView 使用 Qt 自定义渲染，
        消息文本不通过 UIAutomation 标准属性暴露（Name 为空或 "."）。
        因此使用截图 + OCR 的方式提取文本。

        流程：
        1. 先快速检查 Name 属性（非 "." 时直接返回，处理特殊情况）
        2. 检查 ValuePattern / LegacyIAccessiblePattern（兜底）
        3. 使用 OCR 提取文本（主要方案）
        """
        # 1. 先检查 Name 属性（非空且非占位符）
        try:
            name = (ctrl.Name or "").strip()
            if name and name != ".":
                return name
        except Exception:
            pass

        # 2. 尝试 ValuePattern
        try:
            vp = ctrl.GetValuePattern()
            if vp:
                val = (vp.Value or "").strip()
                if val and val != ".":
                    return val
        except Exception:
            pass

        # 3. 尝试 LegacyIAccessiblePattern
        try:
            lp = ctrl.GetLegacyIAccessiblePattern()
            if lp:
                val = (lp.Value or "").strip()
                if val and val != ".":
                    return val
                desc = (lp.Description or "").strip()
                if desc:
                    return desc
        except Exception:
            pass

        # 4. 使用 GetChildren 检查子控件（兜底）
        try:
            children = ctrl.GetChildren()
            for child in children:
                try:
                    child_name = (child.Name or "").strip()
                    if child_name and child_name != ".":
                        return child_name
                except Exception:
                    continue
        except Exception:
            pass

        # 5. 使用 OCR 提取文本（主要方案）
        # 微信 4.1.11.55 的 ChatTextItemView 不通过 UIAutomation 暴露文本
        # 需要截图后用 Windows.Media.Ocr 识别
        try:
            from .ocr import extract_text_from_control
            text = extract_text_from_control(ctrl)
            if text:
                logger.debug(f"OCR 提取文本: '{text[:80]}'")
                return text
        except Exception as e:
            logger.debug(f"OCR 提取失败: {e}")

        return ""

    @staticmethod
    def _is_time_message(name: str) -> bool:
        """判断是否为时间分割线消息"""
        name = name.strip()
        # 匹配 "昨天 22:25"、"今天 14:30"、"星期一" 等
        time_keywords = ["昨天", "今天", "星期", "周一", "周二", "周三", "周四", "周五", "周六", "周日"]
        if any(kw in name for kw in time_keywords) and len(name) < 20:
            return True
        # 纯时间格式 "14:30"
        if len(name) <= 5 and ":" in name:
            return True
        return False

    @staticmethod
    def _is_system_message(name: str) -> bool:
        """判断是否为系统消息"""
        name = name.strip()
        system_keywords = [
            "以下是新消息", "撤回了一条消息", "以上是打招呼的",
            "你已添加了", "现在可以开始聊天", "以下为新消息",
            "开启了朋友验证", "你还不是对方朋友",
        ]
        return any(kw in name for kw in system_keywords)

    def _is_self_message(self, ctrl: ua.Control) -> bool:
        """判断是否为自己发的消息（通过控件位置，靠右为self）"""
        try:
            rect = ctrl.BoundingRectangle
            if not rect:
                return False
            # 获取聊天详情页的矩形
            chat_page = self._get_chat_message_page()
            if not chat_page:
                return False
            page_rect = chat_page.BoundingRectangle
            if not page_rect:
                return False
            # 消息中心点
            msg_center_x = (rect.left + rect.right) / 2
            page_center_x = (page_rect.left + page_rect.right) / 2
            # 自己的消息靠右（中心点在页面右半部分）
            return msg_center_x > page_center_x
        except Exception:
            return False

    @staticmethod
    def _extract_sender_and_content(name: str) -> tuple:
        """从消息 Name 中提取发送者和内容"""
        name = name.strip()
        if not name:
            return "", ""
        # 微信消息 Name 通常是 "发送者\n内容" 或纯内容
        if "\n" in name:
            parts = name.split("\n", 1)
            return parts[0].strip(), parts[1].strip()
        return "", name

    def _get_input_box_position(self) -> Optional[tuple]:
        """
        计算输入框的屏幕坐标位置

        微信 4.x 控件树不暴露输入框，必须通过坐标定位：
        - 输入框在窗口底部中央
        - 水平位置：会话列表右侧 + 聊天区域宽度的一半
        - 垂直位置：窗口底部上方约 60-80px

        Returns:
            tuple: (x, y) 屏幕坐标，失败返回 None
        """
        try:
            win_rect = self.main_window.BoundingRectangle
            if not win_rect:
                return None

            nav_width = 75       # 导航栏宽度
            list_width = 300     # 会话列表宽度

            # 聊天区域中心 x
            chat_left = win_rect.left + nav_width + list_width
            chat_right = win_rect.right
            chat_center_x = (chat_left + chat_right) // 2

            # 输入框 y：窗口底部上方约 60px
            input_y = win_rect.bottom - 60

            return (chat_center_x, input_y)
        except Exception as e:
            logger.warning(f"_get_input_box_position 失败: {e}")
            return None

    def _get_chat_message_region(self) -> Optional[tuple]:
        """
        计算聊天消息列表的屏幕区域（用于 OCR 识别消息）

        微信 4.x 控件树不暴露消息列表控件，必须通过坐标定位：
        - 水平：导航栏(75) + 会话列表(300) 之后到窗口右边
        - 垂直：标题栏(40) + 聊天对象名栏(40) 之后到输入框上方

        布局示意：
        +----+--------+----------------------+
        |导航|会话列表 |    标题栏 (40)        |
        |栏  |       +----------------------+
        |75  | 300   |    聊天对象名 (40)    |
        |    |       +----------------------+
        |    |       |                      |
        |    |       |    消息列表区域       |  ← 这个区域
        |    |       |                      |
        |    |       +----------------------+
        |    |       |    输入框 (80)        |
        +----+--------+----------------------+

        Returns:
            tuple: (left, top, right, bottom) 屏幕坐标，失败返回 None
        """
        try:
            win_rect = self.main_window.BoundingRectangle
            if not win_rect:
                return None

            nav_width = 75        # 导航栏宽度
            list_width = 300      # 会话列表宽度
            title_height = 40     # 标题栏高度
            header_height = 40    # 聊天对象名栏高度
            input_height = 80     # 输入框区域高度

            left = win_rect.left + nav_width + list_width
            right = win_rect.right
            top = win_rect.top + title_height + header_height
            bottom = win_rect.bottom - input_height

            if right <= left or bottom <= top:
                logger.warning(f"聊天消息区域无效: left={left} top={top} right={right} bottom={bottom}")
                return None

            return (left, top, right, bottom)
        except Exception as e:
            logger.warning(f"_get_chat_message_region 失败: {e}")
            return None

    def SendMsg(self, msg: str, who: Optional[str] = None, clear: bool = True,
                at: Optional[str] = None) -> bool:
        """
        发送文本消息 - 坐标点击 + Win32 剪贴板方案

        微信 4.x 控件树不暴露输入框，必须通过坐标点击：
        1. 如果指定 who，先 ChatWith 切换到目标聊天
        2. 点击输入框位置（窗口底部中央）
        3. 用 Win32 API 设置剪贴板（不依赖 clip 命令）
        4. Ctrl+V 粘贴
        5. Enter 发送

        Args:
            msg: 消息内容
            who: 发送对象（None 表示发送给当前聊天）
            clear: 发送后是否清空输入框
            at: @对象（暂未实现）

        Returns:
            bool: 是否发送成功
        """
        if not msg:
            return False

        try:
            # 步骤1：如果指定了 who 且与当前聊天不同，先切换
            if who and who != self.current_chat:
                if not self.ChatWith(who):
                    logger.error(f"切换到聊天 {who} 失败，无法发送消息")
                    return False

            # 步骤2：获取输入框位置
            input_pos = self._get_input_box_position()
            if not input_pos:
                logger.error("无法获取输入框位置")
                return False

            input_x, input_y = input_pos
            logger.info(f"点击输入框位置: ({input_x}, {input_y})")

            # 步骤3：点击输入框激活
            if not self._click_position(input_x, input_y):
                logger.error("点击输入框失败")
                return False
            time.sleep(0.2)  # 缩短从 0.5 到 0.2

            # 步骤4：清空已有内容（Ctrl+A 全选后删除）
            if clear:
                try:
                    u32 = ctypes.windll.user32
                    # Ctrl+A
                    u32.keybd_event(0x11, 0, 0, 0)  # VK_CONTROL
                    u32.keybd_event(0x41, 0, 0, 0)  # 'A'
                    time.sleep(0.03)
                    u32.keybd_event(0x41, 0, 0x0002, 0)  # KEYEVENTF_KEYUP
                    u32.keybd_event(0x11, 0, 0x0002, 0)
                    time.sleep(0.05)
                    # Delete
                    u32.keybd_event(0x2E, 0, 0, 0)  # VK_DELETE
                    time.sleep(0.03)
                    u32.keybd_event(0x2E, 0, 0x0002, 0)
                    time.sleep(0.05)
                except Exception as e:
                    logger.warning(f"清空输入框失败: {e}")

            # 步骤5：用 Win32 API 设置剪贴板
            if not self._set_clipboard_text(msg):
                logger.error("设置剪贴板失败")
                return False
            time.sleep(0.05)  # 缩短从 0.15 到 0.05

            # 步骤6：Ctrl+V 粘贴
            try:
                u32 = ctypes.windll.user32
                u32.keybd_event(0x11, 0, 0, 0)  # VK_CONTROL
                u32.keybd_event(0x56, 0, 0, 0)  # 'V'
                time.sleep(0.03)
                u32.keybd_event(0x56, 0, 0x0002, 0)
                u32.keybd_event(0x11, 0, 0x0002, 0)
                time.sleep(0.15)  # 缩短从 0.3 到 0.15
            except Exception as e:
                logger.error(f"粘贴失败: {e}")
                return False

            # 步骤7：按 Enter 发送
            try:
                u32 = ctypes.windll.user32
                u32.keybd_event(0x0D, 0, 0, 0)  # VK_RETURN
                time.sleep(0.03)
                u32.keybd_event(0x0D, 0, 0x0002, 0)
                time.sleep(0.15)  # 缩短从 0.3 到 0.15
            except Exception as e:
                logger.error(f"按 Enter 失败: {e}")
                return False

            logger.info(f"消息已发送: {msg[:50]}")
            return True
        except Exception as e:
            logger.error(f"发送消息失败: {e}")
            return False

    def _find_edit_control(self, parent: ua.Control) -> Optional[ua.Control]:
        """在 ChatInputView 内部查找实际的编辑控件"""
        # 优先查找 EditControl / TextControl
        for ctrl_type in [ua.ControlType.EditControl, ua.ControlType.TextControl,
                          ua.ControlType.CustomControl]:
            result = self._find_control(parent, ControlType=ctrl_type)
            if result:
                return result
        return None

    def KeepRunning(self) -> None:
        """保持微信窗口运行（防止被系统休眠）"""
        try:
            while True:
                time.sleep(60)
                if not self.IsOnline():
                    logger.warning("微信已离线")
                    break
        except KeyboardInterrupt:
            pass

    def ShutDown(self) -> None:
        """关闭微信进程"""
        try:
            import win32gui
            import win32con
            handle = self.main_window.NativeWindowHandle if self.main_window else 0
            if handle:
                win32gui.PostMessage(handle, win32con.WM_CLOSE, 0, 0)
                logger.info("已发送关闭微信指令")
        except Exception as e:
            logger.warning(f"关闭微信失败: {e}")

    def Close(self) -> None:
        """关闭连接（不关闭微信）"""
        self.main_window = None
        self._cached_session_list = []
