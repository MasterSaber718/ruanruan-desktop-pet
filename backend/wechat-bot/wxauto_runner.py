# -*- coding: utf-8 -*-
"""
微信机器人 wxauto411 插件脚本（独立 Python 进程）

设计要点：
1. 基于自主开发的 wxauto411 库（适配微信 4.1.11.55+ 客户端 Weixin.exe）
   - 借鉴 wxauto4 思路，使用 UIAutomation 操作微信窗口
   - 不依赖 wxauto4 包，避免版本兼容问题
2. 通过 stdin/stdout 与 Node.js 父进程交换 NDJSON 行（每行一个 JSON 对象）
3. AI 调用优先使用 .env 中的 DEEPSEEK_API_KEY/OPENAI_API_KEY，否则回退到本地 GLM
4. systemPrompt 中注入当前时间，避免 AI 编造时间
5. 历史记录持久化到 wechat_bot_history.json（最多 500 条）
6. 状态文件 wechat_bot_state.json 供后端读取
7. 监听对象通过 start 命令的 listen 参数传入，或动态 add_listen/remove_listen
8. 轮询间隔 2 秒（可配置），对监听对象依次切换并获取新消息
9. 任何异常都 try-catch 后写入状态，不影响主服务

适用场景：
  - 微信 4.1.11.55+（Weixin.exe），使用自主开发的 wxauto411 适配库
  - 微信窗口必须保持活跃（未锁屏、未最小化）
  - 监听对象需为好友或群聊名称（与微信中显示一致）

通信协议：
  stdin  -> 命令（NDJSON）：
    {"cmd":"start"}                                      启动 wxauto411
    {"cmd":"start","listen":["文件传输助手","张三"]}      启动并设置监听列表
    {"cmd":"stop"}                                       停止并退出
    {"cmd":"send","to":"张三","text":"..."}              主动发消息
    {"cmd":"add_listen","name":"李四"}                   动态添加监听对象
    {"cmd":"remove_listen","name":"李四"}                移除监听对象
    {"cmd":"get_listen"}                                 查询当前监听列表
    {"cmd":"status"}                                     立即上报一次状态
    {"cmd":"quit"}                                       优雅退出

  stdout <- 事件（NDJSON）：
    {"event":"ready","version":"wxauto411-0.1.0","pid":12345}
    {"event":"login","wxid":"...","name":"昵称"}            微信已登录
    {"event":"not_logged_in","message":"微信未登录"}        微信未登录
    {"event":"msg","sender":"...","content":"...","from_name":"...","chat_name":"..."}
    {"event":"sent","to":"...","text":"...","ok":true,"elapsed":1234}
    {"event":"status","status":"running","wxid":"...","listen":["..."],"incoming_count":10,...}
    {"event":"listen_updated","listen":["..."]}
    {"event":"error","message":"..."}
    {"event":"fatal","message":"..."}                       致命错误，进程将退出
    {"event":"stopped"}
"""

import os
import sys
import json
import time
import threading
import traceback
from datetime import datetime
from typing import Optional, Dict, Any, List, Set

# ==================== 路径与配置 ====================

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)
ENV_PATH = os.path.join(PROJECT_ROOT, ".env")

# 优先使用 Node.js 父进程通过环境变量传入的路径（保证两端数据目录一致）
DATA_DIR = os.environ.get("WXBOT_DATA_DIR") or os.path.join(BACKEND_DIR, "data")
STATE_FILE = os.environ.get("WXBOT_STATE_FILE") or os.path.join(DATA_DIR, "wechat_bot_state.json")
HISTORY_FILE = os.environ.get("WXBOT_HISTORY_FILE") or os.path.join(DATA_DIR, "wechat_bot_history.json")
# 监听列表持久化文件
LISTEN_FILE = os.path.join(DATA_DIR, "wechat_bot_listen.json")

os.makedirs(DATA_DIR, exist_ok=True)

MAX_HISTORY = 500
# AI 调用串行化：同一时间只允许一个 AI 请求在执行
# 原因：多条消息并发触发 _handle_ai_reply 线程，同时请求云端 API 会触发 429 限流
# 串行化后请求按顺序执行，避免触发风控
AI_SERIAL_LOCK = threading.Lock()
# AI 调用最小间隔（串行执行后再加上短间隔，模拟人类节奏）
AI_CALL_INTERVAL_SEC = 0.5
# 缩短超时时间：云端 API 慢时 30 秒会让用户长时间等待
# 20 秒超时兼顾响应速度和 API 处理时间
AI_REQUEST_TIMEOUT_SEC = 20
# 429 错误重试配置
AI_MAX_RETRIES = 2                  # 最多重试 2 次
AI_RETRY_BASE_DELAY = 2.0           # 重试基础延迟（秒）
AI_429_COOLDOWN_SEC = 5.0           # 触发 429 后的冷却时间
MAX_REPLY_LEN = 1500                # 微信文本消息建议长度上限

# ==================== 动态轮询间隔 ====================
# 设计目标：平时低频检测节省资源，收到消息后自动加速响应
# - 空闲时（长时间无新消息）：2 秒轮询，节省 CPU
# - 活跃时（刚收到消息）：1 秒轮询，开始聊天
# - 高频时（5秒内连收多条消息）：0.5 秒轮询，快速响应
# - 冷却：连续 10 秒无新消息回到空闲模式
# 最低 0.5 秒，防止电脑卡顿崩溃
POLL_INTERVAL_IDLE = 2.0            # 空闲模式轮询间隔
POLL_INTERVAL_ACTIVE = 1.0          # 活跃模式轮询间隔
POLL_INTERVAL_HIGH_FREQ = 0.5       # 高频模式轮询间隔（最低限度）
HIGH_FREQ_THRESHOLD = 3             # 5秒内收到 >=3 条消息进入高频模式
HIGH_FREQ_WINDOW_SEC = 5.0          # 高频检测窗口
ACTIVE_COOLDOWN_SEC = 10.0          # 活跃模式冷却时间（无新消息回到空闲）
# 兼容旧代码：POLL_INTERVAL_SEC 仍保留为空闲间隔
POLL_INTERVAL_SEC = POLL_INTERVAL_IDLE
CHAT_SWITCH_TIMEOUT_SEC = 3.0       # ChatWith 切换超时
MSG_DEDUP_WINDOW_SEC = 3            # 3 秒内相同消息去重（符合项目规约）

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
        sys.stderr.write(f"[wxauto_runner] 加载 .env 失败: {e}\n")


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
        sys.stderr.write(f"[wxauto_runner] emit 失败: {e}\n")


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
    "plugin": "wxauto411",
    "listen": [],
    "poll_mode": "idle",         # 当前轮询模式：idle/active/high_freq
    "poll_interval": POLL_INTERVAL_IDLE,  # 当前轮询间隔（秒）
}


def update_state(**kwargs: Any) -> None:
    with _state_lock:
        _state.update(kwargs)
        _state["updated_at"] = int(time.time())
    try:
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(_state, f, ensure_ascii=False, indent=2)
    except Exception as e:
        sys.stderr.write(f"[wxauto_runner] 写状态失败: {e}\n")


def emit_status() -> None:
    with _state_lock:
        snapshot = dict(_state)
    emit({"event": "status", **snapshot, "timestamp": int(time.time())})


# ==================== 监听列表持久化 ====================

_listen_lock = threading.Lock()
_listen_list: List[str] = []


def load_listen_list() -> None:
    """启动时从文件恢复监听列表"""
    global _listen_list
    try:
        if os.path.exists(LISTEN_FILE):
            with open(LISTEN_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    _listen_list = [str(x) for x in data if x]
    except Exception as e:
        sys.stderr.write(f"[wxauto_runner] 加载监听列表失败: {e}\n")


def save_listen_list() -> None:
    try:
        with _listen_lock:
            data = list(_listen_list)
        with open(LISTEN_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        sys.stderr.write(f"[wxauto_runner] 写监听列表失败: {e}\n")


def add_listen(name: str) -> None:
    with _listen_lock:
        if name and name not in _listen_list:
            _listen_list.append(name)
    save_listen_list()


def remove_listen(name: str) -> None:
    with _listen_lock:
        if name in _listen_list:
            _listen_list.remove(name)
    save_listen_list()


def get_listen_snapshot() -> List[str]:
    with _listen_lock:
        return list(_listen_list)


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
            sys.stderr.write(f"[wxauto_runner] 写历史失败: {e}\n")


# ==================== AI 调用 ====================

_last_ai_call_ts = 0.0
_ai_lock = threading.Lock()
# 429 冷却时间戳（触发 429 后所有 AI 请求排队等待到这个时间点）
_ai_429_cooldown_until = 0.0
# 3 秒内相同消息去重（符合项目规约）
_recent_msg_dedup: Dict[str, float] = {}
_dedup_lock = threading.Lock()


def _build_time_info() -> str:
    now = datetime.now()
    weekday = "日一二三四五六"[now.weekday()]
    return f"[当前时间] {now.strftime('%Y/%m/%d %H:%M:%S')}（星期{weekday}），ISO: {now.isoformat(timespec='seconds')}"


def _is_duplicate(content: str) -> bool:
    """3 秒内相同消息去重过滤（增强版：模糊匹配防止 OCR 识别偏差导致重复回复）

    匹配规则：
    1. 完全相同 → 去重
    2. 内容互相包含（A 包含 B 或 B 包含 A）→ 去重
    3. 内容长度差 < 5 且前 20 字相同 → 去重
    """
    now = time.time()
    content_clean = (content or "").strip()
    if not content_clean:
        return True
    with _dedup_lock:
        # 清理过期记录
        expired = [k for k, t in _recent_msg_dedup.items() if now - t > MSG_DEDUP_WINDOW_SEC]
        for k in expired:
            del _recent_msg_dedup[k]
        # 完全匹配
        if content_clean in _recent_msg_dedup:
            return True
        # 模糊匹配：OCR 识别可能把回复部分内容识别成新消息
        for cached in _recent_msg_dedup:
            if not cached:
                continue
            # 包含关系（自己回复的一部分被 OCR 识别为对方消息）
            if content_clean in cached or cached in content_clean:
                # 但要避免误判：只有当长度差较小时才算重复（避免短消息被长消息包含导致误判）
                if abs(len(content_clean) - len(cached)) < 30:
                    return True
            # 前缀匹配（OCR 截断）
            if len(content_clean) > 10 and len(cached) > 10:
                if content_clean[:20] == cached[:20] and abs(len(content_clean) - len(cached)) < 10:
                    return True
        _recent_msg_dedup[content_clean] = now
        return False


def _is_429_error(error_str: str) -> bool:
    """判断是否为 429 限流错误"""
    return "429" in error_str or "Too Many Requests" in error_str


def call_ai(prompt: str) -> Dict[str, Any]:
    """调用 AI，返回 {content, elapsed, error}

    串行化设计（关键修复）：
    - 同一时间只允许一个 AI 请求在执行（AI_SERIAL_LOCK）
    - 触发 429 后所有请求排队等待冷却时间
    - 重试机制：429 错误时按 Retry-After 等待重试

    优先级：
    1. .env 中的 DEEPSEEK_API_KEY/OPENAI_API_KEY（OpenAI 兼容协议）
    2. 本地 AI 模型服务（http://127.0.0.1:27900/api/v1/ai/chat）
    """
    global _last_ai_call_ts, _ai_429_cooldown_until

    # 串行化：等待获取锁（确保同一时间只有一个 AI 请求在执行）
    AI_SERIAL_LOCK.acquire()
    try:
        # 检查是否在 429 冷却期
        now = time.time()
        if _ai_429_cooldown_until > now:
            wait_sec = _ai_429_cooldown_until - now
            sys.stderr.write(f"[wxauto_runner] AI 429 冷却中，等待 {wait_sec:.1f}s\n")
            time.sleep(wait_sec)

        # 相邻调用最小间隔
        elapsed_since_last = time.time() - _last_ai_call_ts
        if elapsed_since_last < AI_CALL_INTERVAL_SEC:
            time.sleep(AI_CALL_INTERVAL_SEC - elapsed_since_last)
        _last_ai_call_ts = time.time()

        start = time.time()
        try:
            import requests  # wxauto4 已依赖
        except ImportError as e:
            return {"content": "", "elapsed": 0, "error": f"requests 未安装: {e}"}

        env_key = os.environ.get("DEEPSEEK_API_KEY") or os.environ.get("OPENAI_API_KEY") or ""

        # ========== 方案1：使用 .env 中的 API Key（OpenAI 兼容协议） ==========
        if env_key:
            base_url = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com").rstrip("/")
            api_key = env_key
            model = os.environ.get("DEEPSEEK_MODEL", "deepseek-v4-pro")

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

            # 429 重试机制
            last_error = ""
            for attempt in range(AI_MAX_RETRIES + 1):
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
                    # 429 错误特殊处理：按 Retry-After 等待
                    if resp.status_code == 429:
                        retry_after = 0
                        try:
                            retry_after = int(resp.headers.get("Retry-After", "0") or "0")
                        except (ValueError, TypeError):
                            retry_after = 0
                        if retry_after <= 0:
                            retry_after = AI_429_COOLDOWN_SEC
                        # 设置全局冷却期，所有后续 AI 请求都等待
                        _ai_429_cooldown_until = time.time() + retry_after
                        last_error = f"429 Client Error: Too Many Requests for url: {resp.url}"
                        sys.stderr.write(
                            f"[wxauto_runner] AI 触发 429 限流，"
                            f"等待 {retry_after:.1f}s 后重试（第 {attempt+1}/{AI_MAX_RETRIES+1} 次）\n"
                        )
                        if attempt < AI_MAX_RETRIES:
                            time.sleep(retry_after)
                            continue
                        return {
                            "content": "",
                            "elapsed": int((time.time() - start) * 1000),
                            "error": last_error,
                        }
                    resp.raise_for_status()
                    data = resp.json()
                    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    # 成功调用，清除 429 冷却
                    _ai_429_cooldown_until = 0.0
                    return {"content": content.strip(), "elapsed": int((time.time() - start) * 1000), "error": ""}
                except requests.exceptions.Timeout:
                    last_error = f"AI 请求超时（{AI_REQUEST_TIMEOUT_SEC}s）"
                    if attempt < AI_MAX_RETRIES:
                        sys.stderr.write(f"[wxauto_runner] AI 超时，重试（第 {attempt+1} 次）\n")
                        time.sleep(AI_RETRY_BASE_DELAY)
                        continue
                    return {"content": "", "elapsed": int((time.time() - start) * 1000), "error": last_error}
                except Exception as e:
                    err_str = str(e)
                    if _is_429_error(err_str):
                        # raise_for_status 抛出的 429
                        if attempt < AI_MAX_RETRIES:
                            sys.stderr.write(f"[wxauto_runner] AI 429 限流，等待重试（第 {attempt+1} 次）\n")
                            _ai_429_cooldown_until = time.time() + AI_429_COOLDOWN_SEC
                            time.sleep(AI_429_COOLDOWN_SEC)
                            continue
                    return {"content": "", "elapsed": int((time.time() - start) * 1000), "error": err_str}
            return {"content": "", "elapsed": int((time.time() - start) * 1000), "error": last_error}

        # ========== 方案2：使用本地 AI 模型服务（http://127.0.0.1:27900） ==========
        # 本地 AI 模型是项目自带的神经网络模型（ai_model 模块），
        # API 格式：POST /api/v1/ai/chat，body: {"message": "...", "session_id": null, "reward": 0.5}
        # 响应格式：{"content": "...", "confidence": 0.9, ...}
        local_ai_url = os.environ.get("LOCAL_AI_URL", "http://127.0.0.1:27900/api/v1/ai/chat")

        try:
            resp = requests.post(
                local_ai_url,
                json={
                    "message": prompt[:8000],
                    "session_id": "wechat_bot",
                    "reward": 0.5,
                },
                headers={"Content-Type": "application/json"},
                timeout=AI_REQUEST_TIMEOUT_SEC,
            )
            resp.raise_for_status()
            data = resp.json()
            content = data.get("content", "") or data.get("response", "") or ""
            if not content:
                # 兼容其他可能的响应格式
                content = str(data.get("message", "") or "")
            return {"content": content.strip(), "elapsed": int((time.time() - start) * 1000), "error": ""}
        except Exception as e:
            return {"content": "", "elapsed": int((time.time() - start) * 1000), "error": f"本地 AI 调用失败: {e}"}
    finally:
        AI_SERIAL_LOCK.release()


# ==================== wxauto411 机器人封装 ====================


class WxautoBot:
    """wxauto411 机器人封装"""

    def __init__(self) -> None:
        self.wx = None
        self.self_wxid: str = ""
        self.self_name: str = ""
        self.running: bool = False
        self._stop_event = threading.Event()
        # 每个监听对象的最后一条消息内容（用于对比新消息）
        # key: chat_name, value: {last_msg_id, last_msg_content}
        self._last_seen: Dict[str, Dict[str, Any]] = {}
        # ==================== 动态轮询状态 ====================
        # 最近收到消息的时间戳列表（用于判断活跃/高频模式）
        self._recent_msg_times: List[float] = []
        # 最后一次收到消息的时间戳
        self._last_msg_received_ts: float = 0.0
        # 当前轮询模式：idle / active / high_freq
        self._poll_mode: str = "idle"
        # 锁保护 _recent_msg_times
        self._poll_lock = threading.Lock()

    def start(self, listen_list: Optional[List[str]] = None) -> bool:
        """启动 wxauto411 实例"""
        # wxauto411 基于 UIAutomation，依赖 COM。每个线程使用 COM 前必须调用 CoInitialize
        try:
            import pythoncom
            pythoncom.CoInitialize()
        except Exception as e:
            sys.stderr.write(f"[wxauto_runner] CoInitialize 失败（可忽略，部分版本无需）: {e}\n")

        try:
            from wxauto411 import WeChat  # 延迟导入，避免插件缺失时崩溃
        except ImportError as e:
            emit_fatal(f"wxauto411 库未安装: {e}")
            return False

        try:
            update_state(status="starting", last_error="")
            # 上报版本
            try:
                import wxauto411
                version = getattr(wxauto411, "__version__", "wxauto411-unknown")
            except Exception:
                version = "wxauto411-unknown"
            emit({"event": "ready", "version": version, "pid": os.getpid()})

            # 初始化微信实例（resize=False 避免抢占用户当前窗口尺寸）
            # 注：resize=False 可能导致 4.x 实时渲染的消息加载不全，
            #     但为减少对用户使用的影响，默认关闭，由用户决定是否调整
            # 重试机制：微信刚启动时可能还在登录界面，主窗口未加载完成，
            # 等待用户扫码登录后重试（最多等待 5 分钟）
            max_init_retries = 60  # 60 次 × 5 秒 = 300 秒 = 5 分钟
            init_retry_delay = 5.0
            last_init_error = ""
            for attempt in range(1, max_init_retries + 1):
                try:
                    self.wx = WeChat(debug=False, resize=False)
                    break  # 初始化成功
                except Exception as e:
                    last_init_error = str(e)
                    # 常见错误：NoneType GroupControl（微信未登录主窗口未加载）
                    #          Find Control Timeout（控件未出现）
                    if "NoneType" in last_init_error or "Find Control Timeout" in last_init_error \
                       or "未找到" in last_init_error or "not found" in last_init_error.lower() \
                       or "未登录" in last_init_error:
                        emit({
                            "event": "waiting_login",
                            "message": f"等待微信登录...（第 {attempt}/{max_init_retries} 次）",
                            "attempt": attempt,
                            "timestamp": int(time.time()),
                        })
                        update_state(
                            status="waiting_login",
                            last_error=f"等待微信登录（第 {attempt}/{max_init_retries} 次）",
                        )
                        time.sleep(init_retry_delay)
                        continue
                    # 其他错误直接抛出
                    raise
            else:
                # 重试用完仍未成功
                emit({"event": "not_logged_in", "message": f"微信登录超时: {last_init_error}"})
                update_state(status="error", last_error=f"微信登录超时: {last_init_error[:200]}")
                return False

            # 检查在线状态
            try:
                if not self.wx.IsOnline():
                    emit({"event": "not_logged_in", "message": "微信未登录"})
                    update_state(status="error", last_error="微信未登录")
                    return False
            except Exception as e:
                sys.stderr.write(f"[wxauto_runner] IsOnline 检查失败: {e}\n")

            # 获取自身信息
            try:
                my_info = self.wx.GetMyInfo()
                if isinstance(my_info, dict):
                    self.self_wxid = my_info.get("wxid") or my_info.get("微信号") or ""
                    self.self_name = my_info.get("nickname") or my_info.get("昵称") or self.self_wxid
            except Exception as e:
                sys.stderr.write(f"[wxauto_runner] GetMyInfo 失败: {e}\n")
                self.self_name = ""

            if not self.self_name:
                self.self_name = "我"

            update_state(
                status="running",
                wxid=self.self_wxid,
                name=self.self_name,
                last_error="",
            )
            emit({"event": "login", "wxid": self.self_wxid, "name": self.self_name})

            # 加载监听列表
            if listen_list:
                for name in listen_list:
                    add_listen(name)
            else:
                load_listen_list()

            current_listen = get_listen_snapshot()
            update_state(listen=current_listen)
            emit({"event": "listen_updated", "listen": current_listen})

            # 启动轮询线程
            self.running = True
            threading.Thread(target=self._poll_loop, daemon=True).start()
            return True

        except Exception as e:
            err_detail = f"{e}\n{traceback.format_exc()}"
            emit_fatal(f"启动 wxauto4 失败: {err_detail}")
            update_state(status="error", last_error=str(e)[:500])
            return False

    def _record_message_received(self) -> None:
        """记录收到一条新消息的时间戳（用于动态轮询模式判断）"""
        now = time.time()
        with self._poll_lock:
            self._recent_msg_times.append(now)
            self._last_msg_received_ts = now
            # 清理窗口外的旧时间戳
            cutoff = now - HIGH_FREQ_WINDOW_SEC
            self._recent_msg_times = [t for t in self._recent_msg_times if t >= cutoff]

    def _get_poll_interval(self) -> float:
        """
        根据最近消息频率动态计算轮询间隔

        策略：
        1. 高频模式：HIGH_FREQ_WINDOW_SEC（5秒）内收到 >= HIGH_FREQ_THRESHOLD（3）条消息
           → 返回 POLL_INTERVAL_HIGH_FREQ（0.5秒）
        2. 活跃模式：ACTIVE_COOLDOWN_SEC（10秒）内收到过消息
           → 返回 POLL_INTERVAL_ACTIVE（1秒）
        3. 空闲模式：超过 ACTIVE_COOLDOWN_SEC 未收到消息
           → 返回 POLL_INTERVAL_IDLE（2秒）
        """
        now = time.time()
        with self._poll_lock:
            # 清理窗口外的旧时间戳
            cutoff = now - HIGH_FREQ_WINDOW_SEC
            self._recent_msg_times = [t for t in self._recent_msg_times if t >= cutoff]
            recent_count = len(self._recent_msg_times)
            last_msg_ts = self._last_msg_received_ts

        # 判断模式
        if recent_count >= HIGH_FREQ_THRESHOLD:
            new_mode = "high_freq"
            interval = POLL_INTERVAL_HIGH_FREQ
        elif last_msg_ts > 0 and (now - last_msg_ts) < ACTIVE_COOLDOWN_SEC:
            new_mode = "active"
            interval = POLL_INTERVAL_ACTIVE
        else:
            new_mode = "idle"
            interval = POLL_INTERVAL_IDLE

        # 模式变化时记录日志
        if new_mode != self._poll_mode:
            old_mode = self._poll_mode
            self._poll_mode = new_mode
            sys.stderr.write(
                f"[wxauto_runner] 轮询模式切换: {old_mode} → {new_mode} "
                f"(间隔={interval}s, 最近{HIGH_FREQ_WINDOW_SEC}s消息数={recent_count})\n"
            )
            # 上报状态变化
            update_state(poll_mode=new_mode, poll_interval=interval)

        return interval

    def _poll_loop(self) -> None:
        """监听轮询主循环（动态间隔）"""
        # 子线程使用 wxauto4（UIAutomation）前必须独立初始化 COM
        try:
            import pythoncom
            pythoncom.CoInitialize()
        except Exception as e:
            sys.stderr.write(f"[wxauto_runner] 轮询线程 CoInitialize 失败: {e}\n")
        sys.stderr.write("[wxauto_runner] 轮询线程已启动（动态间隔模式）\n")

        last_poll_time = 0.0
        while self.running and not self._stop_event.is_set():
            try:
                now = time.time()
                # 动态获取当前轮询间隔
                current_interval = self._get_poll_interval()

                if now - last_poll_time < current_interval:
                    # 短休眠，便于快速响应停止信号和模式切换
                    time.sleep(0.1)
                    continue
                last_poll_time = now

                listen = get_listen_snapshot()
                if not listen:
                    # 没有监听对象，仅等待
                    continue

                # 遍历每个监听对象
                for chat_name in listen:
                    if self._stop_event.is_set():
                        break
                    try:
                        self._check_chat_for_new_messages(chat_name)
                    except Exception as e:
                        emit_error(f"检查 {chat_name} 新消息失败: {e}")
                        # 单次失败不影响其他对象
                        time.sleep(0.3)

            except Exception as e:
                emit_error(f"轮询异常: {e}")
                time.sleep(1)

        sys.stderr.write("[wxauto_runner] 轮询线程已退出\n")

    def _wait_for_messages_render(self, min_wait: float = 1.5, max_wait: float = 2.5, interval: float = 0.3) -> bool:
        """等待微信 4.x 消息区域渲染完成

        根本原因修复：ChatWith 切换聊天后，消息区域需要 1-3 秒渲染。

        关键发现：智能等待的"截图稳定"检测不可靠！
        - 空白区域也会"稳定"（连续 2 次截图相同），导致提前退出
        - 微信 4.x 渲染过程中截图会闪烁，哈希不稳定
        - 实测：等待 0.83 秒（稳定退出）→ GetAllMessage 返回 0 条
        - 实测：等待 1.98 秒（超时退出）→ GetAllMessage 返回 7 条

        修复策略：最小等待时间 + 最大等待时间
        - 至少等 min_wait 秒（1.5 秒），保证渲染基本完成
        - min_wait 后如果截图稳定（连续 2 次相同），立即退出
        - min_wait 后如果截图还在变化，继续等到 max_wait 秒
        - 截图失败 → 固定等待 min_wait 秒

        Args:
            min_wait: 最小等待秒数（保证渲染时间）
            max_wait: 最大等待秒数（兜底）
            interval: 检测间隔（秒）

        Returns:
            bool: True 表示渲染稳定，False 表示超时
        """
        if not self.wx or not getattr(self.wx, 'main_window', None):
            time.sleep(min_wait)
            return False

        try:
            # 获取消息区域
            region = self.wx._get_chat_message_region()
            if not region:
                time.sleep(min_wait)
                return False

            # 导入截图函数
            try:
                from wxauto411.ocr import capture_screen_region
            except Exception:
                try:
                    import sys as _sys
                    _sys.path.insert(0, os.path.dirname(SCRIPT_DIR))
                    from wxauto411.ocr import capture_screen_region
                except Exception:
                    time.sleep(min_wait)
                    return False

            import hashlib
            last_hash = ""
            stable_count = 0
            start_ts = time.time()
            tmp_imgs = []

            while time.time() - start_ts < max_wait:
                img_path = capture_screen_region(region)
                if not img_path:
                    time.sleep(interval)
                    continue

                tmp_imgs.append(img_path)
                try:
                    with open(img_path, 'rb') as f:
                        cur_hash = hashlib.md5(f.read()).hexdigest()
                except Exception:
                    time.sleep(interval)
                    continue

                elapsed = time.time() - start_ts

                if cur_hash != last_hash:
                    # 截图还在变化，渲染进行中
                    last_hash = cur_hash
                    stable_count = 0
                else:
                    stable_count += 1
                    # 只有等够 min_wait 秒后，才检查是否稳定
                    # 避免空白区域"假稳定"导致提前退出
                    if elapsed >= min_wait and stable_count >= 2:
                        for p in tmp_imgs:
                            try:
                                if os.path.exists(p):
                                    os.remove(p)
                            except Exception:
                                pass
                        return True

                time.sleep(interval)

            # 清理临时图片
            for p in tmp_imgs:
                try:
                    if os.path.exists(p):
                        os.remove(p)
                except Exception:
                    pass
            return False
        except Exception as e:
            sys.stderr.write(f"[wxauto_runner] 等待渲染异常: {e}，退化为固定等待\n")
            time.sleep(min_wait)
            return False

    def _check_chat_for_new_messages(self, chat_name: str) -> None:
        """切换到指定聊天窗口并检查新消息

        优化点：
        1. ChatWith 缓存：如果 current_chat 已是目标聊天，跳过 OCR 切换（节省 2-3 秒）
        2. 只在收到新消息时记录时间戳（避免自我回复触发高频模式）
        3. 跳过自己发的消息（避免自我回复循环）
        """
        if not self.wx:
            return

        try:
            # 优化1：ChatWith 缓存 - 如果当前已在目标聊天窗口，跳过 OCR 切换
            # 这样可以节省 2-3 秒的 OCR 时间，大幅提升响应速度
            need_switch = True
            if hasattr(self.wx, 'current_chat') and self.wx.current_chat == chat_name:
                # 已在目标聊天窗口，不需要重新 OCR 切换
                need_switch = False
                # 但需要确保微信窗口在前台（用户可能切走了）
                try:
                    import win32gui
                    hwnd = self.wx.main_window.NativeWindowHandle if self.wx.main_window else 0
                    if hwnd:
                        if not win32gui.IsWindowVisible(hwnd) or win32gui.IsIconic(hwnd):
                            import win32con
                            win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
                            time.sleep(0.2)
                        try:
                            win32gui.SetForegroundWindow(hwnd)
                        except Exception:
                            pass
                        time.sleep(0.1)
                except Exception:
                    pass

            if need_switch:
                # 切换到目标聊天（必须检查返回值，失败时不能继续 GetAllMessage）
                if not self.wx.ChatWith(chat_name, exact=True):
                    # ChatWith 返回 False：截图失败/OCR 未识别/点击失败
                    # 此时聊天窗口可能停在搜索框或错误的会话上，不能继续读取消息
                    sys.stderr.write(f"[wxauto_runner] ChatWith({chat_name}) 失败，跳过本次轮询\n")
                    return
        except Exception as e:
            err_msg = str(e)
            if "未找到" in err_msg or "找不到" in err_msg:
                # 聊天对象不存在，跳过但不报错
                return
            raise

        # ==================== 等待消息渲染 ====================
        # 根本原因修复：微信 4.x ChatWith 切换聊天后，消息区域需要 1-3 秒渲染
        # 之前固定 sleep(0.1) 太短，截图时消息还未渲染完成，OCR 得到空白区域
        #
        # 修复策略（最小+最大等待时间）：
        # - 切换聊天后（need_switch=True）：至少等 1.5 秒，最多 2.5 秒
        #   1.5 秒后如果截图稳定就退出，否则等到 2.5 秒
        # - 未切换聊天（need_switch=False）：保持 0.1 秒（已在当前聊天）
        if need_switch:
            self._wait_for_messages_render(min_wait=1.5, max_wait=2.5, interval=0.3)
        else:
            time.sleep(0.1)

        try:
            msgs = self.wx.GetAllMessage()
        except Exception as e:
            emit_error(f"获取 {chat_name} 消息失败: {e}")
            return

        # ==================== 空消息重试机制 ====================
        # 微信 4.x 渲染可能偶发延迟，第一次 GetAllMessage 返回空时不一定真没消息
        # 如果是切换聊天后的首次读取，再等 0.6 秒重试一次
        if not msgs and need_switch:
            time.sleep(0.6)
            try:
                msgs = self.wx.GetAllMessage()
            except Exception as e:
                emit_error(f"获取 {chat_name} 消息失败（重试）: {e}")
                return

        if not msgs:
            return

        # 找出上次已处理的消息位置
        last_seen = self._last_seen.get(chat_name, {})
        last_id = last_seen.get("last_msg_id", "")
        is_first_run = not last_id  # 首次运行（重启后 _last_seen 为空）

        # 遍历消息，找出 last_id 之后的新消息
        new_messages = []
        found_last = False
        for msg in msgs:
            # 用 type+content+sender 作为简单 ID
            try:
                msg_id = self._get_msg_id(msg)
            except Exception:
                continue

            if last_id and not found_last:
                if msg_id == last_id:
                    found_last = True
                continue

            # 跳过自己发的消息（关键：避免自我回复循环）
            if self._is_self_message(msg):
                continue

            # 只处理文本消息
            if not self._is_text_message(msg):
                continue

            new_messages.append((msg_id, msg))

        # ==================== 首次运行保护 ====================
        # 插件重启后 _last_seen 为空，会把所有旧消息当作新消息处理
        # 这会导致回复所有历史消息，浪费 API 调用并让用户困惑
        # 修复：首次运行只处理最后一条消息（标记为已读，不回复）
        if is_first_run and len(new_messages) > 1:
            sys.stderr.write(
                f"[wxauto_runner] 首次运行检测到 {len(new_messages)} 条历史消息，"
                f"只标记不回复，避免批量回复旧消息\n"
            )
            # 只保留最后一条消息用于"已读"标记，但不触发 AI 回复
            # 实际上直接清空 new_messages，只更新 last_msg_id
            new_messages = []

        # 更新 last_msg_id 为当前最后一条
        if msgs:
            try:
                self._last_seen[chat_name] = {
                    "last_msg_id": self._get_msg_id(msgs[-1]),
                    "last_msg_content": getattr(msgs[-1], "content", "")[:200],
                }
            except Exception:
                pass

        # 处理新消息
        for msg_id, msg in new_messages:
            try:
                # 记录收到消息的时间戳（用于动态轮询模式判断）
                self._record_message_received()
                self._handle_incoming_message(chat_name, msg_id, msg)
            except Exception as e:
                emit_error(f"处理消息异常: {e}")

    def _get_msg_id(self, msg: Any) -> str:
        """生成消息唯一 ID"""
        try:
            msg_type = getattr(msg, "type", "unknown")
            content = getattr(msg, "content", "")
            sender = getattr(msg, "sender", "") or ""
            return f"{msg_type}|{sender}|{content[:50]}"
        except Exception:
            return str(id(msg))

    def _is_self_message(self, msg: Any) -> bool:
        """判断是否为自己发的消息"""
        # wxauto411 的 Message 类提供 is_self() 方法
        try:
            if hasattr(msg, "is_self"):
                return bool(msg.is_self())
        except Exception:
            pass
        # 兜底：通过 type 属性判断
        return getattr(msg, "type", "") == "self"

    def _is_text_message(self, msg: Any) -> bool:
        """判断是否为文本消息"""
        # wxauto411 的 Message 类提供 is_text() 方法
        try:
            if hasattr(msg, "is_text"):
                return bool(msg.is_text())
        except Exception:
            pass
        # 兜底：通过 type 属性判断
        msg_type = getattr(msg, "type", "")
        return msg_type in ("user", "self", "text", "friend_text", "self_text")

    def _handle_incoming_message(self, chat_name: str, msg_id: str, msg: Any) -> None:
        """处理收到的消息：上报 + 异步调用 AI 回复

        优化点：
        1. AI 调用改为异步线程，不阻塞轮询线程（云端 API 30秒超时不影响后续轮询）
        2. 机器人回复记忆：发送回复后把内容加入去重表，避免下一轮 OCR 捕获后自我回复
        """
        try:
            content = getattr(msg, "content", "") or ""
            sender = getattr(msg, "sender", "") or chat_name

            # 空消息跳过
            if not content.strip():
                return

            # 3 秒内相同消息去重
            if _is_duplicate(content):
                return

            # 上报消息事件
            emit({
                "event": "msg",
                "type": "text",
                "sender": sender,
                "from_name": sender,
                "chat_name": chat_name,
                "content": content,
                "msg_id": msg_id,
                "timestamp": int(time.time()),
            })

            # 持久化接收记录
            append_history({
                "dir": "incoming",
                "msgId": msg_id,
                "fromId": sender,
                "fromName": sender,
                "chatName": chat_name,
                "text": content,
                "timestamp": int(time.time()),
            })
            update_state(
                last_message=content[:200],
                incoming_count=_state.get("incoming_count", 0) + 1,
            )

            # 异步调用 AI 回复（不阻塞轮询线程）
            # 关键：云端 API 可能 10-30 秒响应，同步调用会卡死整个轮询
            reply_thread = threading.Thread(
                target=self._handle_ai_reply,
                args=(chat_name, content, msg_id),
                daemon=True,
            )
            reply_thread.start()

        except Exception as e:
            emit_error(f"处理消息异常: {e}")

    def _handle_ai_reply(self, chat_name: str, content: str, msg_id: str) -> None:
        """调用 AI 并回复消息（在独立线程中运行）

        关键修复：
        1. 发送回复后把内容加入 _recent_msg_dedup 去重表
           → 下一轮 OCR 把自己的回复识别成 self 类型时会被 _is_self_message 过滤
           → 但如果 OCR 误判成 user 类型，去重表作为第二道防线阻止自我回复
        2. ChatWith 使用缓存机制（已在 _check_chat_for_new_messages 优化）
        """
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
                    "toName": chat_name,
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

            # 发送回复（确保当前聊天窗口是 chat_name）
            try:
                # 使用缓存机制：如果已在目标聊天就不切换
                need_switch = not (hasattr(self.wx, 'current_chat') and self.wx.current_chat == chat_name)
                if need_switch:
                    if not self.wx.ChatWith(chat_name, exact=True):
                        ok = False
                        error = f"ChatWith({chat_name}) 失败，无法发送回复"
                        sys.stderr.write(f"[wxauto_runner] {error}\n")
                    else:
                        time.sleep(0.1)
                        ok = bool(self.wx.SendMsg(reply))
                        error = ""
                else:
                    # 已在目标聊天，直接发送
                    ok = bool(self.wx.SendMsg(reply))
                    error = ""
            except Exception as e:
                ok = False
                error = f"SendMsg 异常: {e}"

            # 关键：把回复内容加入去重表（防止自我回复循环）
            # 下一轮 OCR 可能把自己的回复识别成"新消息"，去重表作为第二道防线
            if ok and reply:
                with _dedup_lock:
                    _recent_msg_dedup[reply] = time.time()
                # 更新 last_seen，让自己的回复也被标记为"已处理"
                # 这样下一轮 OCR 即使识别到自己的回复，也会被 last_id 机制跳过
                try:
                    reply_msg_id = f"self|{self.self_name or '我'}|{reply[:50]}"
                    self._last_seen[chat_name] = {
                        "last_msg_id": reply_msg_id,
                        "last_msg_content": reply[:200],
                    }
                except Exception:
                    pass

            emit({
                "event": "sent",
                "to": chat_name,
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
                "toName": chat_name,
                "text": reply,
                "timestamp": int(time.time()),
                "elapsed": elapsed,
                "error": "" if ok else (error or "send failed"),
            })
            update_state(
                last_reply=reply[:200],
                outgoing_count=_state.get("outgoing_count", 0) + 1,
                last_error="" if ok else (error or "send failed")[:200],
            )

        except Exception as e:
            emit_error(f"AI 回复异常: {e}")
            update_state(last_error=str(e)[:200])

    def send_text(self, to: str, text: str) -> Dict[str, Any]:
        """主动发消息"""
        if not self.wx:
            return {"ok": False, "error": "wxauto411 未启动"}
        try:
            # 必须检查 ChatWith 返回值：失败时不能 SendMsg，否则会发到错误的聊天
            if not self.wx.ChatWith(to, exact=True):
                return {"ok": False, "error": f"ChatWith({to}) 失败，无法发送消息"}
            time.sleep(0.2)
            # wxauto411 的 SendMsg 返回 bool
            ok = bool(self.wx.SendMsg(text))
            append_history({
                "dir": "outgoing",
                "msgId": f"manual_{int(time.time()*1000)}",
                "fromId": self.self_wxid,
                "fromName": self.self_name,
                "toName": to,
                "text": text,
                "timestamp": int(time.time()),
                "error": "" if ok else "send failed",
            })
            update_state(
                last_reply=text[:200],
                outgoing_count=_state.get("outgoing_count", 0) + 1,
            )
            return {"ok": ok, "error": "" if ok else "send failed"}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def stop(self) -> None:
        """停止机器人"""
        sys.stderr.write("[wxauto_runner] 正在停止...\n")
        self._stop_event.set()
        self.running = False
        update_state(status="stopped")


# ==================== 命令处理 ====================

bot = WxautoBot()


def handle_command(cmd: Dict[str, Any]) -> None:
    action = cmd.get("cmd", "").lower()
    if action == "start":
        listen = cmd.get("listen")
        if bot.wx is None:
            threading.Thread(target=bot.start, args=(listen,), daemon=True).start()
        else:
            # 已启动，更新监听列表
            if isinstance(listen, list):
                for name in listen:
                    add_listen(name)
                current = get_listen_snapshot()
                update_state(listen=current)
                emit({"event": "listen_updated", "listen": current})
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
    elif action == "add_listen":
        name = cmd.get("name", "")
        if name:
            add_listen(name)
            current = get_listen_snapshot()
            update_state(listen=current)
            emit({"event": "listen_updated", "listen": current})
        else:
            emit_error("add_listen 缺少 name")
    elif action == "remove_listen":
        name = cmd.get("name", "")
        if name:
            remove_listen(name)
            current = get_listen_snapshot()
            update_state(listen=current)
            emit({"event": "listen_updated", "listen": current})
        else:
            emit_error("remove_listen 缺少 name")
    elif action == "get_listen":
        current = get_listen_snapshot()
        emit({"event": "listen_list", "listen": current, "timestamp": int(time.time())})
    elif action == "set_api_key":
        # 动态下发 API Key（无需重启子进程）
        api_key = cmd.get("api_key", "")
        base_url = cmd.get("base_url", "")
        model = cmd.get("model", "")
        if api_key:
            os.environ["DEEPSEEK_API_KEY"] = api_key
            if base_url:
                os.environ["DEEPSEEK_BASE_URL"] = base_url
            if model:
                os.environ["DEEPSEEK_MODEL"] = model
            emit({"event": "api_key_updated", "ok": True, "timestamp": int(time.time())})
        else:
            emit_error("set_api_key 缺少 api_key")
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
        sys.stderr.write(f"[wxauto_runner] stdin 循环退出: {e}\n")
        emit_fatal(f"stdin 循环异常: {e}")
        os._exit(1)


# ==================== 主入口 ====================


def main() -> None:
    # 强制 stdin/stdout/stderr 使用 UTF-8
    # 重要：Node.js spawn 子进程时设置 PYTHONIOENCODING=utf-8，
    # 但 sys.stdin 的编码仍可能是 cp936（GBK），导致从 Node.js 传入的
    # UTF-8 中文被错误解码为 ???（U+FFFD 替换字符），必须显式 reconfigure。
    try:
        sys.stdin.reconfigure(encoding="utf-8")   # type: ignore[attr-defined]
        sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
        sys.stderr.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
    except Exception:
        pass

    update_state(status="idle", pid=os.getpid(), started_at=int(time.time()), plugin="wxauto411")
    # 上报就绪（尚未初始化 wxauto411，等待 start 命令）
    try:
        import wxauto411
        version = getattr(wxauto411, "__version__", "wxauto411-unknown")
    except Exception:
        version = "wxauto411-unknown"
    emit({"event": "ready", "version": version, "pid": os.getpid()})

    # 启动 stdin 监听线程
    threading.Thread(target=stdin_loop, daemon=True).start()

    # 主线程阻塞等待
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        bot.stop()
        os._exit(0)


if __name__ == "__main__":
    main()
