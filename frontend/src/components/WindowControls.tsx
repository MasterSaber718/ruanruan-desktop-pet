import React, { useState, useEffect } from 'react';
import { t as tt } from '../i18n';
import { useLocation } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';

/**
 * WindowControls [v173]
 * - 三键固定右上角（right:0），不随白栏收起移动
 * - 高亮：深色模式=纯白；浅色模式=黑色
 * - [v173] 3D 预览主页（/ 与 /new-page）背景恒为深色画布 → 三键强制白色高亮，不随浅色主题变黑
 */
function WindowControls() {
  const [isMaximized, setIsMaximized] = useState(false);
  const location = useLocation();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  // [v173] 预览主页=深色画布，三键恒白
  const onPreview = location.pathname === '/' || location.pathname === '/new-page';

  useEffect(() => {
    const wc = (window as any).windowControls;
    if (!wc) return;
    wc.isMaximized?.().then((m: boolean) => setIsMaximized(m)).catch(() => {});
    const cleanup = wc.onMaximizeChange?.((m: boolean) => setIsMaximized(m));
    return () => { cleanup?.(); };
  }, []);

  if (location.pathname === '/pet') return null;

  const wc = (window as any).windowControls;
  // 深色=纯白高亮；浅色=黑色高亮；预览主页恒白（画布恒深色）
  const iconColor = (isDarkMode || onPreview) ? '#ffffff' : '#000000';
  const hoverBg = (isDarkMode || onPreview) ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.12)';

  const btnBase: React.CSSProperties = {
    width: 44,
    height: 32,
    border: 'none',
    background: 'transparent',
    color: iconColor,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.15s',
    ...( { WebkitAppRegion: 'no-drag' } as any ),
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        zIndex: 99999,
        display: 'flex',
        height: 36,
        background: 'transparent',
        ...( { WebkitAppRegion: 'no-drag' } as any ),
        pointerEvents: 'auto',
      }}
    >
      <button
        onClick={() => wc?.minimize?.()}
        style={btnBase}
        title={tt('win.minimize')}
        onMouseEnter={(e) => { e.currentTarget.style.background = hoverBg; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <rect x="0" y="4.5" width="10" height="1" fill="currentColor" />
        </svg>
      </button>
      <button
        onClick={() => wc?.toggleMaximize?.()}
        style={btnBase}
        title={isMaximized ? tt('win.restore') : tt('win.maximize')}
        onMouseEnter={(e) => { e.currentTarget.style.background = hoverBg; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        {isMaximized ? (
          <svg width="11" height="11" viewBox="0 0 11 11">
            <rect x="2" y="0" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1" />
            <rect x="0" y="2" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1" />
            <rect x="0" y="2" width="3" height="1" fill="currentColor" />
            <rect x="5" y="9" width="3" height="1" fill="currentColor" />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10">
            <rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
        )}
      </button>
      <button
        onClick={() => wc?.close?.()}
        style={{ ...btnBase, width: 44 }}
        title={tt('win.close')}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#e81123'; e.currentTarget.style.color = '#fff'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = iconColor; }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path d="M0,0 L10,10 M10,0 L0,10" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </button>
    </div>
  );
}

export default WindowControls;
