import { useState, useEffect } from 'react';
import { t as tt } from '../i18n';
import { Box, Typography, Button, Paper, Alert, Dialog, DialogTitle, DialogContent, DialogActions, LinearProgress } from '@mui/material';
import UpdateIcon from '@mui/icons-material/Update';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

interface UpdateInfo {
  version: string;
  needsUpdate: boolean;
  updateUrl: string;
  releaseNotes: string;
  forceUpdate: boolean;
}

function UpdateManager() {
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);

  // 获取平台类型
  const getPlatform = (): string => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('windows')) {
      return 'windows';
    } else if (userAgent.includes('android')) {
      return 'android';
    } else if (userAgent.includes('ios') || userAgent.includes('iphone') || userAgent.includes('ipad')) {
      return 'ios';
    } else {
      return 'web';
    }
  };

  // tt('upd.check')
  const checkForUpdates = async () => {
    setIsChecking(true);
    setError(null);

    try {
      const platform = getPlatform();
      const currentVersion = '1.0.0'; // 实际应用中应从配置或存储中获取

      const response = await fetch(`/api/v1/update/latest?platform=${platform}&version=${currentVersion}`);

      if (!response.ok) {
        throw new Error(tt('upd.checkFail'));
      }

      const data = await response.json();
      setUpdateInfo(data);

      if (data.needsUpdate) {
        setIsUpdateDialogOpen(true);
      }
    } catch (err) {
      setError(tt('upd.checkErr'));
      console.error('[UpdateManager] check fail:', err);
    } finally {
      setIsChecking(false);
    }
  };

  // 下载并tt('upd.title')
  const downloadAndApplyUpdate = async () => {
    if (!updateInfo) return;

    setIsDownloading(true);
    setError(null);

    try {
      // 模拟下载进度
      let progress = 0;
      const interval = setInterval(() => {
        progress += 5;
        setDownloadProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          // 模拟更新完成
          setTimeout(() => {
            setIsDownloading(false);
            setIsUpdateDialogOpen(false);
            // 实际应用中应根据平台执行不同的更新操作
            alert(tt('upd.done'));
          }, 1000);
        }
      }, 100);

      // 实际下载逻辑
      // const response = await fetch(updateInfo.updateUrl);
      // 处理下载和安装...
    } catch (err) {
      setError(tt('upd.downloadErr'));
      setIsDownloading(false);
      console.error('[UpdateManager] download fail:', err);
    }
  };

  // 初始化时tt('upd.check')
  useEffect(() => {
    // 应用启动时tt('upd.check')
    checkForUpdates();

    // 定期tt('upd.check')（例如每小时）
    const interval = setInterval(checkForUpdates, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Box sx={{ mb: 2 }}>
      {error && (
        <Alert severity="error" icon={<ErrorIcon />} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <UpdateIcon color="primary" />
          <Typography variant="h6" component="h2">
            tt('upd.title')
          </Typography>
        </Box>

        <Typography variant="body1" sx={{ mb: 2 }}>
          tt('upd.current')
        </Typography>

        {isChecking ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LinearProgress sx={{ flexGrow: 1 }} />
            <Typography variant="body2">{tt('upd.checking')}</Typography>
          </Box>
        ) : isDownloading ? (
          <Box>
            <LinearProgress variant="determinate" value={downloadProgress} sx={{ mb: 2 }} />
            <Typography variant="body2" sx={{ textAlign: 'center' }}>
              tt('upd.download')中: {downloadProgress}%
            </Typography>
          </Box>
        ) : updateInfo && updateInfo.needsUpdate ? (
          <Box sx={{ mb: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              tt('upd.newVersion'): {updateInfo.version}
            </Alert>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {updateInfo.releaseNotes}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={downloadAndApplyUpdate}
                disabled={isDownloading}
              >
                tt('upd.installNow')
              </Button>
              {!updateInfo.forceUpdate && (
                <Button
                  variant="outlined"
                  onClick={() => setIsUpdateDialogOpen(false)}
                >
                  tt('upd.installLater')
                </Button>
              )}
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <CheckCircleIcon color="success" />
            <Typography variant="body1">
              tt('upd.upToDate')
            </Typography>
            <Button
              variant="outlined"
              color="primary"
              onClick={checkForUpdates}
              disabled={isChecking}
            >
              tt('upd.check')
            </Button>
          </Box>
        )}
      </Paper>

      <Dialog
        open={isUpdateDialogOpen}
        onClose={() => !updateInfo?.forceUpdate && setIsUpdateDialogOpen(false)}
        aria-labelledby="update-dialog-title"
        aria-describedby="update-dialog-description"
        disableEscapeKeyDown={updateInfo?.forceUpdate}
      >
        <DialogTitle id="update-dialog-title">
          tt('upd.newVersion')
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            版本: {updateInfo?.version}
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {updateInfo?.releaseNotes}
          </Typography>
          {updateInfo?.forceUpdate && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              tt('upd.forced')
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          {!updateInfo?.forceUpdate && (
            <Button
              onClick={() => setIsUpdateDialogOpen(false)}
            >
              tt('upd.installLater')
            </Button>
          )}
          <Button
            variant="contained"
            color="primary"
            onClick={downloadAndApplyUpdate}
            disabled={isDownloading}
          >
            tt('upd.installNow')
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default UpdateManager;
