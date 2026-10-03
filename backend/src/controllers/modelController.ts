import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// 解压ZIP文件并调用Blender API导入模型
export const importModelFromZip = async (req: Request, res: Response): Promise<void> => {
  try {
    // 检查是否有文件上传
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const zipPath = req.file.path;
    const tempDir = path.join(__dirname, '../../temp', `model_${Date.now()}`);

    // 自动查找 Blender 可执行文件
    const blenderPaths = [
      process.env.BLENDER_PATH || '',
      'C:\\Program Files\\Blender Foundation\\Blender 4.0\\blender.exe',
      'C:\\Program Files\\Blender Foundation\\Blender 3.6\\blender.exe',
      'C:\\Program Files\\Blender Foundation\\Blender 4.1\\blender.exe',
      'C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe',
    ];
    const blenderPath = blenderPaths.find(p => p && fs.existsSync(p)) || 'blender';

    // 创建临时目录
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // 解压ZIP文件
    // [安全] 单引号双写转义（PowerShell 单引号字符串内转义规则），防文件名含单引号破坏命令
    console.log('Extracting ZIP file...');
    const psEscape = (s: string) => s.replace(/'/g, "''");
    await execAsync(`powershell -Command "Expand-Archive -Path '${psEscape(zipPath)}' -DestinationPath '${psEscape(tempDir)}'"`);

    // 筛选模型文件
    const modelExtensions = ['.obj', '.fbx', '.glb', '.gltf', '.pmx'];
    const modelFiles: string[] = [];

    const tempRoot = path.resolve(tempDir);
    const walkDirectory = (dir: string) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        // [安全] zip slip 防护：ZIP 内条目路径必须位于解压目录内（防 ../ 越界写）
        const resolved = path.resolve(filePath);
        if (resolved !== tempRoot && !resolved.startsWith(tempRoot + path.sep)) {
          console.warn(`[安全] 跳过越界路径: ${file}`);
          continue;
        }
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          walkDirectory(filePath);
        } else {
          const ext = path.extname(file).toLowerCase();
          if (modelExtensions.includes(ext)) {
            modelFiles.push(filePath);
          }
        }
      }
    };

    walkDirectory(tempDir);

    if (modelFiles.length === 0) {
      // 清理临时文件
      fs.rmSync(tempDir, { recursive: true, force: true });
      fs.unlinkSync(zipPath);
      
      res.status(400).json({ error: 'No model files found in ZIP' });
      return;
    }

    // 调用Blender API导入模型
    console.log('Importing models with Blender API...');
    const importResults = [];

    for (const modelPath of modelFiles) {
      try {
        const ext = path.extname(modelPath).toLowerCase();
        // [安全] 用 JSON.stringify 生成合法 Python 字符串字面量（路径含引号/反斜杠时不会破坏脚本）
        const pyModelPath = JSON.stringify(modelPath);
        const pyBlendPath = JSON.stringify(modelPath.replace(path.extname(modelPath), '.blend'));
        let importCommand = '';

        switch (ext) {
          case '.obj':
            importCommand = `bpy.ops.import_scene.obj(filepath=${pyModelPath})`;
            break;
          case '.fbx':
            importCommand = `bpy.ops.import_scene.fbx(filepath=${pyModelPath})`;
            break;
          case '.glb':
          case '.gltf':
            importCommand = `bpy.ops.import_scene.gltf(filepath=${pyModelPath})`;
            break;
          case '.pmx':
            importCommand = `bpy.ops.import_scene.mmd(filepath=${pyModelPath})`;
            break;
          default:
            continue;
        }

        const script = `
import bpy
import os

# 清除默认场景
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# 导入模型
${importCommand}

# 保存为Blender文件
bpy.ops.wm.save_as_mainfile(filepath=${pyBlendPath})

print('Model imported successfully:', ${pyModelPath})
`;

        // [安全] 脚本写入临时 .py 文件再执行（--python-expr 传长脚本含引号时存在命令行拼接注入面）
        const scriptPath = path.join(tempDir, `import_${Date.now()}_${modelFiles.indexOf(modelPath)}.py`);
        fs.writeFileSync(scriptPath, script, 'utf8');
        const result = await execAsync(`"${blenderPath}" --background --python "${scriptPath}"`);
        importResults.push({
          file: modelPath,
          success: true,
          output: result.stdout
        });

      } catch (error) {
        importResults.push({
          file: modelPath,
          success: false,
          error: (error as Error).message
        });
      }
    }

    // 清理临时文件
    fs.rmSync(tempDir, { recursive: true, force: true });
    fs.unlinkSync(zipPath);

    res.status(200).json({
      message: 'Model import process completed',
      results: importResults
    });

  } catch (error) {
    console.error('Error importing model:', error);
    res.status(500).json({ error: 'Failed to import model' });
  }
};
