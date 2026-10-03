import express from 'express';
import multer from 'multer';
import { importModelFromZip } from '../controllers/modelController';
import path from 'path';

const router = express.Router();

// 配置multer存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    // 确保上传目录存在
    if (!require('fs').existsSync(uploadDir)) {
      require('fs').mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // [安全] 消毒原始文件名：去除路径分隔符与 ..（防路径穿越/命令注入），仅保留安全字符
    const safeName = file.originalname
      .replace(/[\\/]/g, '_')
      .replace(/\.\./g, '_')
      .replace(/[^a-zA-Z0-9._\-\u4e00-\u9fa5]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});

// 配置multer上传
// [安全] 限制上传大小 50MB（与 .env.example MAX_UPLOAD_SIZE 对齐），超限返回 413
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

// 导入模型的路由
router.post('/import/zip', upload.single('model'), importModelFromZip);

export default router;
