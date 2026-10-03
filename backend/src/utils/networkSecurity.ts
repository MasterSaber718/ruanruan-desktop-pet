import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * 网络安全工具类，用于执行低级且重复的网络攻防任务
 */
export class NetworkSecurityTool {
  /**
   * 端口扫描
   * @param target IP地址或域名
   * @param startPort 起始端口
   * @param endPort 结束端口
   * @returns 开放端口列表
   */
  async portScan(target: string, startPort: number, endPort: number): Promise<number[]> {
    console.log(`开始扫描 ${target} 的端口 ${startPort}-${endPort}`);
    
    // 使用nmap进行端口扫描
    try {
      const { stdout } = await execAsync(
        `nmap -p ${startPort}-${endPort} -T4 -sS ${target}`
      );
      
      // 解析nmap输出，提取开放端口
      const openPorts: number[] = [];
      const lines = stdout.split('\n');
      
      for (const line of lines) {
        const portMatch = line.match(/^(\d+)\/tcp\s+open\s+/);
        if (portMatch) {
          openPorts.push(parseInt(portMatch[1]));
        }
      }
      
      console.log(`扫描完成，发现 ${openPorts.length} 个开放端口`);
      return openPorts;
    } catch (error) {
      console.error('端口扫描失败:', error);
      return [];
    }
  }

  /**
   * 基本漏洞扫描
   * @param target IP地址或域名
   * @returns 发现的漏洞列表
   */
  async vulnerabilityScan(target: string): Promise<string[]> {
    console.log(`开始对 ${target} 进行基本漏洞扫描`);
    
    // 使用nmap进行基本漏洞扫描
    try {
      const { stdout } = await execAsync(
        `nmap --script vuln ${target}`
      );
      
      // 解析nmap输出，提取漏洞信息
      const vulnerabilities: string[] = [];
      const lines = stdout.split('\n');
      
      let inVulnSection = false;
      for (const line of lines) {
        if (line.includes('VULNERABILITY SCAN RESULTS')) {
          inVulnSection = true;
          continue;
        }
        
        if (inVulnSection && line.trim() && !line.includes('Host script results:')) {
          vulnerabilities.push(line.trim());
        }
      }
      
      console.log(`漏洞扫描完成，发现 ${vulnerabilities.length} 个潜在漏洞`);
      return vulnerabilities;
    } catch (error) {
      console.error('漏洞扫描失败:', error);
      return [];
    }
  }

  /**
   * 网络连接监控
   * @param duration 监控时长（秒）
   * @returns 网络连接列表
   */
  async networkMonitor(duration: number = 60): Promise<string[]> {
    console.log(`开始监控网络连接，持续 ${duration} 秒`);
    
    // 使用netstat监控网络连接
    try {
      const { stdout } = await execAsync(
        `netstat -an | findstr ESTABLISHED`
      );
      
      // 解析netstat输出
      const connections: string[] = [];
      const lines = stdout.split('\n');
      
      for (const line of lines) {
        if (line.trim()) {
          connections.push(line.trim());
        }
      }
      
      console.log(`监控完成，发现 ${connections.length} 个已建立的连接`);
      return connections;
    } catch (error) {
      console.error('网络监控失败:', error);
      return [];
    }
  }

  /**
   * 基本的网站信息收集
   * @param target URL地址
   * @returns 网站信息
   */
  async websiteInfoGathering(target: string): Promise<{ [key: string]: string }> {
    console.log(`开始收集 ${target} 的网站信息`);
    
    const info: { [key: string]: string } = {};
    
    // 获取HTTP响应头
    try {
      const { stdout } = await execAsync(
        `curl -I ${target}`
      );
      info['HTTP Headers'] = stdout;
    } catch (error) {
      console.error('获取HTTP头失败:', error);
      info['HTTP Headers'] = '获取失败';
    }
    
    // 获取服务器信息
    try {
      const { stdout } = await execAsync(
        `curl -s -I ${target} | findstr Server`
      );
      info['Server'] = stdout.trim();
    } catch (error) {
      console.error('获取服务器信息失败:', error);
      info['Server'] = '获取失败';
    }
    
    console.log('网站信息收集完成');
    return info;
  }

  /**
   * 基本的密码强度检查
   * @param password 密码
   * @returns 密码强度评估
   */
  checkPasswordStrength(password: string): { strength: string; suggestions: string[] } {
    let strength = '弱';
    const suggestions: string[] = [];
    
    // 检查密码长度
    if (password.length < 8) {
      suggestions.push('密码长度至少8位');
    } else if (password.length >= 12) {
      strength = '强';
    } else {
      strength = '中';
    }
    
    // 检查是否包含数字
    if (!/\d/.test(password)) {
      suggestions.push('密码应包含数字');
    }
    
    // 检查是否包含小写字母
    if (!/[a-z]/.test(password)) {
      suggestions.push('密码应包含小写字母');
    }
    
    // 检查是否包含大写字母
    if (!/[A-Z]/.test(password)) {
      suggestions.push('密码应包含大写字母');
    }
    
    // 检查是否包含特殊字符
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      suggestions.push('密码应包含特殊字符');
    }
    
    return { strength, suggestions };
  }

  /**
   * 生成随机强密码
   * @param length 密码长度
   * @returns 生成的密码
   */
  generateStrongPassword(length: number = 16): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*(),.?":{}|<>';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
    
    return password;
  }
}

export default new NetworkSecurityTool();
