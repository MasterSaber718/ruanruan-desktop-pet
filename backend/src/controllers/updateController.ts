import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { Update } from '../models/Update';

// 获取最新版本信息
export const getLatestVersion = async (req: Request, res: Response): Promise<void> => {
  try {
    const platform = req.query.platform as string;
    const currentVersion = req.query.version as string;

    if (!platform) {
      res.status(400).json({ error: '平台参数是必需的' });
      return;
    }

    // 从数据库获取最新版本信息
    const latestUpdate = await Update.findOne({ platform }).sort({ version: -1 }).exec();

    if (!latestUpdate) {
      res.status(404).json({ error: '未找到该平台的更新' });
      return;
    }

    // 检查是否需要更新
    const needsUpdate = compareVersions(currentVersion, latestUpdate.version) < 0;

    res.json({
      version: latestUpdate.version,
      needsUpdate,
      updateUrl: latestUpdate.updateUrl,
      releaseNotes: latestUpdate.releaseNotes,
      forceUpdate: latestUpdate.forceUpdate
    });
  } catch (error) {
    console.error('获取最新版本信息失败:', error);
    res.status(500).json({ error: '获取最新版本信息失败' });
  }
};

// 上传新版本
export const uploadUpdate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { platform, version, releaseNotes, forceUpdate } = req.body;
    const file = req.file;

    if (!platform || !version || !file) {
      res.status(400).json({ error: '平台、版本和文件是必需的' });
      return;
    }

    // 保存文件到服务器
    const uploadPath = path.join(__dirname, '..', '..', 'uploads', `${platform}_${version}.zip`);
    fs.renameSync(file.path, uploadPath);

    // 生成更新URL
    const updateUrl = `${req.protocol}://${req.get('host')}/api/v1/update/download?platform=${platform}&version=${version}`;

    // 保存更新信息到数据库
    const update = new Update({
      platform,
      version,
      updateUrl,
      releaseNotes,
      forceUpdate: forceUpdate || false,
      createdAt: new Date()
    });

    await update.save();

    res.json({
      message: '更新上传成功',
      update
    });
  } catch (error) {
    console.error('上传更新失败:', error);
    res.status(500).json({ error: '上传更新失败' });
  }
};

// 下载更新
export const downloadUpdate = async (req: Request, res: Response): Promise<void> => {
  try {
    const platform = req.query.platform as string;
    const version = req.query.version as string;

    if (!platform || !version) {
      res.status(400).json({ error: '平台和版本参数是必需的' });
      return;
    }

    const filePath = path.join(__dirname, '..', '..', 'uploads', `${platform}_${version}.zip`);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: '更新文件不存在' });
      return;
    }

    res.download(filePath);
  } catch (error) {
    console.error('下载更新失败:', error);
    res.status(500).json({ error: '下载更新失败' });
  }
};

// 版本比较函数
const compareVersions = (version1: string, version2: string): number => {
  const v1 = version1.split('.').map(Number);
  const v2 = version2.split('.').map(Number);

  for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
    const num1 = v1[i] || 0;
    const num2 = v2[i] || 0;

    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  return 0;
};
