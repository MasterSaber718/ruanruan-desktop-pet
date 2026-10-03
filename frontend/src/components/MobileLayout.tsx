/**
 * MobileLayout.tsx - 移动端布局组件
 * 
 * - 底部导航栏替代顶部菜单
 * - 简化的聊天界面
 * - 触摸友好的交互
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, TextField, IconButton, CircularProgress, Avatar, Menu, MenuItem, Snackbar } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SettingsIcon from '@mui/icons-material/Settings';
import HomeIcon from '@mui/icons-material/Home';
import ChatIcon from '@mui/icons-material/Chat';
import PetsIcon from '@mui/icons-material/Pets';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import MicIcon from '@mui/icons-material/Mic';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DescriptionIcon from '@mui/icons-material/Description';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';
import SlideshowIcon from '@mui/icons-material/Slideshow';

import TypewriterEffect from './TypewriterEffect';
import { applySpeechFix, buildGrammarString, pickBestTranscript } from '../utils/speechFix';

// 懒加载 AI 服务（避免首屏加载过重）
const aiResponseServiceRef: { current: any } = { current: null };

// [1:1搬运] 文件上传白名单（与 PC 端 HomePage 一致）
const ALLOWED_IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
const ALLOWED_DOC_EXT = [
  '.txt', '.md', '.rtf', '.doc', '.docx', '.pdf',
  '.xls', '.xlsx', '.csv', '.et', '.ppt', '.pptx', '.dps',
  '.wps', '.odt', '.pages',
];
const SCRIPT_BLACKLIST = [
  '.js', '.ts', '.tsx', '.jsx', '.mjs', '.cjs',
  '.py', '.pyc', '.pyw', '.sh', '.bat', '.ps1', '.exe', '.cmd', '.vbs',
];

type Attachment = {
  kind: 'image' | 'document';
  fileName: string;
  fileSize: number;
  dataUrl?: string;
  mimeType?: string;
};

type ChatMessage = {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  time: string;
  attachment?: Attachment;
};

type NavTab = 'home' | 'chat' | 'settings' | 'pet';

// [安卓专用] 模型切换选项：手机端不跑本地模型，仅保留云端模型
// [FROM PC] 原 PC 选项含 Qwen/GLM 本地模型，移动端已剔除（见 MobileSettingsPage 说明）
const MODEL_OPTIONS = [
  { label: 'GPT-4o (云端)', value: 'gpt-4o' },
  { label: 'GPT-3.5-Turbo (云端)', value: 'gpt-3.5-turbo' },
  { label: 'Claude-3.5 (云端)', value: 'claude-3-5-sonnet' },
  { label: 'DeepSeek (云端)', value: 'deepseek' },
];

const getFileExt = (fileName: string): string => {
  const idx = fileName.lastIndexOf('.');
  if (idx === -1) return '';
  return fileName.slice(idx).toLowerCase();
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

const detectFileType = (file: File): 'image' | 'document' | 'rejected' => {
  const ext = getFileExt(file.name);
  if (!ext) return 'rejected';
  if (SCRIPT_BLACKLIST.includes(ext)) return 'rejected';
  if (ALLOWED_IMAGE_EXT.includes(ext)) return 'image';
  if (ALLOWED_DOC_EXT.includes(ext)) return 'document';
  return 'rejected';
};

const getDocumentIcon = (fileName: string) => {
  const ext = getFileExt(fileName);
  if (ext === '.pdf') return <PictureAsPdfIcon />;
  if (ext === '.xls' || ext === '.xlsx' || ext === '.csv' || ext === '.et') return <TableChartIcon />;
  if (ext === '.ppt' || ext === '.pptx' || ext === '.dps') return <SlideshowIcon />;
  if (ext === '.txt' || ext === '.md' || ext === '.rtf') return <DescriptionIcon />;
  if (ext === '.doc' || ext === '.docx' || ext === '.wps' || ext === '.odt') return <DescriptionIcon />;
  return <InsertDriveFileIcon />;
};

/**
 * 移动端布局组件
 * 接收 children 作为主内容，底部导航栏切换页面
 */
export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  // [手机复刻PC] 初始高亮跟随当前路由（/ = 主页即 PC 3D 预览）
  const routeToTab = (p: string): NavTab =>
    p === '/' ? 'home' : p === '/chat' ? 'chat' : p === '/pet' ? 'pet' : p === '/settings' ? 'settings' : 'home';
  const [activeTab, setActiveTab] = useState<NavTab>(() => routeToTab(location.pathname));

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      height: '100dvh',
      overflow: 'hidden',
    }}>
      {/* [手机复刻PC] children 现在是 PC 三页常驻层 + 路由层，页面本身 fixed 全屏，
          这里只做透明容器让位不再裁切；导航栏让位由 index.css 处理 */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {children}
      </Box>

      {/* 底部导航栏：[手机复刻PC] 4 tab 直连 PC 路由（主页=3D 预览 / 聊天=DSH / 桌宠 / 设置=PC设置页） */}
      <Box className="mobile-bottom-nav">
        <Box
          className={`mobile-bottom-nav-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => { setActiveTab('home'); navigate('/'); }}
        >
          <HomeIcon fontSize="small" />
          <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>主页</Typography>
        </Box>

        <Box
          className={`mobile-bottom-nav-item ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => { setActiveTab('chat'); navigate('/chat'); }}
        >
          <ChatIcon fontSize="small" />
          <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>聊天</Typography>
        </Box>

        <Box
          className={`mobile-bottom-nav-item ${activeTab === 'pet' ? 'active' : ''}`}
          onClick={() => { setActiveTab('pet'); navigate('/pet'); }}
        >
          <PetsIcon fontSize="small" />
          <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>桌宠</Typography>
        </Box>

        <Box
          className={`mobile-bottom-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => { setActiveTab('settings'); navigate('/settings'); }}
        >
          <SettingsIcon fontSize="small" />
          <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>设置</Typography>
        </Box>
      </Box>
    </Box>
  );
}

/**
 * [修复 CRITICAL-2] 聊天记录条数上限。
 * messages 原来无任何上限，配合内联 base64 图片会持续吃内存；
 * 同时 messages.map() 会把每条消息都渲染成真实 DOM，条数越多每次
 * setState 的 diff 与重排成本越高，聊天到后面会明显变卡。
 * 超过上限时丢弃最旧的消息（保留首条欢迎语之外的最新记录）。
 */
const MAX_MESSAGES = 100;

/** 图片压缩后的最大边长（像素）。手机原图动辄 4000px，显示区宽度实际不足 400px。 */
const MAX_IMAGE_DIMENSION = 1280;

/**
 * [修复 CRITICAL-2] 把图片压缩为受控体积的 JPEG dataUrl。
 *
 * 通过 createImageBitmap + canvas 等比缩放到最长边 1280px 并以 0.8 质量编码 JPEG，
 * 典型 4MB 手机拍照可压到 200~400KB（约 1/10~1/20），显著降低堆占用与渲染开销。
 * 全程主动释放中间对象（ImageBitmap.close / ObjectURL.revoke / canvas 置零），
 * 避免压缩过程本身引入新的泄漏。
 */
async function compressImageToDataUrl(file: File): Promise<string> {
  // 读取为 ObjectURL 而非 base64，避免中间态就产生一份超大字符串
  const objectUrl = URL.createObjectURL(file);
  let bitmap: ImageBitmap | null = null;
  let canvas: HTMLCanvasElement | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(width, height));
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取 2D 上下文');
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    // PNG 无损会让截图类图片反而变大，统一用 JPEG 控制体积
    return canvas.toDataURL('image/jpeg', 0.8);
  } catch {
    // 压缩失败（如 WebView 不支持 createImageBitmap）则退回原始读取，保证功能可用
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  } finally {
    // 显式释放：ImageBitmap 持有解码后的原始位图（数十 MB），必须 close
    bitmap?.close?.();
    URL.revokeObjectURL(objectUrl);
    if (canvas) { canvas.width = 0; canvas.height = 0; canvas = null; }
  }
}

/** [修复 CRITICAL-2] 追加消息并裁剪到上限，防止无界增长 */
function appendMessage(prev: ChatMessage[], msg: ChatMessage): ChatMessage[] {
  const next = [...prev, msg];
  return next.length > MAX_MESSAGES ? next.slice(next.length - MAX_MESSAGES) : next;
}

/**
 * 移动端聊天界面
 * 简化版的 HomePage，针对小屏幕优化
 */
export function MobileChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: '主人好！我是阮琳云，有什么可以帮助您的吗？',
      sender: 'ai',
      time: new Date().toLocaleTimeString(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODEL_OPTIONS[0].value);
  const [modelMenuAnchor, setModelMenuAnchor] = useState<null | HTMLElement>(null);
  const [snackMsg, setSnackMsg] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // [修复 CRITICAL-1] 持有语音识别实例，卸载时必须能停掉它并释放麦克风
  const recognitionRef = useRef<any>(null);
  // [修复 CRITICAL-1] 组件存活标志：异步回调在卸载后不得再 setState，
  //   否则闭包会通过 setState 反向持有整个已卸载组件的 fiber 与 messages（含图片 base64）
  const mountedRef = useRef(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // [修复 CRITICAL-1] 统一的卸载清理：停止语音识别 + 标记组件已卸载
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const rec = recognitionRef.current;
      if (rec) {
        try {
          // 先摘掉回调，防止 abort 过程中再触发 onresult/onerror 导致卸载后 setState
          rec.onresult = null;
          rec.onerror = null;
          rec.onend = null;
          // abort 比 stop 更彻底：立即中断会话并释放麦克风，不再返回最终结果
          rec.abort?.();
        } catch { /* 已结束的会话再次 abort 会抛错，忽略 */ }
        recognitionRef.current = null;
      }
    };
  }, []);

  // [1:1搬运] 文件上传（与 PC 端 HomePage 一致：白名单 + 图片/文档预览）
  const handleFileUpload = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = [...ALLOWED_IMAGE_EXT, ...ALLOWED_DOC_EXT].join(',');
    fileInput.onchange = async (e) => {
      const target = e.target as HTMLInputElement;
      if (!target.files || target.files.length === 0) return;
      const allFiles = Array.from(target.files);
      const acceptedImages: File[] = [];
      const acceptedDocs: File[] = [];
      const rejectedFiles: File[] = [];
      for (const f of allFiles) {
        const t = detectFileType(f);
        if (t === 'image') acceptedImages.push(f);
        else if (t === 'document') acceptedDocs.push(f);
        else rejectedFiles.push(f);
      }
      if (rejectedFiles.length > 0) {
        const names = rejectedFiles.map(f => f.name).join('、');
        setMessages(prev => appendMessage(prev, {
          id: (Date.now() + 0.5).toString(),
          text: `⚠️ 以下文件被拒绝上传（仅支持图片和工作类文档，禁止上传脚本或可执行文件）：\n${names}`,
          sender: 'ai',
          time: new Date().toLocaleTimeString(),
        }));
      }
      for (const imgFile of acceptedImages) {
        try {
          // [修复 CRITICAL-2] 先压缩再入库。
          //   原实现直接 readAsDataURL 存原图：手机拍照普遍 3~5MB，
          //   转 base64 后体积再放大约 1.37 倍（4~7MB/张），且 base64 是 JS 字符串，
          //   无法像 ObjectURL 那样 revoke 释放。连传十几张即可把 WebView 堆
          //   （低端机常见上限 256~512MB）撑爆，表现为"应用突然白屏/重启"。
          const dataUrl = await compressImageToDataUrl(imgFile);
          if (!mountedRef.current) return; // 卸载后停止继续写入状态
          setMessages(prev => appendMessage(prev, {
            id: `${Date.now()}_${imgFile.name}`,
            text: '',
            sender: 'user',
            time: new Date().toLocaleTimeString(),
            attachment: { kind: 'image', fileName: imgFile.name, fileSize: imgFile.size, dataUrl, mimeType: imgFile.type },
          }));
        } catch (err) {
          console.error('图片读取失败:', imgFile.name, err);
        }
      }
      for (const docFile of acceptedDocs) {
        if (!mountedRef.current) return;
        setMessages(prev => appendMessage(prev, {
          id: `${Date.now()}_${docFile.name}`,
          text: '',
          sender: 'user',
          time: new Date().toLocaleTimeString(),
          attachment: { kind: 'document', fileName: docFile.name, fileSize: docFile.size, mimeType: docFile.type },
        }));
      }
    };
    fileInput.click();
  };

  // [1:1搬运] 语音输入（移动端实现：Web Speech API 兜底，失败提示）
  const handleVoiceInput = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSnackMsg('当前环境不支持语音输入');
      return;
    }
    // [修复 CRITICAL-1] 若已有识别会话在进行，先中止旧的，避免多次点击叠加出
    //   多个无法回收的会话（每个都独占麦克风通道）
    if (recognitionRef.current) {
      try { recognitionRef.current.abort?.(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    try {
      const rec = new SR();
      // 保存引用，使卸载时能够停止它、释放麦克风
      recognitionRef.current = rec;
      rec.lang = 'zh-CN';
      rec.interimResults = false;
      rec.maxAlternatives = 3;  // 多候选，按置信度取最优
      // 语法提示（共用 utils/speechFix 热词表，JSGF 软约束；不支持则静默降级）
      try {
        const SGL = (window as any).SpeechGrammarList || (window as any).webkitSpeechGrammarList;
        if (SGL) {
          const gl = new SGL();
          gl.addFromString(buildGrammarString(), 0.5);
          rec.grammars = gl;
        }
      } catch { /* 不支持则忽略 */ }
      rec.onresult = (ev: any) => {
        if (!mountedRef.current) return; // 卸载后丢弃结果，不再 setState
        // 多候选取最优 + 热词同音纠错后处理
        const transcript = applySpeechFix(pickBestTranscript(ev.results[0]));
        if (!transcript) return;
        setInputText(prev => (prev ? prev + ' ' : '') + transcript);
      };
      rec.onerror = () => {
        if (!mountedRef.current) return;
        setSnackMsg('语音识别失败，请重试');
      };
      // 会话自然结束时主动释放引用，让实例可被 GC
      rec.onend = () => {
        if (recognitionRef.current === rec) recognitionRef.current = null;
      };
      rec.start();
    } catch {
      recognitionRef.current = null;
      setSnackMsg('无法启动语音识别');
    }
  };

  // [1:1搬运] 复制消息
  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text)
      .then(() => setSnackMsg('已复制'))
      .catch(() => setSnackMsg('复制失败'));
  };

  // [1:1搬运] 重新生成（找到上一条用户消息，重新请求）
  const handleRegenerate = async (aiMsgId: string) => {
    const idx = messages.findIndex(m => m.id === aiMsgId);
    if (idx <= 0) return;
    const prevUserMsg = messages[idx - 1];
    if (prevUserMsg.sender !== 'user') return;
    setIsLoading(true);
    try {
      const text = prevUserMsg.text || prevUserMsg.attachment?.fileName || '';
      const aiResult = await callAI(text);
      setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: aiResult } : m));
    } catch (error: any) {
      const errMsg = error instanceof Error ? error.message : String(error);
      setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: `抱歉，重新生成失败：${errMsg}` } : m));
    } finally {
      setIsLoading(false);
    }
  };

  // [安卓专用] 统一的 AI 调用：手机端无本地后端，仅走云端 API（LLMApiService 直连）
  // [FROM PC] 原 PC 版 callAI 含 127.0.0.1:27865 后端 fallback，移动端已移除（手机不跑后端）
  const callAI = async (text: string): Promise<string> => {
    if (!aiResponseServiceRef.current) {
      try {
        const { llmApiService } = await import('../services/LLMApiService');
        aiResponseServiceRef.current = llmApiService;
      } catch (e) {
        console.warn('AI 服务加载失败:', e);
      }
    }
    if (aiResponseServiceRef.current?.isConfigured?.()) {
      const now = new Date();
      const timeInfo = `[当前时间] ${now.toLocaleString('zh-CN', { hour12: false })}`;
      const systemPrompt = `你是阮琳云，一个友好、温暖的AI助手。请用中文回复，语气亲切自然。${timeInfo}`;
      const history = messages.slice(-20).map(m => ({
        role: (m.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.text,
      }));
      return await aiResponseServiceRef.current.askWithHistory(history, text, systemPrompt, { model: selectedModel });
    }
    return 'AI 模型未配置，请前往"设置"页面配置 API Key 并启用。';
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text) return;

    const now = new Date().toLocaleTimeString();
    setMessages(prev => appendMessage(prev, { id: Date.now().toString(), text, sender: 'user', time: now }));
    setInputText('');
    setIsLoading(true);

    try {
      const aiResult = await callAI(text);
      // [修复 CRITICAL-1] await 之后组件可能已卸载（用户切了 tab），
      //   此时 setState 会让闭包继续持有整个已卸载组件的状态树
      if (!mountedRef.current) return;
      setMessages(prev => appendMessage(prev, {
        id: (Date.now() + 1).toString(),
        text: aiResult,
        sender: 'ai',
        time: new Date().toLocaleTimeString(),
      }));
    } catch (error: any) {
      if (!mountedRef.current) return;
      const errMsg = error instanceof Error ? error.message : String(error);
      setMessages(prev => appendMessage(prev, {
        id: (Date.now() + 1).toString(),
        text: `抱歉，处理请求时出错：${errMsg}`,
        sender: 'ai',
        time: new Date().toLocaleTimeString(),
      }));
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  };

  return (
    <Box className="mobile-chat-container">
      {/* 顶部标题栏 */}
      <Box sx={{
        py: 1.5,
        px: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        bgcolor: 'background.paper',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
        flexShrink: 0,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: '#4f46e5', fontSize: '0.8rem', mr: 1 }}>
            阮
          </Avatar>
          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
            阮琳云
          </Typography>
        </Box>
        {/* [1:1搬运] 模型切换 */}
        <Box
          onClick={(e) => setModelMenuAnchor(e.currentTarget)}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', color: 'primary.main' }}
        >
          <AutoAwesomeIcon fontSize="small" />
          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
            {MODEL_OPTIONS.find(m => m.value === selectedModel)?.label || '模型'}
          </Typography>
        </Box>
        <Menu anchorEl={modelMenuAnchor} open={!!modelMenuAnchor} onClose={() => setModelMenuAnchor(null)}>
          {MODEL_OPTIONS.map((m) => (
            <MenuItem
              key={m.value}
              selected={m.value === selectedModel}
              onClick={() => { setSelectedModel(m.value); setModelMenuAnchor(null); }}
            >
              {m.label}
            </MenuItem>
          ))}
        </Menu>
      </Box>

      {/* 消息列表 */}
      <Box className="mobile-chat-messages" sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 1 }}>
        {messages.map((msg) => (
          <Box
            key={msg.id}
            sx={{
              display: 'flex',
              gap: 1,
              mb: 2,
              justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            {msg.sender === 'ai' && (
              <Avatar sx={{ bgcolor: '#4f46e5', width: 32, height: 32, fontSize: '0.8rem', flexShrink: 0 }}>
                阮
              </Avatar>
            )}
            <Box sx={{ maxWidth: '78%' }}>
              <Box sx={{
                p: 1.5,
                borderRadius: '12px',
                bgcolor: msg.sender === 'user' ? '#4f46e5' : 'background.paper',
                color: msg.sender === 'user' ? 'white' : 'text.primary',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}>
                {/* [1:1搬运] 附件预览（图片/文档） */}
                {msg.attachment && (
                  <Box sx={{ mb: msg.text ? 1 : 0 }}>
                    {msg.attachment.kind === 'image' && msg.attachment.dataUrl && (
                      <Box
                        component="img"
                        src={msg.attachment.dataUrl}
                        alt={msg.attachment.fileName}
                        onClick={() => setPreviewImage(msg.attachment!.dataUrl!)}
                        sx={{ width: '100%', maxWidth: 220, borderRadius: '8px', cursor: 'pointer', display: 'block' }}
                      />
                    )}
                    {msg.attachment.kind === 'document' && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: 'rgba(0,0,0,0.04)', borderRadius: '8px' }}>
                        {getDocumentIcon(msg.attachment.fileName)}
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="caption" sx={{ display: 'block', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {msg.attachment.fileName}
                          </Typography>
                          <Typography variant="caption" sx={{ opacity: 0.6, fontSize: '0.7rem' }}>
                            {formatFileSize(msg.attachment.fileSize)}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  </Box>
                )}
                {msg.text && (
                  msg.sender === 'ai' ? (
                    <TypewriterEffect text={msg.text} speed={25} />
                  ) : (
                    <Typography variant="body2" sx={{ lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{msg.text}</Typography>
                  )
                )}
                {/* [1:1搬运] AI 消息操作：复制 / 重新生成 */}
                {msg.sender === 'ai' && msg.text && (
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, justifyContent: 'flex-end' }}>
                    <IconButton size="small" onClick={() => handleCopy(msg.text)} sx={{ p: 0.5 }}>
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleRegenerate(msg.id)} sx={{ p: 0.5 }}>
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )}
              </Box>
            </Box>
            {msg.sender === 'user' && (
              <Avatar sx={{ bgcolor: '#10b981', width: 32, height: 32, fontSize: '0.8rem', flexShrink: 0 }}>
                U
              </Avatar>
            )}
          </Box>
        ))}
        {isLoading && (
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Avatar sx={{ bgcolor: '#4f46e5', width: 32, height: 32, fontSize: '0.8rem' }}>阮</Avatar>
            <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: 'background.paper' }}>
              <CircularProgress size={16} />
            </Box>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* 底部输入栏 */}
      <Box className="mobile-chat-input">
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-end' }}>
          {/* [1:1搬运] 文件上传按钮 */}
          <IconButton onClick={handleFileUpload} sx={{ color: 'text.secondary', width: 40, height: 40 }}>
            <AttachFileIcon fontSize="small" />
          </IconButton>
          {/* [1:1搬运] 语音输入按钮 */}
          <IconButton onClick={handleVoiceInput} sx={{ color: 'text.secondary', width: 40, height: 40 }}>
            <MicIcon fontSize="small" />
          </IconButton>
          <TextField
            multiline
            maxRows={3}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="输入消息..."
            size="small"
            sx={{
              flex: 1,
              '& .MuiOutlinedInput-root': {
                borderRadius: '20px',
                fontSize: '0.9rem',
              },
            }}
          />
          <IconButton
            onClick={handleSend}
            disabled={!inputText.trim() || isLoading}
            sx={{
              bgcolor: '#4f46e5',
              color: 'white',
              width: 44,
              height: 44,
              '&:hover': { bgcolor: '#4338ca' },
              '&:disabled': { bgcolor: 'rgba(0,0,0,0.12)' },
            }}
          >
            <SendIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* [1:1搬运] 图片预览 Dialog */}
      {previewImage && (
        <Box
          onClick={() => setPreviewImage(null)}
          sx={{
            position: 'fixed', inset: 0, zIndex: 2000, bgcolor: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2,
          }}
        >
          <Box component="img" src={previewImage} sx={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '8px' }} />
        </Box>
      )}

      {/* [1:1搬运] 操作提示 Snackbar */}
      <Snackbar
        open={!!snackMsg}
        autoHideDuration={2000}
        onClose={() => setSnackMsg('')}
        message={snackMsg}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}

