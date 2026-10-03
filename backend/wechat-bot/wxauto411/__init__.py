"""
wxauto411 - 微信 4.1.x Windows 客户端自动化库（自主开发，适配 4.1.11.55）

设计原理：
  - 基于 Windows UIAutomation (uiautomation 库)
  - 通过控件树定位微信窗口的会话列表、聊天详情、输入框等关键元素
  - 模拟人工操作：点击会话切换聊天、读取消息列表、在输入框输入文本并发送

与 wxauto4 的关系：
  - 借鉴 wxauto4 的 API 设计（WeChat 类、Message 类）
  - 完全自主实现内部逻辑，适配微信 4.1.11.55 的控件结构
  - 关键控件 ClassName：
    * 主窗口: mmui::MainWindow
    * 导航栏: mmui::MainTabBar (aid=MainView.main_tabbar)
    * 会话列表: mmui::ChatSessionList → mmui::XTableView (aid=session_list)
    * 会话项: mmui::ChatSessionCell (aid=session_item_<好友名>)
    * 聊天详情: mmui::ChatDetailView → mmui::ChatMessagePage (aid=chat_message_page)
    * 输入框: mmui::ChatInputView
    * 消息列表: mmui::MessageView
    * 搜索框: mmui::XSearchField → mmui::XValidatorTextEdit (name=搜索)

依赖：
  - uiautomation (pip install uiautomation)
  - pywin32 (pip install pywin32) - 用于 COM 初始化

版本: 0.1.0
作者: 自主开发
"""

from .wechat import WeChat
from .message import Message
from .exceptions import WeChatNotOnlineError, WeChatNotFoundError, ControlNotFoundError

__version__ = "0.1.0"
__all__ = ["WeChat", "Message", "WeChatNotOnlineError", "WeChatNotFoundError", "ControlNotFoundError"]
