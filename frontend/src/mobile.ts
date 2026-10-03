/**
 * mobile.ts - 移动设备检测与布局适配工具
 * 
 * 提供 isMobile() 函数和 useMobileLayout() hook
 * 用于检测移动设备并切换布局
 */

import { useState, useEffect } from 'react';

/**
 * 检测当前设备是否为移动设备
 * 综合判断：UserAgent + Capacitor 平台 + 屏幕宽度
 */
/**
 * 是否运行在原生容器（Capacitor Android / iOS WebView）中。
 *
 * 判定顺序做了冗余，原因是 Capacitor 的 JS 桥注入时机在不同 ROM/WebView 版本上并不一致：
 *   1) Capacitor.isNativePlatform()：官方 API，注入完成后最准确；
 *   2) Capacitor.getPlatform()：旧版本没有 isNativePlatform；
 *   3) androidBridge / webkit.messageHandlers.bridge：桥对象本身，早于 Capacitor 全局可用；
 *   4) UA 兜底：WebView 尚未注入任何桥时，靠 UA 也能识别出安卓机。
 * 任一命中即视为原生，避免"首帧误判为桌面端"导致渲染 Electron 专用组件。
 */
export function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as any;
  const cap = w.Capacitor;
  if (cap) {
    if (typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) return true;
    const platform = typeof cap.getPlatform === 'function' ? cap.getPlatform() : undefined;
    if (platform === 'android' || platform === 'ios') return true;
  }
  // 桥对象兜底：这两个对象由 WebView 宿主注入，通常早于 Capacitor 全局变量就绪
  if (w.androidBridge) return true;
  if (w.webkit?.messageHandlers?.bridge) return true;
  return false;
}

export function isMobile(): boolean {
  // Capacitor 环境检测（Android WebView）
  if (isNativePlatform()) return true;

  // [2026-08-29 黑屏根因修复] Electron 桌面端禁用宽度判定：
  // 主窗口宽度可能瞬时小于 768（拖动/最小化/恢复动画），旧逻辑会把 PC 界面
  // 翻转成 MobileLayout（hooks 结构不同）→ React error #306 → 整树卸载黑屏，
  // 且 100ms 轮询一旦判 true 即锁死不回退。Electron 恒为桌面端布局；
  // 安卓/iOS 由上方 isNativePlatform() 覆盖，不受影响。
  const uaElectron = (navigator.userAgent || '').includes('Electron');
  if (uaElectron) return false;

  // UserAgent 检测
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua.toLowerCase());
  if (isMobileUA) return true;

  // 屏幕宽度检测（小于 768px 视为移动设备）
  if (typeof window !== 'undefined' && window.innerWidth < 768) {
    return true;
  }

  return false;
}

/**
 * React Hook: 检测是否应使用移动端布局
 * 监听窗口大小变化，响应式切换
 */
export function useMobileLayout(): boolean {
  const [mobile, setMobile] = useState(isMobile);

  useEffect(() => {
    let raf = 0;
    // resize/orientationchange 在旋转过程中会高频触发，用 rAF 合并到每帧一次，
    // 避免连续 setState 造成的重复渲染与掉帧。
    const handleResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setMobile(isMobile()));
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // [修复 BLOCKER-1 核心] 轮询复检 Capacitor 桥注入。
    //   WebView 冷启动直达 /pet 时，JS 可能早于 Capacitor 桥注入执行，
    //   此时 isMobile() 返回 false 且此后没有任何 resize 事件来纠正它，
    //   布局会被永久锁死在桌面端分支。这里在挂载后的短时间内复检，
    //   一旦检测到原生平台立即纠正并停止轮询（正常情况下 1~2 次即命中）。
    let tries = 0;
    const timer = window.setInterval(() => {
      tries++;
      const next = isMobile();
      if (next) {
        setMobile(true);
        window.clearInterval(timer);
      } else if (tries >= 20) {
        // 累计约 2s 仍未检测到原生桥，认定确为桌面端，停止轮询避免空转耗电
        window.clearInterval(timer);
      }
    }, 100);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(timer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return mobile;
}

/**
 * 获取安全区域 inset（用于刘海屏/全面屏适配）
 */
export function getSafeAreaInsets() {
  const style = getComputedStyle(document.documentElement);
  return {
    top: parseInt(style.getPropertyValue('--sat') || '0', 10),
    bottom: parseInt(style.getPropertyValue('--sab') || '0', 10),
    left: parseInt(style.getPropertyValue('--sal') || '0', 10),
    right: parseInt(style.getPropertyValue('--sar') || '0', 10),
  };
}
