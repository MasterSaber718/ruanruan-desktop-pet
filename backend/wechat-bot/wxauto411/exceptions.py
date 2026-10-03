"""wxauto411 异常定义"""


class WeChatError(Exception):
    """微信自动化基础异常"""
    pass


class WeChatNotFoundError(WeChatError):
    """未找到微信窗口"""
    pass


class WeChatNotOnlineError(WeChatError):
    """微信未登录"""
    pass


class ControlNotFoundError(WeChatError):
    """控件未找到"""
    pass
