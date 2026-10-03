import express from 'express';
import { getScreenInfo } from '../utils/systemInfo';

const router = express.Router();

// 屏幕信息（分辨率 / 工作区）
router.get('/info', (_req, res) => {
  try {
    const info = getScreenInfo();
    if (!info) {
      return res.json({ success: false, message: '获取屏幕信息失败', enabled: false });
    }
    res.json({
      success: true,
      screen: info,
      primary: `${info.width}x${info.height}`,
      message: '屏幕信息获取成功',
    });
  } catch (error: any) {
    res.json({ success: false, message: '获取屏幕信息失败', error: error.message, enabled: false });
  }
});

// 屏幕录制控制
router.post('/record', (_req, res) => {
  res.json({ message: '屏幕录制功能暂未启用', enabled: false });
});

// 屏幕捕获
router.post('/capture', (_req, res) => {
  res.json({ message: '屏幕捕获功能暂未启用', enabled: false });
});

export default router;
