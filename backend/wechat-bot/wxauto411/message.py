"""
微信消息类 - 封装单条消息的信息

消息类型：
  - user:    别人发来的消息
  - self:    自己发送的消息
  - system:  系统消息（如"xxx 撤回了一条消息"、"以下是新消息"）
  - time:    时间分割线（如"昨天 22:25"）
"""

import time
from typing import Optional


class Message:
    """封装微信消息的单条记录"""

    def __init__(self, ctrl=None, type: str = "user", sender: str = "",
                 content: str = "", timestamp: Optional[float] = None):
        """
        Args:
            ctrl: uiautomation 控件对象（如果从控件构造）
            type: 消息类型 user/self/system/time
            sender: 发送者昵称（self 类型时为当前用户）
            content: 消息文本内容
            timestamp: Unix 时间戳
        """
        self.ctrl = ctrl
        self.type = type
        self.sender = sender
        self.content = content
        self.timestamp = timestamp or time.time()

    @property
    def raw(self) -> dict:
        """返回原始数据字典（兼容 wxauto4 接口）"""
        return {
            "type": self.type,
            "sender": self.sender,
            "content": self.content,
            "timestamp": self.timestamp,
        }

    def __repr__(self) -> str:
        return f"<Message type={self.type} sender='{self.sender}' content='{self.content[:30]}...'>"

    def __str__(self) -> str:
        if self.type == "self":
            return f"[我] {self.content}"
        elif self.type == "system":
            return f"[系统] {self.content}"
        elif self.type == "time":
            return f"[时间] {self.content}"
        else:
            return f"[{self.sender}] {self.content}"

    def is_text(self) -> bool:
        """是否为文本消息"""
        return self.type in ("user", "self") and bool(self.content)

    def is_self(self) -> bool:
        """是否为自己发送的消息"""
        return self.type == "self"
