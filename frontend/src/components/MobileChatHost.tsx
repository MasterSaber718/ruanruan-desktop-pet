import { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, Typography, Button } from '@mui/material';

/**
 * [v187] 手机聊天宿主：UI 与 PC DSH 完全一致（同一份 dsh-web-frontend 前端）。
 * - RlNodeEngine.status().running === true → iframe 直连手机本机 127.0.0.1:5190（带 token）
 * - 引擎未启动 → 仍渲染同一份 DSH UI（本地 /dsh-web/ 壳），顶部提示条 + 一键启动按钮
 *   （nodejs-mobile runtime 接入后，start() 即拉起本机 DSH，本组件零改动）
 * - 兜底：引擎组件不存在（旧 APK）→ 同样渲染壳 + 提示
 */
export default function MobileChatHost() {
  const [probing, setProbing] = useState(true);
  const [engineUrl, setEngineUrl] = useState<string>('');
  const [running, setRunning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startMsg, setStartMsg] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const probe = async () => {
    try {
      const cap = (window as any).Capacitor;
      const eng = cap?.Plugins?.RlNodeEngine;
      if (eng?.status) {
        const st = await eng.status();
        if (st?.running && st?.url) {
          // status.url 是 http://127.0.0.1:5190，token 由启动脚本附带
          setEngineUrl(String(st.url) + '/?token=' + String(st.token || ''));
          setRunning(true);
          setProbing(false);
          return;
        }
      }
    } catch { /* 引擎组件不存在 → 壳+提示 */ }
    setRunning(false);
    setProbing(false);
  };

  useEffect(() => {
    probe();
  }, []);

  const startEngine = async () => {
    setStarting(true);
    setStartMsg('');
    try {
      const cap = (window as any).Capacitor;
      const eng = cap?.Plugins?.RlNodeEngine;
      if (!eng?.start) {
        setStartMsg('引擎组件未安装（需更新 APK）');
        return;
      }
      await eng.start();
      await probe();
      setStartMsg('已启动');
    } catch (e: any) {
      setStartMsg(String(e?.message || e || '启动失败'));
    } finally {
      setStarting(false);
    }
  };

  if (probing) {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5, bgcolor: '#12121a' }}>
        <CircularProgress size={30} thickness={4} />
        <Typography variant="caption" sx={{ opacity: 0.7 }}>正在检查本地聊天引擎…</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%', bgcolor: '#12121a', position: 'relative' }}>
      {/* [v187] 与 PC 完全一致的 DSH web UI（同一份前端 dist） */}
      <iframe
        ref={iframeRef}
        src={running ? engineUrl : 'dsh-web/index.html'}
        title="DSH"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        allow="microphone"
      />
      {!running && (
        <Box sx={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5,
          bgcolor: 'rgba(10,10,20,0.82)', backdropFilter: 'blur(6px)',
          px: 1.5, py: 1, display: 'flex', alignItems: 'center', gap: 1,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <Typography variant="caption" sx={{ color: 'rgba(232,232,232,0.85)', flex: 1 }}>
            {startMsg || '本地聊天引擎未启动（UI 已就绪）'}
          </Typography>
          <Button size="small" variant="contained" color="primary" disabled={starting} onClick={startEngine}>
            {starting ? '启动中…' : '启动引擎'}
          </Button>
        </Box>
      )}
    </Box>
  );
}
