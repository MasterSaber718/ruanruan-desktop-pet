// [2026-09-08 情绪轨道] 听者反馈动作规则引擎
// ---------------------------------------------------------------
// 设计动机：聊天里的社交反馈（被夸/问候/共情/唤名）与"动作意图"是两回事。
//   动作意图 → AI 显式 MOTION 标签（用户明确要求做某动作，如"转圈/抬腿"）
//   社交反馈 → 本模块：确定性关键词规则 → 低姿态小动作（listener 通道）
// 好处：
//   1) 不赌 3B 模型每次回复都自己吐动作标签（实测它只会在被点名时动）
//   2) 动作确定性可控、走正规 27865 队列（白名单/冷却/工作模式锁全生效）
//   3) 规则在前端本地完成，零延迟零额外 token
// 输出：命中一个动作（首个匹配规则），否则 null = 保持安静（防噪，聊天不能一直动）
// ---------------------------------------------------------------
export interface ListenerVerdict {
  actionId: string | null;   // 命中的动作；null=保持安静
  reason?: string;           // 命中原因（日志定位用）
}

interface ListenerRule {
  name: string;
  re: RegExp;
  actionId: string;
}

const RULES: ListenerRule[] = [
  // 顺序即优先级，首个命中返回
  { name: '问候/告别', re: /^\s*(?:你好|您好|嗨|哈喽|哈啰|hi|hello|hey|早安|早上好|晚安|晚上好|拜拜|再见|在吗|在不在)/i, actionId: 'wave' },
  { name: '负面共情', re: /难过|伤心|想哭|哭了|哭死|呜呜|好累|累死|压力|emo|好烦|烦死|生气|气死|倒霉|难受|委屈|失恋|分手|加班|生病|好疼|好痛|睡不着/i, actionId: 'nod' },
  { name: '亲昵表白', re: /喜欢你|爱你|想你|抱抱|亲亲|贴贴|好可爱|真可爱|太可爱|可爱死/i, actionId: 'block' },
  { name: '夸赞感谢', re: /好棒|真棒|厉害|聪明|贴心|温柔|谢谢你|感谢|夸|乖/i, actionId: 'nod' },
  { name: '唤名唤起', re: /琳云|琳奈|云云|小琳|琳琳|奈奈/i, actionId: 'turnHead' },
];

/**
 * 评估一条用户消息 → 是否触发听者反馈动作。
 * @param userText 用户刚发来的消息文本（情绪主要来自用户说什么）
 */
export function classifyListenerMotion(userText: string): ListenerVerdict {
  if (!userText || !userText.trim()) return { actionId: null };
  const t = userText.trim().slice(0, 120);
  for (const rule of RULES) {
    if (rule.re.test(t)) return { actionId: rule.actionId, reason: rule.name };
  }
  return { actionId: null };
}
