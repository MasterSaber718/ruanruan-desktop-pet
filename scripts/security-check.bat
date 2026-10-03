@echo off
chcp 65001 >nul
title 阮琳云AI系统 - Windows安全基线检查
echo ============================================================
echo   阮琳云AI系统 - Windows安全基线检查（增补卷四对照）
echo ============================================================
echo.

echo [1/6] 检查页面文件加密...
fsutil behavior query EncryptPagingFile 2>nul | find "1" >nul && (
    echo    ✓ 页面文件加密已启用
) || (
    echo    ✗ 页面文件未加密！建议以管理员运行: fsutil behavior set EncryptPagingFile 1
)

echo [2/6] 检查休眠文件...
if exist C:\hiberfil.sys (
    echo    ✗ 休眠文件存在！建议以管理员运行: powercfg /h off
) else (
    echo    ✓ 休眠文件不存在
)

echo [3/6] 检查崩溃转储设置...
wmic RECOVEROS get DebugInfoType 2>nul | find "3" >nul && (
    echo    ✓ 崩溃转储已设为小内存转储
) || (
    echo    ✗ 建议设置为小内存转储: wmic RECOVEROS set DebugInfoType = 3
)

echo [4/6] 检查BitLocker状态...
manage-bde -status C: 2>nul | find "保护状态: 开" >nul && (
    echo    ✓ BitLocker已启用
) || (
    manage-bde -status C: 2>nul | find "Protection Status: Protection On" >nul && (
        echo    ✓ BitLocker已启用
    ) || (
        echo    ✗ BitLocker未启用或未检测到，建议启用全盘加密
    )
)

echo [5/6] 检查API密钥是否在环境变量中...
if defined DEEPSEEK_API_KEY (
    echo    ✓ DEEPSEEK_API_KEY 已配置
) else (
    echo    ✗ DEEPSEEK_API_KEY 未配置，代理模式将不可用
)

echo [6/6] 检查后端服务器...
curl -s http://localhost:27865/api/v1/ai/proxy/health 2>nul | find "ok" >nul && (
    echo    ✓ 后端代理健康检查通过
) || (
    echo    ✗ 后端代理无法访问，请确认服务器已启动
)

echo.
echo ============================================================
echo   检查完成。标 ✗ 的项建议处理。
echo   最后防线: 登录 https://platform.deepseek.com 设置每日消费限额
echo ============================================================
pause
