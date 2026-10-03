// ============================================================================
// Agent Router - AI Agent能力路由
// 提供「双手」和「眼睛」系统的API接口
// ============================================================================

import express from 'express';
import { agentHands, AgentAction } from '../utils/AgentHands';
import { agentEyes, EyeAction } from '../utils/AgentEyes';

const router = express.Router();

// ============================================================================
// 双手系统 - 电脑控制能力
// ============================================================================

// 执行命令
router.post('/hands/command', async (req, res) => {
  try {
    const { command, timeout, cwd } = req.body;
    
    if (!command) {
      return res.status(400).json({
        success: false,
        error: '缺少命令参数'
      });
    }
    
    const action: AgentAction = {
      type: 'command',
      params: { command, timeout, cwd },
      description: `执行命令: ${command}`
    };
    
    const result = await agentHands.execute(action);
    
    res.json({
      success: result.success,
      stdout: result.result?.stdout || '',
      stderr: result.result?.stderr || '',
      executionTime: result.executionTime,
      error: result.error
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 读取文件
router.post('/hands/file/read', async (req, res) => {
  try {
    const { path, encoding } = req.body;
    
    if (!path) {
      return res.status(400).json({
        success: false,
        error: '缺少文件路径参数'
      });
    }
    
    const action: AgentAction = {
      type: 'file_read',
      params: { path, encoding: encoding || 'utf-8' },
      description: `读取文件: ${path}`
    };
    
    const result = await agentHands.execute(action);
    
    res.json({
      success: result.success,
      content: result.result?.data || '',
      size: result.result?.size,
      error: result.error
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 写入文件
router.post('/hands/file/write', async (req, res) => {
  try {
    const { path, content } = req.body;
    
    if (!path || !content) {
      return res.status(400).json({
        success: false,
        error: '缺少文件路径或内容参数'
      });
    }
    
    const action: AgentAction = {
      type: 'file_write',
      params: { path, content },
      description: `写入文件: ${path}`
    };
    
    const result = await agentHands.execute(action);
    
    res.json({
      success: result.success,
      size: result.result?.size,
      error: result.error
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 列出目录
router.post('/hands/file/list', async (req, res) => {
  try {
    const { path } = req.body;
    
    if (!path) {
      return res.status(400).json({
        success: false,
        error: '缺少目录路径参数'
      });
    }
    
    const action: AgentAction = {
      type: 'file_list',
      params: { path },
      description: `列出目录: ${path}`
    };
    
    const result = await agentHands.execute(action);
    
    res.json({
      success: result.success,
      files: result.result?.data || [],
      error: result.error
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 创建目录
router.post('/hands/directory/create', async (req, res) => {
  try {
    const { path } = req.body;
    
    if (!path) {
      return res.status(400).json({
        success: false,
        error: '缺少目录路径参数'
      });
    }
    
    const action: AgentAction = {
      type: 'directory_create',
      params: { path },
      description: `创建目录: ${path}`
    };
    
    const result = await agentHands.execute(action);
    
    res.json({
      success: result.success,
      error: result.error
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 删除文件
router.post('/hands/file/delete', async (req, res) => {
  try {
    const { path } = req.body;
    
    if (!path) {
      return res.status(400).json({
        success: false,
        error: '缺少文件路径参数'
      });
    }
    
    const action: AgentAction = {
      type: 'file_delete',
      params: { path },
      description: `删除文件: ${path}`
    };
    
    const result = await agentHands.execute(action);
    
    res.json({
      success: result.success,
      error: result.error
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取进程列表
router.get('/hands/processes', async (req, res) => {
  try {
    const action: AgentAction = {
      type: 'process_list',
      params: {},
      description: '获取进程列表'
    };
    
    const result = await agentHands.execute(action);
    
    res.json({
      success: result.success,
      processes: result.result || [],
      error: result.error
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 终止进程
router.post('/hands/process/kill', async (req, res) => {
  try {
    const { pid } = req.body;
    
    if (!pid) {
      return res.status(400).json({
        success: false,
        error: '缺少进程ID参数'
      });
    }
    
    const action: AgentAction = {
      type: 'process_kill',
      params: { pid },
      description: `终止进程: ${pid}`
    };
    
    const result = await agentHands.execute(action);
    
    res.json({
      success: result.success,
      error: result.error
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取系统信息
router.get('/hands/system-info', async (req, res) => {
  try {
    const action: AgentAction = {
      type: 'system_info',
      params: {},
      description: '获取系统信息'
    };
    
    const result = await agentHands.execute(action);
    
    res.json({
      success: result.success,
      systemInfo: result.result,
      error: result.error
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取操作历史
router.get('/hands/history', async (req, res) => {
  try {
    const count = parseInt(req.query.count as string) || 10;
    const history = agentHands.getRecentActions(count);
    
    res.json({
      success: true,
      history
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// 眼睛系统 - 网络搜索和信息抓取
// ============================================================================

// 搜索
router.post('/eyes/search', async (req, res) => {
  try {
    const { query, maxResults, language, safeSearch } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: '缺少搜索查询参数'
      });
    }
    
    const action: EyeAction = {
      type: 'search',
      params: {
        query,
        options: { maxResults, language, safeSearch }
      },
      description: `搜索: ${query}`
    };
    
    const result = await agentEyes.execute(action);
    
    res.json({
      success: result.success,
      results: result.result || [],
      error: result.error
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 搜索并分析
router.post('/eyes/analyze', async (req, res) => {
  try {
    const { query, maxResults, language } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: '缺少搜索查询参数'
      });
    }
    
    const action: EyeAction = {
      type: 'analyze',
      params: {
        query,
        options: { maxResults, language }
      },
      description: `搜索并分析: ${query}`
    };
    
    const result = await agentEyes.execute(action);
    
    res.json({
      success: result.success,
      summary: result.result,
      error: result.error
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 抓取网页
router.post('/eyes/fetch', async (req, res) => {
  try {
    const { url, timeout } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: '缺少URL参数'
      });
    }
    
    const action: EyeAction = {
      type: 'fetch',
      params: { url, timeout },
      description: `抓取网页: ${url}`
    };
    
    const result = await agentEyes.execute(action);
    
    res.json({
      success: result.success,
      page: result.result,
      error: result.error
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 提取维基百科信息
router.post('/eyes/wiki', async (req, res) => {
  try {
    const { topic } = req.body;
    
    if (!topic) {
      return res.status(400).json({
        success: false,
        error: '缺少主题参数'
      });
    }
    
    const action: EyeAction = {
      type: 'extract_wiki',
      params: { topic },
      description: `提取维基百科: ${topic}`
    };
    
    const result = await agentEyes.execute(action);
    
    res.json({
      success: result.success,
      wikiInfo: result.result,
      error: result.error
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 提取新闻信息
router.post('/eyes/news', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: '缺少URL参数'
      });
    }
    
    const action: EyeAction = {
      type: 'extract_news',
      params: { url },
      description: `提取新闻: ${url}`
    };
    
    const result = await agentEyes.execute(action);
    
    res.json({
      success: result.success,
      newsInfo: result.result,
      error: result.error
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取搜索历史
router.get('/eyes/history', async (req, res) => {
  try {
    const count = parseInt(req.query.count as string) || 10;
    const history = agentEyes.getRecentSearches(count);
    
    res.json({
      success: true,
      history
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// 综合Agent接口 - 让AI自主决定使用什么能力
// ============================================================================

router.post('/execute', async (req, res) => {
  try {
    const { actions } = req.body;
    
    if (!actions || !Array.isArray(actions)) {
      return res.status(400).json({
        success: false,
        error: '缺少actions参数或格式错误'
      });
    }
    
    const results = [];
    
    for (const actionData of actions) {
      const { system, type, params } = actionData;
      
      if (system === 'hands') {
        const action: AgentAction = { type, params };
        results.push(await agentHands.execute(action));
      } else if (system === 'eyes') {
        const action: EyeAction = { type, params };
        results.push(await agentEyes.execute(action));
      } else {
        results.push({
          success: false,
          error: `未知的系统: ${system}`
        });
      }
    }
    
    res.json({
      success: true,
      results
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取Agent状态和能力概览
router.get('/status', async (req, res) => {
  try {
    res.json({
      success: true,
      status: {
        hands: {
          available: true,
          capabilities: [
            'command',
            'file_read',
            'file_write',
            'file_list',
            'file_delete',
            'directory_create',
            'process_list',
            'process_kill',
            'system_info'
          ],
          historyCount: agentHands.getHistory().length
        },
        eyes: {
          available: true,
          capabilities: [
            'search',
            'fetch',
            'analyze',
            'extract_news',
            'extract_wiki',
            'extract_code'
          ],
          historyCount: agentEyes.getSearchHistory().length
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;