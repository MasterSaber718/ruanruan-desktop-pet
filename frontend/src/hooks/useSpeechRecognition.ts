/**
 * [v108] 语音输入 Hook — 全部走统一 speechManager（Edge Web Speech）
 * 聊天框麦克风 / 任何页面语音输入只订阅 manager，不再各自连服务。
 */
import { useRef, useCallback, useState, useEffect } from 'react';
import { speechManager } from '../services/speechManager';

interface UseSpeechResult {
  isListening: boolean;
  interimText: string;
  speechError: string;
  start: () => Promise<void>;
  stop: () => void;
}

function appendText(base: string, newText: string): string {
  if (!newText) return base;
  if (!base) return newText;
  if (base.endsWith(newText)) return base;
  if (newText.startsWith(base)) return newText;
  return base + newText;
}

export function useSpeechRecognition(inputRef: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>): UseSpeechResult {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [speechError, setSpeechError] = useState('');
  const unsubRef = useRef<null | (() => void)>(null);
  const writingRef = useRef(false);

  useEffect(() => {
    const off = speechManager.onState((state, status) => {
      // 仅当本 hook 正在“写输入框”时反映 listening；通话占用 manager 时不抢 UI
      if (!writingRef.current) {
        setIsListening(false);
        return;
      }
      setIsListening(state === 'running' && status.listening);
      if (status.error) setSpeechError(status.error);
      else if (state === 'muted') setSpeechError('麦克风已静音');
      else setSpeechError('');
    });
    return () => { off(); };
  }, []);

  const start = useCallback(async () => {
    setSpeechError('');
    writingRef.current = true;
    if (!unsubRef.current) {
      unsubRef.current = speechManager.subscribe((text) => {
        if (!writingRef.current) return;
        const el = inputRef.current;
        if (!el) return;
        const base = el.value || '';
        el.value = appendText(base, text);
        setInterimText('');
        // 触发 React 受控同步（若使用 value+onChange）
        try {
          el.dispatchEvent(new Event('input', { bubbles: true }));
        } catch { /* noop */ }
      });
    }
    await speechManager.start('zh-CN');
    setIsListening(true);
  }, [inputRef]);

  const stop = useCallback(() => {
    writingRef.current = false;
    if (unsubRef.current) {
      try { unsubRef.current(); } catch { /* noop */ }
      unsubRef.current = null;
    }
    // 若没有通话在用 manager，则彻底停；有通话则只取消本 hook 订阅
    // 通话侧自己的 subscribe 仍保留 → 状态同步
    if (speechManager.getState() !== 'stopped') {
      // 不 stop()，避免聊天框关麦把通话也掐了；仅本地停写
    }
    try { speechManager.release(); } catch { /* noop */ }
    setIsListening(false);
    setInterimText('');
  }, []);

  return { isListening, interimText, speechError, start, stop };
}
