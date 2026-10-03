// [FROM PC] ruanlinyun-assistant/frontend/src/pages/SettingsPage.tsx
// 本文件为移动端专用设置页，从 PC 版 SettingsPage 复制而来。
// 改动点（仅移动端，PC 源码未动）：
//   1. 移除 DeviceOptimizer / UpdateManager（PC 设备优化/更新，手机无意义）
//   2. 移除「局域网访问」区块（手机端不跑本地后端，无需局域网）
//   3. 移除「微信机器人」区块（依赖 wechatbot-webhook 后端，手机端无后端）
//   4. AI 模型配置：展示全部 provider（v175.4 起不再按 id 过滤本地模型，
//      本地/云端一律由 baseUrl 决定，本地端点 apiKey 可留空）
//   5. 保存时不再下发到 127.0.0.1:27865 后端（手机端无后端），仅本地持久化

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, FormControlLabel, Switch, TextField, Paper, Divider,
  Accordion, AccordionSummary, AccordionDetails, IconButton, Box, Alert,
  Button, Select, MenuItem, InputLabel, FormControl, CircularProgress, Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import apiConfigService, { ApiProviderConfig, BUILTIN_PROVIDERS } from '../services/ApiConfigService';
import { llmApiService } from '../services/LLMApiService';

interface MobileSettingsPageProps {
  isDarkMode: boolean;
  setIsDarkMode: (value: boolean) => void;
}

// [2026-09-20 v175.4] 本地模型（qwen_local/glm_local）已随本地千问外置撤掉，
//   移动端展示全部 provider；是否本地由 baseUrl 判定，不再按 id 过滤。

function MobileSettingsPage({ isDarkMode, setIsDarkMode }: MobileSettingsPageProps) {
  const navigate = useNavigate();
  const [providers, setProviders] = useState<ApiProviderConfig[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState('deepseek');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);

  // [2026-09-20 v175.4] 不再过滤本地模型 id，全部展示
  const visibleProviders = providers;

  useEffect(() => {
    const init = async () => {
      await apiConfigService.waitReady();
      const all = apiConfigService.getAll();
      setProviders(all);
      const visible = all;
      if (visible.length > 0) loadProvider(visible[0].id, visible);
    };
    init();
  }, []);

  const loadProvider = (id: string, list?: ApiProviderConfig[]) => {
    const p = (list ?? visibleProviders).find((x) => x.id === id);
    if (p) {
      setSelectedProviderId(p.id); setApiKey(p.apiKey); setBaseUrl(p.baseUrl);
      setModel(p.model); setEnabled(p.enabled); setTestResult(null); setSaved(false);
    }
  };

  const apiKeyOptional = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/i.test(baseUrl);

  const handleSave = async () => {
    await apiConfigService.update(selectedProviderId, { apiKey, baseUrl, model, enabled });
    setProviders(apiConfigService.getAll());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    // [安卓专用] 手机端无后端，不再下发 AI 模式到 127.0.0.1:27865
  };

  const handleTest = async () => {
    setTesting(true); setTestResult(null);
    const result = await llmApiService.testConnection({
      id: selectedProviderId, name: '', baseUrl, apiKey, model, enabled: true,
    });
    setTestResult(result); setTesting(false);
  };

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton aria-label="返回" sx={{ mr: 2 }} onClick={() => navigate('/')}><ArrowBackIcon /></IconButton>
        <Typography variant="h4">设置</Typography>
      </Box>

      {/* ---- AI模型配置（仅云端） ---- */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>AI模型配置</Typography>
        <Divider sx={{ mb: 3 }} />

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="model-select-label">选择模型</InputLabel>
          <Select id="model-select" labelId="model-select-label" value={selectedProviderId} label="选择模型" onChange={(e) => loadProvider(e.target.value)}>
            {visibleProviders.map((p) => (
              <MenuItem key={p.id} value={p.id}>{p.name} ({p.model})</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField id="api-base-url" fullWidth label="API Base URL" value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder={selectedProviderId === 'deepseek' ? 'https://api.deepseek.com' : 'https://your-api.com/v1'}
          helperText={selectedProviderId === 'deepseek' ? '官方文档: https://api.deepseek.com' : 'OpenAI兼容API地址（含/v1）'}
          InputProps={{ sx: { '& input::placeholder': { opacity: 0.4 } } }} sx={{ mb: 2 }} />

        <TextField id="api-key" fullWidth label="API Key" type="password" value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-xxxxxxxxxxxxxxxx"
          helperText={apiKeyOptional ? '本地服务可留空' : selectedProviderId === 'deepseek' ? '在 platform.deepseek.com → API Keys 获取' : 'AES-256-GCM加密存储'}
          InputProps={{ sx: { '& input::placeholder': { opacity: 0.4 } } }} sx={{ mb: 2 }} />

        <TextField id="model-name" fullWidth label="模型名称" value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder={selectedProviderId === 'deepseek' ? 'deepseek-v4-pro' : 'your-model-name'}
          helperText={selectedProviderId === 'deepseek' ? 'DeepSeek V4 Pro: deepseek-v4-pro' : '按API文档填写'}
          InputProps={{ sx: { '& input::placeholder': { opacity: 0.4 } } }} sx={{ mb: 2 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <FormControlLabel
            control={<Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} color="primary" />}
            label={enabled ? '已启用' : '已禁用'} />
          <Box sx={{ flexGrow: 1 }} />
          {!BUILTIN_PROVIDERS.some((p) => p.id === selectedProviderId) && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={async () => {
                if (!window.confirm(`确定删除该 provider 吗？\n\n这将同步清除其 API Key、Base URL、模型名称等所有存储信息，且不可恢复。`)) return;
                const ok = await apiConfigService.removeProvider(selectedProviderId);
                if (ok) {
                  const all = apiConfigService.getAll();
                  setProviders(all);
                  const visible = all;
                  const next = visible.find((c) => c.enabled) ?? visible[0];
                  if (next) loadProvider(next.id, visible);
                } else {
                  alert('删除失败：该 provider 不存在或为内置 provider，无法删除');
                }
              }}
            >
              删除
            </Button>
          )}
          <Button variant="outlined" onClick={handleTest} disabled={testing || !baseUrl.trim() || !model.trim()}
            startIcon={testing ? <CircularProgress size={18} /> : <PlayArrowIcon />}>测试连接</Button>
          <Button variant="contained" onClick={handleSave} color={saved ? 'success' : 'primary'}
            startIcon={saved ? <CheckCircleIcon /> : undefined}>{saved ? '已保存' : '保存'}</Button>
        </Box>

        {testResult && <Alert severity={testResult.ok ? 'success' : 'error'} sx={{ mb: 2 }}>{testResult.message}</Alert>}

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {visibleProviders.map((p) => (
            <Chip key={p.id} label={`${p.name}${p.enabled ? ' ✓' : ''}`}
              color={p.enabled ? 'primary' : 'default'} variant={p.enabled ? 'filled' : 'outlined'} size="small"
              onClick={() => loadProvider(p.id)} />
          ))}
        </Box>
      </Paper>

      {/* ---- 通用 ---- */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>通用设置</Typography>
        <Divider sx={{ mb: 3 }} />
        <FormControlLabel
          control={<Switch checked={isDarkMode} onChange={(e) => setIsDarkMode(e.target.checked)} color="primary" />}
          label="深色模式" />
      </Paper>

      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>关于</Typography>
        <Divider sx={{ mb: 3 }} />
        <Accordion><AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography>版本信息</Typography></AccordionSummary><AccordionDetails><Typography>阮琳云智能助手 v1.0.0 (Android)</Typography></AccordionDetails></Accordion>
        <Accordion><AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography>安全</Typography></AccordionSummary><AccordionDetails><Typography>API Key 采用 AES-256-GCM 加密存储，密钥由浏览器指纹派生（PBKDF2 600000 迭代）。加密可防止 localStorage 直接泄露密钥，但不能防御 XSS 攻击，请勿在不可信环境使用。</Typography></AccordionDetails></Accordion>
      </Paper>
    </Container>
  );
}

export default MobileSettingsPage;
