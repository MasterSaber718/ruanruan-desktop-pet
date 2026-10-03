import express from 'express';
import multer from 'multer';
import { getLatestVersion, uploadUpdate, downloadUpdate } from '../controllers/updateController';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// 获取最新版本信息
router.get('/latest', getLatestVersion);

// 上传新版本
router.post('/upload', upload.single('updateFile'), uploadUpdate);

// 下载更新
router.get('/download', downloadUpdate);

export default router;
