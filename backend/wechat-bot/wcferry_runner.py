# -*- coding: utf-8 -*-
"""
微信机器人 wcferry 插件脚本（独立 Python 进程）

设计要点：
1. 基于 wcferry (WeChatFerry) RPC 框架，纯代码控制微信，不依赖 UI 自动化、不模拟鼠标键盘
2. 通过 stdin/stdout 与 Node.js 父进程交换 NDJSON 行（每行一个 JSON 对象）
3. AI 调用优先使用 .env 中的 DEEPSEEK_API_KEY/OPENAI_API_KEY，否则回退到本地 GLM
4. systemPrompt 中注入当前时间，避免 AI 编造时间
5. 历史记录持久化到 wechat_bot_history.json（最多 500 条）
6. 状态文件 wechat_bot_state.json 供后端读取
7. 单条消息处理串行，间隔 2 秒，模拟人类操作节奏
8. 任何异常都 try-catch 后写入状态，不影响主服务

通信协议：
  stdin  -> 命令（NDJSON）：
    {"cmd":"start"}              启动 wcferry 并等待微信登录
    {"cmd":"stop"}               停止消息接收并退出
    {"cmd":"send","to":"wxid","text":"..."}  主动发消息
    {"cmd":"status"}             立即上报一次状态

  stdout <- 事件（NDJSON）：
    {"event":"ready","version":"39.6.0.0","pid":12345}
    {"event":"login","wxid":"wxid_xxx","name":"昵称"}
    {"event":"qrcode","img":"base64..."}          未登录时获取二维码
    {"event":"msg","type":"text","sender":"wxid_yyy","roomid":"","content":"你好","msg_id":"xxx","timestamp":1234567890,"from_name":"昵称"}
    {"event":"sent","to":"wxid_yyy","text":"回复","ok":true,"elapsed":1234}
    {"event":"status","status":"running","wxid":"...","incoming_count":10,"outgoing_count":10}
    {"event":"error","message":"..."}
    {"event":"fatal","message":"..."}             致命错误，进程将退出
"""

import os
import sys
import json
import time
import threading
import traceback
from datetime import datetime
from typing import Optional, Dict, Any, List

# ==================== 路径与配置 ====================

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)
ENV_PATH = os.path.join(PROJECT_ROOT, ".env")

# 优先使用 Node.js 父进程通过环境变量传入的路径（保证两端数据目录一致）
DATA_DIR = os.environ.get("WCF_BOT_DATA_DIR") or os.path.join(BACKEND_DIR, "data")
STATE_FILE = os.environ.get("WCF_BOT_STATE_FILE") or os.path.join(DATA_DIR, "wechat_bot_state.json")
HISTORY_FILE = os.environ.get("WCF_BOT_HISTORY_FILE") or os.path.join(DATA_DIR, "wechat_bot_history.json")

os.makedirs(DATA_DIR, exist_ok=True)

MAX_HISTORY = 500
AI_CALL_INTERVAL_SEC = 2.0  # 相邻 AI 调用最小间隔
AI_REQUEST_TIMEOUT_SEC = 30
MAX_REPLY_LEN = 1500  # 微信文本消息建议长度上限

# ==================== .env 加载（手写，避免依赖 python-dotenv） ====================


def load_env(env_path: str) -> None:
    if not os.path.exists(env_path):
        return
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" not in line:
                    continue
                key, _, value = line.partition("=")
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = value
    except Exception as e:
        sys.stderr.write(f"[wcferry_runner] 加载 .env 失败: {e}\n")


load_env(ENV_PATH)

# ==================== 日志输出（NDJSON 到 stdout） ====================

_stdout_lock = threading.Lock()


def emit(event: Dict[str, Any]) -> None:
    """向 stdout 输出一行 NDJSON 事件"""
    try:
        line = json.dumps(event, ensure_ascii=False, separators=(",", ":"))
        with _stdout_lock:
            sys.stdout.write(line + "\n")
            sys.stdout.flush()
    except Exception as e:
        sys.stderr.write(f"[wcferry_runner] emit 失败: {e}\n")


def emit_error(message: str) -> None:
    emit({"event": "error", "message": str(message), "timestamp": int(time.time())})


def emit_fatal(message: str) -> None:
    emit({"event": "fatal", "message": str(message), "timestamp": int(time.time())})


# ==================== 状态持久化 ====================

_state_lock = threading.Lock()
_state: Dict[str, Any] = {
    "status": "idle",
    "wxid": "",
    "name": "",
    "pid": os.getpid(),
    "started_at": int(time.time()),
    "last_message": "",
    "last_reply": "",
    "last_error": "",
    "incoming_count": 0,
    "outgoing_count": 0,
    "plugin": "wcferry",
}


def update_state(**kwargs: Any) -> None:
    with _state_lock:
        _state.update(kwargs)
        _state["updated_at"] = int(time.time())
    try:
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(_state, f, ensure_ascii=False, indent=2)
    except Exception as e:
        sys.stderr.write(f"[wcferry_runner] 写状态失败: {e}\n")


def emit_status() -> None:
    with _state_lock:
        snapshot = dict(_state)
    emit({"event": "status", **snapshot, "timestamp": int(time.time())})


# ==================== 历史记录 ====================

_history_lock = threading.Lock()
_history: List[Dict[str, Any]] = []

try:
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            loaded = json.load(f)
            if isinstance(loaded, list):
                _history = loaded[-MAX_HISTORY:]
except Exception:
    _history = []


def append_history(record: Dict[str, Any]) -> None:
    with _history_lock:
        _history.append(record)
        if len(_history) > MAX_HISTORY:
            del _history[: len(_history) - MAX_HISTORY]
        try:
            with open(HISTORY_FILE, "w", encoding="utf-8") as f:
                json.dump(_history, f, ensure_ascii=False, indent=2)
        except Exception as e:
            sys.stderr.write(f"[wcferry_runner] 写历史失败: {e}\n")


# ==================== AI 调用 ====================

_last_ai_call_ts = 0.0
_ai_lock = threading.Lock()


def _build_time_info() -> str:
    now = datetime.now()
    weekday = "日一二三四五六"[now.weekday()]
    return f"[当前时间] {now.strftime('%Y/%m/%d %H:%M:%S')}（星期{weekday}），ISO: {now.isoformat(timespec='seconds')}"


def call_ai(prompt: str) -> Dict[str, Any]:
    """调用 AI，返回 {content, elapsed, error}"""
    global _last_ai_call_ts
    with _ai_lock:
        # 限流：相邻调用至少 AI_CALL_INTERVAL_SEC 秒
        elapsed_since_last = time.time() - _last_ai_call_ts
        if elapsed_since_last < AI_CALL_INTERVAL_SEC:
            time.sleep(AI_CALL_INTERVAL_SEC - elapsed_since_last)
        _last_ai_call_ts = time.time()

    start = time.time()
    try:
        import requests  # wcferry 已依赖
    except ImportError as e:
        return {"content": "", "elapsed": 0, "error": f"requests 未安装: {e}"}

    env_key = os.environ.get("DEEPSEEK_API_KEY") or os.environ.get("OPENAI_API_KEY") or ""
    if env_key:
        base_url = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com").rstrip("/")
        api_key = env_key
        model = os.environ.get("DEEPSEEK_MODEL", "deepseek-v4-pro")
    else:
        base_url = "http://127.0.0.1:8000/v1"
        api_key = "not-needed"
        model = "glm-5.2"

    time_info = _build_time_info()
    system_prompt = (
        "你是阮琳云，一个温柔、聪明的AI助手，通过微信与主人对话。"
        "请用简洁、自然的口吻回答（适合微信聊天场景），避免过长的回复。"
        "如果主人问时间相关问题，请基于以下时间信息回答，不要编造。\n\n"
        f"{time_info}"
    )

    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt[:8000]},
        ],
        "max_tokens": 1024,
        "temperature": 0.7,
    }

    try:
        resp = requests.post(
            f"{base_url}/chat/completions",
            json=body,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            timeout=AI_REQUEST_TIMEOUT_SEC,
        )
        resp.raise_for_status()
        data = resp.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        return {"content": content.strip(), "elapsed": int((time.time() - start) * 1000), "error": ""}
    except Exception as e:
        return {"content": "", "elapsed": int((time.time() - start) * 1000), "error": str(e)}


# ==================== wcferry 封装 ====================


class WcferryBot:
    """wcferry 机器人封装"""

    def __init__(self) -> None:
        self.wcf = None
        self.self_wxid: str = ""
        self.self_name: str = ""
        self.receiving: bool = False
        self.contacts_map: Dict[str, str] = {}  # wxid -> name
        self._stop_event = threading.Event()

    def start(self) -> bool:
        """启动 wcferry，等待微信登录"""
        try:
            from wcferry import Wcf  # 延迟导入，避免插件缺失时崩溃
        except ImportError as e:
            emit_fatal(f"wcferry 库未安装: {e}")
            return False

        try:
            update_state(status="starting", last_error="")
            emit({"event": "ready", "version": getattr(Wcf, "__version__", "unknown"), "pid": os.getpid()})

            # block=False 让我们手动处理登录流程
            self.wcf = Wcf(block=False)
            update_state(status="waiting_login")

            # 检查是否已登录
            if not self.wcf.is_login():
                # 获取二维码
                self._fetch_and_emit_qrcode()
                # 等待登录（最多等 5 分钟）
                wait_start = time.time()
                while not self.wcf.is_login() and not self._stop_event.is_set():
                    if time.time() - wait_start > 300:
                        emit_error("等待微信登录超时（5分钟）")
                        update_state(status="error", last_error="等待登录超时")
                        return False
                    # 每 30 秒刷新一次二维码
                    if int(time.time() - wait_start) % 30 == 0:
                        self._fetch_and_emit_qrcode()
                    time.sleep(1)

                if self._stop_event.is_set():
                    return False

            # 已登录
            self.self_wxid = self.wcf.get_self_wxid()
            try:
                user_info = self.wcf.get_user_info()
                self.self_name = user_info.get("name", "") or self.self_wxid
            except Exception:
                self.self_name = self.self_wxid

            update_state(
                status="running",
                wxid=self.self_wxid,
                name=self.self_name,
                last_error="",
            )
            emit({"event": "login", "wxid": self.self_wxid, "name": self.self_name})

            # 加载通讯录（异步，不阻塞）
            threading.Thread(target=self._load_contacts, daemon=True).start()

            # 启动消息接收
            self._start_receiving()
            return True

        except SystemExit:
            # wcferry 内部可能调用 os._exit，这里捕获不到，但防御性处理
            emit_fatal("wcferry 内部异常退出")
            update_state(status="error", last_error="wcferry 内部异常退出")
            return False
        except Exception as e:
            emit_fatal(f"启动 wcferry 失败: {e}\n{traceback.format_exc()}")
            update_state(status="error", last_error=str(e))
            return False

    def _fetch_and_emit_qrcode(self) -> None:
        try:
            qrcode = self.wcf.get_qrcode()
            if qrcode:
                # qrcode 已是 base64 字符串
                if not qrcode.startswith("data:"):
                    img_data = f"data:image/png;base64,{qrcode}"
                else:
                    img_data = qrcode
                emit({"event": "qrcode", "img": img_data, "timestamp": int(time.time())})
        except Exception as e:
            emit_error(f"获取二维码失败: {e}")

    def _load_contacts(self) -> None:
        try:
            contacts = self.wcf.get_contacts()
            for c in contacts:
                wxid = c.get("wxid", "")
                name = c.get("remark") or c.get("name") or wxid
                if wxid:
                    self.contacts_map[wxid] = name
            sys.stderr.write(f"[wcferry_runner] 加载通讯录完成: {len(self.contacts_map)} 人\n")
        except Exception as e:
            sys.stderr.write(f"[wcferry_runner] 加载通讯录失败: {e}\n")

    def _start_receiving(self) -> None:
        try:
            ok = self.wcf.enable_receiving_msg()
            if not ok:
                emit_error("启动消息接收失败")
                update_state(status="error", last_error="启动消息接收失败")
                return
            self.receiving = True
            threading.Thread(target=self._message_loop, daemon=True).start()
        except Exception as e:
            emit_error(f"启动消息接收异常: {e}")
            update_state(status="error", last_error=str(e))

    def _message_loop(self) -> None:
        """消息接收主循环"""
        sys.stderr.write("[wcferry_runner] 消息接收线程已启动\n")
        while self.receiving and not self._stop_event.is_set():
            try:
                msg = self.wcf.get_msg(block=True)
                if msg is None:
                    time.sleep(0.5)
                    continue
                # 只处理文本消息
                if not msg.is_text():
                    continue
                # 跳过自己发的
                if msg.from_self():
                    continue

                content = msg.content or ""
                sender = msg.sender or ""
                roomid = msg.roomid or ""
                from_name = self.contacts_map.get(sender, sender)

                # 群消息：只有被 @ 才回复
                if msg.from_group():
                    if not msg.is_at(self.self_wxid):
                        continue
                    # 去掉 @  前缀
                    content = self._strip_at_prefix(content)

                if not content.strip():
                    continue

                # 上报消息事件
                msg_event = {
                    "event": "msg",
                    "type": "text",
                    "sender": sender,
                    "roomid": roomid,
                    "from_name": from_name,
                    "content": content,
                    "msg_id": str(msg.id),
                    "timestamp": msg.ts,
                }
                emit(msg_event)

                # 持久化接收记录
                append_history({
                    "dir": "incoming",
                    "msgId": str(msg.id),
                    "fromId": sender,
                    "fromName": from_name,
                    "text": content,
                    "timestamp": msg.ts,
                })
                update_state(
                    last_message=content[:200],
                    incoming_count=_state.get("incoming_count", 0) + 1,
                )

                # 调用 AI 并回复
                self._handle_ai_reply(sender, roomid, content, str(msg.id))

            except Exception as e:
                emit_error(f"消息处理异常: {e}")
                time.sleep(1)

    def _strip_at_prefix(self, content: str) -> str:
        """去掉群消息中 @机器人  的前缀"""
        import re
        # 匹配 @昵称  或 @xxx
        return re.sub(r"^@\S+\s*", "", content).strip()

    def _handle_ai_reply(self, sender: str, roomid: str, content: str, msg_id: str) -> None:
        """调用 AI 并回复消息"""
        try:
            result = call_ai(content)
            reply = result.get("content", "")
            error = result.get("error", "")
            elapsed = result.get("elapsed", 0)

            if error:
                emit_error(f"AI 调用失败: {error}")
                append_history({
                    "dir": "outgoing",
                    "msgId": f"{msg_id}_reply",
                    "fromId": self.self_wxid,
                    "fromName": self.self_name,
                    "text": f"(AI处理失败: {error[:100]})",
                    "timestamp": int(time.time()),
                    "elapsed": elapsed,
                    "error": error,
                })
                update_state(last_error=f"AI: {error[:200]}")
                return

            if not reply:
                reply = "我暂时不知道怎么回答呢~"

            # 截断过长回复
            if len(reply) > MAX_REPLY_LEN:
                reply = reply[:MAX_REPLY_LEN] + "..."

            # 发送回复
            receiver = roomid if roomid else sender
            send_status = self.wcf.send_text(msg=reply, receiver=receiver)

            ok = send_status == 0
            emit({
                "event": "sent",
                "to": receiver,
                "text": reply,
                "ok": ok,
                "elapsed": elapsed,
                "timestamp": int(time.time()),
            })

            append_history({
                "dir": "outgoing",
                "msgId": f"{msg_id}_reply",
                "fromId": self.self_wxid,
                "fromName": self.self_name,
                "toName": self.contacts_map.get(receiver, receiver),
                "text": reply,
                "timestamp": int(time.time()),
                "elapsed": elapsed,
                "error": "" if ok else f"send_text 返回 {send_status}",
            })
            update_state(
                last_reply=reply[:200],
                outgoing_count=_state.get("outgoing_count", 0) + 1,
                last_error="" if ok else f"send_text 返回 {send_status}",
            )

        except Exception as e:
            emit_error(f"AI 回复异常: {e}")
            update_state(last_error=str(e)[:200])

    def send_text(self, to: str, text: str) -> Dict[str, Any]:
        """主动发消息"""
        if not self.wcf:
            return {"ok": False, "error": "wcferry 未启动"}
        try:
            status = self.wcf.send_text(msg=text, receiver=to)
            ok = status == 0
            append_history({
                "dir": "outgoing",
                "msgId": f"manual_{int(time.time()*1000)}",
                "fromId": self.self_wxid,
                "fromName": self.self_name,
                "toName": self.contacts_map.get(to, to),
                "text": text,
                "timestamp": int(time.time()),
                "error": "" if ok else f"send_text 返回 {status}",
            })
            update_state(
                last_reply=text[:200],
                outgoing_count=_state.get("outgoing_count", 0) + 1,
            )
            return {"ok": ok, "error": "" if ok else f"send_text 返回 {status}"}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def stop(self) -> None:
        """停止机器人"""
        sys.stderr.write("[wcferry_runner] 正在停止...\n")
        self._stop_event.set()
        self.receiving = False
        try:
            if self.wcf:
                self.wcf.cleanup()
        except Exception as e:
            sys.stderr.write(f"[wcferry_runner] cleanup 异常: {e}\n")
        update_state(status="stopped")


# ==================== 命令处理 ====================

bot = WcferryBot()


def handle_command(cmd: Dict[str, Any]) -> None:
    action = cmd.get("cmd", "").lower()
    if action == "start":
        if bot.wcf is None:
            threading.Thread(target=bot.start, daemon=True).start()
        else:
            emit_status()
    elif action == "stop":
        bot.stop()
        emit({"event": "stopped", "timestamp": int(time.time())})
    elif action == "send":
        to = cmd.get("to", "")
        text = cmd.get("text", "")
        if to and text:
            result = bot.send_text(to, text)
            emit({"event": "sent", "to": to, "text": text, "ok": result.get("ok", False),
                  "error": result.get("error", ""), "timestamp": int(time.time())})
        else:
            emit_error("send 命令缺少 to 或 text")
    elif action == "status":
        emit_status()
    elif action == "quit":
        bot.stop()
        emit({"event": "quit", "timestamp": int(time.time())})
        # 让主循环退出
        os._exit(0)
    else:
        emit_error(f"未知命令: {action}")


def stdin_loop() -> None:
    """读取 stdin 的 NDJSON 命令"""
    try:
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            try:
                cmd = json.loads(line)
                handle_command(cmd)
            except json.JSONDecodeError as e:
                emit_error(f"命令 JSON 解析失败: {e}")
            except Exception as e:
                emit_error(f"命令处理异常: {e}")
    except Exception as e:
        sys.stderr.write(f"[wcferry_runner] stdin 循环退出: {e}\n")
        emit_fatal(f"stdin 循环异常: {e}")
        os._exit(1)


# ==================== 主入口 ====================


def main() -> None:
    # 强制 stdout/stderr 使用 UTF-8
    try:
        sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
        sys.stderr.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
    except Exception:
        pass

    update_state(status="idle", pid=os.getpid(), started_at=int(time.time()), plugin="wcferry")
    emit({"event": "ready", "version": "wcferry_runner-1.0.0", "pid": os.getpid()})

    # 启动 stdin 监听线程
    threading.Thread(target=stdin_loop, daemon=True).start()

    # 主线程阻塞等待（wcferry 的消息循环在子线程中运行）
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        bot.stop()
        os._exit(0)


if __name__ == "__main__":
    main()
