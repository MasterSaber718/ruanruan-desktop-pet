# -*- coding: utf-8 -*-
"""
阮琳云AI - 本地 TTS 语音合成服务器（edge-tts 神经女声）
========================================================
基于微软 edge-tts（Edge 在线神经语音，免费、无需 API Key，需联网），
默认使用「晓晓 zh-CN-XiaoxiaoNeural」—— 自然、清晰、接近真人的中文女声。

接口设计（与前端 TTSService.ts 的本地 TTS 调用约定完全兼容）：
  GET /health                  -> 200 OK（本地服务瞬时响应，供前端快速探测）
  GET /tts?text=你好&speed=1.05 -> 音频字节流（audio/mpeg, MP3）
      可选参数：
        voice : edge-tts 音色名（默认 zh-CN-XiaoxiaoNeural 晓晓）
        speed : 语速倍率 0.5~2.0（默认 1.0，映射为 edge-tts rate）
        pitch : 音调偏移，如 +5Hz / -2Hz（默认 +5Hz，女声更明亮柔和）
  GET /voices                  -> JSON 音色列表（调试用）

启动：
  C:\\Users\\Administrator\\AppData\\Local\\Programs\\Python\\Python312\\python.exe scripts\\tts_server.py
  （依赖：pip install edge-tts）

说明：
  - 引擎：edge-tts（微软 Edge 神经语音，音质远好于 pyttsx3 等本地引擎）
  - 音色：晓晓 XiaoxiaoNeural（公认最自然的中文女声之一）
   其他可选：晓伊 zh-CN-XiaoyiNeural；云希 zh-CN-YunxiNeural 是男声，勿用于女声需求
  - 合成失败时返回 500，前端自动回退到浏览器 SpeechSynthesis，不影响可用性
"""
import asyncio
import json
import re
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

try:
    import edge_tts
    EDGE_AVAILABLE = True
except ImportError:
    EDGE_AVAILABLE = False

HOST = "127.0.0.1"
PORT = 9881  # [v61e] 原 9880 被 GPT-SoVITS(api_v2.py) 占用，改为 9881 避开冲突  # 与前端 TTSService.ts 的本地 TTS 地址一致

# ============ 音色与音质参数（想换声音只改这里） ============
DEFAULT_VOICE = "zh-CN-XiaoxiaoNeural"   # 晓晓：自然清晰中文女声
DEFAULT_RATE = "+8%"                      # 语速微调（比默认稍快一点，更明快亲切）
DEFAULT_PITCH = "+5Hz"                    # 音调微调（略提升音高，女声更明亮柔和）
MAX_TEXT_LEN = 2000                       # 单次合成文本长度上限（字符）
# ========================================================


def build_rate(speed):
    """speed(1.0 为基准的倍率) -> edge-tts rate 字符串"""
    try:
        s = float(speed)
    except (TypeError, ValueError):
        s = 1.0
    s = max(0.5, min(2.0, s))
    # edge-tts rate 合法范围约 -50% ~ +100%
    pct = max(-50.0, min(100.0, (s - 1.0) * 100.0))
    return f"{pct:+.0f}%"


class TTSHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        pass  # 静默访问日志，避免刷屏

    def _send_json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        # [2026-08-30 修复] 5175 页面 fetch /health 被浏览器 CORS 拦截（服务本身 200 正常）
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_audio(self, audio):
        self.send_response(200)
        # [2026-08-30 修复] 音频响应统一放开 CORS
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Type", "audio/mpeg")
        self.send_header("Content-Length", str(len(audio)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(audio)

    def do_GET(self):
        if not EDGE_AVAILABLE:
            self._send_json(500, {"error": "edge-tts 未安装，请先运行: pip install edge-tts"})
            return

        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path == "/health":
            self._send_json(200, {"ok": True, "engine": "edge-tts", "voice": DEFAULT_VOICE})
            return

        if path == "/voices":
            try:
                voices = asyncio.run(edge_tts.list_voices())
                zh = [v for v in voices if v.get("Locale", "").startswith("zh")]
                self._send_json(200, {"voices": zh})
            except Exception as e:  # noqa: BLE001
                self._send_json(500, {"error": str(e)})
            return

        if path == "/tts":
            text = (query.get("text") or [""])[0]
            if not text.strip():
                self._send_json(400, {"error": "缺少 text 参数"})
                return
            text = text[:MAX_TEXT_LEN]
            voice = (query.get("voice") or [DEFAULT_VOICE])[0]
            speed = (query.get("speed") or ["1.0"])[0]
            pitch = (query.get("pitch") or [DEFAULT_PITCH])[0]
            # 校验 pitch 格式（如 +5Hz / -10%），非法值回退默认，避免 edge-tts 合成报错
            if not re.match(r"^[+-]?\d+(\.\d+)?(Hz|%)$", pitch, re.IGNORECASE):
                pitch = DEFAULT_PITCH
            rate = build_rate(speed)
            try:
                audio = asyncio.run(self._synthesize(text, voice, rate, pitch))
                if not audio:
                    self._send_json(502, {"error": "合成失败（可能未联网或微软服务不可用）"})
                    return
                self._send_audio(audio)
            except Exception as e:  # noqa: BLE001
                self._send_json(500, {"error": str(e)})
            return

        self._send_json(404, {"error": f"未知路径: {path}"})

    @staticmethod
    async def _synthesize(text, voice, rate, pitch):
        communicate = edge_tts.Communicate(text, voice=voice, rate=rate, pitch=pitch)
        chunks = []
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                chunks.append(chunk["data"])
        if not chunks:
            return None
        return b"".join(chunks)


def main():
    print("=" * 56)
    print("阮琳云AI - 本地 TTS 语音合成服务器 (edge-tts)")
    print(f"  音色: {DEFAULT_VOICE} (晓晓 自然中文女声)")
    if not EDGE_AVAILABLE:
        print("  [警告] 未安装 edge-tts，请先运行: pip install edge-tts")
    print(f"  地址: http://{HOST}:{PORT}/tts?text=你好")
    print("=" * 56)
    try:
        server = ThreadingHTTPServer((HOST, PORT), TTSHandler)
    except OSError as e:
        print(f"[错误] 端口 {PORT} 被占用或绑定失败: {e}")
        return
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
