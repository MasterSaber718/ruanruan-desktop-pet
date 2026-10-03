"""
Windows.Media.Ocr 封装 - 用于从截图提取文字

微信 4.1.11.55 的 ChatTextItemView 不通过 UIAutomation 暴露消息文本，
需要通过截图 + OCR 的方式提取。

使用方法：
    from .ocr import extract_text_from_control
    text = extract_text_from_control(control)
"""

import os
import re
import sys
import subprocess
import tempfile
import logging
from typing import Optional

logger = logging.getLogger(__name__)


# 中文字符范围（包括汉字、中文标点、全角符号）
_CJK_PATTERN = r'\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff'
# 中文标点（全角符号）
_CJK_PUNCT_PATTERN = r'\u3000-\u303f\uff00-\uffef'
# 合并的中文字符范围
_CN_CHARS = _CJK_PATTERN + _CJK_PUNCT_PATTERN


def _clean_ocr_text(text: str) -> str:
    """
    清理 OCR 结果中的多余空格和侧边栏干扰文字

    Windows.Media.Ocr 对中文识别时会在每个字之间插入空格，
    同时微信 4.1.11.55 的 ChatTextItemView 截图可能捕获到会话列表的辅助文字，
    需要按以下规则清理：
    1. 过滤侧边栏干扰文字（包含 aid=、session list、session_item、ChatSessionCell 等）
    2. 去除中文字符之间的空格（"微 信 机 器 人" → "微信机器人"）
    3. 去除中文标点与中文字符之间的空格
    4. 去除中文与中文标点之间的空格
    5. 保留英文单词之间的空格（"hello world" 保持不变）
    6. 去除中文与英文/数字之间多余的空格

    Args:
        text: OCR 原始文本

    Returns:
        str: 清理后的文本
    """
    if not text:
        return ""

    # 第0步：过滤侧边栏干扰文字
    # 微信 4.1.11.55 的 ChatTextItemView 截图可能包含会话列表的辅助文字
    # 这些文字通常包含 aid=、session list、session_item、ChatSessionCell 等关键字
    sidebar_patterns = [
        r"aid\s*=\s*['\"]?session[\s_]*list['\"]?",
        r"aid\s*=\s*['\"]?session[\s_]*item",
        r"ChatSessionCell",
        r"ChatSessionList",
        r"ChatDetailView",
        r"ChatMessagePage",
        r"ChatInputView",
        r"MessageView",
        r"XTableView",
        r"XSearchField",
        r"XValidatorTextEdit",
        r"MainTabBar",
        r"MainWindow",
        r"LoginWindow",
        r"session_item_\w+",
    ]
    sidebar_regex = re.compile('|'.join(sidebar_patterns), re.IGNORECASE)

    # 按行过滤：如果一行包含侧边栏关键字，整行去除
    lines = text.splitlines()
    filtered_lines = []
    for line in lines:
        if sidebar_regex.search(line):
            logger.debug(f"过滤侧边栏文字: {repr(line)}")
            continue
        filtered_lines.append(line)
    text = "\n".join(filtered_lines)

    # 第1步：去除中文字符之间的空格（包括中文标点）
    # 匹配：中文字符 + 空格 + 中文字符
    pattern_cn_cn = re.compile(rf'([{_CN_CHARS}])\s+([{_CN_CHARS}])')
    while True:
        new_text = pattern_cn_cn.sub(r'\1\2', text)
        if new_text == text:
            break
        text = new_text

    # 第2步：去除中文标点前的空格（"你好 ，世界" → "你好，世界"）
    pattern_space_punct = re.compile(rf'\s+([{_CJK_PUNCT_PATTERN}])')
    text = pattern_space_punct.sub(r'\1', text)

    # 第3步：去除中文标点后的空格（"你好， 世界" → "你好，世界"）
    pattern_punct_space = re.compile(rf'([{_CJK_PUNCT_PATTERN}])\s+')
    text = pattern_punct_space.sub(r'\1', text)

    # 第4步：处理中文与英文/数字之间的空格
    pattern_en_cn = re.compile(rf'([a-zA-Z0-9])\s+([{_CN_CHARS}])')
    text = pattern_en_cn.sub(r'\1\2', text)
    pattern_cn_en = re.compile(rf'([{_CN_CHARS}])\s+([a-zA-Z0-9])')
    text = pattern_cn_en.sub(r'\1\2', text)

    # 第5步：合并多余的连续空格为单个空格
    text = re.sub(r'[ \t]{2,}', ' ', text)

    # 第6步：去除每行首尾空格
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    return "\n".join(lines)


def _capture_control_bitmap(control, save_path: str) -> bool:
    """
    将控件截图保存为 PNG 文件

    优先使用 PIL.ImageGrab 按控件的 BoundingRectangle 精确截图屏幕区域，
    避免 ToBitmap 可能截取到窗口其他区域（如侧边栏）的问题。

    如果 PIL 不可用或 BoundingRectangle 无效，降级使用 ToBitmap。

    Args:
        control: uiautomation.Control 对象
        save_path: 截图保存路径

    Returns:
        bool: 是否成功保存截图
    """
    # 方案1（优先）：使用 PIL.ImageGrab 按屏幕坐标精确截图
    try:
        from PIL import ImageGrab, Image
        rect = control.BoundingRectangle
        if rect:
            left, top = rect.left, rect.top
            right, bottom = rect.right, rect.bottom
            width = right - left
            height = bottom - top
            if width > 0 and height > 0:
                # ImageGrab.grab 接受物理屏幕坐标（bbox=(left, top, right, bottom)）
                # 注意：在 DPI 缩放环境下，uiautomation 返回的是物理像素坐标
                bbox = (left, top, right, bottom)
                img = ImageGrab.grab(bbox=bbox, include_layered_windows=False, all_screens=True)
                img.save(save_path)
                logger.debug(f"ImageGrab 截图成功: bbox={bbox} size={img.size}")
                return True
    except Exception as e:
        logger.debug(f"ImageGrab 截图失败，降级到 ToBitmap: {e}")

    # 方案2（降级）：使用 uiautomation 的 ToBitmap
    try:
        bitmap = control.ToBitmap()
        if bitmap is None:
            logger.debug("ToBitmap 返回 None")
            return False
        bitmap.ToFile(save_path)
        return True
    except Exception as e:
        logger.debug(f"ToBitmap 失败: {e}")
        return False


def _ocr_image_via_powershell(image_path: str) -> str:
    """通过 PowerShell 调用 Windows.Media.Ocr 识别图片中的文字"""
    # 使用单引号包裹路径，避免转义问题
    # 重要：必须在脚本开头设置 OutputEncoding 为 UTF8，否则 PowerShell 默认用
    # 系统编码（cp936/GBK）输出中文，Python 端用 utf-8 解码会报
    # UnicodeDecodeError: 'utf-8' codec can't decode byte 0xce
    ps_script = r'''
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | ? { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await($WinRtTask, $ResultType) {
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtTask))
    $netTask.Wait(-1) | Out-Null
    $netTask.Result
}
[Windows.Media.Ocr.OcrEngine, Windows.Media.Ocr, ContentType=WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType=WindowsRuntime] | Out-Null
[Windows.Storage.StorageFile, Windows.Storage, ContentType=WindowsRuntime] | Out-Null
$path = 'IMAGE_PATH_HERE'
$file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($path)) ([Windows.Storage.StorageFile])
$stream = Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
$decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
$bitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
if ($engine -eq $null) {
    Write-Output ''
    exit
}
$result = Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
Write-Output $result.Text
'''.replace('IMAGE_PATH_HERE', image_path.replace("'", "''"))

    try:
        # 关键：添加 errors='replace' 防止 PowerShell 输出非 UTF-8 字节时
        # _readerthread 崩溃导致整个 subprocess.run 返回空结果
        # （PowerShell 即使设置了 [Console]::OutputEncoding = UTF8，
        # 在某些 Windows 版本上仍可能输出 BOM 或其他非 UTF-8 字节）
        result = subprocess.run(
            ['powershell', '-NoProfile', '-NonInteractive', '-Command', ps_script],
            capture_output=True, text=True, timeout=15,
            encoding='utf-8', errors='replace'
        )
        if result.returncode != 0:
            logger.debug(f"PowerShell OCR 错误: {(result.stderr or '')[:200]}")
            return ""
        return (result.stdout or "").strip()
    except subprocess.TimeoutExpired:
        logger.debug("PowerShell OCR 超时")
        return ""
    except Exception as e:
        logger.debug(f"PowerShell OCR 异常: {e}")
        return ""


def _upscale_image(image_path: str, scale: float = 2.0) -> bool:
    """
    放大图片以提高 OCR 识别率

    Windows.Media.Ocr 对小字体识别率不高，放大 2 倍可以显著改善效果。

    Args:
        image_path: 图片路径（原地覆盖）
        scale: 放大倍数（默认 2.0）

    Returns:
        bool: 是否成功放大
    """
    try:
        from PIL import Image
        with Image.open(image_path) as img:
            new_w = int(img.width * scale)
            new_h = int(img.height * scale)
            # 使用 LANCZOS 重采样（高质量）
            upscaled = img.resize((new_w, new_h), Image.LANCZOS)
            upscaled.save(image_path)
            logger.debug(f"图片放大: {img.size} → ({new_w}, {new_h})")
            return True
    except Exception as e:
        logger.debug(f"图片放大失败: {e}")
        return False


def extract_text_from_control(control) -> str:
    """
    从 UIAutomation 控件截图并 OCR 提取文字

    流程：
    1. 使用 PIL.ImageGrab 按控件 BoundingRectangle 精确截图（避免捕获侧边栏）
    2. 放大图片 2 倍（提高 OCR 识别率）
    3. 通过 PowerShell 调用 Windows.Media.Ocr 识别文字
    4. 清理 OCR 结果（过滤侧边栏文字、去除中文间多余空格）

    Args:
        control: uiautomation.Control 对象

    Returns:
        str: 提取的文字（去除首尾空白），失败返回空字符串
    """
    if control is None:
        return ""

    # 使用临时文件保存截图
    tmp_dir = tempfile.gettempdir()
    tmp_path = os.path.join(tmp_dir, f"wxauto411_ocr_{os.getpid()}.png")

    try:
        # 步骤1：精确截图（按 BoundingRectangle）
        if not _capture_control_bitmap(control, tmp_path):
            return ""

        # 步骤2：放大图片（提高 OCR 识别率）
        _upscale_image(tmp_path, scale=2.0)

        # 步骤3：OCR 识别
        text = _ocr_image_via_powershell(tmp_path)
        if not text:
            return ""

        # 步骤4：清理 OCR 结果（过滤侧边栏、去除中文间多余空格等）
        cleaned = _clean_ocr_text(text)
        if cleaned:
            logger.debug(f"OCR 原文: '{text[:80]}' → 清理后: '{cleaned[:80]}'")
        return cleaned
    finally:
        # 清理临时文件
        try:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        except Exception:
            pass


def _ocr_image_with_positions_via_powershell(image_path: str):
    """
    通过 PowerShell 调用 Windows.Media.Ocr，返回带坐标的 OCR 结果

    与 _ocr_image_via_powershell 不同，此函数返回 JSON 格式：
    [
        {"text": "主人", "x": 10.0, "y": 20.0, "w": 50.0, "h": 25.0},
        ...
    ]

    坐标是相对于图片左上角的像素坐标（已考虑放大倍数）。

    Returns:
        list: [{text, x, y, w, h}, ...] 失败返回空列表
    """
    import json

    ps_script = r'''
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | ? { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await($WinRtTask, $ResultType) {
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtTask))
    $netTask.Wait(-1) | Out-Null
    $netTask.Result
}
[Windows.Media.Ocr.OcrEngine, Windows.Media.Ocr, ContentType=WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType=WindowsRuntime] | Out-Null
[Windows.Storage.StorageFile, Windows.Storage, ContentType=WindowsRuntime] | Out-Null
$path = 'IMAGE_PATH_HERE'
$file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($path)) ([Windows.Storage.StorageFile])
$stream = Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
$decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
$bitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
if ($engine -eq $null) {
    Write-Output '[]'
    exit
}
$result = Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
$output = @()
foreach ($line in $result.Lines) {
    $lineText = $line.Text
    $words = @($line.Words)
    if ($words.Count -gt 0) {
        $firstWord = $words[0]
        $lastWord = $words[$words.Count - 1]
        # 强制转换为 double，避免 PowerShell 返回数组
        $x = [double]$firstWord.BoundingRect.X
        $y = [double]$firstWord.BoundingRect.Y
        $lastX = [double]$lastWord.BoundingRect.X
        $lastW = [double]$lastWord.BoundingRect.Width
        $w = [double]($lastX + $lastW - $x)
        $h = [double]$firstWord.BoundingRect.Height
    } else {
        $x = 0.0; $y = 0.0; $w = 0.0; $h = 0.0
    }
    $output += [PSCustomObject]@{ text = $lineText; x = $x; y = $y; w = $w; h = $h }
}
$output | ConvertTo-Json -Compress -Depth 3
'''.replace('IMAGE_PATH_HERE', image_path.replace("'", "''"))

    try:
        # 关键：添加 errors='replace' 防止 PowerShell 输出非 UTF-8 字节时
        # _readerthread 崩溃导致整个 subprocess.run 返回空结果
        result = subprocess.run(
            ['powershell', '-NoProfile', '-NonInteractive', '-Command', ps_script],
            capture_output=True, text=True, timeout=15,
            encoding='utf-8', errors='replace'
        )
        if result.returncode != 0:
            logger.debug(f"PowerShell OCR 带坐标错误: {(result.stderr or '')[:200]}")
            return []
        output = (result.stdout or "").strip()
        if not output:
            return []
        # PowerShell 单元素数组可能不返回 JSON 数组格式，需处理
        if output.startswith('['):
            data = json.loads(output)
        elif output.startswith('{'):
            # 单个对象，包装成数组
            data = [json.loads(output)]
        else:
            return []
        # 清理每个文本
        for item in data:
            if 'text' in item:
                item['text'] = _clean_ocr_text(item['text'])
        return data
    except subprocess.TimeoutExpired:
        logger.debug("PowerShell OCR 带坐标超时")
        return []
    except Exception as e:
        logger.debug(f"PowerShell OCR 带坐标异常: {e}")
        return []


def extract_text_with_positions_from_image(image_path: str, upscale: float = 2.0):
    """
    从图片文件提取文字及其相对坐标

    用于会话列表/消息列表的点击定位：OCR 识别文字后，
    返回每行文字的相对坐标（相对于图片左上角，未放大前的坐标）。

    优先使用 RapidOCR（PaddleOCR PP-OCRv6 模型，中文识别精度 98%+），
    失败时回退到 PowerShell 的 Windows.Media.Ocr。

    Args:
        image_path: 图片文件路径
        upscale: OCR 前放大倍数（提高识别率），返回坐标会按此倍数缩回原坐标

    Returns:
        list: [{text, x, y, w, h}, ...] 坐标为原图像素坐标
    """
    # 优先使用 RapidOCR（精度高、速度快、返回坐标）
    try:
        return _extract_with_rapidocr(image_path, upscale)
    except Exception as e:
        logger.warning(f"RapidOCR 识别失败，回退到 PowerShell OCR: {e}")
        # 回退到 PowerShell 方案
        return _extract_with_powershell(image_path, upscale)


# 全局 RapidOCR 实例（避免每次调用都重新加载模型）
_rapidocr_instance = None


def _get_rapidocr():
    """获取全局 RapidOCR 实例（懒加载）"""
    global _rapidocr_instance
    if _rapidocr_instance is None:
        from rapidocr import RapidOCR
        _rapidocr_instance = RapidOCR()
        logger.info("RapidOCR 实例已创建（PP-OCRv6 模型）")
    return _rapidocr_instance


def _extract_with_rapidocr(image_path: str, upscale: float = 2.0):
    """
    使用 RapidOCR 识别图片中的文字及坐标

    RapidOCR 返回的 box 是 4 个点的坐标 [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]，
    需要转成 (x, y, w, h) 格式。

    坐标是相对于放大后图片的，需要缩回原图坐标。

    Args:
        image_path: 图片文件路径
        upscale: 放大倍数

    Returns:
        list: [{text, x, y, w, h}, ...] 坐标为原图像素坐标
    """
    try:
        from PIL import Image
    except ImportError:
        upscale = 1.0
        upscaled_path = image_path
    else:
        # 放大图片提高识别率
        if upscale > 1.0:
            upscaled_path = _upscale_image_to_temp(image_path, upscale)
            if not upscaled_path:
                upscaled_path = image_path
                upscale = 1.0
        else:
            upscaled_path = image_path

    ocr = _get_rapidocr()
    result = ocr(upscaled_path)

    # 清理临时放大图片
    if upscaled_path != image_path:
        try:
            os.remove(upscaled_path)
        except Exception:
            pass

    if result is None:
        return []
    # 注意：result.boxes 是 numpy array，不能用 `not result.boxes` 判断
    # （会报 "The truth value of an array with more than one element is ambiguous"）
    txts = result.txts if result.txts is not None else []
    boxes = result.boxes if result.boxes is not None else []
    scores = result.scores if result.scores is not None else []
    if len(txts) == 0 or len(boxes) == 0:
        return []

    # 将放大后的坐标缩回原图坐标
    scale = 1.0 / upscale
    cleaned = []
    for txt, box, score in zip(txts, boxes, scores):
        # box 是 4 个点的坐标 [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
        # 转成 (x, y, w, h)
        try:
            xs = [float(p[0]) for p in box]
            ys = [float(p[1]) for p in box]
            x = min(xs) * scale
            y = min(ys) * scale
            w = (max(xs) - min(xs)) * scale
            h = (max(ys) - min(ys)) * scale
        except (TypeError, ValueError, IndexError):
            continue

        # 过滤掉置信度过低的结果（< 0.5）
        if score < 0.5:
            logger.debug(f"过滤低置信度文字: {txt!r} score={score:.3f}")
            continue

        cleaned.append({
            'text': txt,
            'x': x,
            'y': y,
            'w': w,
            'h': h,
        })

    return cleaned


def _upscale_image_to_temp(image_path: str, scale: float) -> Optional[str]:
    """放大图片到临时文件，返回临时文件路径"""
    try:
        from PIL import Image
        with Image.open(image_path) as img:
            new_w = int(img.width * scale)
            new_h = int(img.height * scale)
            # 使用 LANCZOS 重采样（高质量）
            resized = img.resize((new_w, new_h), Image.LANCZOS)
            tmp_dir = tempfile.gettempdir()
            tmp_path = os.path.join(tmp_dir, f"wxauto411_upscaled_{os.getpid()}_{int(time.time()*1000)}.png")
            resized.save(tmp_path)
            return tmp_path
    except Exception as e:
        logger.debug(f"放大图片失败: {e}")
        return None


def _extract_with_powershell(image_path: str, upscale: float = 2.0):
    """PowerShell OCR 回退方案（RapidOCR 不可用时使用）"""
    try:
        # 先记录原图尺寸
        from PIL import Image
        with Image.open(image_path) as img:
            orig_w, orig_h = img.size

        # 放大图片
        if upscale > 1.0:
            _upscale_image(image_path, scale=upscale)

        # OCR 识别（带坐标）
        results = _ocr_image_with_positions_via_powershell(image_path)
        if not results:
            return []

        # 将放大后的坐标缩回原图坐标
        scale = 1.0 / upscale
        cleaned = []
        for item in results:
            try:
                x = float(item.get('x', 0) or 0)
                y = float(item.get('y', 0) or 0)
                w = float(item.get('w', 0) or 0)
                h = float(item.get('h', 0) or 0)
            except (TypeError, ValueError):
                x = 0.0
                y = 0.0
                w = 0.0
                h = 0.0

            cleaned.append({
                'text': item.get('text', ''),
                'x': x * scale,
                'y': y * scale,
                'w': w * scale,
                'h': h * scale,
            })

        return cleaned
    except Exception as e:
        logger.debug(f"_extract_with_powershell 失败: {e}")
        return []


def capture_screen_region(bbox):
    """
    截图屏幕指定区域

    Args:
        bbox: (left, top, right, bottom) 屏幕坐标

    Returns:
        str: 临时图片文件路径，失败返回 None
    """
    try:
        from PIL import ImageGrab
        tmp_dir = tempfile.gettempdir()
        tmp_path = os.path.join(tmp_dir, f"wxauto411_region_{os.getpid()}_{int(time.time()*1000)}.png")
        img = ImageGrab.grab(bbox=bbox, include_layered_windows=False, all_screens=True)
        img.save(tmp_path)
        return tmp_path
    except Exception as e:
        logger.debug(f"capture_screen_region 失败: {e}")
        return None


# 模块顶部导入 time（capture_screen_region 需要）
import time
