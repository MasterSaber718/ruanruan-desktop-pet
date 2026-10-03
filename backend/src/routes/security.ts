import express from 'express';
import networkSecurity from '../utils/networkSecurity';

const router = express.Router();

/**
 * 网络安全相关API路由
 */

// 端口扫描
router.post('/port-scan', async (req, res) => {
  try {
    const { target, startPort = 1, endPort = 1000 } = req.body;
    
    if (!target) {
      return res.status(400).json({ message: '请提供目标IP或域名' });
    }
    
    const openPorts = await networkSecurity.portScan(target, startPort, endPort);
    
    res.json({
      message: '端口扫描完成',
      data: {
        target,
        startPort,
        endPort,
        openPorts,
        count: openPorts.length
      }
    });
  } catch (error: any) {
    console.error('端口扫描错误:', error);
    res.status(500).json({ message: '端口扫描失败', error: error.message });
  }
});

// 漏洞扫描
router.post('/vulnerability-scan', async (req, res) => {
  try {
    const { target } = req.body;
    
    if (!target) {
      return res.status(400).json({ message: '请提供目标IP或域名' });
    }
    
    const vulnerabilities = await networkSecurity.vulnerabilityScan(target);
    
    res.json({
      message: '漏洞扫描完成',
      data: {
        target,
        vulnerabilities,
        count: vulnerabilities.length
      }
    });
  } catch (error: any) {
    console.error('漏洞扫描错误:', error);
    res.status(500).json({ message: '漏洞扫描失败', error: error.message });
  }
});

// 网络连接监控
router.get('/network-monitor', async (req, res) => {
  try {
    const { duration = 60 } = req.query;
    
    const connections = await networkSecurity.networkMonitor(parseInt(duration as string));
    
    res.json({
      message: '网络连接监控完成',
      data: {
        duration: parseInt(duration as string),
        connections,
        count: connections.length
      }
    });
  } catch (error: any) {
    console.error('网络监控错误:', error);
    res.status(500).json({ message: '网络监控失败', error: error.message });
  }
});

// 网站信息收集
router.post('/website-info', async (req, res) => {
  try {
    const { target } = req.body;
    
    if (!target) {
      return res.status(400).json({ message: '请提供目标URL' });
    }
    
    const info = await networkSecurity.websiteInfoGathering(target);
    
    res.json({
      message: '网站信息收集完成',
      data: {
        target,
        info
      }
    });
  } catch (error: any) {
    console.error('网站信息收集错误:', error);
    res.status(500).json({ message: '网站信息收集失败', error: error.message });
  }
});

// 密码强度检查
router.post('/password-strength', (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ message: '请提供密码' });
    }
    
    const result = networkSecurity.checkPasswordStrength(password);
    
    res.json({
      message: '密码强度检查完成',
      data: {
        password: '********', // 不返回原始密码
        ...result
      }
    });
  } catch (error: any) {
    console.error('密码强度检查错误:', error);
    res.status(500).json({ message: '密码强度检查失败', error: error.message });
  }
});

// 生成强密码
router.get('/generate-password', (req, res) => {
  try {
    const { length = 16 } = req.query;
    
    const password = networkSecurity.generateStrongPassword(parseInt(length as string));
    
    res.json({
      message: '强密码生成完成',
      data: {
        length: parseInt(length as string),
        password
      }
    });
  } catch (error: any) {
    console.error('密码生成错误:', error);
    res.status(500).json({ message: '密码生成失败', error: error.message });
  }
});

export default router;
