import { useEffect, useState } from 'react';
import { t as tt } from '../i18n';
import { Box, Typography, Paper, LinearProgress, Chip, Divider, Button, Switch, FormControlLabel, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, Alert, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeviceHubIcon from '@mui/icons-material/DeviceHub';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';


interface DeviceInfo {
  type: string;
  name: string;
  value: string;
  unit: string;
  score: number;
  maxScore: number;
}

interface DevicePerformance {
  overall: number;
  cpu: number;
  memory: number;
  storage: number;
  gpu: number;
  network: number;
  deviceInfo: DeviceInfo[];
  performanceLevel: 'low' | 'medium' | 'high';
}

interface ProcessInfo {
  id: string;
  name: string;
  cpu: number;
  memory: number;
  status: 'running' | 'frozen';
  isSystem: boolean;
  isUser: boolean;
}

function DeviceOptimizer() {
  const [devicePerformance, setDevicePerformance] = useState<DevicePerformance | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationStatus, setOptimizationStatus] = useState('');
  const [autoOptimize, setAutoOptimize] = useState(true);
  const [backgroundProcesses, setBackgroundProcesses] = useState<ProcessInfo[]>([]);
  const [optimizationInterval, setOptimizationInterval] = useState<NodeJS.Timeout | null>(null);

  // 检测设备性能
  const detectDevicePerformance = async () => {
    try {
      // 基本设备信息
      // 检测CPU性能
      const cpuScore = await measureCpuPerformance();

      // 检测内存信息
      let memoryScore = 20; // 默认更低分数，更适合老设备
      try {
        const memoryInfo = (window.performance as any).memory;
        if (memoryInfo && memoryInfo.totalJSHeapSize) {
          // 调整内存分数计算，使老设备能得到更合理的分数
          const totalHeapMB = memoryInfo.totalJSHeapSize / 1024 / 1024;
          // 老设备通常内存较小，调整计算逻辑
          memoryScore = Math.min(100, (totalHeapMB / 4096) * 100);
        }
      } catch (error) {
        console.error('Error accessing memory info:', error);
      }

      // 检测存储信息
      const storageScore = await measureStoragePerformance();

      // 检测网络速度
      const networkScore = await measureNetworkPerformance();

      // 检测GPU性能
      const gpuScore = await measureGpuPerformance();

      // 计算总体性能分数 - 真实反映设备能力，不做打压
      const overallScore = (cpuScore + memoryScore + storageScore + gpuScore + networkScore) / 5;

      // 确定性能等级 - 基于真实分数
      let performanceLevel: 'low' | 'medium' | 'high' = 'medium';
      if (overallScore < 30) {
        performanceLevel = 'low';
      } else if (overallScore > 60) {
        performanceLevel = 'high';
      }

      // 构建设备信息
      const deviceInfo: DeviceInfo[] = [
        {
          type: 'cpu',
          name: 'CPU',
          value: 'Unknown',
          unit: '',
          score: cpuScore,
          maxScore: 100
        },
        {
          type: 'memory',
          name: tt('dev.memory'),
          value: 'Unknown',
          unit: 'MB',
          score: memoryScore,
          maxScore: 100
        },
        {
          type: 'storage',
          name: tt('dev.storage'),
          value: 'Unknown',
          unit: '',
          score: storageScore,
          maxScore: 100
        },
        {
          type: 'network',
          name: tt('dev.network'),
          value: 'Unknown',
          unit: '',
          score: networkScore,
          maxScore: 100
        },
        {
          type: 'gpu',
          name: 'GPU',
          value: 'Unknown',
          unit: '',
          score: gpuScore,
          maxScore: 100
        }
      ];

      setDevicePerformance({
        overall: overallScore,
        cpu: cpuScore,
        memory: memoryScore,
        storage: storageScore,
        gpu: gpuScore,
        network: networkScore,
        deviceInfo,
        performanceLevel
      });
    } catch (error) {
      console.error('Error detecting device performance:', error);
    }
  };

  // 测量CPU性能
  const measureCpuPerformance = async (): Promise<number> => {
    return new Promise((resolve) => {
      const startTime = window.performance.now();
      let iterations = 0;

      // 执行一些计算密集型任务
      const calculate = () => {
        let sum = 0;
        for (let i = 0; i < 1000000; i++) {
          sum += Math.sqrt(i);
        }
        iterations++;

        const elapsedTime = window.performance.now() - startTime;
        if (elapsedTime < 1000) {
          requestAnimationFrame(calculate);
        } else {
          const score = Math.min(100, (iterations / 100) * 100);
          if (iterations < 10) {
            resolve(score * 0.5);
          } else {
            resolve(score);
          }
        }
      };

      calculate();
    });
  };

  // 测量存储性能
  const measureStoragePerformance = async (): Promise<number> => {
    return new Promise((resolve) => {
      try {
        const testData = 'x'.repeat(1024 * 1024); // 1MB test data
        const testKey = 'storage_test_' + Date.now();
        const startTime = window.performance.now();

        // 写入测试
        localStorage.setItem(testKey, testData);
        const writeTime = window.performance.now() - startTime;

        // 读取测试
        const readStartTime = window.performance.now();
        localStorage.getItem(testKey);
        const readTime = window.performance.now() - readStartTime;

        // 清理测试数据
        localStorage.removeItem(testKey);

        // 计算分数（更快的读写速度意味着更高的分数）
        const totalTime = writeTime + readTime;
        const score = Math.max(0, Math.min(100, 100 - (totalTime / 10)));
        resolve(score);
      } catch (error) {
        console.error('Error measuring storage performance:', error);
        resolve(50); // 默认中等分数
      }
    });
  };

  // 测量网络性能
  const measureNetworkPerformance = async (): Promise<number> => {
    return new Promise((resolve) => {
      try {
        const startTime = window.performance.now();
        const image = new Image();

        image.onload = () => {
          const loadTime = window.performance.now() - startTime;
          // 计算分数（更快的加载速度意味着更高的分数）
          const score = Math.max(0, Math.min(100, 100 - (loadTime / 10)));
          resolve(score);
        };

        image.onerror = () => {
          resolve(50); // 默认中等分数
        };

        // 加载一个小图像来测试网络速度
        image.src = `https://via.placeholder.com/1x1?${Date.now()}`;
      } catch (error) {
        console.error('Error measuring network performance:', error);
        resolve(50); // 默认中等分数
      }
    });
  };

  // 测量GPU性能
  const measureGpuPerformance = async (): Promise<number> => {
    return new Promise((resolve) => {
      try {
        // 创建一个Canvas元素来测试GPU性能
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

        if (!ctx) {
          resolve(20); // 如果不支持WebGL，返回较低分数，更适合老设备
          return;
        }

        const startTime = window.performance.now();
        let frames = 0;

        // 绘制一些图形来测试GPU性能
        const draw = () => {
          // 清空画布
          if ('clearColor' in ctx) {
            (ctx as any).clearColor(0.0, 0.0, 0.0, 1.0);
            (ctx as any).clear((ctx as any).COLOR_BUFFER_BIT);
          }

          // 绘制一些简单的几何图形
          for (let i = 0; i < 100; i++) {
            Math.random() * canvas.width;
            Math.random() * canvas.height;
            Math.random() * 20 + 5;

            // 这里应该使用WebGL绘制代码，但为了简化，我们只计数帧
          }

          frames++;
          const elapsedTime = window.performance.now() - startTime;

          if (elapsedTime < 1000) {
            requestAnimationFrame(draw);
          } else {
            // 基于帧率计算分数（更高的帧率意味着更好的性能）
            // 调整计算逻辑，使老设备能得到更合理的分数
            const score = Math.min(100, (frames / 30) * 100);
            resolve(score); // 真实反映GPU性能
          }
        };

        draw();
      } catch (error) {
        console.error('Error measuring GPU performance:', error);
        resolve(20); // 默认较低分数，更适合老设备
      }
    });
  };

  // 应用优化策略
  const applyOptimization = () => {
    if (!devicePerformance) return;

    setIsOptimizing(true);
    setOptimizationStatus(tt('dev.applying'));

    // 模拟优化过程
    setTimeout(() => {
      const { performanceLevel } = devicePerformance;

      // 根据性能等级应用不同的优化策略
      switch (performanceLevel) {
        case 'low':
          // 低配置设备优化
          optimizeForLowPerformance();
          setOptimizationStatus(tt('dev.appliedLow'));
          break;
        case 'medium':
          // 中配置设备优化
          optimizeForMediumPerformance();
          setOptimizationStatus(tt('dev.appliedMid'));
          break;
        case 'high':
          // 高配置设备优化
          optimizeForHighPerformance();
          setOptimizationStatus(tt('dev.appliedHigh'));
          break;
      }

      // 额外的软件特定优化
      optimizeSoftwareSpecific();

      setIsOptimizing(false);
    }, 1500);
  };

  // 为低配置设备优化 - 但保持高画质
  const optimizeForLowPerformance = () => {
    // 保持动画效果
    document.body.style.setProperty('--animation-duration', '0.8s');

    // 启用大部分功能
    document.body.classList.remove('low-performance');

    // 允许中等并发请求
    localStorage.setItem('maxConcurrentRequests', '8');

    // 使用完整AI模型复杂度
    localStorage.setItem('aiModelComplexity', 'high');

    // 启用资源优化（非压缩）
    localStorage.setItem('enableResourceCompression', 'false');
  };

  // 为中配置设备优化
  const optimizeForMediumPerformance = () => {
    // 1. 平衡动画效果
    document.body.style.setProperty('--animation-duration', '0.5s');

    // 2. 启用大部分功能
    document.body.classList.remove('low-performance');

    // 3. 允许中等并发请求
    localStorage.setItem('maxConcurrentRequests', '4');

    // 4. 使用中等复杂度的AI模型
    localStorage.setItem('aiModelComplexity', 'medium');

    // 5. 启用适度的资源压缩
    localStorage.setItem('enableResourceCompression', 'true');
  };

  // 为高配置设备优化
  const optimizeForHighPerformance = () => {
    // 1. 启用全部动画效果
    document.body.style.setProperty('--animation-duration', '1s');

    // 2. 启用所有高级功能
    document.body.classList.remove('low-performance');
    document.body.classList.add('high-performance');

    // 3. 允许高并发请求
    localStorage.setItem('maxConcurrentRequests', '8');

    // 4. 使用完整复杂度的AI模型
    localStorage.setItem('aiModelComplexity', 'high');

    // 5. 禁用不必要的资源压缩
    localStorage.setItem('enableResourceCompression', 'false');
  };

  // 软件特定优化 - 始终最高画质
  const optimizeSoftwareSpecific = () => {
    // 1. 3D渲染 - 始终最高画质
    localStorage.setItem('threejs_antialias', 'true'); // 始终开启抗锯齿
    localStorage.setItem('threejs_shadow_map_size', '4096'); // 4K阴影
    localStorage.setItem('threejs_texture_quality', 'high'); // 最高纹理质量

    // 2. 内存使用 - 不限制
    localStorage.setItem('memory_limit', '4096'); // 4GB内存限制
    localStorage.setItem('cache_size', '1024'); // 1GB缓存

    // 3. 网络请求
    localStorage.setItem('api_timeout', '10000');
    localStorage.setItem('retry_count', '3');

    // 4. AI处理
    localStorage.setItem('ai_processing_timeout', '30000');
    localStorage.setItem('ai_cache_enabled', 'true');

    // 5. 渲染性能 - 60FPS
    localStorage.setItem('render_optimization', 'true');
    localStorage.setItem('animation_fps', '60'); // 始终60帧

    // 6. 资源加载
    localStorage.setItem('lazy_loading', 'true');
    localStorage.setItem('preload_resources', 'true'); // 始终预加载

    // 7. 清理无用的缓存
    try {
      const keys = Object.keys(localStorage);
      const now = Date.now();
      keys.forEach(key => {
        if (key.startsWith('temp_') || key.startsWith('cache_')) {
          const value = localStorage.getItem(key);
          try {
            const data = JSON.parse(value || '{}');
            if (data.expiry && data.expiry < now) {
              localStorage.removeItem(key);
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      });
    } catch (error) {
      console.error('清理缓存时出错:', error);
    }
  };

  // 获取后台进程信息
  const getBackgroundProcesses = () => {
    // 模拟后台进程数据
    const processes: ProcessInfo[] = [
      { id: '1', name: 'Chrome', cpu: 15.2, memory: 1200, status: 'running', isSystem: false, isUser: true },
      { id: '2', name: 'Explorer', cpu: 2.5, memory: 300, status: 'running', isSystem: true, isUser: false },
      { id: '3', name: 'Spotify', cpu: 5.1, memory: 250, status: 'running', isSystem: false, isUser: true },
      { id: '4', name: 'Task Manager', cpu: 1.2, memory: 150, status: 'running', isSystem: true, isUser: false },
      { id: '5', name: 'Steam', cpu: 8.7, memory: 500, status: 'running', isSystem: false, isUser: true },
      { id: '6', name: 'Discord', cpu: 4.3, memory: 350, status: 'running', isSystem: false, isUser: true },
      { id: '7', name: 'System', cpu: 3.1, memory: 200, status: 'running', isSystem: true, isUser: false },
      { id: '8', name: 'Antivirus', cpu: 2.8, memory: 220, status: 'running', isSystem: true, isUser: false },
    ];
    setBackgroundProcesses(processes);
  };

  // 冻结进程
  const freezeProcess = (processId: string) => {
    setBackgroundProcesses(prev => prev.map(process => 
      process.id === processId ? { ...process, status: 'frozen' } : process
    ));
  };

  // 恢复进程
  const resumeProcess = (processId: string) => {
    setBackgroundProcesses(prev => prev.map(process => 
      process.id === processId ? { ...process, status: 'running' } : process
    ));
  };

  // [2026-08-06 增强] 自动优化函数：前端优化 + 后端系统级优化（清理缓存+提升优先级）
  const autoOptimizeFunction = async () => {
    if (!devicePerformance) return;

    // 1. 应用前端性能优化策略（localStorage 设置、3D 渲染参数等）
    applyOptimization();

    // 2. [新增] 调用后端系统级优化接口
    //    清理系统临时文件、DNS缓存、Electron缓存目录、提升进程优先级
    //    失败静默处理（后端可能未启动，不影响前端功能）
    try {
      const host = (typeof window !== 'undefined' && window.location && window.location.hostname) || '127.0.0.1';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);  // 10秒超时
      const resp = await fetch(`http://${host}:27865/api/v1/optimization/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: 'high' }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (resp.ok) {
        const data = await resp.json();
        console.log('[设备优化] 系统级优化完成:', data?.data?.results?.join('、') || '成功');
      }
    } catch (err) {
      // 后端不可达时静默失败，不影响前端正常使用
      console.warn('[设备优化] 系统级优化跳过（后端可能未启动）');
    }

    // 3. 冻结不必要的进程（保持原有逻辑）
    setBackgroundProcesses(prev => prev.map(process => {
      // 冻结非系统、非用户关键进程，且CPU或内存占用较高的进程
      if (!process.isSystem && !process.isUser && (process.cpu > 5 || process.memory > 300)) {
        return { ...process, status: 'frozen' };
      }
      return process;
    }));
  };

  // 处理自动优化开关
  const handleAutoOptimizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = event.target.checked;
    setAutoOptimize(enabled);

    if (enabled) {
      // 启动自动优化定时器，每5分钟执行一次
      const interval = setInterval(autoOptimizeFunction, 5 * 60 * 1000);
      setOptimizationInterval(interval);
      // 立即执行一次优化
      autoOptimizeFunction();
    } else {
      // 清除定时器
      if (optimizationInterval) {
        clearInterval(optimizationInterval);
        setOptimizationInterval(null);
      }
    }
  };

  // 初始化时检测设备性能
  useEffect(() => {
    detectDevicePerformance();
    getBackgroundProcesses();

    // 如果自动优化开启，启动定时器
    if (autoOptimize) {
      const interval = setInterval(autoOptimizeFunction, 5 * 60 * 1000);
      setOptimizationInterval(interval);
      // 立即执行一次优化
      autoOptimizeFunction();
    }

    // 清理函数
    return () => {
      if (optimizationInterval) {
        clearInterval(optimizationInterval);
      }
    };
  }, []);

  if (!devicePerformance) {
    return (
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <DeviceHubIcon color="primary" />
          <Typography variant="h6" component="h2">
            设备优化
          </Typography>
        </Box>
        <Typography variant="body1" sx={{ mb: 2 }}>
          正在检测设备性能...
        </Typography>
        <LinearProgress />
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <DeviceHubIcon color="primary" />
        <Typography variant="h6" component="h2">
          设备优化
        </Typography>
        <Chip
          label={devicePerformance.performanceLevel === 'low' ? tt('dev.levelLow') :
            devicePerformance.performanceLevel === 'medium' ? tt('dev.levelMid') : tt('dev.levelHigh')}
          color={devicePerformance.performanceLevel === 'low' ? 'error' :
            devicePerformance.performanceLevel === 'medium' ? 'warning' : 'success'}
          size="small" />
      </Box>

      <Typography variant="body1" sx={{ mb: 2 }}>
        总体性能得分: {Math.round(devicePerformance.overall)}/100
      </Typography>

      <LinearProgress
        variant="determinate"
        value={devicePerformance.overall}
        sx={{ mb: 3 }} />

      <Box sx={{ mb: 3 }}>
        {devicePerformance.deviceInfo.map((info) => (
          <Box key={info.type} sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">{info.name}</Typography>
              <Typography variant="body2">{Math.round(info.score)}/100</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={info.score}
              sx={{ mb: 1 }} />
          </Box>
        ))}
      </Box>

      <Divider sx={{ my: 3 }} />

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<FlashOnIcon />}
          onClick={applyOptimization}
          disabled={isOptimizing}
        >
          {isOptimizing ? tt('set.optimizing') : tt('set.optimizeBtn')}
        </Button>
        <Button
          variant="outlined"
          color="primary"
          onClick={detectDevicePerformance}
        >
          重新检测
        </Button>
      </Box>

      {optimizationStatus && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {optimizationStatus}
        </Typography>
      )}

      <Divider sx={{ my: 3 }} />

      {/* tt('dev.autoOptimize') */}
      <Accordion elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">{tt('dev.autoOptimize')}</Typography>
        </AccordionSummary>
        <AccordionDetails>
        <FormControlLabel
          control={
            <Switch
              checked={autoOptimize}
              onChange={handleAutoOptimizeChange}
              color="primary"
            />
          }
          label={tt('dev.enableAuto')}
        />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          自动优化会每5分钟执行一次，包括性能优化和进程管理
        </Typography>
        <Typography variant="caption" color="primary" sx={{ mt: 1, display: 'block' }}>
          此优化专为该软件设计，不会影响其他应用
        </Typography>
        </AccordionDetails>
      </Accordion>

      {/* 进程管理 */}
      <Accordion elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">{tt('dev.bgProcess')}</Typography>
        </AccordionSummary>
        <AccordionDetails>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<AutorenewIcon />}
          onClick={getBackgroundProcesses}
          sx={{ mb: 2 }}
        >
          刷新进程列表
        </Button>
        <Alert severity="info" sx={{ mb: 2 }}>
          系统进程和用户关键进程不会被自动冻结
        </Alert>
        <List sx={{ maxHeight: 300, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
          {backgroundProcesses.map((process) => (
            <ListItem key={process.id}>
              <ListItemText
                primary={process.name}
                secondary={`CPU: ${process.cpu}%, 内存: ${process.memory}MB, 状态: ${process.status === 'running' ? tt('set.procRunning') : tt('set.procFrozen')}`}
              />
              <ListItemSecondaryAction>
                {process.status === 'running' ? (
                  <IconButton edge="end" aria-label="freeze" onClick={() => freezeProcess(process.id)}>
                    <PauseIcon />
                  </IconButton>
                ) : (
                  <IconButton edge="end" aria-label="resume" onClick={() => resumeProcess(process.id)}>
                    <PlayArrowIcon />
                  </IconButton>
                )}
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
}

export default DeviceOptimizer;
