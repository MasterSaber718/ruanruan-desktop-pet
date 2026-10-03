/**
 * speechFix — 识别结果后处理与热词表
 * [v129] 桌面 STT=Edge speech-bridge；本工具供 MobileLayout 热词/纠错（与 Vosk 无关）
 * 从构建产物 App-a069a167.js 还原（源文件曾被误清空）
 */
export const HOT_WORDS: string[] = [
  '阮琳云', '琳云', '数字人', '智能助手', '语音助手', '桌面助手', '虚拟人',
  '你好', '请问', '谢谢', '再见', '帮助', '打开', '关闭', '播放', '停止', '暂停', '继续',
  '开始', '结束', '今天', '明天', '昨天', '天气', '几点', '时间', '日期', '星期',
  '什么', '为什么', '怎么样', '怎么', '多少', '哪里', '谁',
  '音乐', '歌曲', '视频', '图片', '照片', '文件', '文档', '邮件', '短信', '电话',
  '聊天', '对话', '消息', '通知', '提醒', '闹钟', '定时',
  '搜索', '查询', '翻译', '计算', '保存', '删除', '取消', '确认', '发送', '设置',
  '语音', '文字', '模型', '角色', '任务', '主页', '返回', '上一个', '下一个', '上一页', '下一页',
  '通话', '打电话', '接电话', '挂电话', '挂断', '接通', '静音', '免提', '扬声器', '听筒',
  '关机', '重启', '注销', '锁屏', '休眠', '睡眠', '音量', '调高', '调低',
  '截图', '截屏', '回收站', '垃圾桶', '壁纸', '分辨率', '终端', '命令行',
  '记事本', '计算器', '画图', '浏览器', '清理垃圾', '清理缓存', '清空回收站',
  '倒计时', '定时器', '计时', '分钟', '小时', '秒钟', '几号', '星期几', '礼拜',
  '新闻', '资讯', '股票', '基金', '汇率', '价格', '热点', '头条',
  '微信', '邮箱',
];

const HOMOPHONE_RULES: Array<[string, string]> = [
  ['软林云|阮林云|阮玲云|阮琳芸|阮灵云|软琳云|阮淋云|阮林芸|阮琳韵|阮凌芸|阮凌韵|阮琳允|阮临云|阮菱云|阮绫云|软淋云', '阮琳云'],
  ['(?<![\\u4e00-\\u9fa5])(?:林云|玲云|淋云)(?![\\u4e00-\\u9fa5])', '琳云'],
  ['只能助手|智能住手|只能住手|智囊助手', '智能助手'],
  ['数字刃|数字认|数值人', '数字人'],
  ['雨音', '语音'],
  ['摸型|磨型', '模型'],
  ['认务', '任务'],
  ['在见', '再见'],
  ['在次', '再次'],
  ['情问', '请问'],
  ['金天', '今天'],
  ['名天', '明天'],
  ['天起', '天气'],
  ['什莫', '什么'],
  ['为什莫|喂什么', '为什么'],
  ['怎莫', '怎么'],
  ['阴乐|因乐', '音乐'],
  ['帮住|邦助', '帮助'],
  ['时坚', '时间'],
  ['去消', '取消'],
  ['记算', '计算'],
  ['收索|搜所', '搜索'],
  ['麦克锋|麦可风|麦客风', '麦克风'],
];

const COMPILED_RULES = HOMOPHONE_RULES.map(
  ([pattern, replacement]) => [new RegExp(pattern, 'g'), replacement] as [RegExp, string],
);

export function applySpeechFix(text: string): string {
  if (!text) return '';
  let fixed = text.trim();
  for (const [re, replacement] of COMPILED_RULES) {
    fixed = fixed.replace(re, replacement);
  }
  fixed = fixed.replace(/([，。！？；：、,.;!?])\1+/g, '$1');
  fixed = fixed.replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, '$1$2');
  fixed = fixed.replace(/ {2,}/g, ' ');
  return fixed;
}

export function buildGrammarString(): string {
  return '#JSGF V1.0; grammar commands; public <command> = ' + HOT_WORDS.join(' | ') + ' ;';
}

export function pickBestTranscript(result: any): string {
  let best = '';
  let bestConf = -1;
  if (!result || typeof result.length !== 'number') return '';
  for (let j = 0; j < result.length; j++) {
    const alt = result[j];
    if (!alt) continue;
    const conf = typeof alt.confidence === 'number' ? alt.confidence : 0;
    if (conf > bestConf) {
      bestConf = conf;
      best = alt.transcript ?? '';
    }
  }
  return best || (result[0]?.transcript ?? '');
}
