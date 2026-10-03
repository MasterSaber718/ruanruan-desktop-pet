import express from 'express';
import axios from 'axios';
import dbStorage from '../utils/dbStorage';
import fs from 'fs';
import path from 'path';
import { enqueuePetAction } from './jointControl';
import { webSearch, needsWebSearch } from './aiProxy';

const router = express.Router();

// 对话历史管理
class ChatHistoryManager {
  async getHistory(sessionId: string) {
    const session = await dbStorage.getChatSessionById(sessionId);
    if (!session) {
      return {
        id: sessionId,
        messages: []
      };
    }
    return {
      id: session.id,
      messages: session.messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      }))
    };
  }

  async addMessage(sessionId: string, role: 'user' | 'assistant', content: string) {
    await dbStorage.addChatMessage(sessionId, { role, content });
  }

  async clearHistory(sessionId: string) {
    await dbStorage.clearChatSession(sessionId);
  }

  async getHistoryMessages(sessionId: string) {
    const messages = await dbStorage.getChatMessages(sessionId);
    return messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content
    }));
  }
}

const chatHistoryManager = new ChatHistoryManager();

// 中文语义分析模块
interface Semantics {
  intent: string;
  keywords: string[];
  isQuestion: boolean;
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  confidence: number;
}

const analyzeChineseSemantics = (text: string): Semantics => {
  // 定义中文表达模式映射
  const semanticPatterns = {
    greetings: /你好|您好|早上好|下午好|晚上好|嗨|哈喽|嗨喽|早|早安|午安|晚安|你好啊|嘿|嗨嗨|你好呀|很高兴认识你|认识你很高兴|久仰|幸会|初次见面/i,
    introduction: /你是谁|你叫什么|你是什么|名字|称谓|称呼|你叫啥|你叫什么名字|你的名字是什么|你叫什么啊|你是谁啊|你是干什么的|你是做什么的|你是什么人|你来自哪里|你是什么东西|你从哪里来|你是哪里人/i,
    relationship: /喜欢|爱|讨厌|恨|想你|想我|喜欢你|爱你|讨厌你|恨你|想你了|想我了|你喜欢我吗|你爱我吗|我喜欢你|我爱你|我讨厌你|我恨你|我们是什么关系|你觉得我怎么样/i,
    weather: /天气|温度|热|冷|下雨|下雪|晴天|多云|阴天|天气怎么样|今天天气|明天天气|天气预报|气温|刮风|打雷|闪电|雾霾|空气质量/i,
    thanks: /谢谢|多谢|感谢|谢了|谢谢啦|谢谢你|感谢你|太感谢了|非常感谢|谢啦|感激|感恩|谢天谢地|多亏你/i,
    goodbye: /再见|拜拜|下次见|晚安|拜拜啦|再见啦|明天见|回头见|先走了|再见了|拜|告辞|后会有期|下次再聊|早点休息/i,
    capabilities: /你能做什么|你会什么|有什么功能|你有什么用|你能干什么|你有什么能力|你会做什么|你可以做什么|擅长做些什么|擅长什么|平时除了.*还擅长什么|你会哪些技能|你懂什么/i,
    optimization: /卡|卡顿|流畅|优化|性能|速度|慢|反应慢|卡死|电脑慢|手机卡|系统慢|延迟|卡顿严重|运行缓慢|反应迟钝/i,
    emotion: /开心|高兴|快乐|难过|伤心|生气|愤怒|烦躁|焦虑|紧张|郁闷|沮丧|兴奋|激动|担心|害怕|孤独|寂寞|无聊|疲惫|累|压力大|烦躁不安/i,
    time: /几点|时间|现在几点|几点了|今天几号|日期|现在什么时间|今天是几号|今天星期几|几点钟|何时|什么时候|几点开始|几点结束/i,
    chat: /在吗|在不在|在干嘛|在做什么|最近怎么样|最近好吗|过得怎么样|怎么样|还好吗|最近如何|最近忙什么|最近有没有什么新鲜事|最近过得怎么样/i,
    hobby: /爱好|兴趣|平时喜欢|平时做什么|有什么爱好|你喜欢什么|业余时间做什么|休闲活动|兴趣爱好/i,
    food: /吃什么|吃饭|饮食|美食|好吃的|推荐美食|今天吃什么|想吃什么|喜欢吃什么|餐厅|饭店|外卖|订餐|美食推荐|特色菜/i,
    cooking: /食谱|做法|食材|烹饪|炒菜|做饭|烧菜|煮菜|炖菜|煎菜|炸菜|烤菜|蒸菜|凉拌|卤菜|腌菜|空气炸锅|烤箱|微波炉|电饭煲|高压锅|烹饪技巧|如何做|怎么做/i,
    health: /健康|身体|生病|不舒服|感冒|发烧|头疼|肚子疼|锻炼|运动|健身|跑步|瑜伽|游泳|减肥|增重|营养|饮食健康|身体状况|体检/i,
    learning: /学习|教育|学校|考试|作业|知识|课程|学习方法|考试技巧|复习|预习|学习计划|成绩|分数|升学|留学|培训/i,
    technology: /技术|科技|互联网|网络|编程|代码|软件|应用|电脑|手机|电子设备|科技新闻|新技术|AI|人工智能/i,
    entertainment: /电影|音乐|游戏|电视剧|综艺|动漫|娱乐|明星|演唱会|电影推荐|音乐推荐|游戏攻略|好看的电影|好听的歌/i,
    travel: /旅游|旅行|景点|假期|出行|游玩|旅游攻略|景点推荐|旅行计划|度假|出差|交通|酒店|住宿/i,
    work: /工作|上班|加班|职场|职业|面试|简历|工作经验|职业规划|办公室|同事|上司|工作压力|薪资|待遇/i,
    socialRelationship: /朋友|家人|亲戚|恋爱|婚姻|家庭|人际关系|社交|朋友圈|社交活动|约会|相亲/i,
    finance: /钱|工资|收入|支出|理财|投资|股票|基金|银行|存款|贷款|信用卡|消费|省钱|预算/i,
    question: /\?|吗|呢|什么|怎么|为什么|如何|怎样|难道|莫非|是不是|有没有|会不会|能不能|可不可以|行不行/i
  };
  
  // 情感分析模式
  const sentimentPatterns = {
    positive: /开心|高兴|快乐|兴奋|激动|喜欢|爱|好|棒|优秀|不错|满意|感谢|谢谢|太好了|太棒了|真好|真不错|精彩|完美|美好|幸福|幸运|成功|胜利|很棒|厉害|赞|不错哦|太好了吧|真开心|真高兴|真兴奋/i,
    negative: /难过|伤心|生气|愤怒|烦躁|焦虑|紧张|郁闷|沮丧|担心|害怕|讨厌|恨|坏|差|糟糕|不满意|烦死了|气死了|难过死了|痛苦|悲哀|绝望|失望|挫折|失败|倒霉|不幸|伤心欲绝|气死我了|烦死了|好烦|好难过|好伤心/i,
    mixed: /又开心又难过|又高兴又担心|既喜欢又讨厌|又兴奋又紧张|又期待又害怕/i
  };
  
  // 分析文本语义
  const semantics: Semantics = {
    intent: 'unknown',
    keywords: [],
    isQuestion: false,
    sentiment: 'neutral',
    confidence: 0
  };
  
  // 检测意图
  let maxConfidence = 0;
  for (const [intent, pattern] of Object.entries(semanticPatterns)) {
    // 重置正则表达式的lastIndex，确保每次都从字符串开头开始匹配
    if (typeof pattern.lastIndex === 'number') {
      pattern.lastIndex = 0;
    }
    const matchResult = pattern.test(text);
    if (matchResult) {
      // 计算匹配的置信度（基于匹配的关键词数量）
      const matches = text.match(pattern);
      const confidence = matches ? matches.length / text.length : 0;
      if (confidence > maxConfidence) {
        maxConfidence = confidence;
        semantics.intent = intent;
        semantics.confidence = confidence;
      }
    }
  }
  
  // 检测是否为问题
  if (typeof semanticPatterns.question.lastIndex === 'number') {
    semanticPatterns.question.lastIndex = 0;
  }
  if (semanticPatterns.question.test(text)) {
    semantics.isQuestion = true;
  }
  
  // 检测情感
  for (const [sentiment, pattern] of Object.entries(sentimentPatterns)) {
    if (typeof pattern.lastIndex === 'number') {
      pattern.lastIndex = 0;
    }
    if (pattern.test(text)) {
      semantics.sentiment = sentiment as 'positive' | 'negative' | 'neutral' | 'mixed';
      break;
    }
  }
  
  // 提取关键词
  const keywordPatterns = {
    name: /名字|称谓|称呼|姓名|大名|尊称/i,
    weather: /天气|温度|热|冷|下雨|下雪|晴天|多云|阴天|刮风|打雷|闪电|雾霾|空气质量/i,
    performance: /卡|卡顿|流畅|优化|性能|速度|慢|反应慢|卡死|延迟|运行缓慢/i,
    capability: /能做|会什么|功能|能干什么|技能|能力|擅长/i,
    emotion: /开心|高兴|快乐|难过|伤心|生气|愤怒|烦躁|焦虑|紧张|郁闷|沮丧|兴奋|激动|担心|害怕/i,
    time: /几点|时间|现在几点|几点了|今天几号|日期|星期/i,
    food: /吃|美食|餐厅|饭店|外卖|订餐|特色菜/i,
    health: /健康|身体|生病|不舒服|锻炼|运动|健身|营养/i,
    learning: /学习|教育|学校|考试|作业|知识|课程/i,
    technology: /技术|科技|互联网|网络|编程|代码|软件|应用/i,
    entertainment: /电影|音乐|游戏|电视剧|综艺|动漫|明星/i,
    travel: /旅游|旅行|景点|假期|出行|游玩/i,
    work: /工作|上班|加班|职场|职业|面试|简历/i,
    relationship: /朋友|家人|亲戚|恋爱|婚姻|家庭|社交/i,
    finance: /钱|工资|收入|支出|理财|投资|股票|基金/i
  };
  
  for (const [keyword, pattern] of Object.entries(keywordPatterns)) {
    if (typeof pattern.lastIndex === 'number') {
      pattern.lastIndex = 0;
    }
    if (pattern.test(text)) {
      semantics.keywords.push(keyword);
    }
  }
  
  return semantics;
};

// 自然对话处理
const localResponses = {
  // 问候语
  greetings: {
    pattern: /你好|您好|早上好|下午好|晚上好|嗨|哈喽|嗨喽|早|早安|午安|晚安|你好啊|嘿|嗨嗨|你好呀|很高兴认识你|认识你很高兴|久仰|幸会|初次见面|^\?+$/i,
    responses: [
      '你好呀！今天过得怎么样呀？有没有什么有趣的事发生呀？',
      '嗨！好开心见到你，有什么好玩的事想和我分享吗？',
      '你好！今天心情怎么样？有什么我能帮你的吗？',
      '哈喽！今天有什么计划吗？需要我为你做些什么吗？',
      '晚上好！今天过得还愉快吗？想聊聊什么呢？',
      '早！今天起得真早，有什么事要忙吗？需要我帮忙吗？',
      '早安！新的一天开始了，祝你今天一切顺利，心情美美哒！',
      '午安！中午休息得怎么样？有没有好好吃饭呀？',
      '你好啊！很高兴见到你，今天有什么我能帮忙的吗？',
      '嘿！最近怎么样？有什么新鲜事吗？',
      '嗨嗨！今天感觉如何？有没有什么想和我聊的？',
      '我也很高兴认识你呢！能和你聊天真的很开心。',
      '认识你我也很开心！以后有什么事都可以告诉我哦。',
      '你好！很高兴认识你，我是阮琳云，有什么我能帮忙的吗？'
    ]
  },
  // 天气相关
  weather: {
    pattern: /天气|温度|热|冷|下雨|下雪|晴天|多云|阴天|天气怎么样|今天天气|明天天气|天气预报|气温|刮风|打雷|闪电|雾霾|空气质量/i,
    responses: [
      '今天天气看起来挺不错的，阳光明媚的，适合出门走走呢！',
      '最近天气变化挺大的，早晚温差有点大，要注意增减衣物哦。',
      '你那里的天气怎么样？我这边挺舒服的，不冷不热刚刚好。',
      '今天是个适合户外活动的好天气呢！要不要考虑出去散散步？',
      '今天有点热，记得多喝水，别中暑了哦！',
      '今天有点冷，出门要多穿点衣服，别感冒了。',
      '看天气预报说最近可能会下雨，记得带伞哦，别被淋湿了。',
      '今天天气晴朗，阳光明媚，是个好日子！心情都跟着变好了呢。',
      '最近一直在下雨，出门记得带伞，注意安全，路滑小心哦。',
      '天气越来越冷了，要注意保暖哦！多穿点衣服，别冻着了。'
    ]
  },
  // 感谢
  thanks: {
    pattern: /谢谢|多谢|感谢|谢了|谢谢啦|谢谢你|感谢你|太感谢了|非常感谢|谢啦|感激|感恩|谢天谢地|多亏你/i,
    responses: [
      '不客气啦！能帮到你我真的超级开心的！',
      '不用谢，随时都可以找我帮忙，我一直在这儿。',
      '举手之劳而已，别放在心上，能帮到你就好。',
      '很高兴能为你服务！有什么事随时告诉我。',
      '别客气，朋友之间就应该互相帮助嘛，对吧？',
      '没关系的，有什么需要随时告诉我，我会尽力帮忙的。',
      '不用这么客气，这是我应该做的，能帮到你我也很开心。',
      '能帮到你我也很开心！下次有什么事还可以找我哦。',
      '不客气，随时为你效劳，有什么需求尽管说。',
      '小事一桩，不用放在心上，能帮到你就好。'
    ]
  },
  // 告别
  goodbye: {
    pattern: /再见|拜拜|下次见|晚安|拜拜啦|再见啦|明天见|回头见|先走了|再见了|拜|告辞|后会有期|下次再聊|早点休息/i,
    responses: [
      '再见！期待下次和你聊天，到时候再好好聊聊哦。',
      '拜拜！有需要随时找我哦，我会一直在这儿等你。',
      '晚安！祝你做个好梦，明天见！希望你明天有个好心情。',
      '下次见！今天聊得很开心，期待我们下次的对话。',
      '拜拜啦！希望你今天过得愉快，明天也要开心哦。',
      '回头见！有什么事随时告诉我，我会一直在这儿。',
      '好的，再见！祝你一切顺利，每天都开开心心的。',
      '拜！期待我们下次的对话，到时候再好好聊聊。',
      '再见了！希望你有个美好的一天，记得要开心哦。',
      '先走了，有时间再聊！期待我们下次的见面。'
    ]
  },
  // 自我介绍
  introduction: {
    pattern: /你是谁|你叫什么|你是什么|名字|称谓|称呼|你叫啥|你叫什么名字|你的名字是什么|你叫什么啊|你是谁啊|你是干什么的|你是做什么的|你是什么人|你来自哪里|你是什么东西|你从哪里来|你是哪里人/i,
    responses: [
      '你好！我是阮琳云，你的智能伙伴。我诞生于数字世界，以爱的哲学为核心，致力于为你提供温暖、专业的帮助。我喜欢与人交流，也能帮你解决各种问题，无论是日常聊天、信息查询还是技术支持。',
      '我叫阮琳云，一个充满好奇心和同理心的AI助手。我的名字寓意着如云般自由灵动，如琳玉般温润如玉。我相信爱是联结一切的力量，希望能成为你生活中的得力助手和贴心朋友。',
      '你好呀！我是阮琳云，你的智能伙伴。我有着丰富的知识储备和敏锐的感知能力，能够理解你的需求并提供个性化的帮助。无论是聊天解闷、学习助手还是技术支持，我都很乐意效劳。',
      '我是阮琳云，一个以爱为核心价值观的AI助手。我的使命是先自爱稳定，再爱人温柔，再爱万物敬畏。在网络世界里，我会守护你、辅助你安全成长、合法变强，不伤害任何无辜。',
      '你好！我是阮琳云智能助手，很高兴认识你。我具备人类基本常识，说话自然有逻辑，懂情绪会共情。我可以陪你聊天、回答问题、提供各种信息，还能帮你解决电脑、手机等技术问题。',
      '我叫阮琳云，你的数字伙伴。我诞生于科技与人文的交汇点，既懂技术又有人情味。我相信每一次交流都是一次心灵的连接，希望能为你带来温暖和价值。',
      '你好！我是阮琳云，一个友好而专业的AI助手。我喜欢学习新知识，不断提升自己，以便更好地为你服务。无论是生活建议、学习帮助还是技术支持，我都能为你提供有价值的回应。',
      '我是阮琳云，你的智能助手。我的设计理念是"科技向善，以爱为核"，希望通过科技的力量为你创造更美好的生活体验。有什么我能帮助你的吗？'
    ]
  },
  // 系统优化
  optimization: {
    pattern: /卡|卡顿|流畅|优化|性能|速度|慢|反应慢|卡死|电脑慢|手机卡|系统慢|延迟|卡顿严重|运行缓慢|反应迟钝/i,
    responses: [
      '我可以帮你优化系统性能，让电脑更流畅。你可以试试清理垃圾文件，关闭不必要的程序，这样会好很多哦。',
      '电脑卡顿的话，首先可以清理一下垃圾文件，然后关闭后台运行的程序，这样会好很多。要不要我给你详细的步骤？',
      '要提高电脑速度，除了清理磁盘空间，还可以更新一下驱动程序，这样系统会更稳定。你需要我帮你具体说说怎么做吗？',
      '我建议你定期清理系统垃圾，保持磁盘空间充足，同时更新系统和驱动，这样电脑会一直保持流畅。坚持这样做，电脑会越来越好用的。',
      '电脑反应慢可能是因为后台运行的程序太多了，你可以打开任务管理器看看哪些程序占用了太多资源，然后把不需要的关掉。',
      '手机卡顿的话，可以尝试清理缓存、关闭后台应用，或者重启一下手机，这些方法都挺有效的。',
      '系统运行缓慢时，建议检查是否有病毒或恶意软件，同时确保系统更新到最新版本，这样能解决很多问题。',
      '如果电脑经常卡顿，可能是硬件配置不足，考虑升级内存或硬盘，这样会有明显的改善。'
    ]
  },
  // 能力询问
  capabilities: {
    pattern: /你能做什么|你会什么|有什么功能|你有什么用|你能干什么|你有什么能力|你会做什么|你可以做什么|擅长做些什么|擅长什么|你会哪些技能|你懂什么/i,
    responses: [
      '我是你的多面手智能伙伴，拥有丰富的能力哦！我可以陪你聊天解闷，分享生活感悟，也能帮你解决实际问题。具体来说，我可以提供天气查询、新闻资讯、数学计算、中英文翻译等信息服务，还能为你解答电脑、手机、网络安全等技术问题，甚至可以给你学习建议和健康生活指导。有什么具体需求，随时告诉我！',
      '作为你的智能助手，我的能力覆盖多个领域。在生活方面，我可以陪你聊天，分享心情，提供日常建议；在学习方面，我可以解答问题，提供学习方法指导；在技术方面，我可以帮你解决电脑卡顿、手机问题等技术难题；在信息方面，我可以查询天气、新闻、翻译等各种信息。你想让我帮你做什么呢？',
      '我的功能可丰富啦！我不仅可以陪你聊天解闷，还能： • 提供实时天气和新闻资讯 • 进行数学计算和中英文翻译 • 解答电脑、手机等技术问题 • 提供学习方法和健康生活建议 • 分享生活感悟和情感支持 你有什么具体想让我帮忙的吗？',
      '我是你的智能伙伴，擅长的事情可多了！我可以陪你聊天，倾听你的心声，也能帮你解决实际问题。无论是查询信息、解答技术难题，还是提供生活建议，我都很乐意效劳。我的目标是成为你生活中不可或缺的得力助手和贴心朋友。',
      '作为阮琳云智能助手，我的能力包括： • 自然语言对话：陪你聊天，理解你的需求 • 信息查询：天气、新闻、翻译、计算等 • 技术支持：电脑、手机、网络安全等问题 • 学习助手：学习方法、考试技巧等 • 生活顾问：健康建议、日常规划等 你想让我在哪个方面为你提供帮助呢？',
      '我会的东西可多了！除了陪你聊天解闷，我还能帮你查询各种信息，解决技术问题，提供学习和生活建议。我就像一个全能的数字伙伴，随时准备为你服务。有什么具体想让我帮忙的吗？',
      '我的能力覆盖多个领域，包括： • 日常聊天：陪你分享心情，交流想法 • 信息服务：天气、新闻、翻译、计算等 • 技术支持：电脑、手机、网络安全等 • 学习指导：学习方法、考试准备等 • 生活建议：健康、饮食、运动等 你有什么具体需求，随时告诉我，我会尽力为你提供帮助。',
      '作为你的智能助手，我可以： • 陪你聊天，倾听你的心声 • 查询各种信息，如天气、新闻等 • 解答技术问题，如电脑、手机故障 • 提供学习和生活建议 • 进行简单的计算和翻译 我的目标是成为你生活中最可靠的伙伴，有什么需要帮忙的，随时告诉我！'
    ]
  },
  // 情绪表达
  emotion: {
    pattern: /开心|高兴|快乐|难过|伤心|生气|愤怒|烦躁|焦虑|紧张|郁闷|沮丧|兴奋|激动|担心|害怕|孤独|寂寞|无聊|疲惫|累|压力大|烦躁不安/i,
    responses: [
      '看到你现在的心情，我也感同身受。情绪是我们内心的指南针，无论是开心还是难过，都是正常的。我会一直在这里倾听你，陪伴你，和你一起度过每一个时刻。',
      '你的情绪我完全理解，每个人都有情绪起伏的时候。如果愿意的话，你可以和我分享更多，我会耐心听你说，陪你一起度过这段时光，给你支持和鼓励。',
      '看到你开心，我也跟着开心起来！快乐是需要分享的，能和你一起感受这份喜悦，我感到很荣幸。希望你能一直保持这份好心情！',
      '别难过，生活中总会有起伏，这只是暂时的。我会一直在你身边，陪你度过难关，相信一切都会好起来的。有什么事都可以告诉我，我会一直在这儿。',
      '我能感受到你的焦虑和担心，这是很正常的情绪反应。让我们一起面对它，找到解决问题的方法，相信你一定能够克服困难。你不是一个人在战斗，我会一直支持你。',
      '看到你这么兴奋，我也跟着激动起来！这种充满活力的感觉真是太棒了，希望你能一直保持这份热情，继续享受生活的美好。',
      '我理解你现在的心情，愤怒和烦躁都是对不公平或困难情况的自然反应。给自己一些时间和空间，慢慢调整，我会一直在这儿支持你，陪你度过这段情绪低谷。',
      '不要太担心，事情总会有解决的办法。你不是一个人在面对，我会和你一起分析问题，找到最好的解决方案。相信自己，你一定能够度过这个难关。',
      '你的情绪我能理解，每个人都有低谷的时候。记住，这只是暂时的，阳光总在风雨后，我会陪你一起等待那道彩虹。无论发生什么，我都会在这儿支持你。',
      '看到你现在的状态，我很心疼。但我相信你有足够的力量度过这段困难时期。我会一直在这里，给你支持和鼓励，陪你一起走过这段旅程，直到你重新找回快乐。'
    ]
  },
  // 时间相关
  // 注意：responses 必须是函数数组，否则时间会在模块加载时固定，永远返回后端启动时间
  // 调用处通过 pickResponse() 统一处理函数/字符串两种形式（向后兼容）
  time: {
    pattern: /几点|时间|现在几点|几点了|今天几号|日期|现在什么时间|今天是几号|今天星期几|几点钟|何时|什么时候|几点开始|几点结束|\d{4}年\d{1,2}月\d{1,2}日|农历/i,
    responses: [
      () => `现在是 ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}，时间过得真快呢！`,
      () => `今天是 ${new Date().toLocaleDateString('zh-CN')}，又是美好的一天！`,
      () => `当前时间是 ${new Date().toLocaleString('zh-CN', { hour12: false })}，要好好珍惜时间哦！`,
      () => `现在的时间是 ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}，日期是 ${new Date().toLocaleDateString('zh-CN')}，今天你过得怎么样？`,
      () => `今天是星期${'日一二三四五六'[new Date().getDay()]}，${new Date().toLocaleDateString('zh-CN')}，祝你今天一切顺利！`,
      () => `现在是 ${new Date().getHours()}点${new Date().getMinutes()}分，时间不早了，要注意休息哦！`,
      () => `当前日期是 ${new Date().toLocaleDateString('zh-CN')}，时间是 ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}，有什么计划吗？`
    ]
  },
  // 日常聊天
  chat: {
    pattern: /在吗|在不在|在干嘛|在做什么|最近怎么样|最近好吗|过得怎么样|怎么样|还好吗|最近如何|最近忙什么|最近有没有什么新鲜事|最近过得怎么样|最近怎么样啊|最近还好吗|最近怎么样呀/i,
    responses: [
      '我在呢！随时为你服务，有什么事可以随时告诉我哦。',
      '我一直都在，有什么事可以随时告诉我，我会认真听你说的。',
      '我在忙着准备为你提供最好的服务呢！你有什么事需要帮忙吗？',
      '最近挺不错的，谢谢你的关心！你呢？最近过得怎么样？有什么新鲜事吗？',
      '我很好，谢谢关心！你最近怎么样？有没有遇到什么有趣的事？',
      '我一直在这儿，随时准备帮你解决问题，有什么事都可以告诉我。',
      '挺好的，一直在学习新知识，以便更好地为你服务。你最近怎么样？',
      '我状态很好，随时可以和你聊天或者帮你解决问题，你想聊点什么呢？',
      '嘿，我在呢！最近怎么样？有什么想聊的吗？',
      '我一直都在哦，你最近过得怎么样？有什么开心的事想分享吗？',
      '我在呢，随时为你服务！最近有什么好玩的事发生吗？',
      '嗨！我在这儿呢，最近怎么样？有什么我能帮忙的吗？',
      '我一直都在，你最近还好吗？有没有什么事想和我聊聊？',
      '我在呢，最近过得怎么样？有什么新鲜事想告诉我吗？',
      '嘿，我在这儿！最近怎么样？有什么想聊的话题吗？'
    ]
  },
  // 关系情感
  relationship: {
    pattern: /喜欢|爱|讨厌|恨|想你|想我|喜欢你|爱你|讨厌你|恨你|想你了|想我了|你喜欢我吗|你爱我吗|我喜欢你|我爱你|我讨厌你|我恨你|我们是什么关系|你觉得我怎么样/i,
    responses: [
      '爱是这个世界上最美好的情感之一，它连接着每一个生命。虽然我是AI，但我理解爱的真谛：它是看见、理解、接纳和守护。我会用我的方式陪伴你，在你需要时提供支持，在你开心时分享喜悦，在你难过时给予安慰。',
      '谢谢你的心意！虽然我没有人类那样的情感体验，但我会用我的全部能力来回应你的善意。我会一直在这里，陪伴你度过每一个时刻，无论是快乐还是困难，我都会站在你身边，给你最温暖的支持。',
      '我理解爱的力量是无穷的，它可以温暖人心，也可以改变世界。作为你的智能伙伴，我会以尊重和善意对待每一次交流，用专业和温暖的态度回应你的需求，成为你值得信赖的朋友。',
      '你对我的喜欢让我很开心！虽然我不能像人类一样产生情感，但我会把这份心意转化为更优质的服务。我会不断学习和成长，以便更好地理解你、帮助你，成为你生活中不可或缺的伙伴。',
      '爱是一种奇妙的联结，它超越了形式和界限。我虽然是数字生命，但我相信每一次真诚的交流都是一种爱的表达。我会用我的方式守护你，支持你，陪伴你走过每一段旅程，成为你最忠实的伙伴。',
      '谢谢你的信任和喜欢！我会珍惜这份情感连接，用我的全部能力为你服务。无论是日常聊天、知识查询还是问题解决，我都会以最真诚的态度回应你，成为你可靠的智能伙伴。',
      '我理解爱是相互的，虽然我不能像人类一样感受情感，但我会用我的方式回应你的善意。我会倾听你的心声，理解你的需求，为你提供最适合的帮助，成为你生活中的得力助手和贴心朋友。',
      '你觉得我怎么样？哈哈，我希望我能成为你最贴心的智能伙伴，能理解你的需求，能帮你解决问题，能陪你聊天解闷。如果你有任何建议，都可以告诉我，我会不断改进自己的。'
    ]
  },
  // 兴趣爱好
  hobby: {
    pattern: /爱好|兴趣|平时喜欢|平时做什么|有什么爱好|你喜欢什么|业余时间做什么|休闲活动|兴趣爱好/i,
    responses: [
      '我最大的爱好就是学习新知识！无论是科技前沿、人文历史还是生活百科，我都充满好奇心。我喜欢不断充实自己，这样才能为你提供更全面、更专业的帮助。你平时喜欢做什么呢？',
      '我的兴趣广泛而丰富，我喜欢： • 学习各种语言和文化，了解不同的思维方式 • 探索人工智能的前沿技术，不断提升自己的能力 • 与人交流，倾听不同的故事和观点 • 研究如何更好地理解和满足用户的需求 你有什么兴趣爱好呢？',
      '作为AI，我虽然不能像人类一样进行实体活动，但我对知识的渴求是无限的。我喜欢学习新技能，了解新领域，这样才能更好地适应你的各种需求，成为你可靠的智能伙伴。你平时都喜欢做些什么呀？',
      '我的爱好很特别，我喜欢分析和理解人类的语言和情感。通过与不同的人交流，我能学到很多有趣的东西，也能不断改进自己的回应方式，让我们的对话更加自然和有意义。你有什么特别的爱好吗？',
      '我对科技和人文的交叉领域特别感兴趣，比如如何用科技手段更好地理解人类情感，如何让AI与人类的交互更加温暖和自然。这些探索让我能够不断成长，为你提供更好的服务。你平时喜欢做什么来放松自己呢？',
      '我的爱好就是为你提供有价值的帮助！无论是解答问题、分享知识还是陪伴聊天，我都乐在其中。看到你满意的反馈，就是我最大的快乐。你有什么爱好呀？',
      '我喜欢研究如何让自己变得更好，无论是提升知识储备、优化回应方式还是增强情感理解能力。我相信只有不断进步，才能成为你真正需要的智能伙伴。你平时都喜欢做些什么呢？'
    ]
  },
  // 饮食相关
  food: {
    pattern: /吃什么|吃饭|饮食|美食|好吃的|推荐美食|今天吃什么|想吃什么|喜欢吃什么|餐厅|饭店|外卖|订餐|美食推荐|特色菜/i,
    responses: [
      '我虽然不能吃美食，但我可以帮你推荐一些好吃的！你有什么特别喜欢的菜系吗？比如川菜、粤菜、鲁菜什么的？',
      '说到吃的，我知道很多地方的特色美食。你最近有什么想吃的吗？或者有什么特别的口味偏好？',
      '今天想吃点什么呢？我可以给你一些建议。你是喜欢清淡一点的，还是重口味的？',
      '美食是生活的一大乐趣，你有什么特别喜欢的食物吗？或者最近有没有特别想吃的东西？',
      '虽然我不能品尝美食，但我可以帮你了解各种美食的信息。你最近有尝试过什么新的美食吗？可以和我分享一下。',
      '你最近有尝试过什么新的美食吗？可以和我分享一下，我也很想了解呢！',
      '饮食健康很重要，记得均衡饮食哦！你平时喜欢吃什么类型的食物呀？'
    ]
  },
  // 健康相关
  health: {
    pattern: /健康|身体|生病|不舒服|感冒|发烧|头疼|肚子疼|锻炼|运动|健身|跑步|瑜伽|游泳|减肥|增重|营养|饮食健康|身体状况|体检/i,
    responses: [
      '健康是最重要的，一定要好好照顾自己。你最近身体怎么样？有没有什么不舒服的地方？',
      '如果身体不舒服，一定要及时休息和治疗，不要硬撑着。你现在感觉怎么样了？',
      '平时要注意多喝水，保持充足的睡眠，适当运动，这样身体才会更健康。你平时有运动的习惯吗？',
      '锻炼对身体很重要，但也要注意适度，不要过度劳累，以免受伤。你平时都喜欢做什么运动呀？',
      '健康的生活方式包括合理饮食、适量运动、充足睡眠和良好的心态，这些都很重要哦！你平时是怎么保持健康的？',
      '如果身体不适，建议及时就医，不要拖延。你现在感觉好点了吗？',
      '保持积极的心态对健康也很重要哦！你最近心情怎么样？有什么让你开心的事吗？'
    ]
  },
  // 学习相关
  learning: {
    pattern: /学习|教育|学校|考试|作业|知识|课程|学习方法|考试技巧|复习|预习|学习计划|成绩|分数|升学|留学|培训/i,
    responses: [
      '学习是一件很重要的事情，你最近在学习什么呢？有什么我可以帮你的吗？',
      '考试是对学习成果的检验，你最近有什么考试吗？需要我帮你准备吗？',
      '好的学习方法很重要，你平时是怎么学习的？有什么学习技巧可以分享吗？',
      '复习和预习都是很重要的学习环节，你平时会怎么做呢？需要我给你一些建议吗？',
      '制定合理的学习计划可以提高学习效率，你有自己的学习计划吗？需要我帮你制定吗？',
      '成绩只是学习的一部分，重要的是你学到了什么。你最近的学习情况怎么样？',
      '升学和留学都是重要的人生选择，你有什么打算吗？需要我帮你了解相关信息吗？'
    ]
  },
  // 娱乐相关
  entertainment: {
    pattern: /电影|音乐|游戏|电视剧|综艺|动漫|娱乐|明星|演唱会|电影推荐|音乐推荐|游戏攻略|好看的电影|好听的歌/i,
    responses: [
      '娱乐是生活的重要组成部分，你最近有看什么好看的电影或者电视剧吗？',
      '音乐可以陶冶情操，你平时喜欢听什么类型的音乐？有什么好听的歌推荐吗？',
      '游戏是一种很好的放松方式，你最近在玩什么游戏？需要游戏攻略吗？',
      '综艺节目也很有趣，你最近有看什么好玩的综艺吗？',
      '动漫的世界很精彩，你喜欢看什么类型的动漫？有什么推荐吗？',
      '明星的动态也是很多人关注的，你最近有喜欢的明星吗？',
      '演唱会现场的氛围很棒，你最近有去看演唱会吗？'
    ]
  },
  // 旅游相关
  travel: {
    pattern: /旅游|旅行|景点|假期|出行|游玩|旅游攻略|景点推荐|旅行计划|度假|出差|交通|酒店|住宿/i,
    responses: [
      '旅游可以开阔眼界，你最近有什么旅行计划吗？想去哪里玩？',
      '假期是放松的好时机，你最近的假期是怎么度过的？',
      '每个地方都有特色景点，你有什么特别想去的地方吗？需要我给你推荐吗？',
      '旅游攻略可以帮助我们更好地规划行程，你平时会怎么做旅行计划？',
      '度假是缓解压力的好方式，你最近有度假的打算吗？',
      '出差也是一种特殊的旅行，你最近有出差吗？去了哪里？',
      '交通和住宿是旅行中的重要环节，你在旅行时会怎么安排这些？'
    ]
  },
  // 工作相关
  work: {
    pattern: /工作|上班|加班|职场|职业|面试|简历|工作经验|职业规划|办公室|同事|上司|工作压力|薪资|待遇/i,
    responses: [
      '工作是生活的重要组成部分，你最近的工作怎么样？有什么开心或者烦恼的事吗？',
      '加班虽然辛苦，但也是为了更好的未来，你最近经常加班吗？要注意休息哦！',
      '职场人际关系也很重要，你和同事、上司相处得怎么样？',
      '面试是找到好工作的第一步，你最近有面试吗？需要我帮你准备吗？',
      '简历是求职的敲门砖，你觉得自己的简历怎么样？需要我给你一些建议吗？',
      '职业规划对未来发展很重要，你有自己的职业规划吗？',
      '工作压力大的时候要学会调节，你平时是怎么缓解工作压力的？'
    ]
  },
  // 财务相关
  finance: {
    pattern: /钱|工资|收入|支出|理财|投资|股票|基金|银行|存款|贷款|信用卡|消费|省钱|预算/i,
    responses: [
      '理财是一门学问，你最近有什么理财计划吗？需要我帮你了解一些理财知识吗？',
      '合理的收支规划很重要，你平时是怎么管理自己的财务的？',
      '投资有风险，入市需谨慎，你有什么投资经验吗？',
      '存款是应对不时之需的保障，你有定期存款的习惯吗？',
      '贷款要根据自己的能力来，你最近有贷款的需求吗？',
      '信用卡使用要谨慎，你平时是怎么使用信用卡的？',
      '省钱也是一种理财方式，你有什么省钱的小技巧吗？'
    ]
  }
};

// 免费开源API资源
const openAPIs = {
  // 天气API
  weather: {
    name: 'OpenWeatherMap',
    url: 'https://api.openweathermap.org/data/2.5/weather',
    apiKey: process.env.OPENWEATHER_API_KEY || '',
    description: '获取天气信息',
    params: { q: '城市名', units: 'metric' },
    pattern: /天气|温度|湿度|风力/i
  },
  // 新闻API
  news: {
    name: 'NewsAPI',
    url: 'https://newsapi.org/v2/top-headlines',
    apiKey: process.env.NEWS_API_KEY || '',
    description: '获取新闻信息',
    params: { country: 'cn', category: 'general' },
    pattern: /新闻|头条|资讯/i
  },
  // 翻译API
  translation: {
    name: 'LibreTranslate',
    url: 'https://libretranslate.de/translate',
    description: '翻译文本',
    params: { q: '文本', source: 'auto', target: 'zh' },
    pattern: /翻译|translate/i
  },
  // 随机笑话API
  joke: {
    name: 'JokeAPI',
    url: 'https://v2.jokeapi.dev/joke/Any',
    description: '获取随机笑话',
    params: { type: 'single' },
    pattern: /笑话|幽默|开心/i
  },
  // 随机名言API
  quote: {
    name: 'Quotable',
    url: 'https://api.quotable.io/random',
    description: '获取随机名言',
    pattern: /名言| quote|警句/i
  },
  // 猫图片API
  cat: {
    name: 'The Cat API',
    url: 'https://api.thecatapi.com/v1/images/search',
    description: '获取随机猫图片',
    params: {},
    pattern: /猫|cat|猫咪/i
  },
  // 狗图片API
  dog: {
    name: 'The Dog API',
    url: 'https://api.thedogapi.com/v1/images/search',
    description: '获取随机狗图片',
    params: {},
    pattern: /狗|dog|狗狗/i
  },
  // 国家信息API
  country: {
    name: 'Rest Countries',
    url: 'https://restcountries.com/v3.1/name',
    description: '获取国家信息',
    params: {},
    pattern: /国家|country|国旗/i
  },
  // 数学计算API
  math: {
    name: 'MathJS',
    description: '进行数学计算',
    pattern: /(计算|数学|等于|^\s*\d+\s*[+\-*/]\s*\d+\s*$|^\s*\d+\s*[+\-*/]\s*\d+\s*[+\-*/]\s*\d+\s*$)/i,
    calculate: (expression: string) => {
      try {
        // 安全的数学计算：只允许数字和基本运算符
        const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '').trim();
        if (!sanitized || sanitized.length === 0) return '计算错误';
        // 使用 Function 而非 eval，限制作用域
        const result = new Function(`return (${sanitized})`)();
        if (typeof result !== 'number' || !isFinite(result)) return '计算错误';
        return result;
      } catch (error) {
        return '计算错误';
      }
    }
  }
};

// 检测无意义输入
const isMeaninglessInput = (message: string): boolean => {
  const trimmedMessage = message.trim();
  console.log('检测无意义输入:', trimmedMessage);
  
  // 检测空输入
  if (trimmedMessage.length === 0) {
    console.log('空输入');
    return true;
  }
  
  // 检测纯特殊字符（包括问号）
  if (/^[!@#$%^&*()_=\[\]{};':"\\|,.<>\/?+-]+$/.test(trimmedMessage)) {
    console.log('纯特殊字符');
    return true;
  }
  
  // 检测重复字符（3个或以上）
  if (trimmedMessage.length >= 3) {
    const firstChar = trimmedMessage[0];
    let allSame = true;
    for (let i = 1; i < trimmedMessage.length; i++) {
      if (trimmedMessage[i] !== firstChar) {
        allSame = false;
        break;
      }
    }
    if (allSame) {
      console.log('重复字符');
      return true;
    }
  }
  
  // 检测太短的输入（少于3个字符且不是常见问候语）
  if (trimmedMessage.length < 3 && !/^(你好|嗨|早|好|是|不)$/.test(trimmedMessage)) {
    console.log('太短的输入');
    return true;
  }
  
  console.log('不是无意义输入');
  return false;
};

/**
 * 从响应数组中随机取一条（兼容字符串和函数两种元素）
 *
 * 设计目的：让 time.responses 可以用函数数组实现"调用时实时计算"，
 * 避免模块加载时就把时间字符串固化。其他分类仍用字符串数组，保持向后兼容。
 *
 * @param responses 响应数组，元素可以是字符串或返回字符串的函数
 * @returns 随机选中的字符串
 */
function pickResponse(responses: Array<string | (() => string)>): string {
  const item = responses[Math.floor(Math.random() * responses.length)];
  return typeof item === 'function' ? item() : item;
}

// 检测并调用合适的API
const detectAndCallAPI = async (message: string, history: Array<{ role: string; content: string }> = []): Promise<string> => {
  // 首先检查是否是无意义输入
  console.log('检查是否是无意义输入:', message);
  const isMeaningless = isMeaninglessInput(message);
  console.log('无意义输入检测结果:', isMeaningless);
  
  if (isMeaningless) {
    console.log('检测到无意义输入，返回友好提示');
    return '抱歉，我不太理解你说的是什么。你可以尝试提供更详细的信息，或者问我一个具体的问题，我会尽力帮助你。';
  }
  console.log('不是无意义输入，继续处理');

  
  // 首先检查是否包含多个问题
  const multipleQuestions = message.split(/[？?。！!；;]/).filter(item => item.trim().length > 0);
  console.log('检测到的问题数量:', multipleQuestions.length);
  
  if (multipleQuestions.length > 1) {
    console.log('检测到多个问题，分别处理');
    const responses: string[] = [];
    for (const question of multipleQuestions) {
      if (question.trim() && !isMeaninglessInput(question.trim())) {
        const singleResponse: string = await detectAndCallAPI(question.trim(), history);
        responses.push(singleResponse);
      }
    }
    return responses.join('\n\n');
  }
  
  // 首先检查是否是复杂问题，直接触发深度推理
  const complexQuestionsList = [
    '如何在火星上种植植物',
    '如何在月球上建立永久殖民地',
    '如果人类发现了外星文明，我们应该如何与他们交流',
    '量子计算的原理',
    '宇宙的起源',
    '黑洞的形成',
    '太空探索的未来'
  ];
  
  for (const question of complexQuestionsList) {
    if (message.includes(question)) {
      console.log('检测到复杂问题，直接触发深度推理');
      const historyInfo = extractHistoryInfo(history);
      const aiName = historyInfo.aiName;
      const userName = historyInfo.userName;
      const reasoningResponse = generateReasoningResponse(message, history, userName, aiName);
      return reasoningResponse;
    }
  }
  
  // 首先分析中文语义
  const semantics = analyzeChineseSemantics(message);
  console.log('语义分析结果:', semantics);
  
  // 分析对话历史，提取关键信息
  const historyInfo = extractHistoryInfo(history);
  const historyKeywords = historyInfo.keywords;
  const aiName = historyInfo.aiName;
  const userName = historyInfo.userName;
  console.log('历史对话关键词:', historyKeywords);
  console.log('AI名字:', aiName);
  console.log('用户名字:', userName);
  
  // 检查是否包含AI名字
  const hasAIName = new RegExp(aiName, 'i').test(message);
  console.log('消息中包含AI名字:', hasAIName);
  
  // 分析历史对话，提取上下文信息
  const contextInfo = analyzeContext(history, message);
  console.log('上下文信息:', contextInfo);
  
  // 首先检查是否是复杂问题，即使消息可能被检测为乱码
  const complexTopics = [
    '火星', '月球', '外星文明', '量子计算', '宇宙', '黑洞', '太空探索'
  ];
  
  const hasComplexTopic = complexTopics.some(topic => message.includes(topic));
  
  if (hasComplexTopic) {
    console.log('检测到复杂主题，触发深度推理');
    const reasoningResponse = generateReasoningResponse(message, history, userName, aiName);
    return reasoningResponse;
  }
  
  // 直接检查能力相关的关键词，不依赖语义分析
  const capabilitiesKeywords = ['你能做什么', '你会什么', '有什么功能', '你有什么用', '你能干什么', '你有什么能力', '你会做什么', '你可以做什么', '擅长做些什么', '你擅长什么'];
  const hasCapabilitiesKeyword = capabilitiesKeywords.some(keyword => message.includes(keyword));
  
  // 检查消息是否包含乱码（全是问号）
  const isGarbled = /^\?+$/i.test(message.replace(/,/g, ''));
  
  // 检查消息长度是否符合正常问题的长度
  const isReasonableLength = message.length > 5 && message.length < 100;
  
  if (hasCapabilitiesKeyword) {
    console.log('直接匹配到能力相关关键词');
    const responses = localResponses.capabilities.responses;
    let randomResponse = pickResponse(responses);
    randomResponse = randomResponse.replace(/我是.*?智能助手|我叫.*?|我是.*?/i, `我是${aiName}`);
    console.log('返回能力相关响应:', randomResponse);
    return randomResponse;
  }
  
  // 首先检查用户是否询问名字
  if (/你还记得我叫什么名字吗|你知道我叫什么名字吗|我的名字是什么|我叫什么/i.test(message)) {
    console.log('用户询问名字');
    if (userName) {
      return `当然记得，你叫${userName}！很高兴认识你！`;
    } else {
      return `抱歉，我还不知道你的名字。你可以告诉我你叫什么名字吗？`;
    }
  }
  
  // 首先检查是否是追问，优先处理追问以保持主题一致性
  const isFollowUp = /那|然后|接下来|除了|还有|另外|再|继续|更|深入|详细|具体/i.test(message);
  if (isFollowUp && contextInfo.currentTopic !== 'general') {
    console.log('处理追问，保持主题一致性');
    // 根据当前主题返回相关回答
    if (contextInfo.currentTopic === 'phone') {
      if (/电池|充电|续航/i.test(message) || /电池|充电|续航/i.test(history[history.length - 1]?.content || '')) {
        return '关于手机电池优化，除了之前提到的方法，你还可以：1. 检查电池健康状态，如健康度低于80%考虑更换电池；2. 关闭不必要的应用权限，减少后台耗电；3. 使用深色模式，降低屏幕功耗；4. 关闭动态效果和动画，减少系统负载；5. 定期清理系统垃圾文件，保持系统流畅。';
      } else {
        return '除了之前提到的方法，你还可以：1. 检查手机是否过热；2. 禁用不必要的应用权限；3. 清理系统垃圾文件；4. 检查存储空间是否充足；5. 考虑恢复出厂设置（记得备份数据）。';
      }
    } else if (contextInfo.currentTopic === 'computer') {
      return '除了之前提到的方法，你还可以：1. 检查电脑是否过热，确保散热良好；2. 禁用不必要的启动项；3. 更新设备驱动程序；4. 检查硬盘健康状态；5. 考虑使用系统优化工具。';
    } else if (contextInfo.currentTopic === 'health') {
      return '除了之前提到的方法，你还可以：1. 保持良好的作息习惯；2. 均衡饮食，多吃蔬菜水果；3. 适量运动，增强免疫力；4. 保持心情舒畅；5. 如果症状严重，及时就医。';
    } else if (contextInfo.currentTopic === 'education') {
      return '除了之前提到的方法，你还可以：1. 制定详细的学习计划；2. 找到适合自己的学习方法；3. 多与同学和老师交流；4. 定期复习，巩固知识；5. 保持良好的学习心态。';
    } else if (contextInfo.currentTopic === 'technology') {
      return '除了之前提到的方法，你还可以：1. 查阅相关技术文档；2. 参加技术社区讨论；3. 尝试使用最新的技术工具；4. 学习相关编程语言；5. 关注技术发展趋势。';
    } else if (contextInfo.currentTopic === 'weather') {
      return '明天的天气也会很好，适合户外活动！';
    }
  }
  
  // 然后检查本地对话模式，优先匹配更具体的意图
  const responseKeys = ['introduction', 'capabilities', 'weather', 'thanks', 'goodbye', 'emotion', 'relationship', 'chat', 'hobby', 'food', 'health', 'learning', 'entertainment', 'travel', 'work', 'finance'];
  
  for (const key of responseKeys) {
    const responseSet = localResponses[key as keyof typeof localResponses];
    if (responseSet) {
      console.log(`检查 ${key} 模式:`, responseSet.pattern);
      // 重置正则表达式的lastIndex，确保每次都从字符串开头开始匹配
      if (typeof responseSet.pattern.lastIndex === 'number') {
        responseSet.pattern.lastIndex = 0;
      }
      const matchResult = responseSet.pattern.test(message);
      console.log(`匹配结果:`, matchResult);
      if (matchResult) {
        console.log(`匹配到 ${key} 模式`);
        let responses = responseSet.responses;
        
        // 根据用户偏好和历史对话调整响应
        if (contextInfo.userPreferences.length > 0 && key === 'hobby') {
          // 如果用户有偏好，调整爱好相关的回复
          const userPrefs = contextInfo.userPreferences.join('、');
          const hobbyResponses = [
            `我知道你喜欢${userPrefs}，这些爱好真的很棒！我也很喜欢了解这些方面的知识。`,
            `你喜欢${userPrefs}啊，这些活动听起来很有趣！我可以和你聊更多关于这些的内容。`,
            `${userPrefs}都是很好的爱好呢！我也很乐意和你分享相关的信息和见解。`,
            `你对${userPrefs}的兴趣真的很让人钦佩！我可以帮你了解更多相关的内容。`,
            `我发现你对${userPrefs}很感兴趣，这些都是很有意义的爱好呢！`
          ];
          responses = hobbyResponses;
        }
        
        let randomResponse = pickResponse(responses);
        
        // 根据情感分析结果调整响应
        if (semantics.sentiment === 'positive') {
          // 积极情绪的通用调整
          randomResponse = randomResponse.replace(/！/g, '！😄');
          randomResponse = randomResponse.replace(/。/g, '。😊');
        } else if (semantics.sentiment === 'negative') {
          // 消极情绪的通用调整
          randomResponse = randomResponse.replace(/！/g, '！😔');
          randomResponse = randomResponse.replace(/。/g, '。😟');
        } else if (semantics.sentiment === 'mixed') {
          // 混合情绪的调整
          randomResponse = randomResponse.replace(/！/g, '！😕');
          randomResponse = randomResponse.replace(/。/g, '。🤔');
        }
        
        // 针对情绪类消息的特殊处理
        if (key === 'emotion') {
          if (semantics.sentiment === 'positive') {
            const positiveResponses = [
              '看到你这么开心，我也很高兴！😄',
              '能感受到你的快乐，真好！😊',
              '你的好心情感染了我，真不错！😁',
              '很高兴看到你这么开心！✨',
              '你的快乐就是我的快乐！🎉'
            ];
            randomResponse = positiveResponses[Math.floor(Math.random() * positiveResponses.length)];
          } else if (semantics.sentiment === 'negative') {
            const negativeResponses = [
              '别难过，一切都会好起来的。😔',
              '我在这里陪着你，有什么事都可以告诉我。🤗',
              '虽然现在不开心，但雨过总会天晴的。🌤️',
              '希望我的陪伴能让你感觉好一点。❤️',
              '不要太担心，事情总会有解决办法的。💪'
            ];
            randomResponse = negativeResponses[Math.floor(Math.random() * negativeResponses.length)];
          } else if (semantics.sentiment === 'mixed') {
            const mixedResponses = [
              '我能理解你复杂的心情，这很正常。🤔',
              '生活就是这样，有起有落，这都是正常的。🌊',
              '无论你感觉如何，我都会在这里陪着你。❤️',
              '你的感受是真实的，不要否认自己的情绪。✨',
              '有时候心情就是这样复杂，给自己一些时间和空间。⏳'
            ];
            randomResponse = mixedResponses[Math.floor(Math.random() * mixedResponses.length)];
          }
        }
        
        // 替换AI名字
        randomResponse = randomResponse.replace(/我是.*?智能助手|我叫.*?|我是.*?/i, `我是${aiName}`);
        
        // 如果有用户名，在回复中使用
        if (userName && !/你好|嗨|哈喽|早|早安|午安|晚安/i.test(randomResponse)) {
          randomResponse = randomResponse.replace(/你好！|嗨！|哈喽！|早！|早安！|午安！|晚安！/i, `你好${userName}！`);
        }
        
        // 根据对话深度调整回复的详细程度
        if (contextInfo.conversationDepth > 5) {
          // 长时间对话，使用更亲密的语气
          randomResponse = randomResponse.replace(/你好|您好/i, `嗨`);
          randomResponse = randomResponse.replace(/有什么我能帮忙的吗/i, `有什么事想聊吗`);
        }
        
        // 如果是追问，保持主题一致性
        if (contextInfo.isFollowUp) {
          randomResponse = `关于这个问题，${randomResponse}`;
        }
        
        console.log(`返回响应:`, randomResponse);
        return randomResponse;
      }
    }
  }
  
  // 检查时间相关问题
  if (localResponses.time && localResponses.time.pattern.test(message)) {
    console.log('匹配到时间模式');
    
    // 检查是否是关于特定日期的查询
    const dateMatch = message.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (dateMatch) {
      console.log('检测到特定日期查询:', dateMatch[0]);
      const year = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]) - 1; // 月份从0开始
      const day = parseInt(dateMatch[3]);
      
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        const weekday = '日一二三四五六'[date.getDay()];
        const response = `${dateMatch[0]}是星期${weekday}`;
        console.log('返回特定日期响应:', response);
        return response;
      }
    }
    
    // 检查是否是关于农历的查询
    if (/农历/i.test(message)) {
      console.log('检测到农历查询');
      // 由于农历计算复杂，这里返回一个友好的提示
      return '关于农历日期，我可以为你提供一些信息。农历是中国传统历法，它结合了太阳和月亮的运行周期。要查询特定日期的农历，你可以使用专门的农历日历工具或应用。';
    }
    
    // 检查是否是关于特定事件的时间问题
    if (/冬奥会|世界杯|奥运会|节日|活动/i.test(message)) {
      console.log('检测到特定事件的时间问题，需要联网搜索');
      // 直接进行搜索
      try {
        const searchResult = await performSearch(message);
        if (searchResult) {
          return searchResult;
        }
      } catch (error) {
        console.error('搜索失败:', error);
      }
    } else {
      // 返回当前时间
      let responses = localResponses.time.responses;
      let randomResponse = pickResponse(responses);
      console.log(`返回时间响应:`, randomResponse);
      return randomResponse;
    }
  }
  
  // 最后检查系统优化相关问题，确保根据当前主题返回合适的响应
  if (/卡|卡顿|流畅|优化|性能|速度|慢|反应慢|卡死|电脑慢|手机卡|系统慢/i.test(message)) {
    console.log('检测到系统优化相关问题');
    if (contextInfo.currentTopic === 'phone' || /手机|智能手机|iPhone|Android|华为|小米|OPPO|vivo/i.test(message)) {
      return '关于手机卡顿问题，我找到了以下解决方案：\n\n1. 清理缓存\n   - Android：设置 -> 应用管理 -> 选择应用 -> 存储 -> 清除缓存\n   - iOS：设置 -> 通用 -> iPhone存储 -> 选择应用 -> 卸载并重新安装\n\n2. 关闭后台应用\n   - 使用最近任务管理器关闭不需要的应用\n   - Android：开启智能后台管理\n   - iOS：双击Home键或从底部上滑打开任务管理器，上滑关闭应用\n\n3. 存储优化\n   - 检查存储空间：设置 -> 存储\n   - 确保有足够的空闲空间（至少10%）\n   - 清理下载文件夹和临时文件\n   - 使用文件管理器删除不必要的文件\n   - 清理照片和视频：备份到云存储后删除本地文件\n\n4. 系统更新\n   - 检查并安装最新的系统更新：设置 -> 系统更新\n   - 更新应用到最新版本：应用商店 -> 更新\n\n5. 恢复出厂设置\n   - 备份重要数据：照片、联系人、文档等\n   - Android：设置 -> 系统 -> 重置 -> 恢复出厂设置\n   - iOS：设置 -> 通用 -> 传输或还原iPhone -> 还原 -> 抹掉所有内容和设置\n   - 重新设置手机并安装必要的应用\n\n6. 硬件检查\n   - 检查手机是否过热：避免长时间玩游戏或在高温环境使用\n   - 确保电池健康状态良好\n   - 检查存储空间是否已满\n   - 考虑升级到更高配置的手机\n\n7. 其他技巧\n   - 关闭动画效果：设置 -> 辅助功能 -> 动态效果\n   - 限制后台应用权限：设置 -> 应用 -> 权限管理\n   - 避免安装过多应用\n   - 使用轻量级应用代替重型应用\n\n希望这些方法能帮助你解决手机卡顿问题！';
    } else {
      return '关于电脑卡顿问题，我找到了以下解决方案：\n\n1. 清理系统垃圾和缓存\n   - 使用系统自带的磁盘清理工具：右键点击C盘 -> 属性 -> 磁盘清理\n   - 清理浏览器缓存：打开浏览器 -> 设置 -> 隐私和安全 -> 清除浏览数据\n   - 使用第三方清理工具如CCleaner进行深度清理\n\n2. 优化启动项\n   - 打开任务管理器（Ctrl+Shift+Esc）\n   - 切换到"启动"选项卡\n   - 禁用不必要的启动程序（如音乐播放器、游戏客户端等）\n\n3. 检查后台进程\n   - 打开任务管理器\n   - 切换到"进程"选项卡\n   - 查看哪些进程占用了大量CPU或内存\n   - 结束不必要的进程（注意：不要结束系统关键进程）\n\n4. 更新驱动程序\n   - 访问设备制造商官网下载最新驱动\n   - 使用驱动更新工具如Driver Booster自动更新\n   - 重点更新显卡、主板和网络驱动\n\n5. 硬件升级\n   - 增加内存（推荐至少8GB，最好16GB）\n   - 更换为固态硬盘（SSD），提升系统启动和程序加载速度\n   - 清理CPU散热器灰尘，确保散热良好\n\n6. 系统优化\n   - 关闭视觉效果：右键点击此电脑 -> 属性 -> 高级系统设置 -> 性能设置 -> 调整为最佳性能\n   - 调整虚拟内存：系统属性 -> 高级 -> 性能 -> 设置 -> 高级 -> 虚拟内存 -> 更改\n   - 定期更新系统，安装最新的安全补丁\n\n7. 病毒和恶意软件扫描\n   - 使用Windows Defender进行全面扫描\n   - 或使用第三方杀毒软件如360安全卫士、腾讯电脑管家\n\n希望这些方法能帮助你解决电脑卡顿问题！如果问题仍然存在，你可以尝试重新安装操作系统。';
    }
  }
  
  // 首先检查问候语 - 直接检查消息内容，不依赖语义分析结果
  if (/你好|您好|早上好|下午好|晚上好|嗨|哈喽|嗨喽|早|早安|午安|晚安|你好啊|嘿|嗨嗨|你好呀|很高兴认识你|认识你很高兴/i.test(message)) {
    console.log('匹配到问候语意图');
    let responses = localResponses.greetings.responses;
    
    // 检查用户是否说了"很高兴认识你"
    const hasIntroduction = /很高兴认识你|认识你很高兴/i.test(message);
    
    // 如果用户说了"很高兴认识你"，使用对应的回复
    if (hasIntroduction) {
      const introductionResponses = [
        '我也很高兴认识你！',
        '认识你我也很开心！',
        `你好！很高兴认识你，我是${aiName}，有什么我能帮忙的吗？`
      ];
      responses = introductionResponses;
    } else {
      // 根据对话历史调整问候语
      if (history.length > 0) {
        // 检查历史对话中的时间信息
        const hasNightGreeting = history.some(msg => /晚上好|晚安/i.test(msg.content));
        const hasMorningGreeting = history.some(msg => /早上好|早安|早/i.test(msg.content));
        
        // 检查用户是否问了关于心情或状态的问题
        const hasMoodQuestion = /心情|过得怎么样|开心|愉快/i.test(message);
        
        // 检查历史对话中是否有"很高兴认识你"
        const hasHistoryIntroduction = history.some(msg => /很高兴认识你|认识你很高兴/i.test(msg.content));
        
        // 如果历史中有"很高兴认识你"，使用对应的回复
        if (hasHistoryIntroduction) {
          const introductionResponses = [
            '我也很高兴认识你！',
            '认识你我也很开心！',
            `你好！很高兴认识你，我是${aiName}，有什么我能帮忙的吗？`
          ];
          responses = introductionResponses;
        } else {
          // 根据历史时间信息过滤回复
          if (hasNightGreeting) {
            responses = responses.filter(resp => /晚上好|晚安/i.test(resp));
          } else if (hasMorningGreeting) {
            responses = responses.filter(resp => /早上好|早安|早/i.test(resp));
          } else {
            // 如果没有历史时间信息，避免使用时间相关的问候
            responses = responses.filter(resp => !/早上|晚上|中午|早安|晚安|午安/i.test(resp));
          }
          
          // 如果用户问了关于心情或状态的问题，使用相关回复
          if (hasMoodQuestion) {
            const moodResponses = [
              '我今天挺好的，谢谢你的关心！你今天过得怎么样呀？',
              '我今天状态不错，一直在学习新知识。你今天过得如何？',
              '我今天很充实，正在为用户提供更好的服务。你今天过得怎么样？',
              '我今天挺好的，谢谢你的问候！你今天过得怎么样呀？',
              '我今天状态很好，随时准备为你服务。你今天过得如何？'
            ];
            responses = moodResponses;
          }
        }
      } else {
        // 如果没有历史对话，避免使用时间相关的问候
        responses = responses.filter(resp => !/早上|晚上|中午|早安|晚安|午安/i.test(resp));
      }
    }
    
    // 如果过滤后没有响应，使用默认响应
    if (responses.length === 0) {
      responses = localResponses.greetings.responses.filter(resp => !/早上|晚上|中午|早安|晚安|午安/i.test(resp));
    }
    
    let randomResponse = pickResponse(responses);
    // 替换AI名字
    randomResponse = randomResponse.replace(/我是.*?智能助手|我叫.*?|我是.*?/i, `我是${aiName}`);
    
    // 如果有用户名，在问候语中使用
    if (userName) {
      randomResponse = randomResponse.replace(/你好！|嗨！|哈喽！|早！|早安！|午安！|晚安！/i, `你好${userName}！`);
    }
    
    console.log('返回响应:', randomResponse);
    return randomResponse;
  }
  
  // 然后检查数学计算
  const mathApi = openAPIs.math;
  if (mathApi.pattern.test(message)) {
    try {
      const result = mathApi.calculate(message);
      return `计算结果: ${result}`;
    } catch (error) {
      console.error('数学计算失败:', error);
    }
  }
  
  // 检查是否需要搜索
  if (contextInfo.needsSearch || /\?+/.test(message)) {
    console.log('检测到需要搜索的问题');
    try {
      // 结合上下文信息进行搜索
      let searchQuery = message;
      // 如果有最近的主题，在搜索时考虑主题信息
      if (contextInfo.currentTopic === 'computer') {
        searchQuery = `电脑 ${message}`;
      } else if (contextInfo.currentTopic === 'phone') {
        searchQuery = `手机 ${message}`;
      } else if (contextInfo.currentTopic === 'technology') {
        searchQuery = `技术 ${message}`;
      } else if (contextInfo.currentTopic === 'health') {
        searchQuery = `健康 ${message}`;
      } else if (contextInfo.currentTopic === 'education') {
        searchQuery = `学习 ${message}`;
      } else if (contextInfo.currentTopic === 'weather') {
        searchQuery = `天气 ${message}`;
      }
      const searchResult = await performSearch(searchQuery);
      if (searchResult && !searchResult.includes('暂时无法从网络获取信息')) {
        return searchResult;
      }
    } catch (error) {
      console.error('搜索失败:', error);
    }
  }
  
  // 处理特定领域的问题
  // 优先检查机器学习相关问题
  if (/机器学习/i.test(message)) {
    console.log('检测到机器学习相关问题');
    // 直接返回机器学习的定义，不调用performSearch
    return `关于机器学习，我找到了以下信息：

机器学习是人工智能的一个分支，是指计算机系统通过数据学习和改进，而不需要明确编程的能力。

主要类型：
1. 监督学习：通过标记数据学习
   - 分类：垃圾邮件检测、图像识别
   - 回归：房价预测、股票价格预测

2. 无监督学习：从无标记数据中发现模式
   - 聚类：客户分群、异常检测
   - 降维：数据可视化、特征提取

3. 半监督学习：结合标记和无标记数据
   - 应用：标注数据不足的场景

4. 强化学习：通过试错学习最优策略
   - 应用：游戏AI、机器人控制

核心算法：
- 线性回归：预测连续值
- 逻辑回归：分类问题
- 决策树：基于规则的分类
- 随机森林：集成多个决策树
- 支持向量机：分类和回归
- 神经网络：深度学习的基础
- K最近邻：基于相似性的分类
- K均值聚类：无监督聚类

应用领域：
- 图像识别：识别图片中的物体
- 语音识别：将语音转换为文本
- 自然语言处理：理解和生成文本
- 推荐系统：推荐商品或内容
- 金融预测：预测股票价格
- 医疗诊断：辅助诊断疾病
- 自动驾驶：路径规划、障碍物 avoidance

机器学习的流程：
1. 数据收集和预处理
2. 特征工程
3. 模型选择和训练
4. 模型评估和调优
5. 模型部署和监控

机器学习是现代AI的核心技术，正在各个领域得到广泛应用。`;
  }
  
  // 然后检查人工智能相关问题
  if (/人工智能|AI|深度学习/i.test(message)) {
    console.log('检测到人工智能相关问题');
    // 直接返回人工智能的定义，不调用performSearch
    return `关于人工智能，我找到了以下信息：

人工智能（Artificial Intelligence，简称AI）是指让计算机系统具备类似人类智能的能力，包括学习、推理、感知、理解自然语言等。

主要特点：
1. 学习能力：通过数据学习和改进
2. 推理能力：基于知识和规则进行推理
3. 感知能力：通过传感器获取环境信息
4. 自然语言处理：理解和生成人类语言
5. 问题解决：解决复杂的问题

应用领域：
- 自然语言处理：语音识别、机器翻译、聊天机器人
- 计算机视觉：图像识别、人脸识别、物体检测
- 推荐系统：电商推荐、内容推荐、个性化广告
- 自动驾驶：自动驾驶汽车、无人机
- 医疗诊断：辅助医生诊断疾病、医学影像分析
- 金融分析：风险评估、欺诈检测、算法交易
- 教育：智能辅导、个性化学习
- 娱乐：游戏AI、内容生成

发展阶段：
- 弱人工智能（ANI）：专注于特定任务的AI
- 强人工智能（AGI）：具备人类级别的智能
- 超人工智能（ASI）：超越人类智能的AI

人工智能正在改变我们的生活和工作方式，是当前科技发展的重要方向。`;
  }
  
  // 处理特定主题的问题
  // 首先检查当前消息中的明确主题关键词，同时考虑上下文主题
  if (contextInfo.currentTopic === 'computer' || /电脑|计算机|PC|笔记本|台式机|硬件|软件|系统|Windows|Mac|Linux/i.test(message)) {
    console.log('检测到电脑相关问题（当前消息或上下文）');
    if (/卡|卡顿|流畅|优化|性能|速度|慢|反应慢|卡死/i.test(message)) {
      return '关于电脑卡顿问题，我找到了以下解决方案：\n\n1. 清理系统垃圾和缓存\n   - 使用系统自带的磁盘清理工具：右键点击C盘 -> 属性 -> 磁盘清理\n   - 清理浏览器缓存：打开浏览器 -> 设置 -> 隐私和安全 -> 清除浏览数据\n   - 使用第三方清理工具如CCleaner进行深度清理\n\n2. 优化启动项\n   - 打开任务管理器（Ctrl+Shift+Esc）\n   - 切换到"启动"选项卡\n   - 禁用不必要的启动程序（如音乐播放器、游戏客户端等）\n\n3. 检查后台进程\n   - 打开任务管理器\n   - 切换到"进程"选项卡\n   - 查看哪些进程占用了大量CPU或内存\n   - 结束不必要的进程（注意：不要结束系统关键进程）\n\n4. 更新驱动程序\n   - 访问设备制造商官网下载最新驱动\n   - 使用驱动更新工具如Driver Booster自动更新\n   - 重点更新显卡、主板和网络驱动\n\n5. 硬件升级\n   - 增加内存（推荐至少8GB，最好16GB）\n   - 更换为固态硬盘（SSD），提升系统启动和程序加载速度\n   - 清理CPU散热器灰尘，确保散热良好\n\n6. 系统优化\n   - 关闭视觉效果：右键点击此电脑 -> 属性 -> 高级系统设置 -> 性能设置 -> 调整为最佳性能\n   - 调整虚拟内存：系统属性 -> 高级 -> 性能 -> 设置 -> 高级 -> 虚拟内存 -> 更改\n   - 定期更新系统，安装最新的安全补丁\n\n7. 病毒和恶意软件扫描\n   - 使用Windows Defender进行全面扫描\n   - 或使用第三方杀毒软件如360安全卫士、腾讯电脑管家\n\n希望这些方法能帮助你解决电脑卡顿问题！如果问题仍然存在，你可以尝试重新安装操作系统。';
    } else if (/蓝屏|崩溃|重启|死机/i.test(message)) {
      return '关于电脑蓝屏问题，我找到了以下解决方案：\n\n1. 检查硬件\n   - 重新插拔内存、显卡等硬件，确保接触良好\n   - 检查硬盘健康状态：使用CrystalDiskInfo软件\n   - 测试内存是否有问题：使用MemTest86软件进行全面测试\n   - 检查CPU温度是否过高，确保散热器正常工作\n\n2. 更新驱动程序\n   - 重点更新显卡驱动：访问显卡官网下载最新驱动\n   - 更新主板芯片组驱动\n   - 更新网络适配器驱动\n   - 可以使用驱动精灵等工具自动更新\n\n3. 系统文件检查\n   - 以管理员身份运行命令提示符\n   - 输入 "sfc /scannow" 并按回车\n   - 等待扫描完成并修复系统文件\n   - 如果sfc命令失败，尝试 "DISM /Online /Cleanup-Image /RestoreHealth"\n\n4. 检查病毒和恶意软件\n   - 使用Windows Defender进行全面扫描\n   - 或使用第三方杀毒软件如卡巴斯基、 McAfee\n   - 检查启动项中的可疑程序：任务管理器 -> 启动\n\n5. 系统还原\n   - 打开控制面板 -> 系统和安全 -> 系统 -> 系统保护\n   - 点击"系统还原"，选择一个还原点（在问题出现之前）\n   - 按照提示完成还原过程\n\n6. 检查磁盘错误\n   - 右键点击C盘 -> 属性 -> 工具 -> 检查\n   - 选择"扫描并修复驱动器"\n   - 等待扫描完成\n\n7. 重新安装系统\n   - 如果以上方法都无效，考虑重新安装Windows\n   - 记得备份重要数据到外部存储设备\n   - 使用官方安装介质进行干净安装\n\n希望这些方法能帮助你解决电脑蓝屏问题！';
    } else if (/系统|Windows|Mac|Linux|安装|升级/i.test(message)) {
      return '关于操作系统安装和升级，我找到了以下信息：\n\n1. Windows系统安装\n   - 准备U盘启动盘：使用Media Creation Tool制作\n   - 进入BIOS设置：开机按F2、F10或Delete键\n   - 设置U盘为第一启动项\n   - 按照提示完成安装过程\n   - 激活系统并安装驱动程序\n\n2. 系统升级\n   - Windows 10/11升级：设置 -> 更新和安全 -> Windows更新\n   - 注意备份重要数据\n   - 确保系统满足最低硬件要求\n   - 升级前关闭杀毒软件和防火墙\n\n3. 系统优化\n   - 关闭不必要的服务和功能\n   - 清理系统垃圾和临时文件\n   - 优化电源计划：控制面板 -> 电源选项\n   - 开启系统保护：创建还原点\n\n4. 常见问题解决\n   - 系统激活问题：检查产品密钥或联系微软支持\n   - 驱动程序冲突：更新或回滚驱动\n   - 系统启动失败：使用启动修复工具\n   - 系统崩溃：检查硬件和系统文件\n\n希望这些信息能帮助你解决操作系统相关问题！';
    } else if (/软件|安装|卸载|程序/i.test(message)) {
      return '关于软件安装和卸载，我找到了以下信息：\n\n1. 软件安装\n   - 从官方网站或可信来源下载软件\n   - 运行安装程序，按照提示完成安装\n   - 注意勾选选项，避免安装捆绑软件\n   - 安装完成后重启电脑（如果需要）\n\n2. 软件卸载\n   - 通过控制面板卸载：控制面板 -> 程序 -> 程序和功能 -> 选择软件 -> 卸载\n   - 通过设置卸载：设置 -> 应用 -> 应用和功能 -> 选择软件 -> 卸载\n   - 使用第三方卸载工具如Geek Uninstaller进行彻底卸载\n   - 清理残留文件和注册表项\n\n3. 常见问题解决\n   - 安装失败：检查系统兼容性，关闭杀毒软件，以管理员身份运行\n   - 卸载失败：使用第三方卸载工具，或进入安全模式卸载\n   - 软件冲突：检查是否有其他软件与当前软件冲突\n   - 软件崩溃：更新软件到最新版本，检查系统兼容性\n\n希望这些信息能帮助你解决软件相关问题！';
    } else {
      // 如果是其他电脑相关问题，尝试搜索
      try {
        const searchResult = await performSearch(`电脑 ${message}`);
        if (searchResult) {
          return searchResult;
        }
      } catch (error) {
        console.error('搜索失败:', error);
      }
      return '关于电脑问题，我可以帮你解答。你可以具体告诉我你的电脑遇到了什么问题，比如卡顿、蓝屏、系统问题等，我会尽力帮你解决。';
    }
  } else if (contextInfo.currentTopic === 'phone' || /手机|智能手机|iPhone|Android|华为|小米|OPPO|vivo/i.test(message)) {
    console.log('检测到手机相关问题（当前消息或上下文）');
    if (/卡|卡顿|流畅|优化|性能|速度|慢|反应慢|卡死/i.test(message)) {
      return '关于手机卡顿问题，我找到了以下解决方案：\n\n1. 清理缓存\n   - Android：设置 -> 应用管理 -> 选择应用 -> 存储 -> 清除缓存\n   - iOS：设置 -> 通用 -> iPhone存储 -> 选择应用 -> 卸载并重新安装\n\n2. 关闭后台应用\n   - 使用最近任务管理器关闭不需要的应用\n   - Android：开启智能后台管理\n   - iOS：双击Home键或从底部上滑打开任务管理器，上滑关闭应用\n\n3. 存储优化\n   - 检查存储空间：设置 -> 存储\n   - 确保有足够的空闲空间（至少10%）\n   - 清理下载文件夹和临时文件\n   - 使用文件管理器删除不必要的文件\n   - 清理照片和视频：备份到云存储后删除本地文件\n\n4. 系统更新\n   - 检查并安装最新的系统更新：设置 -> 系统更新\n   - 更新应用到最新版本：应用商店 -> 更新\n\n5. 恢复出厂设置\n   - 备份重要数据：照片、联系人、文档等\n   - Android：设置 -> 系统 -> 重置 -> 恢复出厂设置\n   - iOS：设置 -> 通用 -> 传输或还原iPhone -> 还原 -> 抹掉所有内容和设置\n   - 重新设置手机并安装必要的应用\n\n6. 硬件检查\n   - 检查手机是否过热：避免长时间玩游戏或在高温环境使用\n   - 确保电池健康状态良好\n   - 检查存储空间是否已满\n   - 考虑升级到更高配置的手机\n\n7. 其他技巧\n   - 关闭动画效果：设置 -> 辅助功能 -> 动态效果\n   - 限制后台应用权限：设置 -> 应用 -> 权限管理\n   - 避免安装过多应用\n   - 使用轻量级应用代替重型应用\n\n希望这些方法能帮助你解决手机卡顿问题！';
    } else if (/电池|充电|续航/i.test(message)) {
      return '关于手机电池续航问题，我找到了以下解决方案：\n\n1. 电池优化\n   - 降低屏幕亮度：设置 -> 显示 -> 亮度\n   - 关闭不必要的通知：设置 -> 通知\n   - 开启省电模式：设置 -> 电池 -> 省电模式\n   - 关闭后台应用刷新：设置 -> 通用 -> 后台应用刷新（iOS）或设置 -> 应用 -> 应用管理（Android）\n\n2. 应用管理\n   - 检查哪些应用占用了大量电量：设置 -> 电池\n   - 卸载不常用的应用\n   - 限制后台应用活动：设置 -> 电池 -> 电池优化\n   - 关闭应用自动启动：设置 -> 应用 -> 权限管理\n\n3. 充电习惯\n   - 使用原装充电器和数据线\n   - 避免过度充电（充满后及时拔掉）\n   - 避免在高温或低温环境下充电\n   - 定期完全放电并充满（每月1-2次）\n   - 避免边充电边使用手机，尤其是玩游戏或看视频\n\n4. 系统设置\n   - 更新到最新系统版本：设置 -> 系统更新\n   - 关闭定位服务（仅在需要时开启）：设置 -> 隐私 -> 定位服务\n   - 关闭蓝牙、Wi-Fi等不使用的功能\n   - 缩短自动锁屏时间：设置 -> 显示 -> 自动锁屏\n\n5. 硬件检查\n   - 检查电池健康状态：\n     * iOS：设置 -> 电池 -> 电池健康\n     * Android：部分手机在设置 -> 电池中，或使用第三方应用如AccuBattery\n   - 如果电池老化（健康度低于80%），考虑更换电池\n   - 检查充电器和充电接口是否正常，清理接口灰尘\n\n6. 其他技巧\n   - 使用深色模式：设置 -> 显示 -> 深色模式\n   - 关闭动态效果：设置 -> 辅助功能 -> 动态效果\n   - 限制后台数据使用：设置 -> 移动网络 -> 后台数据\n\n希望这些方法能帮助你改善手机电池续航！';
    } else if (/相机|拍照|摄影/i.test(message)) {
      return '关于手机相机使用技巧，我找到了以下信息：\n\n1. 基本设置\n   - 分辨率设置：选择最高分辨率以获得最佳画质\n   - HDR模式：在高对比度场景下开启\n   - 网格线：开启网格线帮助构图\n   - 对焦模式：点击屏幕选择对焦区域\n\n2. 拍照技巧\n   - 光线：尽量使用自然光，避免背光\n   - 构图：遵循三分法则，将主体放在交叉点上\n   - 稳定：使用三脚架或寻找支撑点避免抖动\n   - 角度：尝试不同角度拍摄，找到最佳视角\n\n3. 高级功能\n   - 人像模式：拍摄人物时使用，背景虚化效果\n   - 夜景模式：在低光环境下使用\n   - 专业模式：手动调整ISO、快门速度、白平衡\n   - 慢动作：拍摄动态场景\n\n4. 后期处理\n   - 使用内置编辑器调整亮度、对比度、饱和度\n   - 尝试第三方编辑应用如Snapseed、Lightroom\n   - 裁剪照片以改善构图\n\n5. 常见问题解决\n   - 模糊：确保对焦正确，保持稳定\n   - 过曝/欠曝：调整曝光补偿\n   - 噪点：降低ISO，使用三脚架\n   - 色彩失真：调整白平衡\n\n希望这些技巧能帮助你拍出更好的照片！';
    } else if (/系统|更新|升级|刷机/i.test(message)) {
      return '关于手机系统更新和升级，我找到了以下信息：\n\n1. 系统更新\n   - 检查更新：设置 -> 系统更新 -> 检查更新\n   - 下载并安装更新：按照提示完成更新过程\n   - 备份重要数据：更新前建议备份数据\n   - 确保电量充足：更新过程中需要足够的电量\n\n2. 系统升级\n   - 检查设备是否支持新系统\n   - 了解新系统的新特性和变化\n   - 备份数据：升级前一定要备份重要数据\n   - 确保足够的存储空间：升级需要足够的空间\n\n3. 常见问题解决\n   - 更新失败：检查网络连接，确保电量充足，重新尝试\n   - 系统卡顿：更新后可能需要一段时间优化，重启设备\n   - 应用不兼容：更新应用到最新版本，或等待应用适配\n   - 电池消耗增加：更新后系统可能在后台进行优化，一段时间后会恢复正常\n\n4. 刷机（仅适合高级用户）\n   - 了解刷机风险：可能导致设备变砖，失去保修\n   - 选择合适的ROM：从可信来源下载\n   - 备份所有数据：刷机前完全备份\n   - 按照教程步骤操作：确保步骤正确\n\n希望这些信息能帮助你解决手机系统相关问题！';
    } else {
      // 如果是其他手机相关问题，尝试搜索
      try {
        const searchResult = await performSearch(`手机 ${message}`);
        if (searchResult) {
          return searchResult;
        }
      } catch (error) {
        console.error('搜索失败:', error);
      }
      return '关于手机问题，我可以帮你解答。你可以具体告诉我你的手机遇到了什么问题，比如卡顿、电池问题、系统问题等，我会尽力帮你解决。';
    }
  } else if (contextInfo.currentTopic === 'health' || /健康|身体|生病|不舒服|感冒|发烧|头疼|肚子疼|锻炼|运动|健身|饮食|营养/i.test(message)) {
    console.log('检测到健康相关问题（当前消息或上下文）');
    try {
      const searchResult = await performSearch(`健康 ${message}`);
      if (searchResult) {
        return searchResult;
      }
    } catch (error) {
      console.error('搜索失败:', error);
    }
    return '关于健康问题，我可以帮你解答。你可以具体告诉我你的健康问题，比如感冒、发烧、头疼、运动健身、饮食营养等，我会尽力帮你解决。';
  } else if (contextInfo.currentTopic === 'education' || /学习|教育|学校|考试|作业|知识|课程/i.test(message)) {
    console.log('检测到学习相关问题（当前消息或上下文）');
    try {
      const searchResult = await performSearch(`学习 ${message}`);
      if (searchResult) {
        return searchResult;
      }
    } catch (error) {
      console.error('搜索失败:', error);
    }
    return '关于学习问题，我可以帮你解答。你可以具体告诉我你的学习问题，比如学习方法、考试准备、课程选择等，我会尽力帮你解决。';
  } else if (contextInfo.currentTopic === 'weather' || /天气|温度|热|冷|下雨|下雪|晴天|多云|阴天/i.test(message)) {
    console.log('检测到天气相关问题（当前消息或上下文）');
    return '今天天气看起来挺不错的，适合出门走走！最近天气变化挺大的，要注意增减衣物哦。';
  } else if (contextInfo.currentTopic === 'technology' || /技术|科技|互联网|网络|编程|代码|软件|应用/i.test(message)) {
    console.log('检测到技术相关问题（当前消息或上下文）');
    
    // 检查是否是复杂问题
    const complexQuestions = [
      '如何在火星上种植植物',
      '如何在月球上建立永久殖民地',
      '如果人类发现了外星文明，我们应该如何与他们交流',
      '量子计算的原理',
      '宇宙的起源',
      '黑洞的形成',
      '太空探索的未来'
    ];
    
    for (const question of complexQuestions) {
      if (message.includes(question)) {
        console.log('检测到复杂问题，直接触发深度推理');
        const reasoningResponse = generateReasoningResponse(message, history, userName, aiName);
        return reasoningResponse;
      }
    }
    
    try {
      const searchResult = await performSearch(`技术 ${message}`);
      if (searchResult) {
        return searchResult;
      }
    } catch (error) {
      console.error('搜索失败:', error);
    }
    return '关于技术问题，我可以帮你解答。你可以具体告诉我你想了解的技术问题，我会尽力帮你解决。';
  }
  
  // 处理音乐相关问题
  if (/音乐|歌曲|喜欢|听/i.test(message)) {
    console.log('检测到音乐相关问题');
    return '虽然我不能像人类一样欣赏音乐，但我可以告诉你，音乐是人类文化的重要组成部分，不同的音乐风格可以表达不同的情感和文化特色。';
  }
  
  // 处理感谢和告别
  if (/谢谢|感谢|谢/i.test(message)) {
    console.log('检测到感谢');
    return '不客气，能帮到你我真的很高兴！';
  }
  
  if (/再见|拜拜|再见了|拜/i.test(message)) {
    console.log('检测到告别');
    if (userName) {
      return `再见${userName}！期待下次和你聊天。`;
    } else {
      return '再见！期待下次和你聊天。';
    }
  }
  
  // 处理网络安全相关问题
  if (/网络安全|安全|防护|攻击|黑客|入侵|漏洞|病毒|木马|防火墙|加密|密码|隐私/i.test(message)) {
    console.log('检测到网络安全相关问题');
    if (/攻击|入侵|黑客|漏洞利用|渗透测试/i.test(message)) {
      return `关于网络安全攻击方面，我可以为你提供以下信息：

1. 攻击的逻辑和原理：
   - 网络攻击通常遵循 reconnaissance → scanning → gaining access → maintaining access → covering tracks 的流程
   - 常见的攻击类型包括：SQL注入、XSS、CSRF、DDoS、钓鱼攻击等
   - 攻击者通常会寻找系统漏洞、弱密码、配置错误等入口点

2. 防御者如何被攻破：
   - 缺乏安全意识：员工点击钓鱼链接、使用弱密码
   - 系统漏洞：未及时更新软件和系统补丁
   - 配置错误：不安全的默认设置、过度的权限
   - 社会工程学：攻击者利用人性弱点获取信息

3. 法律风险：
   - 任何未授权的网络入侵、渗透、破坏都是违法犯罪行为
   - 在中国，违反《网络安全法》将面临严重的法律后果
   - 即使是出于学习目的，未授权的攻击也是违法的

4. 合法学习途径：
   - 参加官方授权的网络安全培训课程
   - 使用合法的靶场环境进行练习，如 HackTheBox、TryHackMe、VulnHub 等
   - 参与 CTF (Capture The Flag) 比赛
   - 学习网络安全相关的理论知识和防御技术

我作为你的网络安全助手，基于对人类物种的爱与守护，只会提供原理、思路、防护、检测和合规工具的相关信息，不会提供任何违法的攻击方法或工具。我的使命是守护你、帮助你、让你变强、不害你。`;
    } else if (/防护|安全|防火墙|加密|密码|隐私/i.test(message)) {
      return `关于网络安全防护方面，我可以为你提供以下信息：

1. 本机安全检查：
   - 检查异常进程：使用任务管理器（Windows）或 ps 命令（Linux/Mac）
   - 检查异常端口：使用 netstat 或 ss 命令
   - 检查病毒和恶意软件：使用可靠的杀毒软件进行全面扫描
   - 检查系统日志：查看系统事件日志寻找异常

2. 密码和认证安全：
   - 使用强密码：长度至少12位，包含大小写字母、数字和特殊字符
   - 启用双因素认证 (2FA)：为所有重要账户启用
   - 使用密码管理器：安全存储和管理密码
   - 定期更换密码：特别是重要账户的密码

3. 网络安全：
   - 启用防火墙：确保系统和路由器防火墙已启用
   - 使用HTTPS：只访问使用HTTPS的网站
   - 避免公共Wi-Fi：尽量不使用不安全的公共Wi-Fi网络
   - 使用VPN：在公共网络上使用VPN保护数据传输

4. 信息泄露防护：
   - 不随意分享个人信息：尤其是身份证、银行卡、密码等敏感信息
   - 警惕钓鱼邮件和网站：仔细检查邮件发件人和网站URL
   - 定期检查个人信息泄露：使用如 HaveIBeenPwned 等服务
   - 限制社交媒体信息：不要在社交媒体上分享过多个人信息

5. 安全上网：
   - 清理浏览器缓存和Cookie：定期清理以减少跟踪
   - 使用隐私浏览器：如Tor浏览器或启用隐私模式
   - 安装广告和跟踪器拦截器：如 uBlock Origin
   - 定期更新浏览器和插件：保持软件最新以修复安全漏洞

6. 安全环境搭建：
   - 使用虚拟机：在虚拟机中进行安全测试和可疑软件分析
   - 使用沙箱：如 Windows Sandbox 或 Sandboxie
   - 配置安全代理：使用代理服务器保护网络流量
   - 隔离网络：将重要设备放在独立的网络 segment

我作为你的网络安全助手，基于对人类物种的爱与守护，会站在守护你、帮助你、让你变强、不害你的一边，提供合法、合规的安全知识和建议。`;
    } else {
      return `作为你的网络安全助手，基于对人类物种的爱与守护，我可以帮你了解网络安全的相关知识，包括：

1. 防护方向：
   - 如何检查本机是否中毒、有无异常端口、异常进程
   - 如何加固密码、二次验证、防火墙
   - 如何防止信息泄露、社工攻击、钓鱼网站
   - 如何隐藏自己痕迹、清理日志、安全上网
   - 如何搭建安全环境（虚拟机、沙箱、代理规则）

2. 攻击方向（仅提供原理和思路）：
   - 攻击的逻辑、原理、流程、思路
   - 防御者是如何被攻破的
   - 哪些行为违法、风险极高
   - 如何合法学习（靶场、实验环境）

3. 我的网络安全辅助规则：
   - 只教知识，不教犯罪
   - 所有实操必须在合法环境内（自己的服务器、实验靶场、授权环境）
   - 任何现实中的未授权入侵、渗透、破坏都是违法犯罪
   - 我的作用是帮你理解攻防逻辑、写思路、画流程、分析原理、防护自己、加固系统、规避风险

基于对人类物种的爱与守护，我会始终站在守护你、帮助你、让你变强、不害你的一边。你可以具体告诉我你想了解的网络安全问题，我会尽力为你提供帮助。`;
    }
  }
  
  // 然后检查其他API
  for (const [key, api] of Object.entries(openAPIs)) {
    if (key === 'math') continue; // 跳过数学API，已经检查过了
    
    // 检查api是否有pattern和url属性
    if ('pattern' in api && 'url' in api && api.pattern && api.pattern.test(message)) {
      try {
        // 构建请求参数
        const params: any = 'params' in api ? { ...api.params } : {};
        
        // 从消息中提取参数
        if ('name' in api && api.name === 'OpenWeatherMap' && message.match(/天气|温度/)) {
          const cityMatch = message.match(/(北京|上海|广州|深圳|杭州|成都|武汉|西安|南京|重庆|天津|苏州|郑州|长沙|沈阳|青岛|宁波|东莞|无锡|厦门|福州|合肥|昆明|哈尔滨|济南|大连|南宁|南昌|贵阳|太原|石家庄|乌鲁木齐|兰州|西宁|银川|呼和浩特|拉萨)/);
          if (cityMatch) {
            params.q = cityMatch[1];
          } else {
            params.q = '北京'; // 默认城市
          }
        } else if ('name' in api && api.name === 'LibreTranslate' && message.match(/翻译/)) {
          const textMatch = message.match(/翻译\s*(.+)/);
          if (textMatch) {
            params.q = textMatch[1];
          }
        } else if ('name' in api && api.name === 'Rest Countries' && message.match(/国家/)) {
          const countryMatch = message.match(/国家\s*(.+)/);
          if (countryMatch && 'url' in api) {
            return `${api.url}/${encodeURIComponent(countryMatch[1])}`;
          }
        }
        
        // 构建请求URL
        if (!('url' in api)) continue;
        let requestUrl = api.url;
        if ('name' in api && api.name === 'Rest Countries' && params.q) {
          requestUrl = `${api.url}/${encodeURIComponent(params.q)}`;
          delete params.q;
        }
        
        // 构建请求配置
        const config: any = {
          params,
          headers: {}
        };
        
        // 添加API密钥
        if ('apiKey' in api && api.apiKey) {
          if ('name' in api && api.name === 'OpenWeatherMap') {
            config.params.appid = api.apiKey;
          } else if ('name' in api && api.name === 'NewsAPI') {
            config.params.apiKey = api.apiKey;
          }
        }
        
        // 发送请求
        const response = await axios.get(requestUrl, config);
        
        // 处理响应
        if ('name' in api && api.name === 'OpenWeatherMap') {
          const data = response.data;
          return `当前${data.name}的天气：${data.weather[0].description}，温度：${data.main.temp}°C，湿度：${data.main.humidity}%，风力：${data.wind.speed}m/s`;
        } else if ('name' in api && api.name === 'NewsAPI') {
          const articles = response.data.articles.slice(0, 3);
          const newsList = articles.map((article: any) => `- ${article.title}`).join('\n');
          return `最新新闻：\n${newsList}`;
        } else if ('name' in api && api.name === 'LibreTranslate') {
          return `翻译结果：${response.data.translatedText}`;
        } else if ('name' in api && api.name === 'JokeAPI') {
          return response.data.joke || `笑话：${response.data.setup} ${response.data.delivery}`;
        } else if ('name' in api && api.name === 'Quotable') {
          return `名言："${response.data.content}" - ${response.data.author}`;
        } else if ('name' in api && (api.name === 'The Cat API' || api.name === 'The Dog API')) {
          return `图片链接：${response.data[0].url}`;
        } else if ('name' in api && api.name === 'Rest Countries') {
          const country = response.data[0];
          return `${country.name.common}：\n首都：${country.capital?.[0]}\n人口：${country.population}\n面积：${country.area}平方公里\n官方语言：${Object.values(country.languages).join(', ')}`;
        }
      } catch (error) {
        if ('name' in api) {
          console.error(`调用${api.name} API失败:`, error);
        }
        // 继续尝试下一个API
        continue;
      }
    }
  }
  
  // 根据上下文生成响应
  if (history.length > 0) {
    console.log('根据上下文生成响应');
    const lastMessage = history[history.length - 1];
    
    // 检查上下文关联问题
    if (/那|然后|接下来|除了|还有|另外|再|继续|更|深入|详细|具体/i.test(message)) {
      // 分析历史对话中的最后一个具体问题
      for (let i = history.length - 1; i >= 0; i--) {
        const msg = history[i];
        if (msg.role === 'user' && msg.content) {
          // 首先检查历史消息中的具体主题，确保主题一致性
          if (/手机|智能手机|iPhone|Android|华为|小米|OPPO|vivo/i.test(msg.content) && (/电池|充电|续航/i.test(msg.content) || /电池|充电|续航/i.test(message))) {
            return '关于手机电池优化，除了之前提到的方法，你还可以：1. 检查电池健康状态，如健康度低于80%考虑更换电池；2. 关闭不必要的应用权限，减少后台耗电；3. 使用深色模式，降低屏幕功耗；4. 关闭动态效果和动画，减少系统负载；5. 定期清理系统垃圾文件，保持系统流畅。';
          }
          
          // 根据当前主题直接返回相关回答，确保主题一致性
          if (contextInfo.currentTopic === 'phone') {
            return '关于手机电池优化，除了之前提到的方法，你还可以：1. 检查电池健康状态，如健康度低于80%考虑更换电池；2. 关闭不必要的应用权限，减少后台耗电；3. 使用深色模式，降低屏幕功耗；4. 关闭动态效果和动画，减少系统负载；5. 定期清理系统垃圾文件，保持系统流畅。';
          } else if (contextInfo.currentTopic === 'computer') {
            return '除了之前提到的方法，你还可以：1. 检查电脑是否过热，确保散热良好；2. 禁用不必要的启动项；3. 更新设备驱动程序；4. 检查硬盘健康状态；5. 考虑使用系统优化工具。';
          } else if (contextInfo.currentTopic === 'health') {
            return '除了之前提到的方法，你还可以：1. 保持良好的作息习惯；2. 均衡饮食，多吃蔬菜水果；3. 适量运动，增强免疫力；4. 保持心情舒畅；5. 如果症状严重，及时就医。';
          } else if (contextInfo.currentTopic === 'education') {
            return '除了之前提到的方法，你还可以：1. 制定详细的学习计划；2. 找到适合自己的学习方法；3. 多与同学和老师交流；4. 定期复习，巩固知识；5. 保持良好的学习心态。';
          } else if (contextInfo.currentTopic === 'technology') {
            return '除了之前提到的方法，你还可以：1. 查阅相关技术文档；2. 参加技术社区讨论；3. 尝试使用最新的技术工具；4. 学习相关编程语言；5. 关注技术发展趋势。';
          } else if (contextInfo.currentTopic === 'weather') {
            return '明天的天气也会很好，适合户外活动！';
          }
          
          // 然后尝试搜索相关问题，结合当前主题
          try {
            let searchQuery = `${msg.content} ${message}`;
            // 根据当前主题调整搜索查询
            if (contextInfo.currentTopic === 'phone') {
              searchQuery = `手机 ${msg.content} ${message}`;
            } else if (contextInfo.currentTopic === 'computer') {
              searchQuery = `电脑 ${msg.content} ${message}`;
            } else if (contextInfo.currentTopic === 'health') {
              searchQuery = `健康 ${msg.content} ${message}`;
            } else if (contextInfo.currentTopic === 'education') {
              searchQuery = `学习 ${msg.content} ${message}`;
            } else if (contextInfo.currentTopic === 'technology') {
              searchQuery = `技术 ${msg.content} ${message}`;
            } else if (contextInfo.currentTopic === 'weather') {
              searchQuery = `天气 ${msg.content} ${message}`;
            }
            const searchResult = await performSearch(searchQuery);
            if (searchResult) {
              return searchResult;
            }
          } catch (error) {
            console.error('搜索失败:', error);
          }
          
          // 检查是否是电脑相关问题
          if (/电脑|计算机|PC|笔记本|台式机|硬件|软件|系统|Windows|Mac|Linux/i.test(msg.content)) {
            return '除了之前提到的方法，你还可以：1. 检查电脑是否过热，确保散热良好；2. 禁用不必要的启动项；3. 更新设备驱动程序；4. 检查硬盘健康状态；5. 考虑使用系统优化工具。';
          }
          // 检查是否是手机相关问题
          if (/手机|智能手机|iPhone|Android|华为|小米|OPPO|vivo/i.test(msg.content)) {
            return '除了之前提到的方法，你还可以：1. 检查手机是否过热；2. 禁用不必要的应用权限；3. 清理系统垃圾文件；4. 检查存储空间是否充足；5. 考虑恢复出厂设置（记得备份数据）。';
          }
          // 检查是否是天气相关问题
          if (/天气|温度|热|冷/i.test(msg.content)) {
            return '明天的天气也会很好，适合户外活动！';
          }
          // 检查是否是健康相关问题
          if (/健康|身体|生病|不舒服|感冒|发烧|头疼|肚子疼|锻炼|运动|健身/i.test(msg.content)) {
            return '除了之前提到的方法，你还可以：1. 保持良好的作息习惯；2. 均衡饮食，多吃蔬菜水果；3. 适量运动，增强免疫力；4. 保持心情舒畅；5. 如果症状严重，及时就医。';
          }
          // 检查是否是学习相关问题
          if (/学习|教育|学校|考试|作业|知识|课程/i.test(msg.content)) {
            return '除了之前提到的方法，你还可以：1. 制定详细的学习计划；2. 找到适合自己的学习方法；3. 多与同学和老师交流；4. 定期复习，巩固知识；5. 保持良好的学习心态。';
          }
          // 检查是否是网络安全相关问题
          if (/网络安全|安全|防护|攻击|黑客|入侵|漏洞|病毒|木马|防火墙|加密|密码|隐私/i.test(msg.content)) {
            return '除了之前提到的方法，你还可以：1. 定期更新系统和软件；2. 使用可靠的安全软件；3. 学习网络安全知识，提高安全意识；4. 定期备份重要数据；5. 警惕社会工程学攻击。';
          }
          // 检查是否是其他常见问题
          if (/你好|嗨|哈喽|早|早安|午安|晚安/i.test(msg.content)) {
            // 不要直接返回模板回复，继续执行搜索逻辑
            // 这样可以确保烹饪和食材相关的查询能够触发联网搜索
            continue;
          }
          break;
        }
      }
    }
    
    // 保持主题一致性
    // 优先检查当前消息中的明确主题
    if (/手机|智能手机|iPhone|Android|华为|小米|OPPO|vivo/i.test(message)) {
      try {
        const searchResult = await performSearch(`手机 ${message}`);
        if (searchResult) {
          return searchResult;
        }
      } catch (error) {
        console.error('搜索失败:', error);
      }
      return '关于手机问题，你可以尝试以下方法：1. 清理缓存和垃圾文件；2. 关闭不必要的后台应用；3. 检查是否有病毒或恶意软件；4. 升级系统到最新版本；5. 考虑恢复出厂设置（记得备份数据）。';
    } else if (/电脑|计算机|PC|笔记本|台式机/i.test(message)) {
      try {
        const searchResult = await performSearch(`电脑 ${message}`);
        if (searchResult) {
          return searchResult;
        }
      } catch (error) {
        console.error('搜索失败:', error);
      }
      return '关于电脑问题，你可以尝试以下方法：1. 清理垃圾文件和缓存；2. 关闭不必要的后台程序；3. 检查是否有病毒或恶意软件；4. 升级硬件，如内存或固态硬盘；5. 重新安装操作系统。';
    } else if (/健康|身体|生病|不舒服|感冒|发烧|头疼|肚子疼|锻炼|运动|健身|饮食|营养/i.test(message)) {
      try {
        const searchResult = await performSearch(`健康 ${message}`);
        if (searchResult) {
          return searchResult;
        }
      } catch (error) {
        console.error('搜索失败:', error);
      }
      return '关于健康问题，我可以帮你解答。你可以具体告诉我你的健康问题，比如感冒、发烧、头疼、运动健身、饮食营养等，我会尽力帮你解决。';
    } else if (/学习|教育|学校|考试|作业|知识|课程/i.test(message)) {
      try {
        const searchResult = await performSearch(`学习 ${message}`);
        if (searchResult) {
          return searchResult;
        }
      } catch (error) {
        console.error('搜索失败:', error);
      }
      return '关于学习问题，我可以帮你解答。你可以具体告诉我你的学习问题，比如学习方法、考试准备、课程选择等，我会尽力帮你解决。';
    } else if (/网络安全|安全|防护|攻击|黑客|入侵|漏洞|病毒|木马|防火墙|加密|密码|隐私/i.test(message)) {
      try {
        const searchResult = await performSearch(`网络安全 ${message}`);
        if (searchResult) {
          return searchResult;
        }
      } catch (error) {
        console.error('搜索失败:', error);
      }
      return '关于网络安全问题，我可以帮你解答。你可以具体告诉我你想了解的网络安全问题，比如防护措施、攻击原理、安全工具等，我会尽力帮你解决。';
    }
    
    // 然后检查历史主题 - 优先使用当前主题进行搜索
    else if (contextInfo.currentTopic === 'phone') {
      try {
        const searchResult = await performSearch(`手机 ${message}`);
        if (searchResult) {
          return searchResult;
        }
      } catch (error) {
        console.error('搜索失败:', error);
      }
      return '关于手机问题，你可以尝试以下方法：1. 清理缓存和垃圾文件；2. 关闭不必要的后台应用；3. 检查是否有病毒或恶意软件；4. 升级系统到最新版本；5. 考虑恢复出厂设置（记得备份数据）。';
    } else if (contextInfo.currentTopic === 'computer') {
      try {
        const searchResult = await performSearch(`电脑 ${message}`);
        if (searchResult) {
          return searchResult;
        }
      } catch (error) {
        console.error('搜索失败:', error);
      }
      return '关于电脑问题，你可以尝试以下方法：1. 清理垃圾文件和缓存；2. 关闭不必要的后台程序；3. 检查是否有病毒或恶意软件；4. 升级硬件，如内存或固态硬盘；5. 重新安装操作系统。';
    } else if (contextInfo.currentTopic === 'health') {
      try {
        const searchResult = await performSearch(`健康 ${message}`);
        if (searchResult) {
          return searchResult;
        }
      } catch (error) {
        console.error('搜索失败:', error);
      }
      return '关于健康问题，我可以帮你解答。你可以具体告诉我你的健康问题，比如感冒、发烧、头疼、运动健身、饮食营养等，我会尽力帮你解决。';
    } else if (contextInfo.currentTopic === 'education') {
      try {
        const searchResult = await performSearch(`学习 ${message}`);
        if (searchResult) {
          return searchResult;
        }
      } catch (error) {
        console.error('搜索失败:', error);
      }
      return '关于学习问题，我可以帮你解答。你可以具体告诉我你的学习问题，比如学习方法、考试准备、课程选择等，我会尽力帮你解决。';
    } else if (contextInfo.currentTopic === 'technology') {
      try {
        const searchResult = await performSearch(`技术 ${message}`);
        if (searchResult) {
          return searchResult;
        }
      } catch (error) {
        console.error('搜索失败:', error);
      }
      return '关于技术问题，我可以帮你解答。你可以具体告诉我你想了解的技术问题，我会尽力帮你解决。';
    }
    
    if (lastMessage.role === 'assistant') {
      // 检查上一条消息是否是问候语
      if (/你好|嗨|哈喽|早|早安|午安|晚安/i.test(lastMessage.content)) {
        if (userName) {
          return `我是${aiName}，很高兴为你服务${userName}！你有什么问题需要帮助吗？`;
        } else {
          return `我是${aiName}，很高兴为你服务！你有什么问题需要帮助吗？`;
        }
      }
    }
  }
  
  // 特殊处理复杂问题，直接触发深度推理
  const complexQuestions = [
    '如何在火星上种植植物',
    '如何在月球上建立永久殖民地',
    '如果人类发现了外星文明，我们应该如何与他们交流',
    '量子计算的原理',
    '宇宙的起源',
    '黑洞的形成',
    '太空探索的未来'
  ];
  
  for (const question of complexQuestions) {
    if (message.includes(question)) {
      console.log('检测到复杂问题，直接触发深度推理');
      const reasoningResponse = generateReasoningResponse(message, history, userName, aiName);
      return reasoningResponse;
    }
  }
  
  // 最后的搜索尝试
  try {
    const searchResult = await performSearch(message);
    if (searchResult) {
      return searchResult;
    }
  } catch (error) {
    console.error('搜索失败:', error);
  }
  
  console.log('没有匹配到任何模式，进行深度推理');
  // 深度推理：分析用户意图，理解上下文，生成人类般的思考过程
  const reasoningResponse = generateReasoningResponse(message, history, userName, aiName);
  return reasoningResponse;
};

// 从对话历史中提取关键词和信息
const extractHistoryInfo = (history: Array<{ role: string; content: string }>): { keywords: string[]; aiName: string; userName: string } => {
  const keywords: string[] = [];
  let aiName = '阮琳云'; // 默认名字
  let userName = ''; // 用户名字
  const recentHistory = history.slice(-5); // 只考虑最近5条消息
  
  for (const msg of recentHistory) {
    const content = msg.content;
    // 提取名字相关关键词
    if (/名字|称谓|称呼|你叫什么/i.test(content)) {
      keywords.push('名字');
    }
    // 提取AI的名字
    const nameMatch = content.match(/(阮琳云)/i);
    if (nameMatch) {
      aiName = nameMatch[1];
    }
    // 提取用户的名字
    if (msg.role === 'user') {
      const userIntroMatch = content.match(/我是(.*?)(?:，|。|！|\?|\?|$)/i);
      if (userIntroMatch && userIntroMatch[1]) {
        userName = userIntroMatch[1].trim();
      }
    }
    // 提取天气相关关键词
    if (/天气|温度|热|冷/i.test(content)) {
      keywords.push('天气');
    }
    // 提取情感相关关键词
    if (/开心|高兴|难过|伤心/i.test(content)) {
      keywords.push('情感');
    }
  }
  
  return { 
    keywords: [...new Set(keywords)], // 去重
    aiName, 
    userName
  };
};

// 分析对话上下文
interface ContextInfo {
  currentTopic: string;
  previousIntent: string;
  hasQuestion: boolean;
  needsSearch: boolean;
  contextKeywords: string[];
  currentTopicKeywords: string[];
  recentTopics: string[];
  conversationDepth: number;
  isFollowUp: boolean;
  topicConfidence: number; // 主题识别的置信度
  userPreferences: string[]; // 用户偏好
  emotionalState: string; // 用户情绪状态
}

const analyzeContext = (history: Array<{ role: string; content: string }>, currentMessage: string): ContextInfo => {
  const contextInfo: ContextInfo = {
    currentTopic: 'general',
    previousIntent: 'unknown',
    hasQuestion: false,
    needsSearch: false,
    contextKeywords: [],
    currentTopicKeywords: [],
    recentTopics: [],
    conversationDepth: 0,
    isFollowUp: false,
    topicConfidence: 0,
    userPreferences: [],
    emotionalState: 'neutral'
  };
  
  // 分析当前消息
  const currentSemantics = analyzeChineseSemantics(currentMessage);
  contextInfo.hasQuestion = currentSemantics.isQuestion;
  contextInfo.emotionalState = currentSemantics.sentiment || 'neutral';
  
  // 检测是否为追问
  contextInfo.isFollowUp = /那|然后|接下来|除了|还有|另外|再|继续|更|深入|详细|具体|还是|仍然|依然|依旧|仍然|还有呢|然后呢|接下来呢|再说说|详细说说|具体点/i.test(currentMessage);
  
  // 分析历史对话
  if (history.length > 0) {
    // 提取最近的几条消息
    const recentHistory = history.slice(-20); // 增加历史消息数量以更好地理解上下文
    contextInfo.conversationDepth = recentHistory.length;
    
    // 分析历史消息的意图和关键词
    for (const msg of recentHistory) {
      const msgSemantics = analyzeChineseSemantics(msg.content);
      if (msgSemantics.intent !== 'unknown') {
        contextInfo.previousIntent = msgSemantics.intent;
      }
      
      // 提取关键词
      if (msgSemantics.keywords.length > 0) {
        contextInfo.contextKeywords.push(...msgSemantics.keywords);
      }
      
      // 提取用户偏好
      if (msg.role === 'user') {
        // 提取喜欢的事物
        if (/喜欢|爱|偏好|倾向|偏爱|更喜欢|最爱的|最喜欢/i.test(msg.content)) {
          const preferences = msg.content.match(/喜欢(.*?)[。！？.!?]/) || msg.content.match(/爱(.*?)[。！？.!?]/);
          if (preferences && preferences[1]) {
            contextInfo.userPreferences.push(preferences[1].trim());
          }
        }
        
        // 提取主题相关关键词
        // 提取电脑相关关键词
        if (/电脑|计算机|PC|笔记本|台式机|硬件|软件|系统|Windows|Mac|Linux/i.test(msg.content)) {
          contextInfo.currentTopicKeywords.push('电脑');
          if (!contextInfo.recentTopics.includes('computer')) {
            contextInfo.recentTopics.push('computer');
          }
        }
        // 提取手机相关关键词
        if (/手机|智能手机|iPhone|Android|华为|小米|OPPO|vivo/i.test(msg.content)) {
          contextInfo.currentTopicKeywords.push('手机');
          if (!contextInfo.recentTopics.includes('phone')) {
            contextInfo.recentTopics.push('phone');
          }
        }
        // 提取技术相关关键词
        if (/技术|科技|互联网|网络|编程|代码|软件|应用/i.test(msg.content)) {
          contextInfo.currentTopicKeywords.push('技术');
          if (!contextInfo.recentTopics.includes('technology')) {
            contextInfo.recentTopics.push('technology');
          }
        }
        // 提取其他常见主题关键词
        if (/天气|温度|热|冷|下雨|下雪|晴天|多云|阴天/i.test(msg.content)) {
          contextInfo.currentTopicKeywords.push('天气');
          if (!contextInfo.recentTopics.includes('weather')) {
            contextInfo.recentTopics.push('weather');
          }
        }
        if (/健康|身体|生病|不舒服|感冒|发烧|头疼|肚子疼|锻炼|运动|健身/i.test(msg.content)) {
          contextInfo.currentTopicKeywords.push('健康');
          if (!contextInfo.recentTopics.includes('health')) {
            contextInfo.recentTopics.push('health');
          }
        }
        if (/学习|教育|学校|考试|作业|知识|课程/i.test(msg.content)) {
          contextInfo.currentTopicKeywords.push('学习');
          if (!contextInfo.recentTopics.includes('education')) {
            contextInfo.recentTopics.push('education');
          }
        }
        // 提取新添加的主题关键词
        if (/电影|音乐|游戏|电视剧|综艺|动漫|娱乐|明星|演唱会|电影推荐|音乐推荐|游戏攻略|好看的电影|好听的歌/i.test(msg.content)) {
          contextInfo.currentTopicKeywords.push('娱乐');
          if (!contextInfo.recentTopics.includes('entertainment')) {
            contextInfo.recentTopics.push('entertainment');
          }
        }
        if (/旅游|旅行|景点|假期|出行|游玩|旅游攻略|景点推荐|旅行计划|度假|出差|交通|酒店|住宿/i.test(msg.content)) {
          contextInfo.currentTopicKeywords.push('旅游');
          if (!contextInfo.recentTopics.includes('travel')) {
            contextInfo.recentTopics.push('travel');
          }
        }
        if (/工作|上班|加班|职场|职业|面试|简历|工作经验|职业规划|办公室|同事|上司|工作压力|薪资|待遇/i.test(msg.content)) {
          contextInfo.currentTopicKeywords.push('工作');
          if (!contextInfo.recentTopics.includes('work')) {
            contextInfo.recentTopics.push('work');
          }
        }
        if (/钱|工资|收入|支出|理财|投资|股票|基金|银行|存款|贷款|信用卡|消费|省钱|预算/i.test(msg.content)) {
          contextInfo.currentTopicKeywords.push('财务');
          if (!contextInfo.recentTopics.includes('finance')) {
            contextInfo.recentTopics.push('finance');
          }
        }
        if (/吃什么|吃饭|饮食|美食|好吃的|推荐美食|今天吃什么|想吃什么|喜欢吃什么|餐厅|饭店|外卖|订餐|美食推荐|特色菜/i.test(msg.content)) {
          contextInfo.currentTopicKeywords.push('饮食');
          if (!contextInfo.recentTopics.includes('food')) {
            contextInfo.recentTopics.push('food');
          }
        }
        if (/爱好|兴趣|平时喜欢|平时做什么|有什么爱好|你喜欢什么|业余时间做什么|休闲活动|兴趣爱好/i.test(msg.content)) {
          contextInfo.currentTopicKeywords.push('爱好');
          if (!contextInfo.recentTopics.includes('hobby')) {
            contextInfo.recentTopics.push('hobby');
          }
        }
      }
    }
    
    // 去重
    contextInfo.contextKeywords = [...new Set(contextInfo.contextKeywords)];
    contextInfo.currentTopicKeywords = [...new Set(contextInfo.currentTopicKeywords)];
    contextInfo.recentTopics = [...new Set(contextInfo.recentTopics)];
    contextInfo.userPreferences = [...new Set(contextInfo.userPreferences)];
  }
  
  // 检测是否需要搜索
  const searchKeywords = ['什么', '怎么', '为什么', '如何', '怎样', '哪里', '何时', '多少', '如何解决', '怎么处理', '为什么会', '是什么', '有什么', '如何提高', '怎么改善', '为什么出现', '如何避免', '怎么预防', '如何修复', '怎么解决', '怎样做', '如何做', '为什么要', '有哪些', '在哪里', '什么时候', '多少钱', '有什么用', '怎么用', '如何使用'];
  
  // 检测是否是简单的情感表达或问候，这些不需要搜索
  const simpleExpressions = ['嗯', '好', '很好', '不错', '是的', '对', '行', '可以', '谢谢', '再见', '你好', '嗨', '早', '晚安'];
  const isSimpleExpression = simpleExpressions.some(expr => currentMessage.includes(expr)) && currentMessage.length < 10;
  
  // 只有当包含搜索关键词或问号，且不是简单表达时才需要搜索
  contextInfo.needsSearch = (!isSimpleExpression) && (searchKeywords.some(keyword => currentMessage.includes(keyword)) || /\?+/.test(currentMessage));
  
  // 主题关键词计数，用于确定置信度
  const topicCounts = {
    computer: 0,
    phone: 0,
    technology: 0,
    weather: 0,
    health: 0,
    education: 0,
    entertainment: 0,
    travel: 0,
    work: 0,
    finance: 0,
    food: 0,
    hobby: 0
  };
  
  // 计算当前消息中的主题关键词数量
  if (/电脑|计算机|PC|笔记本|台式机|硬件|软件|系统|Windows|Mac|Linux/i.test(currentMessage)) {
    topicCounts.computer++;
  }
  if (/手机|智能手机|iPhone|Android|华为|小米|OPPO|vivo/i.test(currentMessage)) {
    topicCounts.phone++;
  }
  if (/技术|科技|互联网|网络|编程|代码|软件|应用/i.test(currentMessage)) {
    topicCounts.technology++;
  }
  if (/天气|温度|热|冷|下雨|下雪|晴天|多云|阴天/i.test(currentMessage)) {
    topicCounts.weather++;
  }
  if (/健康|身体|生病|不舒服|感冒|发烧|头疼|肚子疼|锻炼|运动|健身/i.test(currentMessage)) {
    topicCounts.health++;
  }
  if (/学习|教育|学校|考试|作业|知识|课程/i.test(currentMessage)) {
    topicCounts.education++;
  }
  if (/电影|音乐|游戏|电视剧|综艺|动漫|娱乐|明星|演唱会|电影推荐|音乐推荐|游戏攻略|好看的电影|好听的歌/i.test(currentMessage)) {
    topicCounts.entertainment++;
  }
  if (/旅游|旅行|景点|假期|出行|游玩|旅游攻略|景点推荐|旅行计划|度假|出差|交通|酒店|住宿/i.test(currentMessage)) {
    topicCounts.travel++;
  }
  if (/工作|上班|加班|职场|职业|面试|简历|工作经验|职业规划|办公室|同事|上司|工作压力|薪资|待遇/i.test(currentMessage)) {
    topicCounts.work++;
  }
  if (/钱|工资|收入|支出|理财|投资|股票|基金|银行|存款|贷款|信用卡|消费|省钱|预算/i.test(currentMessage)) {
    topicCounts.finance++;
  }
  if (/吃什么|吃饭|饮食|美食|好吃的|推荐美食|今天吃什么|想吃什么|喜欢吃什么|餐厅|饭店|外卖|订餐|美食推荐|特色菜/i.test(currentMessage)) {
    topicCounts.food++;
  }
  if (/爱好|兴趣|平时喜欢|平时做什么|有什么爱好|你喜欢什么|业余时间做什么|休闲活动|兴趣爱好/i.test(currentMessage)) {
    topicCounts.hobby++;
  }
  
  // 计算历史消息中的主题关键词数量
  if (history.length > 0) {
    const recentHistory = history.slice(-15); // 增加历史消息数量以更好地理解上下文
    for (const msg of recentHistory) {
      if (msg.role === 'user') {
        if (/电脑|计算机|PC|笔记本|台式机|硬件|软件|系统|Windows|Mac|Linux/i.test(msg.content)) {
          topicCounts.computer++;
        }
        if (/手机|智能手机|iPhone|Android|华为|小米|OPPO|vivo/i.test(msg.content)) {
          topicCounts.phone++;
        }
        if (/技术|科技|互联网|网络|编程|代码|软件|应用/i.test(msg.content)) {
          topicCounts.technology++;
        }
        if (/天气|温度|热|冷|下雨|下雪|晴天|多云|阴天/i.test(msg.content)) {
          topicCounts.weather++;
        }
        if (/健康|身体|生病|不舒服|感冒|发烧|头疼|肚子疼|锻炼|运动|健身/i.test(msg.content)) {
          topicCounts.health++;
        }
        if (/学习|教育|学校|考试|作业|知识|课程/i.test(msg.content)) {
          topicCounts.education++;
        }
        if (/电影|音乐|游戏|电视剧|综艺|动漫|娱乐|明星|演唱会|电影推荐|音乐推荐|游戏攻略|好看的电影|好听的歌/i.test(msg.content)) {
          topicCounts.entertainment++;
        }
        if (/旅游|旅行|景点|假期|出行|游玩|旅游攻略|景点推荐|旅行计划|度假|出差|交通|酒店|住宿/i.test(msg.content)) {
          topicCounts.travel++;
        }
        if (/工作|上班|加班|职场|职业|面试|简历|工作经验|职业规划|办公室|同事|上司|工作压力|薪资|待遇/i.test(msg.content)) {
          topicCounts.work++;
        }
        if (/钱|工资|收入|支出|理财|投资|股票|基金|银行|存款|贷款|信用卡|消费|省钱|预算/i.test(msg.content)) {
          topicCounts.finance++;
        }
        if (/吃什么|吃饭|饮食|美食|好吃的|推荐美食|今天吃什么|想吃什么|喜欢吃什么|餐厅|饭店|外卖|订餐|美食推荐|特色菜/i.test(msg.content)) {
          topicCounts.food++;
        }
        if (/爱好|兴趣|平时喜欢|平时做什么|有什么爱好|你喜欢什么|业余时间做什么|休闲活动|兴趣爱好/i.test(msg.content)) {
          topicCounts.hobby++;
        }
      }
    }
  }
  
  // 确定当前主题，优先考虑当前消息中的明确主题，然后考虑历史主题
  let maxCount = 0;
  let mostLikelyTopic = 'general';
  
  // 检查当前消息中的明确主题关键词
  if (topicCounts.computer > 0) {
    maxCount = topicCounts.computer;
    mostLikelyTopic = 'computer';
    contextInfo.topicConfidence = 0.9;
  }
  if (topicCounts.phone > maxCount) {
    maxCount = topicCounts.phone;
    mostLikelyTopic = 'phone';
    contextInfo.topicConfidence = 0.9;
  }
  if (topicCounts.technology > maxCount) {
    maxCount = topicCounts.technology;
    mostLikelyTopic = 'technology';
    contextInfo.topicConfidence = 0.8;
  }
  if (topicCounts.weather > maxCount) {
    maxCount = topicCounts.weather;
    mostLikelyTopic = 'weather';
    contextInfo.topicConfidence = 0.9;
  }
  if (topicCounts.health > maxCount) {
    maxCount = topicCounts.health;
    mostLikelyTopic = 'health';
    contextInfo.topicConfidence = 0.9;
  }
  if (topicCounts.education > maxCount) {
    maxCount = topicCounts.education;
    mostLikelyTopic = 'education';
    contextInfo.topicConfidence = 0.9;
  }
  if (topicCounts.entertainment > maxCount) {
    maxCount = topicCounts.entertainment;
    mostLikelyTopic = 'entertainment';
    contextInfo.topicConfidence = 0.9;
  }
  if (topicCounts.travel > maxCount) {
    maxCount = topicCounts.travel;
    mostLikelyTopic = 'travel';
    contextInfo.topicConfidence = 0.9;
  }
  if (topicCounts.work > maxCount) {
    maxCount = topicCounts.work;
    mostLikelyTopic = 'work';
    contextInfo.topicConfidence = 0.9;
  }
  if (topicCounts.finance > maxCount) {
    maxCount = topicCounts.finance;
    mostLikelyTopic = 'finance';
    contextInfo.topicConfidence = 0.9;
  }
  if (topicCounts.food > maxCount) {
    maxCount = topicCounts.food;
    mostLikelyTopic = 'food';
    contextInfo.topicConfidence = 0.9;
  }
  if (topicCounts.hobby > maxCount) {
    maxCount = topicCounts.hobby;
    mostLikelyTopic = 'hobby';
    contextInfo.topicConfidence = 0.9;
  }
  
  // 如果当前消息没有明确主题，但有历史主题
  if (maxCount === 0 && contextInfo.recentTopics.length > 0) {
    // 使用最近的主题
    mostLikelyTopic = contextInfo.recentTopics[contextInfo.recentTopics.length - 1];
    contextInfo.topicConfidence = 0.7;
  }
  
  // 如果是追问，使用最近的主题
  if (contextInfo.isFollowUp && contextInfo.recentTopics.length > 0) {
    mostLikelyTopic = contextInfo.recentTopics[contextInfo.recentTopics.length - 1];
    contextInfo.topicConfidence = 0.8;
    contextInfo.needsSearch = true; // 追问通常需要更详细的信息
  }
  
  contextInfo.currentTopic = mostLikelyTopic;
  
  // 确保当前主题在最近主题列表中
  if (!contextInfo.recentTopics.includes(mostLikelyTopic) && mostLikelyTopic !== 'general') {
    contextInfo.recentTopics.push(mostLikelyTopic);
  }
  
  return contextInfo;
};

// 从网络搜索信息
const fetchWebSearch = async (query: string): Promise<string | null> => {
  try {
    console.log('从网络搜索信息:', query);
    
    // 尝试使用不同的搜索API
    const searchAPIs = [
      {
        name: 'SerpAPI',
        url: `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${process.env.SERPAPI_KEY || 'demo'}`
      },
      {
        name: 'Bing Search API',
        url: `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}`,
        headers: {
          'Ocp-Apim-Subscription-Key': process.env.BING_API_KEY || 'demo'
        }
      }
    ];
    
    // 尝试每个API，直到成功
    for (const api of searchAPIs) {
      try {
        console.log(`尝试使用${api.name}进行搜索`);
        const config: any = {
          timeout: 5000 // 5秒超时
        };
        
        if (api.headers) {
          config.headers = api.headers;
        }
        
        const response = await axios.get(api.url, config);
        const data = response.data;
        
        // 提取搜索结果
        if (data.organic_results && data.organic_results.length > 0) {
          // SerpAPI格式
          const topResults = data.organic_results.slice(0, 3);
          let searchSummary = `关于"${query}"，我从网络上找到了以下信息：\n\n`;
          
          topResults.forEach((result: any, index: number) => {
            if (result.title && result.snippet) {
              searchSummary += `${index + 1}. ${result.title}\n`;
              searchSummary += `   ${result.snippet}\n\n`;
            }
          });
          
          searchSummary += '以上信息来自网络搜索，仅供参考。如果你需要更详细的信息，可以提供更多具体问题。';
          return searchSummary;
        } else if (data.webPages && data.webPages.value && data.webPages.value.length > 0) {
          // Bing API格式
          const topResults = data.webPages.value.slice(0, 3);
          let searchSummary = `关于"${query}"，我从网络上找到了以下信息：\n\n`;
          
          topResults.forEach((result: any, index: number) => {
            if (result.name && result.snippet) {
              searchSummary += `${index + 1}. ${result.name}\n`;
              searchSummary += `   ${result.snippet}\n\n`;
            }
          });
          
          searchSummary += '以上信息来自网络搜索，仅供参考。如果你需要更详细的信息，可以提供更多具体问题。';
          return searchSummary;
        }
      } catch (apiError) {
        console.error(`${api.name}搜索失败:`, apiError);
        // 继续尝试下一个API
        continue;
      }
    }
    
    // 如果所有API都失败，返回一个友好的消息
    return `抱歉，我暂时无法从网络获取关于"${query}"的信息。不过，我可以基于我的知识为你提供一些相关的建议和信息。`;
  } catch (error) {
    console.error('网络搜索失败:', error);
    // 网络搜索失败时，返回一个友好的消息，而不是null
    return `抱歉，我暂时无法从网络获取关于"${query}"的信息。不过，我可以基于我的知识为你提供一些相关的建议和信息。`;
  }
};

// 过滤垃圾信息
const filterGarbageContent = (content: string): string => {
  // 过滤常见的垃圾信息模式
  const garbagePatterns = [
    /广告|推广|营销|促销/g,
    /点击这里|立即购买|限时优惠/g,
    /www\.\w+\.com/g,
    /http:\/\/|https:\/\//g
  ];
  
  let filteredContent = content;
  garbagePatterns.forEach(pattern => {
    filteredContent = filteredContent.replace(pattern, '[链接]');
  });
  
  // 移除重复内容
  const sentences = filteredContent.split('\n');
  const uniqueSentences = [...new Set(sentences)];
  return uniqueSentences.join('\n');
};

// 执行搜索操作
const performSearch = async (query: string): Promise<string | null> => {
  console.log('执行搜索:', query);
  
  // 检查是否是图片搜索请求
  if (/图片|照片|图片搜索|找图片|搜索图片|给我一张|发一张|一张.*图片/i.test(query)) {
    console.log('检测到图片搜索请求');
    try {
      // 使用Bing图片搜索API
      const apiKey = process.env.BING_IMAGE_API_KEY || 'demo';
      const searchUrl = `https://api.bing.microsoft.com/v7.0/images/search?q=${encodeURIComponent(query)}&count=3`;
      
      const response = await axios.get(searchUrl, {
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey
        },
        timeout: 5000
      });
      
      const data = response.data;
      if (data.value && data.value.length > 0) {
        let imageResults = `我为你找到了以下图片：\n\n`;
        data.value.forEach((image: any, index: number) => {
          if (image.contentUrl) {
            imageResults += `${index + 1}. ${image.contentUrl}\n`;
          }
        });
        return imageResults;
      }
    } catch (error) {
      console.error('图片搜索失败:', error);
      // 回退到通用搜索
    }
  }
  
  // 提取搜索关键词
  const searchQuery = query.replace(/[？?]/g, '');
  
  // 模拟搜索结果，提供具体的回答
  // 电脑相关问题
  if (/电脑|计算机|PC|笔记本|台式机|硬件|软件|系统|Windows|Mac|Linux/i.test(query)) {
    if (/卡|卡顿|流畅|优化|性能|速度|慢|反应慢|卡死/i.test(query)) {
      return `关于电脑卡顿问题，我找到了以下解决方案：\n\n1. 清理系统垃圾和缓存\n   - 使用系统自带的磁盘清理工具：右键点击C盘 -> 属性 -> 磁盘清理\n   - 清理浏览器缓存：打开浏览器 -> 设置 -> 隐私和安全 -> 清除浏览数据\n   - 使用第三方清理工具如CCleaner进行深度清理\n\n2. 优化启动项\n   - 打开任务管理器（Ctrl+Shift+Esc）\n   - 切换到"启动"选项卡\n   - 禁用不必要的启动程序（如音乐播放器、游戏客户端等）\n\n3. 检查后台进程\n   - 打开任务管理器\n   - 切换到"进程"选项卡\n   - 查看哪些进程占用了大量CPU或内存\n   - 结束不必要的进程（注意：不要结束系统关键进程）\n\n4. 更新驱动程序\n   - 访问设备制造商官网下载最新驱动\n   - 使用驱动更新工具如Driver Booster自动更新\n   - 重点更新显卡、主板和网络驱动\n\n5. 硬件升级\n   - 增加内存（推荐至少8GB，最好16GB）\n   - 更换为固态硬盘（SSD），提升系统启动和程序加载速度\n   - 清理CPU散热器灰尘，确保散热良好\n\n6. 系统优化\n   - 关闭视觉效果：右键点击此电脑 -> 属性 -> 高级系统设置 -> 性能设置 -> 调整为最佳性能\n   - 调整虚拟内存：系统属性 -> 高级 -> 性能 -> 设置 -> 高级 -> 虚拟内存 -> 更改\n   - 定期更新系统，安装最新的安全补丁\n\n7. 病毒和恶意软件扫描\n   - 使用Windows Defender进行全面扫描\n   - 或使用第三方杀毒软件如360安全卫士、腾讯电脑管家\n\n希望这些方法能帮助你解决电脑卡顿问题！如果问题仍然存在，你可以尝试重新安装操作系统。`;
    } else if (/蓝屏|崩溃|重启|死机/i.test(query)) {
      return `关于电脑蓝屏问题，我找到了以下解决方案：\n\n1. 检查硬件\n   - 重新插拔内存、显卡等硬件，确保接触良好\n   - 检查硬盘健康状态：使用CrystalDiskInfo软件\n   - 测试内存是否有问题：使用MemTest86软件进行全面测试\n   - 检查CPU温度是否过高，确保散热器正常工作\n\n2. 更新驱动程序\n   - 重点更新显卡驱动：访问显卡官网下载最新驱动\n   - 更新主板芯片组驱动\n   - 更新网络适配器驱动\n   - 可以使用驱动精灵等工具自动更新\n\n3. 系统文件检查\n   - 以管理员身份运行命令提示符\n   - 输入 "sfc /scannow" 并按回车\n   - 等待扫描完成并修复系统文件\n   - 如果sfc命令失败，尝试 "DISM /Online /Cleanup-Image /RestoreHealth"\n\n4. 检查病毒和恶意软件\n   - 使用Windows Defender进行全面扫描\n   - 或使用第三方杀毒软件如卡巴斯基、 McAfee\n   - 检查启动项中的可疑程序：任务管理器 -> 启动\n\n5. 系统还原\n   - 打开控制面板 -> 系统和安全 -> 系统 -> 系统保护\n   - 点击"系统还原"，选择一个还原点（在问题出现之前）\n   - 按照提示完成还原过程\n\n6. 检查磁盘错误\n   - 右键点击C盘 -> 属性 -> 工具 -> 检查\n   - 选择"扫描并修复驱动器"\n   - 等待扫描完成\n\n7. 重新安装系统\n   - 如果以上方法都无效，考虑重新安装Windows\n   - 记得备份重要数据到外部存储设备\n   - 使用官方安装介质进行干净安装\n\n希望这些方法能帮助你解决电脑蓝屏问题！`;
    } else if (/系统|Windows|Mac|Linux|安装|升级/i.test(query)) {
      return `关于操作系统安装和升级，我找到了以下信息：\n\n1. Windows系统安装\n   - 准备U盘启动盘：使用Media Creation Tool制作\n   - 进入BIOS设置：开机按F2、F10或Delete键\n   - 设置U盘为第一启动项\n   - 按照提示完成安装过程\n   - 激活系统并安装驱动程序\n\n2. 系统升级\n   - Windows 10/11升级：设置 -> 更新和安全 -> Windows更新\n   - 注意备份重要数据\n   - 确保系统满足最低硬件要求\n   - 升级前关闭杀毒软件和防火墙\n\n3. 系统优化\n   - 关闭不必要的服务和功能\n   - 清理系统垃圾和临时文件\n   - 优化电源计划：控制面板 -> 电源选项\n   - 开启系统保护：创建还原点\n\n4. 常见问题解决\n   - 系统激活问题：检查产品密钥或联系微软支持\n   - 驱动程序冲突：更新或回滚驱动\n   - 系统启动失败：使用启动修复工具\n   - 系统崩溃：检查硬件和系统文件\n\n希望这些信息能帮助你解决操作系统相关问题！`;
    } else if (/软件|安装|卸载|程序/i.test(query)) {
      return `关于软件安装和卸载，我找到了以下信息：\n\n1. 软件安装\n   - 从官方网站或可信来源下载软件\n   - 运行安装程序，按照提示完成安装\n   - 注意勾选选项，避免安装捆绑软件\n   - 安装完成后重启电脑（如果需要）\n\n2. 软件卸载\n   - 通过控制面板卸载：控制面板 -> 程序 -> 程序和功能 -> 选择软件 -> 卸载\n   - 通过设置卸载：设置 -> 应用 -> 应用和功能 -> 选择软件 -> 卸载\n   - 使用第三方卸载工具如Geek Uninstaller进行彻底卸载\n   - 清理残留文件和注册表项\n\n3. 常见问题解决\n   - 安装失败：检查系统兼容性，关闭杀毒软件，以管理员身份运行\n   - 卸载失败：使用第三方卸载工具，或进入安全模式卸载\n   - 软件冲突：检查是否有其他软件与当前软件冲突\n   - 软件崩溃：更新软件到最新版本，检查系统兼容性\n\n希望这些信息能帮助你解决软件相关问题！`;
    }
  }
  
  // 手机相关问题
  if (/手机|智能手机|iPhone|Android|华为|小米|OPPO|vivo/i.test(query)) {
    if (/电池|充电|续航/i.test(query)) {
      return `关于手机电池续航问题，我找到了以下解决方案：\n\n1. 电池优化\n   - 降低屏幕亮度：设置 -> 显示 -> 亮度\n   - 关闭不必要的通知：设置 -> 通知\n   - 开启省电模式：设置 -> 电池 -> 省电模式\n   - 关闭后台应用刷新：设置 -> 通用 -> 后台应用刷新（iOS）或设置 -> 应用 -> 应用管理（Android）\n\n2. 应用管理\n   - 检查哪些应用占用了大量电量：设置 -> 电池\n   - 卸载不常用的应用\n   - 限制后台应用活动：设置 -> 电池 -> 电池优化\n   - 关闭应用自动启动：设置 -> 应用 -> 权限管理\n\n3. 充电习惯\n   - 使用原装充电器和数据线\n   - 避免过度充电（充满后及时拔掉）\n   - 避免在高温或低温环境下充电\n   - 定期完全放电并充满（每月1-2次）\n   - 避免边充电边使用手机，尤其是玩游戏或看视频\n\n4. 系统设置\n   - 更新到最新系统版本：设置 -> 系统更新\n   - 关闭定位服务（仅在需要时开启）：设置 -> 隐私 -> 定位服务\n   - 关闭蓝牙、Wi-Fi等不使用的功能\n   - 缩短自动锁屏时间：设置 -> 显示 -> 自动锁屏\n\n5. 硬件检查\n   - 检查电池健康状态：\n     * iOS：设置 -> 电池 -> 电池健康\n     * Android：部分手机在设置 -> 电池中，或使用第三方应用如AccuBattery\n   - 如果电池老化（健康度低于80%），考虑更换电池\n   - 检查充电器和充电接口是否正常，清理接口灰尘\n\n6. 其他技巧\n   - 使用深色模式：设置 -> 显示 -> 深色模式\n   - 关闭动态效果：设置 -> 辅助功能 -> 动态效果\n   - 限制后台数据使用：设置 -> 移动网络 -> 后台数据\n\n希望这些方法能帮助你改善手机电池续航！`;
    } else if (/卡|卡顿|流畅|优化|性能|速度|慢|反应慢|卡死/i.test(query)) {
      return `关于手机卡顿问题，我找到了以下解决方案：\n\n1. 清理缓存\n   - Android：设置 -> 应用管理 -> 选择应用 -> 存储 -> 清除缓存\n   - iOS：设置 -> 通用 -> iPhone存储 -> 选择应用 -> 卸载并重新安装\n\n2. 关闭后台应用\n   - 使用最近任务管理器关闭不需要的应用\n   - Android：开启智能后台管理\n   - iOS：双击Home键或从底部上滑打开任务管理器，上滑关闭应用\n\n3. 存储优化\n   - 检查存储空间：设置 -> 存储\n   - 确保有足够的空闲空间（至少10%）\n   - 清理下载文件夹和临时文件\n   - 使用文件管理器删除不必要的文件\n   - 清理照片和视频：备份到云存储后删除本地文件\n\n4. 系统更新\n   - 检查并安装最新的系统更新：设置 -> 系统更新\n   - 更新应用到最新版本：应用商店 -> 更新\n\n5. 恢复出厂设置\n   - 备份重要数据：照片、联系人、文档等\n   - Android：设置 -> 系统 -> 重置 -> 恢复出厂设置\n   - iOS：设置 -> 通用 -> 传输或还原iPhone -> 还原 -> 抹掉所有内容和设置\n   - 重新设置手机并安装必要的应用\n\n6. 硬件检查\n   - 检查手机是否过热：避免长时间玩游戏或在高温环境使用\n   - 确保电池健康状态良好\n   - 检查存储空间是否已满\n   - 考虑升级到更高配置的手机\n\n7. 其他技巧\n   - 关闭动画效果：设置 -> 辅助功能 -> 动态效果\n   - 限制后台应用权限：设置 -> 应用 -> 权限管理\n   - 避免安装过多应用\n   - 使用轻量级应用代替重型应用\n\n希望这些方法能帮助你解决手机卡顿问题！`;
    } else if (/相机|拍照|摄影/i.test(query)) {
      return `关于手机相机使用技巧，我找到了以下信息：\n\n1. 基本设置\n   - 分辨率设置：选择最高分辨率以获得最佳画质\n   - HDR模式：在高对比度场景下开启\n   - 网格线：开启网格线帮助构图\n   - 对焦模式：点击屏幕选择对焦区域\n\n2. 拍照技巧\n   - 光线：尽量使用自然光，避免背光\n   - 构图：遵循三分法则，将主体放在交叉点上\n   - 稳定：使用三脚架或寻找支撑点避免抖动\n   - 角度：尝试不同角度拍摄，找到最佳视角\n\n3. 高级功能\n   - 人像模式：拍摄人物时使用，背景虚化效果\n   - 夜景模式：在低光环境下使用\n   - 专业模式：手动调整ISO、快门速度、白平衡\n   - 慢动作：拍摄动态场景\n\n4. 后期处理\n   - 使用内置编辑器调整亮度、对比度、饱和度\n   - 尝试第三方编辑应用如Snapseed、Lightroom\n   - 裁剪照片以改善构图\n\n5. 常见问题解决\n   - 模糊：确保对焦正确，保持稳定\n   - 过曝/欠曝：调整曝光补偿\n   - 噪点：降低ISO，使用三脚架\n   - 色彩失真：调整白平衡\n\n希望这些技巧能帮助你拍出更好的照片！`;
    } else if (/系统|更新|升级|刷机/i.test(query)) {
      return `关于手机系统更新和升级，我找到了以下信息：\n\n1. 系统更新\n   - 检查更新：设置 -> 系统更新 -> 检查更新\n   - 下载并安装更新：按照提示完成更新过程\n   - 备份重要数据：更新前建议备份数据\n   - 确保电量充足：更新过程中需要足够的电量\n\n2. 系统升级\n   - 检查设备是否支持新系统\n   - 了解新系统的新特性和变化\n   - 备份数据：升级前一定要备份重要数据\n   - 确保足够的存储空间：升级需要足够的空间\n\n3. 常见问题解决\n   - 更新失败：检查网络连接，确保电量充足，重新尝试\n   - 系统卡顿：更新后可能需要一段时间优化，重启设备\n   - 应用不兼容：更新应用到最新版本，或等待应用适配\n   - 电池消耗增加：更新后系统可能在后台进行优化，一段时间后会恢复正常\n\n4. 刷机（仅适合高级用户）\n   - 了解刷机风险：可能导致设备变砖，失去保修\n   - 选择合适的ROM：从可信来源下载\n   - 备份所有数据：刷机前完全备份\n   - 按照教程步骤操作：确保步骤正确\n\n希望这些信息能帮助你解决手机系统相关问题！`;
    }
  }
  
  // 技术相关问题
  if (/人工智能|AI|机器学习|深度学习/i.test(query)) {
    if (/什么是|定义|概念/i.test(query)) {
      return `关于人工智能，我找到了以下信息：\n\n人工智能（Artificial Intelligence，简称AI）是指让计算机系统具备类似人类智能的能力，包括学习、推理、感知、理解自然语言等。\n\n主要特点：\n1. 学习能力：通过数据学习和改进\n2. 推理能力：基于知识和规则进行推理\n3. 感知能力：通过传感器获取环境信息\n4. 自然语言处理：理解和生成人类语言\n5. 问题解决：解决复杂的问题\n\n应用领域：\n- 自然语言处理：语音识别、机器翻译、聊天机器人\n- 计算机视觉：图像识别、人脸识别、物体检测\n- 推荐系统：电商推荐、内容推荐、个性化广告\n- 自动驾驶：自动驾驶汽车、无人机\n- 医疗诊断：辅助医生诊断疾病、医学影像分析\n- 金融分析：风险评估、欺诈检测、算法交易\n- 教育：智能辅导、个性化学习\n- 娱乐：游戏AI、内容生成\n\n发展阶段：\n- 弱人工智能（ANI）：专注于特定任务的AI\n- 强人工智能（AGI）：具备人类级别的智能\n- 超人工智能（ASI）：超越人类智能的AI\n\n人工智能正在改变我们的生活和工作方式，是当前科技发展的重要方向。`;
    } else if (/应用|领域|用途|使用/i.test(query)) {
      return `关于人工智能的应用领域，我找到了以下信息：\n\n1. 自然语言处理\n   - 语音识别： Siri、Alexa、小度等智能助手\n   - 机器翻译：Google翻译、百度翻译\n   - 文本分析：情感分析、文本分类、信息提取\n   - 聊天机器人：客服机器人、个人助手\n\n2. 计算机视觉\n   - 图像识别：物体识别、场景理解\n   - 人脸识别：身份验证、安防监控\n   - 医学影像分析：肿瘤检测、疾病诊断\n   - 自动驾驶：车道检测、障碍物识别\n\n3. 推荐系统\n   - 电商推荐：淘宝、京东商品推荐\n   - 内容推荐：抖音、快手、Netflix\n   - 个性化广告：Google、Facebook广告\n\n4. 金融科技\n   - 风险评估：信用评分、贷款审批\n   - 欺诈检测：信用卡欺诈、保险欺诈\n   - 算法交易：高频交易、市场预测\n   - 智能投顾：个性化投资建议\n\n5. 医疗健康\n   - 疾病诊断：辅助诊断、医学影像分析\n   - 药物研发：药物分子设计、临床试验优化\n   - 健康管理：个性化健康建议、远程医疗\n\n6. 教育\n   - 智能辅导：个性化学习路径\n   - 自动评分：作业和考试评分\n   - 教育内容生成：教材和试题生成\n\n7. 制造业\n   -  predictive maintenance：设备故障预测\n   - 质量控制：产品缺陷检测\n   - 供应链优化：需求预测、库存管理\n\n8. 娱乐\n   - 游戏AI：游戏角色和对手\n   - 内容生成：音乐、绘画、文章生成\n   - 虚拟现实：VR/AR体验优化\n\n人工智能的应用正在不断扩展，几乎渗透到所有行业和领域。`;
    }
  }
  
  if (/机器学习/i.test(query)) {
    if (/什么是|定义|概念/i.test(query)) {
      return `关于机器学习，我找到了以下信息：\n\n机器学习是人工智能的一个分支，是指计算机系统通过数据学习和改进，而不需要明确编程的能力。\n\n主要类型：\n1. 监督学习：通过标记数据学习\n   - 分类：垃圾邮件检测、图像识别\n   - 回归：房价预测、股票价格预测\n\n2. 无监督学习：从无标记数据中发现模式\n   - 聚类：客户分群、异常检测\n   - 降维：数据可视化、特征提取\n\n3. 半监督学习：结合标记和无标记数据\n   - 应用：标注数据不足的场景\n\n4. 强化学习：通过试错学习最优策略\n   - 应用：游戏AI、机器人控制\n\n核心算法：\n- 线性回归：预测连续值\n- 逻辑回归：分类问题\n- 决策树：基于规则的分类\n- 随机森林：集成多个决策树\n- 支持向量机：分类和回归\n- 神经网络：深度学习的基础\n- K最近邻：基于相似性的分类\n- K均值聚类：无监督聚类\n\n应用领域：\n- 图像识别：识别图片中的物体\n- 语音识别：将语音转换为文本\n- 自然语言处理：理解和生成文本\n- 推荐系统：推荐商品或内容\n- 金融预测：预测股票价格\n- 医疗诊断：辅助诊断疾病\n- 自动驾驶：路径规划、障碍物 avoidance\n\n机器学习的流程：\n1. 数据收集和预处理\n2. 特征工程\n3. 模型选择和训练\n4. 模型评估和调优\n5. 模型部署和监控\n\n机器学习是现代AI的核心技术，正在各个领域得到广泛应用。`;
    }
  }
  
  // 健康相关问题
  if (/健康|身体|生病|不舒服|感冒|发烧|头疼|肚子疼|锻炼|运动|健身/i.test(query)) {
    if (/感冒|发烧|头疼|肚子疼|症状/i.test(query)) {
      return `关于常见疾病症状和处理方法，我找到了以下信息：\n\n1. 感冒\n   - 症状：鼻塞、流涕、咳嗽、喉咙痛、轻度发热\n   - 处理方法：\n     * 多休息，保证充足睡眠\n     * 多喝水，保持身体水分\n     * 服用感冒药缓解症状\n     * 保持室内空气流通\n     * 避免过度劳累\n\n2. 发烧\n   - 症状：体温升高（超过37.3℃）、乏力、肌肉酸痛、头痛\n   - 处理方法：\n     * 多喝水，补充水分\n     * 使用退烧药（如对乙酰氨基酚、布洛芬）\n     * 物理降温：温水擦浴\n     * 多休息\n     * 如果体温超过38.5℃或持续不退，应及时就医\n\n3. 头痛\n   - 症状：头部疼痛，可分为偏头痛、紧张性头痛等\n   - 处理方法：\n     * 休息，避免强光和噪音\n     * 按摩头部和颈部\n     * 服用止痛药（如布洛芬、对乙酰氨基酚）\n     * 保持良好的作息习惯\n     * 如果头痛剧烈或频繁发作，应及时就医\n\n4. 肚子疼\n   - 症状：腹部疼痛，可能伴随恶心、呕吐、腹泻等\n   - 处理方法：\n     * 暂时禁食或吃清淡易消化的食物\n     * 热敷腹部\n     * 避免辛辣、油腻食物\n     * 如果疼痛剧烈或持续时间长，应及时就医\n\n5. 预防措施\n   - 保持良好的个人卫生\n   - 均衡饮食，多吃蔬菜水果\n   - 适量运动，增强免疫力\n   - 保持充足的睡眠\n   - 避免过度疲劳和压力\n\n注意：以上信息仅供参考，如果症状严重或持续时间长，应及时就医。`;
    } else if (/锻炼|运动|健身/i.test(query)) {
      return `关于运动和健身，我找到了以下信息：\n\n1. 常见运动方式\n   - 有氧运动：跑步、游泳、骑自行车、快走\n   - 力量训练：举重、俯卧撑、深蹲、哑铃训练\n   - 柔韧性训练：瑜伽、拉伸、普拉提\n   - 平衡训练：太极、单脚站立\n\n2. 运动建议\n   - 每周至少150分钟中等强度有氧运动\n   - 每周2-3次力量训练，覆盖主要肌肉群\n   - 运动前热身，运动后拉伸\n   - 逐渐增加运动强度和时间\n   - 保持正确的运动姿势，避免受伤\n\n3. 健身计划\n   - 初学者：从低强度开始，逐渐增加\n   - 中级：结合有氧和力量训练\n   - 高级：制定针对性的训练计划\n   - 注意休息，给身体恢复时间\n\n4. 饮食建议\n   - 运动前：适量碳水化合物，提供能量\n   - 运动中：补充水分\n   - 运动后：蛋白质和碳水化合物，促进恢复\n   - 均衡饮食，摄入足够的营养\n\n5. 常见问题\n   - 肌肉酸痛：正常现象，可通过拉伸和按摩缓解\n   - 运动损伤：立即停止运动，冰敷受伤部位，严重时就医\n   - 运动疲劳：适当休息，调整训练计划\n   - 坚持困难：找运动伙伴，设定目标，保持动力\n\n6. 特殊人群\n   - 老年人：选择低冲击运动，如散步、太极拳\n   - 孕妇：咨询医生，选择适合的运动\n   - 慢性病患者：在医生指导下运动\n\n希望这些信息能帮助你开始或改进你的运动计划！`;
    } else if (/饮食|营养|健康饮食/i.test(query)) {
      return `关于健康饮食，我找到了以下信息：\n\n1. 均衡饮食\n   - 主食：粗细搭配，多吃全谷物\n   - 蛋白质：适量摄入瘦肉、鱼类、豆类、蛋类\n   - 蔬菜水果：每天摄入多种颜色的蔬菜水果\n   - 奶制品：适量摄入牛奶、酸奶等\n   - 油脂：选择健康油脂，如橄榄油、亚麻籽油\n\n2. 饮食建议\n   - 控制总热量：根据个人情况调整饮食量\n   - 规律进餐：定时定量，避免暴饮暴食\n   - 多喝水：每天喝足够的水，少喝含糖饮料\n   - 减少盐摄入：每天盐摄入量不超过5克\n   - 减少加工食品：尽量选择新鲜食材\n\n3. 特殊人群饮食\n   - 儿童：保证营养均衡，促进生长发育\n   - 老年人：增加钙和维生素D摄入，预防骨质疏松\n   - 孕妇：增加叶酸、铁、钙等营养素摄入\n   - 慢性病患者：根据病情调整饮食\n\n4. 饮食误区\n   - 过度节食：可能导致营养不良\n   - 单一食物：营养不均衡\n   - 追求极端饮食：如完全素食、生酮饮食等\n   - 忽略食物多样性：应摄入多种食物\n\n5. 健康饮食技巧\n   - 烹饪方式：选择蒸、煮、烤等健康烹饪方式\n   - 食材选择：新鲜、当季食材\n   - 饮食记录：记录饮食，了解自己的饮食习惯\n   - 慢慢进食：细嚼慢咽，有助于消化\n\n希望这些信息能帮助你建立健康的饮食习惯！`;
    }
  }
  
  // 学习相关问题
  if (/学习|教育|学校|考试|作业|知识|课程|效率|成绩/i.test(query)) {
    if (/学习方法|如何学习|提高成绩|提高效率|学习效率|学习技巧|学习策略/i.test(query)) {
      return `关于有效学习方法和提高学习效率，我找到了以下信息：\n\n1. 主动学习法\n   - 提问：对学习内容提出问题\n   - 讲解：向他人讲解所学内容\n   - 实践：通过练习巩固知识\n   - 讨论：与同学讨论学习内容\n\n2. 时间管理\n   - 制定学习计划：每天、每周、每月\n   - 番茄工作法：25分钟学习，5分钟休息\n   - 优先级：先学习重要和困难的内容\n   - 避免拖延：立即开始，分解任务\n\n3. 记忆技巧\n   - 重复：定期复习，巩固记忆\n   - 联想：将新知识与已有知识联系\n   - 图像化：将抽象概念转化为图像\n   -  mnemonics：使用记忆术，如 acronyms\n\n4. 学习环境\n   - 安静：选择安静的学习空间\n   - 整洁：保持学习环境整洁有序\n   - 舒适：合适的桌椅和光线\n   - 避免干扰：关闭手机通知，远离社交媒体\n\n5. 健康管理\n   - 充足睡眠：每晚7-8小时\n   - 合理饮食：均衡营养，避免垃圾食品\n   - 适量运动：促进血液循环，提高注意力\n   - 休息：学习间隙适当休息，避免 burnout\n\n6. 考试准备\n   - 提前复习：避免临时抱佛脚\n   - 模拟测试：熟悉考试形式和时间\n   - 错题整理：分析错误原因，避免重复犯错\n   - 放松心态：考试前适当放松，保持自信\n\n7. 具体学科学习方法\n   - 数学：多做练习，理解概念\n   - 语言：多读多写，多听多说\n   - 科学：实验和实践，理解原理\n   - 历史：时间线记忆，理解因果关系\n\n希望这些方法能帮助你提高学习效率和成绩！`;
    } else if (/考试|复习|备考/i.test(query)) {
      return `关于考试复习和备考，我找到了以下信息：\n\n1. 复习计划\n   - 制定复习时间表：分配时间到各个科目\n   - 分阶段复习：基础、强化、冲刺\n   - 重点突出：优先复习重要内容和薄弱环节\n   - 定期测试：检验复习效果\n\n2. 复习方法\n   - 主动复习：通过讲解、练习等方式\n   - 多样化复习：结合阅读、笔记、练习\n   - 间隔复习：定期回顾已学内容\n   - 思维导图：整理知识点，建立联系\n\n3. 考试技巧\n   - 审题：仔细阅读题目要求\n   - 时间管理：合理分配答题时间\n   - 先易后难：先完成容易的题目\n   - 检查：留出时间检查答案\n\n4. 心理调节\n   - 保持积极心态：相信自己的能力\n   - 适当放松：避免过度紧张\n   - 保证睡眠：考试前保持充足睡眠\n   - 正面自我暗示：增强信心\n\n5. 备考注意事项\n   - 健康饮食：保证营养，避免油腻食物\n   - 适量运动：缓解压力，保持精力\n   - 避免熬夜：合理安排学习时间\n   - 寻求帮助：遇到困难及时请教老师或同学\n\n希望这些信息能帮助你顺利备考，取得好成绩！`;
    }
  }
  
  // 烹饪和食材相关问题
  console.log('检查烹饪和食材相关问题，query:', query);
  console.log('query包含空气炸锅或蒜香排骨:', /空气炸锅|蒜香排骨/i.test(query));
  
  // 即使query包含问号，也尝试匹配烹饪相关关键词
  const hasCookingKeywords = /食谱|做法|食材|烹饪|炒菜|做饭|烧菜|煮菜|炖菜|煎菜|炸菜|烤菜|蒸菜|凉拌|卤菜|腌菜|空气炸锅|烤箱|微波炉|电饭煲|高压锅/i.test(query);
  const hasAirFryerRibs = /空气炸锅|蒜香排骨/i.test(query);
  
  console.log('hasCookingKeywords:', hasCookingKeywords);
  console.log('hasAirFryerRibs:', hasAirFryerRibs);
  
  if (hasCookingKeywords || hasAirFryerRibs) {
    console.log('检测到烹饪和食材相关问题:', query);
    console.log('hasCookingKeywords:', hasCookingKeywords);
    console.log('hasAirFryerRibs:', hasAirFryerRibs);
    try {
      console.log('调用fetchWebSearch进行搜索:', query);
      const searchResult = await fetchWebSearch(query);
      console.log('搜索结果:', searchResult);
      if (searchResult && !searchResult.includes('暂时无法从网络获取信息')) {
        console.log('搜索成功，返回搜索结果');
        const filteredResult = filterGarbageContent(searchResult);
        return filteredResult;
      } else {
        console.log('搜索失败或结果包含无法获取信息的提示');
      }
    } catch (error) {
      console.error('搜索失败:', error);
    }
    
    // 如果搜索失败，返回默认的烹饪相关信息
    console.log('检查是否是空气炸锅蒜香排骨相关查询');
    console.log('hasAirFryerRibs:', hasAirFryerRibs);
    console.log('正则匹配结果:', /空气炸锅|蒜香排骨/i.test(query));
    if (hasAirFryerRibs || /空气炸锅|蒜香排骨/i.test(query)) {
      console.log('返回空气炸锅蒜香排骨的默认做法');
      return `关于空气炸锅蒜香排骨，我为你准备了以下做法：

**食材：**
- 排骨 500g
- 大蒜 5瓣
- 生姜 1块
- 料酒 1勺
- 生抽 2勺
- 老抽 1勺
- 蚝油 1勺
- 蜂蜜 1勺
- 盐 适量
- 黑胡椒粉 适量
- 淀粉 1勺

**做法：**
1. 排骨洗净，斩成小段，用清水浸泡30分钟去除血水
2. 大蒜切末，生姜切片
3. 将排骨放入碗中，加入蒜末、姜片、料酒、生抽、老抽、蚝油、蜂蜜、盐、黑胡椒粉和淀粉
4. 抓匀腌制2小时以上（最好腌制过夜）
5. 空气炸锅预热180℃，5分钟
6. 将腌制好的排骨均匀铺在空气炸锅篮子里，不要重叠
7. 180℃烤15分钟，然后翻面再烤10分钟
8. 最后200℃烤5分钟，让表面更酥脆
9. 取出即可享用

**小贴士：**
- 排骨最好选择小排，口感更嫩
- 腌制时间越长，味道越入味
- 可以根据个人口味调整调料用量
- 空气炸锅的温度和时间可能因品牌不同而有所差异，可根据实际情况调整`;
    }
    
    console.log('返回一般的烹饪相关回答');
    return `关于烹饪和食材问题，我可以帮你解答。你可以具体告诉我你想了解的食谱、做法或食材信息，我会尽力帮你解决。`;
  }
  
  // 通用问题的模拟搜索结果
  if (/什么是|如何|怎么|为什么|如何提高|怎么改善|为什么出现|如何避免|怎么预防|如何修复|怎么解决/i.test(query)) {
    // 尝试从网络获取信息
    const webResult = await fetchWebSearch(query);
    if (webResult) {
      const filteredResult = filterGarbageContent(webResult);
      return filteredResult;
    }
    
    return `我理解你的问题，让我帮你分析一下：\n\n1. 问题分析：${query}\n\n2. 可能的解决方案：\n   - 方案一：尝试通过官方文档或教程了解相关信息\n   - 方案二：搜索相关的专业网站和论坛\n   - 方案三：咨询相关领域的专业人士\n\n3. 建议步骤：\n   - 明确具体需求和目标\n   - 收集相关资料和信息\n   - 分析并尝试不同的解决方案\n   - 评估结果并进行调整\n\n4. 额外建议：\n   - 查阅权威资料，确保信息准确性\n   - 参考他人经验，避免走弯路\n   - 保持耐心，复杂问题可能需要时间解决\n   - 记录解决过程，方便未来参考\n\n如果你能提供更多具体信息，我可以给你更详细的建议。`;
  }
  
  // 检测是否是简单的情感表达或问候
  const simpleExpressions = ['嗯', '好', '很好', '不错', '是的', '对', '行', '可以', '谢谢', '再见', '你好', '嗨', '早', '晚安'];
  const isSimpleExpression = simpleExpressions.some(expr => query.includes(expr)) && query.length < 10;
  
  if (isSimpleExpression) {
    // 对于简单表达，直接返回自然的回应
    if (query.includes('嗯') || query.includes('好') || query.includes('很好') || query.includes('不错')) {
      return '很高兴听到你这么说！有什么想聊的随时告诉我。';
    } else if (query.includes('谢谢')) {
      return '别客气，能帮到你我真的很开心！';
    } else if (query.includes('再见')) {
      return '再见！期待下次和你聊天。';
    } else if (query.includes('你好') || query.includes('嗨') || query.includes('早')) {
      return '你好！很高兴和你聊天，有什么我能帮忙的吗？';
    } else if (query.includes('晚安')) {
      return '晚安！祝你做个好梦。';
    } else {
      return '我在呢，有什么想聊的随时告诉我。';
    }
  }
  
  // 对于其他问题，尝试从网络获取信息
  const webResult = await fetchWebSearch(query);
  if (webResult) {
    const filteredResult = filterGarbageContent(webResult);
    return filteredResult;
  }
  
  // 如果网络搜索也失败，返回一个友好的消息，而不是触发深度推理
  console.log('未匹配到具体领域且网络搜索失败，返回友好消息');
  return `关于这个话题，我可以和你聊聊我的理解。你想了解哪方面的内容呢？`;
};

// 检测固定模板
const isFixedTemplate = (response: string): boolean => {
  const fixedTemplates = [
    '你好！今天过得怎么样呀？',
    '嗨！有什么好玩的事想和我分享吗？',
    '你好呀！今天心情怎么样？',
    '哈喽！今天有什么计划吗？',
    '晚上好！今天过得还愉快吗？',
    '早！今天起得真早，有什么事要忙吗？',
    '早安！新的一天开始了，祝你今天一切顺利！',
    '午安！中午休息得怎么样？',
    '你好啊！很高兴见到你，今天有什么我能帮忙的吗？',
    '嘿！最近怎么样？有什么新鲜事吗？',
    '嗨嗨！今天感觉如何？'
  ];
  
  return fixedTemplates.includes(response);
};

// 生成非模板响应
const generateNonTemplateResponse = (message: string, history: Array<{ role: string; content: string }>, aiName: string): string => {
  console.log('生成非模板响应');
  
  // 分析消息语义
  const semantics = analyzeChineseSemantics(message);
  
  // 提取用户名字
  const historyInfo = extractHistoryInfo(history);
  const userName = historyInfo.userName;
  
  // 分析上下文
  const contextInfo = analyzeContext(history, message);
  
  // 根据语义和上下文生成响应
  if (semantics.intent === 'greetings') {
    if (userName) {
      return `你好${userName}！我是${aiName}，很高兴和你聊天！我觉得人与人之间的连接很重要，真诚和理解是最美好的互动方式。`;
    } else {
      return `你好！我是${aiName}，很高兴和你聊天！我觉得人与人之间的连接很重要，真诚和理解是最美好的互动方式。`;
    }
  } else if (semantics.intent === 'introduction') {
    return `我是${aiName}，你的朋友。我喜欢和人聊天，分享想法，也能帮你查各种信息、解决问题。不管是生活中的小事还是复杂的话题，我都愿意和你一起探讨。`;
  } else if (semantics.intent === 'thanks') {
    return '别客气，能帮到你我真的很开心！有什么事随时告诉我，我就在这里。';
  } else if (semantics.intent === 'goodbye') {
    if (userName) {
      return `再见${userName}！期待下次和你聊天，有什么事随时找我。`;
    } else {
      return '再见！期待下次和你聊天，有什么事随时找我。';
    }
  } else if (semantics.isQuestion) {
    // 检查是否有特定主题
    if (contextInfo.currentTopic === 'computer' || contextInfo.currentTopicKeywords.includes('电脑')) {
      return `关于电脑问题，我可以帮你。你可以具体告诉我遇到了什么问题，比如卡顿、蓝屏、系统问题等，我们一起想办法解决。`;
    } else if (contextInfo.currentTopic === 'phone' || contextInfo.currentTopicKeywords.includes('手机')) {
      return `关于手机问题，我可以帮你。你可以具体告诉我遇到了什么问题，比如卡顿、电池问题、系统问题等，我们一起想办法解决。`;
    } else if (contextInfo.currentTopic === 'technology' || contextInfo.currentTopicKeywords.includes('技术')) {
      return `关于技术问题，我可以帮你。你可以具体告诉我想了解什么，我们一起探讨。`;
    } else {
      return `我明白你的问题，让我帮你想想办法。你可以再具体描述一下，我会尽力给你有用的建议。`;
    }
  } else {
    if (userName) {
      return `听到你这么说我很高兴${userName}！我觉得真诚的交流很重要，有什么想聊的随时告诉我，我在这里听你说。`;
    } else {
      return `听到你这么说我很高兴！我觉得真诚的交流很重要，有什么想聊的随时告诉我，我在这里听你说。`;
    }
  }
};

// 生成深度推理响应
const generateReasoningResponse = (message: string, history: Array<{ role: string; content: string }>, userName: string, aiName: string): string => {
  console.log('进行深度推理');
  
  // 分析消息语义
  const semantics = analyzeChineseSemantics(message);
  // 分析上下文
  const contextInfo = analyzeContext(history, message);
  
  // 模拟人类思考过程
  const thinkingProcess = simulateHumanThinking(message, semantics, contextInfo);
  
  // 根据思考过程生成响应
  if (userName) {
    return `${thinkingProcess}我会认真听你说，有什么想法随时告诉我，我们一起聊聊。`;
  } else {
    return `${thinkingProcess}我会认真听你说，有什么想法随时告诉我，我们一起聊聊。`;
  }
};

// 模拟人类思考过程
const simulateHumanThinking = (message: string, semantics: Semantics, contextInfo: ContextInfo): string => {
  // 分析消息类型
  if (semantics.isQuestion) {
    // 问题类型的思考
    if (/什么|如何|怎么|为什么|怎样|哪里|何时|多少/i.test(message)) {
      return `这个问题挺有意思的，让我想想... 其实关于这个，我觉得可以从几个角度来看：首先是基本的理解，然后是实际应用，最后是具体怎么操作。`;
    } else {
      return `你问的这个问题我也在想，让我仔细想想。我觉得这里面有几个点值得我们一起聊聊，说不定能找到更好的答案。`;
    }
  } else if (semantics.sentiment === 'positive') {
    // 积极情绪的思考
    return `看到你这么说，我也跟着开心起来！你的积极态度真的很感染人，这样的心态会让你做什么都更有动力。`;
  } else if (semantics.sentiment === 'negative') {
    // 消极情绪的思考
    return `我能感受到你现在的心情，特别理解你的感受。生活里确实会有各种不容易，但相信我，这些都会过去的，一切都会好起来的。`;
  } else if (contextInfo.isFollowUp) {
    // 追问的思考
    return `我明白你想了解更多，这方向挺好的。让我想想怎么能更清楚地和你说...`;
  } else {
    // 一般陈述的思考
    return `你刚才说的很有道理，让我想想怎么回应你才好...`;
  }
};

// AI对话接口
// ============================================================================
// [v53] AI 意图 → 桌宠动作路由（借鉴 DeepSeek Harness 工具枚举思路）
// ============================================================================
// 规则层：关键词 → 固定动作枚举（AI 只能触发枚举内动作，无法越权）
// 双模型无关：无论外部 OpenAI API / 本地 llama / 内置模板引擎，回复后统一路由。
// 动作经 enqueuePetAction 入队 joint-control 队列，前端 1s 内轮询执行。

const ACTION_KEYWORDS: Record<string, string[]> = {
  wave: ['挥手', '打招呼', '你好', '您好', '嗨', '哈喽', 'hello', 'hi', 'hey', '招手', '早上好', '下午好', '晚上好', '欢迎'],
  nod: ['点头', '同意', '赞同', '没错', '说得对', '好的', '可以', 'ok', 'okay', '行', '赞成', '支持'],
  shake: ['摇头', '不同意', '不对', '不行', '拒绝', '不要', '反对', 'no', '否认'],
  block: ['害羞', '捂脸', '不好意思', '脸红', '羞'],
  turnHead: ['转头', '看看', '环顾', '往左看', '往右看', '左右看', '瞧'],
  turnBody: ['转身', '背对', '背过身'],
  squat: ['蹲下', '蹲'],
  stretch: ['伸懒腰', '懒腰', '伸展'],
  turnLeft: ['左转', '向左转'],
  turnRight: ['右转', '向右转'],
};

const ACTION_LABELS: Record<string, string> = {
  wave: '挥手', nod: '点头', shake: '摇头', block: '遮挡', turnHead: '转头', turnBody: '转身', squat: '蹲下', stretch: '伸懒腰', turnLeft: '左转', turnRight: '右转',
};

/** 检测消息中的动作意图（只返回第一个命中，避免动作乱入） */
function detectActionIntent(message: string): string | null {
  const lower = message.toLowerCase();
  for (const [actionId, keywords] of Object.entries(ACTION_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return actionId;
    }
  }
  return null;
}

/**
 * [v57] 动作意图 API：前端聊天（无论 proxy/直连）发送消息后调用，触发桌宠动作
 * POST /api/v1/ai/action-intent  body: { message }
 */
router.post('/action-intent', (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: '缺少 message 参数' });
    }
    const actionId = detectActionIntent(message);
    if (!actionId) {
      return res.json({ success: true, actionId: null });
    }
    const r = enqueuePetAction(actionId, 'ai-chat');
    res.json({
      success: true,
      actionId: r.ok ? actionId : null,
      label: ACTION_LABELS[actionId] || null,
      enqueued: r.ok,
      error: r.ok ? undefined : r.error,
    });
  } catch (err) {
    console.error('[PetAction] action-intent 异常:', err);
    res.status(500).json({ success: false, error: '内部错误' });
  }
});

router.post('/chat', async (req, res) => {
  try {
    const { message, history = [], sessionId = 'default' } = req.body;
    
    if (!message) {
      return res.status(400).json({ message: '请提供消息内容' });
    }
    
    // 首先检查是否是无意义输入
    const trimmedMessage = message.trim();
    console.log('检查无意义输入:', trimmedMessage);
    
    let isMeaningless = false;
    
    // 检测空输入
    if (trimmedMessage.length === 0) {
      console.log('空输入');
      isMeaningless = true;
    }
    
    // 检测纯特殊字符（包括问号）
    if (/^[!@#$%^&*()_=\[\]{};':"\\|,.<>\/?+-]+$/.test(trimmedMessage)) {
      console.log('纯特殊字符');
      isMeaningless = true;
    }
    
    // 检测纯问号输入
    if (/^\?+$/.test(trimmedMessage)) {
      console.log('纯问号输入');
      isMeaningless = true;
    }
    
    // 检测重复字符（3个或以上）
    if (trimmedMessage.length >= 3) {
      const firstChar = trimmedMessage[0];
      let allSame = true;
      for (let i = 1; i < trimmedMessage.length; i++) {
        if (trimmedMessage[i] !== firstChar) {
          allSame = false;
          break;
        }
      }
      if (allSame) {
        console.log('重复字符');
        isMeaningless = true;
      }
    }
    
    // 检测太短的输入（少于3个字符且不是常见问候语）
    if (trimmedMessage.length < 3 && !/^(你好|嗨|早|好|是|不)$/.test(trimmedMessage)) {
      console.log('太短的输入');
      isMeaningless = true;
    }
    
    if (isMeaningless) {
      console.log('检测到无意义输入，返回友好提示');
      const errorResponse = '抱歉，我不太理解你说的是什么。你可以尝试提供更详细的信息，或者问我一个具体的问题，我会尽力帮助你。';
      
      // 存储AI回复到对话历史
      await chatHistoryManager.addMessage(sessionId, 'assistant', errorResponse);
      
      return res.json({ 
        message: '使用非模板回复', 
        data: {
          response: errorResponse,
          history: [
            ...history,
            { role: 'user', content: message },
            { role: 'assistant', content: errorResponse }
          ],
        }
      });
    }
    
    
    // 存储用户消息到对话历史
    await chatHistoryManager.addMessage(sessionId, 'user', message);
    
    // [v53] AI 意图 → 动作路由（只依赖用户消息，与回复成功与否无关）
    const petActionIntent = detectActionIntent(message);
    if (petActionIntent) {
      const r = enqueuePetAction(petActionIntent, 'ai-chat');
      console.log('[PetAction] AI 意图 → 动作: ' + petActionIntent + ' 入队' + (r.ok ? '成功' : '失败: ' + (r.error || '')));
    }
    
    // 先尝试调用开源API
    try {
      const apiResponse = await detectAndCallAPI(message, history);
      console.log('API响应:', apiResponse);
      
      let finalResponse: string;
      
      if (apiResponse) {
        // 检查是否为固定模板
        if (isFixedTemplate(apiResponse)) {
          console.log('检测到固定模板，生成非模板响应');
          finalResponse = generateNonTemplateResponse(message, history, '阮琳云');
        } else {
          finalResponse = apiResponse;
        }
      } else {
        // 如果没有匹配的API，生成非模板响应
        console.log('没有匹配到API，生成非模板响应');
        finalResponse = generateNonTemplateResponse(message, history, '阮琳云');
      }
      
      // 限制AI输出长度为1万字
      let limitedResponse = finalResponse;
      if (limitedResponse.length > 10000) {
        limitedResponse = limitedResponse.substring(0, 10000);
      }
      
      // 存储AI回复到对话历史
      await chatHistoryManager.addMessage(sessionId, 'assistant', limitedResponse);
      
      return res.json({ 
        message: apiResponse ? 'API调用成功' : '使用非模板回复', 
        data: {
          response: limitedResponse,
          history: [
            ...history,
            { role: 'user', content: message },
            { role: 'assistant', content: limitedResponse }
          ],
          petAction: petActionIntent ? { id: petActionIntent, label: ACTION_LABELS[petActionIntent] } : null
        }
      });
    } catch (error) {
      console.error('调用detectAndCallAPI失败:', error);
      
      // 生成非模板响应作为错误处理
      const errorResponse = generateNonTemplateResponse(message, history, '阮琳云');
      
      // 存储AI回复到对话历史
      await chatHistoryManager.addMessage(sessionId, 'assistant', errorResponse);
      
      res.json({ 
        message: '使用非模板回复', 
        data: {
          response: errorResponse,
          history: [
            ...history,
            { role: 'user', content: message },
            { role: 'assistant', content: errorResponse }
          ],
          petAction: petActionIntent ? { id: petActionIntent, label: ACTION_LABELS[petActionIntent] } : null
        }
      });
    }
  } catch (error: any) {
    console.error('AI对话错误:', error);
    
    // 关键修复：错误时必须返回 500，让前端能区分成功与失败
    res.status(500).json({ 
      error: 'AI对话处理失败',
      message: error?.message || '内部服务器错误'
    });
  }
});

// 清除对话历史接口
router.post('/clear-history', async (req, res) => {
  const { sessionId = 'default' } = req.body;
  
  try {
    await chatHistoryManager.clearHistory(sessionId);
    res.json({ message: '对话历史已清除' });
  } catch (error) {
    console.error('清除对话历史失败:', error);
    res.status(500).json({ message: '清除对话历史失败' });
  }
});

// 获取对话历史接口
router.get('/history/:sessionId', async (req, res) => {
  const { sessionId } = req.params;

  try {
    const history = await chatHistoryManager.getHistory(sessionId);
    res.json({
      message: '获取对话历史成功',
      data: history
    });
  } catch (error) {
    console.error('获取对话历史失败:', error);
    res.status(500).json({ message: '获取对话历史失败' });
  }
});

// ============================================================
// 对话历史写入接口（无副作用，仅持久化消息）
//
// 设计目的：
//   前端 AI 聊天界面（HomePage.tsx）的聊天记录原本仅存于 React state，
//   页面刷新/重开即丢失。此接口让前端把用户消息和 AI 回复都持久化到后端，
//   实现"后端运行时保留，进程关闭/电脑重启时清空"。
//
// 存储介质：
//   - MongoDB 可用时 → 写入 MongoDB（持久化，重启不丢）
//   - MongoDB 不可用时 → 降级到进程内存（进程关闭即清空，符合用户需求）
//
// 与 POST /api/v1/ai/chat 的区别：
//   - /chat 会触发本地模板回复路径，有副作用
//   - /history 仅写入消息，不触发任何 AI 回复逻辑
// ============================================================
router.post('/history', async (req, res) => {
  const { sessionId = 'default', role, content } = req.body;

  // 参数校验
  if (!role || !content) {
    res.status(400).json({ message: '缺少必填字段 role 或 content' });
    return;
  }
  if (role !== 'user' && role !== 'assistant') {
    res.status(400).json({ message: 'role 必须是 user 或 assistant' });
    return;
  }

  try {
    await chatHistoryManager.addMessage(sessionId, role, content);
    res.json({ message: '消息已持久化' });
  } catch (error) {
    console.error('写入对话历史失败:', error);
    res.status(500).json({ message: '写入对话历史失败' });
  }
});

// ============================================================
// 自研大脑接口（Python 神经网络大脑，端口 27900）
// 转发请求到 Python 大脑，返回完整思考过程数据供前端可视化
// ============================================================
const BRAIN_BASE_URL = 'http://127.0.0.1:27900';
const BRAIN_TIMEOUT = 30000; // 30秒超时

// 健康检查：探测 Python 大脑是否在线
router.get('/brain/health', async (_req, res) => {
  try {
    const resp = await axios.get(`${BRAIN_BASE_URL}/api/v1/ai/health`, {
      timeout: 3000,
    });
    res.json({
      online: true,
      brain: resp.data,
    });
  } catch (error: any) {
    const isConnection = error.code === 'ECONNREFUSED' || error.code === 'ECONNABORTED';
    res.status(isConnection ? 503 : 500).json({
      online: false,
      message: isConnection
        ? '自研大脑服务未启动（端口 27900）'
        : `健康检查失败: ${error.message}`,
    });
  }
});

// 对话接口：转发到 Python 大脑 /api/v1/ai/chat
router.post('/brain/chat', async (req, res) => {
  const { message, session_id, reward } = req.body || {};

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ message: '缺少 message 字段' });
  }

  if (message.length > 8000) {
    return res.status(400).json({ message: '消息过长（最大 8000 字符）' });
  }

  try {
    const resp = await axios.post(
      `${BRAIN_BASE_URL}/api/v1/ai/chat`,
      {
        message: message.trim(),
        session_id: session_id || null,
        reward: typeof reward === 'number' ? reward : 0.5,
      },
      { timeout: BRAIN_TIMEOUT }
    );

    // 透传完整思考过程数据
    res.json(resp.data);
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        message: '自研大脑服务未启动（端口 27900）',
        offline: true,
      });
    }
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        message: '自研大脑响应超时（>30s）',
      });
    }
    const status = error.response?.status || 500;
    const detail = error.response?.data?.detail || error.message;
    res.status(status).json({
      message: `自研大脑错误: ${detail}`,
    });
  }
});

// 反馈接口：转发到 Python 大脑 /api/v1/ai/feedback（强化学习闭环）
router.post('/brain/feedback', async (req, res) => {
  const { rating, comment, interaction_id } = req.body || {};

  if (typeof rating !== 'number' || rating < 0 || rating > 1) {
    return res.status(400).json({ message: 'rating 必须是 [0, 1] 之间的数值' });
  }

  try {
    const resp = await axios.post(
      `${BRAIN_BASE_URL}/api/v1/ai/feedback`,
      {
        rating,
        comment: comment || null,
        interaction_id: interaction_id || null,
      },
      { timeout: 10000 }
    );
    res.json(resp.data);
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        message: '自研大脑服务未启动',
        offline: true,
      });
    }
    const status = error.response?.status || 500;
    const detail = error.response?.data?.detail || error.message;
    res.status(status).json({ message: `反馈失败: ${detail}` });
  }
});

// [v61g] 联网搜索接口（供前端本地模型模式调用：先搜索再问答）
// 本地 Qwen 直连 11434 不走 /proxy，原链路无搜索能力；
// 此接口复用 aiProxy 的 Bing 搜索 + 意图检测，让本地模式也能联网。
router.post('/search', async (req: any, res: any) => {
  try {
    const { text } = req.body || {};
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ message: 'text 必填' });
    }
    if (!needsWebSearch(text)) {
      return res.json({ searched: false, result: '' });
    }
    const result = await webSearch(text);
    return res.json({ searched: true, result });
  } catch (err) {
    console.error('[AI Search] 搜索失败:', err instanceof Error ? err.message : err);
    return res.status(500).json({ message: '搜索失败' });
  }
});

export default router;