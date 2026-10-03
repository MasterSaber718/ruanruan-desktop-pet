import express from 'express';
import { execSync } from 'child_process';

const router = express.Router();

// 执行ADB命令
const executeAdbCommand = (command: string): string => {
  try {
    return execSync(`adb ${command}`, { encoding: 'utf8' });
  } catch (error: any) {
    return error.message;
  }
};

// 获取连接的设备
router.get('/devices', (req, res) => {
  try {
    const output = executeAdbCommand('devices');
    res.json({ message: '获取设备列表成功', data: output });
  } catch (error: any) {
    res.status(500).json({ message: '获取设备列表失败', error: error.message });
  }
});

// 点击屏幕
router.post('/tap', (req, res) => {
  const { x, y } = req.body;
  if (!x || !y) {
    return res.status(400).json({ message: '请提供坐标x和y' });
  }
  
  try {
    const output = executeAdbCommand(`shell input tap ${x} ${y}`);
    res.json({ message: '点击成功', data: output });
  } catch (error: any) {
    res.status(500).json({ message: '点击失败', error: error.message });
  }
});

// 滑动屏幕
router.post('/swipe', (req, res) => {
  const { x1, y1, x2, y2, duration = 300 }: { x1: number; y1: number; x2: number; y2: number; duration?: number } = req.body;
  if (!x1 || !y1 || !x2 || !y2) {
    return res.status(400).json({ message: '请提供起始坐标和结束坐标' });
  }
  
  try {
    const output = executeAdbCommand(`shell input swipe ${x1} ${y1} ${x2} ${y2} ${duration}`);
    res.json({ message: '滑动成功', data: output });
  } catch (error: any) {
    res.status(500).json({ message: '滑动失败', error: error.message });
  }
});

// 输入文本
router.post('/input', (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ message: '请提供要输入的文本' });
  }
  
  try {
    const output = executeAdbCommand(`shell input text ${text.replace(/ /g, '%s')}`);
    res.json({ message: '输入成功', data: output });
  } catch (error: any) {
    res.status(500).json({ message: '输入失败', error: error.message });
  }
});

export default router;