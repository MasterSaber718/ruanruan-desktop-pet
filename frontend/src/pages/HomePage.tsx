/**
 * HomePage [v166]
 * - /chat：黑底加载层 + 进度条；URL 探活通过后才挂 iframe
 * - 收到 rl-dsh-ready 才撤加载层（防首开黑屏）
 * - 白栏：∧收起改状态 / ∨固定展开；三键位置由 WindowControls 固定右上角
 */
import { useState, useRef, useEffect } from 'react';
import { t as tt } from '../i18n';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material';
import apiConfigService from '../services/ApiConfigService';

function HomePage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const [dshUrl, setDshUrl] = useState<string | null>(null);
  const [dshError, setDshError] = useState<string | null>(null);
  const [dshUiReady, setDshUiReady] = useState(false);
  const [bootProgress, setBootProgress] = useState(3);
  const [bootTip, setBootTip] = useState(tt('home.bootStarting'));
  /** 硬控已到 5s：撤掉全屏遮罩，界面可操作，DSH 后台继续 */
  const [waitOverdue, setWaitOverdue] = useState(false);
  const [topBarOpen, setTopBarOpen] = useState(true);
  const pollRef = useRef<number | null>(null);
  const bootingRef = useRef(false);
  const liveCheckRef = useRef(false);
  // [v174 真实进度] bootProgress = 真实里程碑（只增不减），显示值由 RAF 缓动追赶、绝不越过真实值、
  //   也绝不按时间自涨（v171 那种"每秒 +1%"是假进度，用户已否）。
  //   超过 900ms 没有新里程碑且未完成 → 叠加扫描光带（不定态），表示"在等，但不知道还有多久"。
  const progTargetRef = useRef(3);
  const progEventAtRef = useRef(Date.now());
  useEffect(() => {
    progTargetRef.current = bootProgress;
    progEventAtRef.current = Date.now();
  }, [bootProgress]);
  useEffect(() => {
    let raf = 0;
    let cur = 3;
    const step = () => {
      const t = progTargetRef.current;
      const diff = t - cur;
      if (Math.abs(diff) < 0.15) cur = t;
      else cur += diff * (diff > 12 ? 0.10 : 0.055);
      const w = Math.max(3, Math.min(100, cur)).toFixed(1) + '%';
      document.querySelectorAll<HTMLElement>('[data-progfill]').forEach((el) => {
        if (el.style.width !== w) el.style.width = w;
      });
      const txt = Math.floor(Math.max(0, Math.min(100, cur))) + '%';
      document.querySelectorAll<HTMLElement>('[data-progpct]').forEach((el) => {
        if (el.textContent !== txt) el.textContent = txt;
      });
      const waiting = progTargetRef.current < 100 && (Date.now() - progEventAtRef.current) > 900;
      document.querySelectorAll<HTMLElement>('[data-progsweep]').forEach((el) => {
        const want = waiting ? '1' : '0';
        if (el.style.opacity !== want) el.style.opacity = want;
        const anim = waiting ? 'rl-sweep 1.15s linear infinite' : 'none';
        if (el.style.animation !== anim) el.style.animation = anim;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    try {
      window.dispatchEvent(new CustomEvent('rl-topbar', { detail: { collapsed: !topBarOpen } }));
    } catch { /* noop */ }
  }, [topBarOpen]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data;
      if (d && typeof d === 'object' && d.type === 'rl-dsh-ready') {
        setDshUiReady(true);
        setDshError(null);
        setBootProgress(100);
        setBootTip(tt('home.bootReady'));
        try { window.dispatchEvent(new CustomEvent('rl-dsh-ready', { detail: { ts: Date.now() } })); } catch { /* noop */ }
        return;
      }
      // [v173] 会话删除：DSH 页内「删除」确认后，由宿主主进程物理删除该会话落盘数据
      if (d && typeof d === 'object' && d.type === 'rl-dsh-delete-session' && d.sessionId) {
        console.log('[HomePage] 收到 DSH 会话删除请求:', d.sessionId);
        (async () => {
          try {
            const r = await (window as any).dshHarness?.purgeSession?.(String(d.sessionId));
            window.postMessage({ type: 'rl-dsh-delete-session-result', sessionId: d.sessionId, ok: !!(r && r.ok), error: (r && r.error) || null }, '*');
          } catch (err: any) {
            window.postMessage({ type: 'rl-dsh-delete-session-result', sessionId: d.sessionId, ok: false, error: err?.message || 'purge failed' }, '*');
          }
        })();
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const buildModelCfg = () => {
    try {
      const active = apiConfigService.getActive?.() || null;
      const list = apiConfigService.getAll?.() || [];
      const picked = active || list.find((c: any) => c.enabled) || null;
      if (picked && picked.baseUrl) {
        return {
          providerId: picked.id,
          name: picked.name || picked.id,
          baseUrl: picked.baseUrl,
          model: picked.model || 'deepseek-chat',
          apiKey: picked.apiKey || '',
          contextWindow: 8192,
          maxTicks: 2048,
          maxTokens: 2048,
        };
      }
    } catch { /* noop */ }
    return null;
  };

  const stopPoll = () => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  /** 端口是否真正能连上（防 token 已写、web 未监听 → iframe 黑屏） */
  const probeLive = async (url: string) => {
    try {
      const ctrl = new AbortController();
      const timer = window.setTimeout(() => ctrl.abort(), 1200);
      await fetch(url, { method: 'GET', mode: 'no-cors', cache: 'no-store', signal: ctrl.signal });
      window.clearTimeout(timer);
      return true;
    } catch {
      return false;
    }
  };

  /** 探活通过才 setDshUrl；硬控目标 5s / 硬顶 10s，到点放界面后台继续 */
  const applyUrlWhenLive = async (url: string) => {
    if (liveCheckRef.current) return false;
    liveCheckRef.current = true;
    // 按用户锁定：硬控最多 5 秒；极慢机器硬顶 10 秒
    const BOOT_TARGET_MS = 5000;
    const BOOT_HARD_MS = 10000;
    const t0 = Date.now();
    try {
      setWaitOverdue(false);
      setBootTip(tt('home.bootConnecting'));
      let attempts = 0;
      let lastTipAt = 0;
      while (Date.now() - t0 < BOOT_HARD_MS) {
        if (await probeLive(url)) {
          setDshUrl(url);
          setDshError(null);
          // [v174 真实进度] 端口真通了才算一个里程碑（45）；界面渲染进度等 iframe onLoad 真实事件
          setBootProgress(45);
          setBootTip(tt('home.bootConnected'));
          return true;
        }
        attempts += 1;
        if (attempts % 3 === 0) {
          try {
            const r = await (window as any).dshHarness?.resolveUrl?.();
            if (r?.ok && r.url) url = r.url;
          } catch { /* noop */ }
          try { await (window as any).dshHarness?.start?.(buildModelCfg() || undefined); } catch { /* noop */ }
        }
        const elapsed = Date.now() - t0;
        // [v174] 这里以前是"按秒 +1%"的假进度（用户已否）。现在不报任何虚假百分比：
        //   5s 到点只是撤掉全屏遮罩让界面可用，进度条交给"扫描光带"表示还在等真实事件。
        if (elapsed >= BOOT_TARGET_MS) {
          if (!waitOverdue) setWaitOverdue(true);
          if (elapsed - lastTipAt > 4000) {
            lastTipAt = elapsed;
            setBootTip(tt('home.bootUiReady'));
          }
        } else {
          setBootTip(tt('home.bootConnecting'));
        }
        await sleep(400);
      }
      // 10s 硬顶：停止阻塞等待，后台轮询，不把用户钉死在加载层
      setWaitOverdue(true);
      setDshError(tt('home.bootWarming'));
      setBootTip(tt('home.bootBg'));
      return false;
    } finally {
      liveCheckRef.current = false;
    }
  };

  const startPoll = () => {
    stopPoll();
    let ticks = 0;
    // 后台轮询：不挡界面；探活成功即挂 iframe
    pollRef.current = window.setInterval(async () => {
      ticks += 1;
      const dsh = (window as any).dshHarness;
      if (!dsh) { stopPoll(); return; }
      try {
        const r = await dsh.resolveUrl?.();
        if (r?.ok && r.url) {
          stopPoll();
          const ok = await applyUrlWhenLive(r.url);
          if (!ok) {
            // 10s 内未通：继续后台探，不再全屏硬控
            startPoll();
          }
          return;
        }
      } catch { /* noop */ }
      if (ticks % 5 === 0) {
        try { await dsh.start(buildModelCfg() || undefined); } catch { /* noop */ }
      }
      if (ticks >= 40) {
        stopPoll();
        setWaitOverdue(true);
        setDshError(tt('home.bootBusy'));
        setBootTip(tt('home.bootBg'));
      }
    }, 1000);
  };

  const bootDsh = async () => {
    if (bootingRef.current) return;
    bootingRef.current = true;
    setDshError(null);
    setDshUiReady(false);
    setWaitOverdue(false);
    setBootProgress(10);
    setBootTip(tt('home.bootStarting'));
    try {
      const dsh = (window as any).dshHarness;
      if (!dsh?.start) {
        setDshError(tt('home.bootBridgeDown'));
        setWaitOverdue(true);
        return;
      }
      let url: string | null = null;
      try {
        const ready = await dsh.resolveUrl?.();
        if (ready?.ok && ready.url) url = ready.url;
      } catch { /* noop */ }
      if (!url) {
        const st = await dsh.status?.().catch(() => null);
        if (st?.ok && st.url) url = st.url;
      }
      setBootProgress(30);   // [v174] 真实里程碑：拿到服务地址（桥响应了）
      setBootTip(url ? tt('home.bootHandshake') : tt('home.bootWaitingSvc'));
      if (url) {
        const ok = await applyUrlWhenLive(url);
        if (!ok) startPoll();
        return;
      }
      startPoll();
      try {
        const result = await dsh.start(buildModelCfg() || undefined);
        if (result?.ok && result.url) {
          stopPoll();
          const ok = await applyUrlWhenLive(result.url);
          if (!ok) startPoll();
        }
      } catch {
        startPoll();
      }
    } catch (e: any) {
      setDshError(e?.message || tt('home.bootFail'));
      startPoll();
    } finally {
      bootingRef.current = false;
    }
  };

  useEffect(() => {
    bootDsh();
    return () => { stopPoll(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const collapsed = !topBarOpen;
  // 5s 内：全屏加载层；到点后：可操作，内容区显示进度条（不再硬控）
  const showOverlay = !dshUiReady && !waitOverdue;
  const showInlineLoad = !dshUiReady && waitOverdue;

  const barBg = collapsed
    ? (isDarkMode ? '#1a1a1a' : '#e8eaed')
    : (isDarkMode ? '#121212' : '#ffffff');

  return (
    <Box sx={{
      width: '100%',
      height: '100%',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      bgcolor: isDarkMode ? '#0e0e0e' : '#f0f2f5',
      position: 'relative',
    }}>
      <Box
        className="rl-topbar"
        data-state={collapsed ? 'collapsed' : 'open'}
        sx={{
          py: collapsed ? 0.25 : 0.75,
          px: collapsed ? 1 : 2,
          borderBottom: `1px solid ${isDarkMode ? '#333' : '#d0d4da'}`,
          bgcolor: barBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'flex-start' : 'center',
          position: 'relative',
          width: '100%',
          boxSizing: 'border-box',
          flexShrink: 0,
          minHeight: collapsed ? 28 : 44,
          zIndex: 30,
          transition: 'min-height 0.12s ease, padding 0.12s ease, background 0.12s ease',
          pointerEvents: 'auto',
          ...( { WebkitAppRegion: 'no-drag' } as any ),
        }}
      >
        <Box sx={{
          position: collapsed ? 'static' : 'absolute',
          left: collapsed ? undefined : 8,
          top: collapsed ? undefined : '50%',
          transform: collapsed ? undefined : 'translateY(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 0.25,
          zIndex: 2,
          pointerEvents: 'auto',
          ...( { WebkitAppRegion: 'no-drag' } as any ),
        }}>
          <button
            type="button"
            aria-label={tt('home.backHome')}
            title={tt('home.backHome')}
            onClick={(e) => { e.stopPropagation(); navigate('/'); }}
            style={{
              width: collapsed ? 30 : 34,
              height: collapsed ? 26 : 34,
              border: 'none',
              background: 'transparent',
              color: isDarkMode ? '#fff' : '#1a1a1a',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              fontSize: 16,
              lineHeight: 1,
              ...( { WebkitAppRegion: 'no-drag' } as any ),
            }}
          >
            ⌂
          </button>
          <button
            type="button"
            aria-label={collapsed ? tt('home.expandRail') : tt('home.collapseRail')}
            title={collapsed ? tt('home.expandRailPin') : tt('home.collapseRail')}
            data-rl-topbar-toggle={collapsed ? 'expand' : 'collapse'}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setTopBarOpen(collapsed);
            }}
            style={{
              width: 32,
              height: collapsed ? 26 : 32,
              border: 'none',
              background: collapsed ? 'rgba(225,29,72,0.12)' : 'transparent',
              color: '#e11d48',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              fontSize: 16,
              fontWeight: 700,
              lineHeight: 1,
              fontFamily: 'sans-serif',
              borderRadius: 4,
              ...( { WebkitAppRegion: 'no-drag' } as any ),
            }}
          >
            {collapsed ? '∨' : '∧'}
          </button>
          {collapsed && (
            <Typography
              variant="caption"
              sx={{ color: isDarkMode ? '#ddd' : '#444', userSelect: 'none', pointerEvents: 'none', opacity: 0.9, ml: 0.5 }}
            >
              阮琳云
            </Typography>
          )}
        </Box>
        {!collapsed && (
          <Typography
            variant="subtitle1"
            sx={{ color: isDarkMode ? 'white' : 'text.primary', fontWeight: 500, userSelect: 'none', pointerEvents: 'none' }}
          >
            阮琳云
          </Typography>
        )}
      </Box>

      <Box sx={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: isDarkMode ? '#0e0e0e' : '#f0f2f5',
      }}>
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative', bgcolor: '#0c0c12' }}>
          {dshUrl ? (
            <iframe
              key={dshUrl}
              src={dshUrl}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                background: '#0c0c12',
                display: 'block',
              }}
              title="DeepSeek Harness"
              allow="clipboard-read; clipboard-write; microphone"
              // [v174 真实进度] iframe 文档+子资源加载完 = 真实里程碑 78（不再是"瞬间 100 还要等"）；
              //   再等一个短settle 让 DSH 首帧画出来才报 100（这是能拿到的最真实的"画完了"信号）
              onLoad={() => {
                if (dshUiReady) return;
                setBootProgress(78);
                setBootTip(tt('home.bootRendering'));
                window.setTimeout(() => {
                  setDshUiReady(true);
                  setBootProgress(100);
                  setBootTip(tt('home.bootReady'));
                }, 700);
              }}
              onError={() => {
                setDshUrl(null);
                setDshUiReady(false);
                setBootProgress(8);
                setBootTip(tt('home.bootRetry'));
                startPoll();
              }}
            />
          ) : null}
          {showOverlay && (
            <Box sx={{
              position: 'absolute', inset: 0, zIndex: 15,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: 2,
              bgcolor: '#0c0c12',
              '@keyframes rl-sweep': { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(320%)' } },
            }}>
              <Box sx={{
                width: 40, height: 40, borderRadius: '50%',
                border: '3px solid rgba(255,255,255,0.12)',
                borderTopColor: 'rgba(255,255,255,0.92)',
                borderRightColor: 'rgba(255,255,255,0.35)',
                animation: 'rl-spin 0.85s cubic-bezier(0.45,0.05,0.35,1) infinite',
                '@keyframes rl-spin': { to: { transform: 'rotate(360deg)' } },
              }} />
              <Box sx={{ position: 'relative', width: 240, maxWidth: '70%', height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
                <Box sx={{
                  position: 'absolute', left: 0, top: 0,
                  width: '3%',
                  height: '100%',
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.9)',
                }} data-progfill="" />
                {/* [v174] 等待态扫描光带：没有真实新里程碑时显示，表示"在等，但不知道还有多久" */}
                <Box sx={{
                  position: 'absolute', left: 0, top: 0, height: '100%', width: '36%',
                  borderRadius: 2, opacity: 0, pointerEvents: 'none',
                  background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 100%)',
                }} data-progsweep="" />
              </Box>
              <Typography variant="body2" sx={{ color: 'rgba(232,232,232,0.85)', letterSpacing: 1 }}>
                {bootTip} · <span data-progpct="">0%</span>
              </Typography>
            </Box>
          )}
          {/* 5s 到点后：不硬控，内容区进度条 + 可重试 */}
          {showInlineLoad && (
            <Box sx={{
              position: 'absolute', left: 0, right: 0, top: 0, zIndex: 8,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 1, pt: 3, px: 2,
              bgcolor: 'transparent',
              pointerEvents: 'none',
            }}>
              <Box sx={{ position: 'relative', width: 240, maxWidth: '80%', height: 3, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
                <Box sx={{
                  position: 'absolute', left: 0, top: 0,
                  width: '3%',
                  height: '100%',
                  bgcolor: 'rgba(255,255,255,0.85)',
                }} data-progfill="" />
                <Box sx={{
                  position: 'absolute', left: 0, top: 0, height: '100%', width: '36%',
                  borderRadius: 2, opacity: 0, pointerEvents: 'none',
                  background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 100%)',
                }} data-progsweep="" />
              </Box>
              <Typography variant="caption" sx={{ color: 'rgba(232,232,232,0.8)', letterSpacing: 1 }}>
                {dshError || bootTip} · <span data-progpct="">0%</span>
              </Typography>
              {!!dshError && (
                <Typography
                  component="button"
                  variant="caption"
                  onClick={() => { setDshError(null); setDshUiReady(false); setWaitOverdue(false); bootDsh(); }}
                  style={{
                    cursor: 'pointer', border: 'none', background: 'transparent',
                    color: 'rgba(232,232,232,0.75)', textDecoration: 'underline',
                    pointerEvents: 'auto',
                  }}
                >
                  重试
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default HomePage;
