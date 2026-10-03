export interface CharacterData {
  char: string;
  pinyin: string;
  meaning: string;
  partOfSpeech: string;
  radicals: string[];
  relatedWords: string[];
  emotionalValue: number;
}

export interface WordMeaning {
  meaning: string;
  emotionalTone: number;
  contextKeywords: string[];
}

export interface WordData {
  word: string;
  pinyin: string;
  meanings: WordMeaning[];
  partOfSpeech: string;
  structure: '合成' | '派生' | '重叠' | '单纯';
  characters: string[];
}

export const characterKnowledge: Record<string, CharacterData> = {
  '我': {
    char: '我',
    pinyin: 'wǒ',
    meaning: '说话人自己',
    partOfSpeech: '代词',
    radicals: ['戈'],
    relatedWords: ['我们', '自我', '忘我', '唯我'],
    emotionalValue: 0
  },
  '你': {
    char: '你',
    pinyin: 'nǐ',
    meaning: '对话的另一方',
    partOfSpeech: '代词',
    radicals: ['亻'],
    relatedWords: ['你们', '你好', '你我', '迷你'],
    emotionalValue: 0
  },
  '他': {
    char: '他',
    pinyin: 'tā',
    meaning: '第三人称男性',
    partOfSpeech: '代词',
    radicals: ['亻'],
    relatedWords: ['他们', '他人', '其他', '他者'],
    emotionalValue: 0
  },
  '她': {
    char: '她',
    pinyin: 'tā',
    meaning: '第三人称女性',
    partOfSpeech: '代词',
    radicals: ['女'],
    relatedWords: ['她们', '她的'],
    emotionalValue: 0
  },
  '它': {
    char: '它',
    pinyin: 'tā',
    meaning: '第三人称非人类',
    partOfSpeech: '代词',
    radicals: ['宀', '匕'],
    relatedWords: ['它们'],
    emotionalValue: 0
  },
  '是': {
    char: '是',
    pinyin: 'shì',
    meaning: '表示判断、肯定',
    partOfSpeech: '动词',
    radicals: ['日'],
    relatedWords: ['是的', '是否', '是非', '可是'],
    emotionalValue: 0
  },
  '有': {
    char: '有',
    pinyin: 'yǒu',
    meaning: '拥有、存在',
    partOfSpeech: '动词',
    radicals: ['月'],
    relatedWords: ['没有', '所有', '有趣', '有用'],
    emotionalValue: 0.2
  },
  '在': {
    char: '在',
    pinyin: 'zài',
    meaning: '存在于、正在',
    partOfSpeech: '动词/介词',
    radicals: ['土'],
    relatedWords: ['现在', '正在', '存在', '在于'],
    emotionalValue: 0
  },
  '不': {
    char: '不',
    pinyin: 'bù',
    meaning: '否定',
    partOfSpeech: '副词',
    radicals: ['一'],
    relatedWords: ['不是', '不要', '不好', '不可能'],
    emotionalValue: -0.1
  },
  '很': {
    char: '很',
    pinyin: 'hěn',
    meaning: '程度副词',
    partOfSpeech: '副词',
    radicals: ['彳'],
    relatedWords: ['很好', '很多', '很快', '很少'],
    emotionalValue: 0
  },
  '好': {
    char: '好',
    pinyin: 'hǎo',
    meaning: '优秀、令人满意',
    partOfSpeech: '形容词',
    radicals: ['女', '子'],
    relatedWords: ['很好', '好的', '美好', '友好'],
    emotionalValue: 0.7
  },
  '爱': {
    char: '爱',
    pinyin: 'ài',
    meaning: '喜爱、关爱',
    partOfSpeech: '动词/名词',
    radicals: ['爫', '友'],
    relatedWords: ['爱情', '爱心', '热爱', '友爱'],
    emotionalValue: 0.9
  },
  '情': {
    char: '情',
    pinyin: 'qíng',
    meaning: '感情、情况',
    partOfSpeech: '名词',
    radicals: ['忄', '青'],
    relatedWords: ['情感', '心情', '情况', '感情'],
    emotionalValue: 0.5
  },
  '意': {
    char: '意',
    pinyin: 'yì',
    meaning: '意思、心意',
    partOfSpeech: '名词',
    radicals: ['音', '心'],
    relatedWords: ['意义', '意思', '心意', '意识'],
    emotionalValue: 0.3
  },
  '思': {
    char: '思',
    pinyin: 'sī',
    meaning: '思考、思念',
    partOfSpeech: '动词/名词',
    radicals: ['田', '心'],
    relatedWords: ['思考', '思想', '思念', '思路'],
    emotionalValue: 0.2
  },
  '想': {
    char: '想',
    pinyin: 'xiǎng',
    meaning: '思考、想要',
    partOfSpeech: '动词',
    radicals: ['相', '心'],
    relatedWords: ['想法', '想要', '思想', '想象'],
    emotionalValue: 0.2
  },
  '知': {
    char: '知',
    pinyin: 'zhī',
    meaning: '知道、知识',
    partOfSpeech: '动词/名词',
    radicals: ['矢', '口'],
    relatedWords: ['知识', '知道', '智慧', '知己'],
    emotionalValue: 0.3
  },
  '识': {
    char: '识',
    pinyin: 'shí',
    meaning: '认识、知识',
    partOfSpeech: '动词/名词',
    radicals: ['讠', '只'],
    relatedWords: ['知识', '认识', '识别', '见识'],
    emotionalValue: 0.3
  },
  '生': {
    char: '生',
    pinyin: 'shēng',
    meaning: '生命、生长',
    partOfSpeech: '动词/名词',
    radicals: ['生'],
    relatedWords: ['生命', '生活', '生长', '学生'],
    emotionalValue: 0.4
  },
  '命': {
    char: '命',
    pinyin: 'mìng',
    meaning: '生命、命令',
    partOfSpeech: '名词/动词',
    radicals: ['人', '口', '卩'],
    relatedWords: ['生命', '命运', '命令', '使命'],
    emotionalValue: 0.2
  },
  '自': {
    char: '自',
    pinyin: 'zì',
    meaning: '自己、自然',
    partOfSpeech: '代词/名词',
    radicals: ['自'],
    relatedWords: ['自己', '自我', '自然', '自由'],
    emotionalValue: 0.1
  },
  '由': {
    char: '由',
    pinyin: 'yóu',
    meaning: '经过、理由',
    partOfSpeech: '介词/名词',
    radicals: ['由'],
    relatedWords: ['自由', '理由', '由于', '由来'],
    emotionalValue: 0.2
  },
  '人': {
    char: '人',
    pinyin: 'rén',
    meaning: '人类、人民',
    partOfSpeech: '名词',
    radicals: ['人'],
    relatedWords: ['人们', '人类', '人生', '人民'],
    emotionalValue: 0.3
  },
  '类': {
    char: '类',
    pinyin: 'lèi',
    meaning: '种类、类别',
    partOfSpeech: '名词',
    radicals: ['米', '大'],
    relatedWords: ['人类', '类别', '类似', '种类'],
    emotionalValue: 0
  },
  '心': {
    char: '心',
    pinyin: 'xīn',
    meaning: '心脏、心灵',
    partOfSpeech: '名词',
    radicals: ['心'],
    relatedWords: ['心灵', '心情', '心理', '心态'],
    emotionalValue: 0.4
  },
  '灵': {
    char: '灵',
    pinyin: 'líng',
    meaning: '灵魂、精灵',
    partOfSpeech: '名词',
    radicals: ['彐', '火'],
    relatedWords: ['灵魂', '心灵', '灵感', '灵活'],
    emotionalValue: 0.5
  },
  '魂': {
    char: '魂',
    pinyin: 'hún',
    meaning: '灵魂、魂魄',
    partOfSpeech: '名词',
    radicals: ['云', '鬼'],
    relatedWords: ['灵魂', '魂魄', '鬼魂', '惊魂'],
    emotionalValue: 0.2
  },
  '时': {
    char: '时',
    pinyin: 'shí',
    meaning: '时间、时候',
    partOfSpeech: '名词',
    radicals: ['日', '寸'],
    relatedWords: ['时间', '时候', '时光', '时代'],
    emotionalValue: 0
  },
  '间': {
    char: '间',
    pinyin: 'jiān',
    meaning: '空间、中间',
    partOfSpeech: '名词',
    radicals: ['门', '日'],
    relatedWords: ['时间', '空间', '中间', '房间'],
    emotionalValue: 0
  },
  '学': {
    char: '学',
    pinyin: 'xué',
    meaning: '学习、学问',
    partOfSpeech: '动词/名词',
    radicals: ['⺍', '子'],
    relatedWords: ['学习', '学问', '学校', '学生'],
    emotionalValue: 0.4
  },
  '习': {
    char: '习',
    pinyin: 'xí',
    meaning: '学习、习惯',
    partOfSpeech: '动词',
    radicals: ['羽'],
    relatedWords: ['学习', '习惯', '练习', '实习'],
    emotionalValue: 0.3
  },
  '成': {
    char: '成',
    pinyin: 'chéng',
    meaning: '成功、成为',
    partOfSpeech: '动词',
    radicals: ['成'],
    relatedWords: ['成功', '成长', '成为', '成就'],
    emotionalValue: 0.5
  },
  '长': {
    char: '长',
    pinyin: 'zhǎng/cháng',
    meaning: '生长、长度',
    partOfSpeech: '动词/名词',
    radicals: ['长'],
    relatedWords: ['成长', '长度', '长久', '长处'],
    emotionalValue: 0.2
  },
  '对': {
    char: '对',
    pinyin: 'duì',
    meaning: '正确、面对',
    partOfSpeech: '形容词/动词',
    radicals: ['又', '寸'],
    relatedWords: ['对话', '正确', '面对', '对待'],
    emotionalValue: 0.2
  },
  '话': {
    char: '话',
    pinyin: 'huà',
    meaning: '话语、说话',
    partOfSpeech: '名词/动词',
    radicals: ['讠', '舌'],
    relatedWords: ['对话', '话语', '说话', '电话'],
    emotionalValue: 0.1
  },
  '探': {
    char: '探',
    pinyin: 'tàn',
    meaning: '探索、探查',
    partOfSpeech: '动词',
    radicals: ['扌', '罙'],
    relatedWords: ['探索', '探查', '侦探', '探讨'],
    emotionalValue: 0.3
  },
  '索': {
    char: '索',
    pinyin: 'suǒ',
    meaning: '探索、绳索',
    partOfSpeech: '动词/名词',
    radicals: ['糸', '十'],
    relatedWords: ['探索', '绳索', '搜索', '索取'],
    emotionalValue: 0.1
  },
  '梦': {
    char: '梦',
    pinyin: 'mèng',
    meaning: '梦想、梦境',
    partOfSpeech: '名词',
    radicals: ['林', '夕'],
    relatedWords: ['梦想', '梦境', '做梦', '梦幻'],
    emotionalValue: 0.4
  },
  '友': {
    char: '友',
    pinyin: 'yǒu',
    meaning: '朋友、友谊',
    partOfSpeech: '名词',
    radicals: ['友'],
    relatedWords: ['朋友', '友谊', '友好', '友人'],
    emotionalValue: 0.6
  },
  '谊': {
    char: '谊',
    pinyin: 'yì',
    meaning: '友谊、情谊',
    partOfSpeech: '名词',
    radicals: ['讠', '宜'],
    relatedWords: ['友谊', '情谊', '交谊'],
    emotionalValue: 0.6
  },
  '快': {
    char: '快',
    pinyin: 'kuài',
    meaning: '快乐、快速',
    partOfSpeech: '形容词',
    radicals: ['忄', '夬'],
    relatedWords: ['快乐', '快速', '愉快', '快捷'],
    emotionalValue: 0.6
  },
  '乐': {
    char: '乐',
    pinyin: 'lè/yuè',
    meaning: '快乐、音乐',
    partOfSpeech: '形容词/名词',
    radicals: ['丿', '木'],
    relatedWords: ['快乐', '音乐', '乐趣', '乐意'],
    emotionalValue: 0.7
  },
  '智': {
    char: '智',
    pinyin: 'zhì',
    meaning: '智慧、明智',
    partOfSpeech: '名词/形容词',
    radicals: ['知', '日'],
    relatedWords: ['智慧', '明智', '智力', '智商'],
    emotionalValue: 0.5
  },
  '能': {
    char: '能',
    pinyin: 'néng',
    meaning: '能力、能够',
    partOfSpeech: '名词/动词',
    radicals: ['厶', '熊'],
    relatedWords: ['能力', '智能', '能源', '可能'],
    emotionalValue: 0.4
  },
  '理': {
    char: '理',
    pinyin: 'lǐ',
    meaning: '理解、道理',
    partOfSpeech: '名词/动词',
    radicals: ['王', '里'],
    relatedWords: ['理解', '道理', '理论', '理由'],
    emotionalValue: 0.2
  },
  '解': {
    char: '解',
    pinyin: 'jiě',
    meaning: '理解、解决',
    partOfSpeech: '动词',
    radicals: ['角', '刀', '牛'],
    relatedWords: ['理解', '解决', '解释', '解答'],
    emotionalValue: 0.2
  },
  '孤': {
    char: '孤',
    pinyin: 'gū',
    meaning: '单独、孤单',
    partOfSpeech: '形容词',
    radicals: ['子', '瓜'],
    relatedWords: ['孤独', '孤单', '孤僻'],
    emotionalValue: -0.3
  },
  '独': {
    char: '独',
    pinyin: 'dú',
    meaning: '单独、唯一',
    partOfSpeech: '形容词/副词',
    radicals: ['犬', '虫'],
    relatedWords: ['孤独', '独立', '独特', '独一无二'],
    emotionalValue: 0.1
  },
  '王': {
    char: '王',
    pinyin: 'wáng',
    meaning: '国王、王者',
    partOfSpeech: '名词',
    radicals: ['王'],
    relatedWords: ['国王', '王者', '王冠', '王朝'],
    emotionalValue: 0.5
  },
  '从': {
    char: '从',
    pinyin: 'cóng',
    meaning: '跟随、从...开始',
    partOfSpeech: '介词/动词',
    radicals: ['人'],
    relatedWords: ['从小', '从此', '跟随', '跟从'],
    emotionalValue: 0
  },
  '小': {
    char: '小',
    pinyin: 'xiǎo',
    meaning: '年幼、尺寸小',
    partOfSpeech: '形容词',
    radicals: ['小'],
    relatedWords: ['很小', '小时候', '小朋友', '小事'],
    emotionalValue: 0.2
  },
  '美': {
    char: '美',
    pinyin: 'měi',
    meaning: '美丽、美好',
    partOfSpeech: '形容词',
    radicals: ['羊', '大'],
    relatedWords: ['美丽', '美好', '美妙', '完美'],
    emotionalValue: 0.7
  },
  '善': {
    char: '善',
    pinyin: 'shàn',
    meaning: '善良、善意',
    partOfSpeech: '形容词',
    radicals: ['羊', '口'],
    relatedWords: ['善良', '善意', '善待', '友善'],
    emotionalValue: 0.7
  },
  '真': {
    char: '真',
    pinyin: 'zhēn',
    meaning: '真实、真正',
    partOfSpeech: '形容词',
    radicals: ['十', '目', '八'],
    relatedWords: ['真实', '真正', '真诚', '真理'],
    emotionalValue: 0.6
  },
  '实': {
    char: '实',
    pinyin: 'shí',
    meaning: '实际、真实',
    partOfSpeech: '形容词',
    radicals: ['宀', '头'],
    relatedWords: ['实际', '真实', '实在', '事实'],
    emotionalValue: 0.4
  },
  '信': {
    char: '信',
    pinyin: 'xìn',
    meaning: '信任、信念',
    partOfSpeech: '名词/动词',
    radicals: ['亻', '言'],
    relatedWords: ['信任', '信念', '信心', '信用'],
    emotionalValue: 0.5
  },
  '任': {
    char: '任',
    pinyin: 'rèn',
    meaning: '信任、任务',
    partOfSpeech: '名词/动词',
    radicals: ['亻', '壬'],
    relatedWords: ['信任', '任务', '责任', '任意'],
    emotionalValue: 0.2
  },
  '未': {
    char: '未',
    pinyin: 'wèi',
    meaning: '未来、没有',
    partOfSpeech: '名词/副词',
    radicals: ['木', '一'],
    relatedWords: ['未来', '未知', '未必', '未曾'],
    emotionalValue: 0.1
  },
  '来': {
    char: '来',
    pinyin: 'lái',
    meaning: '来到、未来',
    partOfSpeech: '动词',
    radicals: ['来'],
    relatedWords: ['未来', '来到', '来源', '来往'],
    emotionalValue: 0.3
  },
  '过': {
    char: '过',
    pinyin: 'guò',
    meaning: '经过、过去',
    partOfSpeech: '动词',
    radicals: ['辶', '呙'],
    relatedWords: ['过去', '经过', '过程', '过度'],
    emotionalValue: 0
  },
  '去': {
    char: '去',
    pinyin: 'qù',
    meaning: '离开、过去',
    partOfSpeech: '动词',
    radicals: ['土', '厶'],
    relatedWords: ['过去', '出去', '去向', '去除'],
    emotionalValue: 0
  },
  '现': {
    char: '现',
    pinyin: 'xiàn',
    meaning: '现在、出现',
    partOfSpeech: '名词/动词',
    radicals: ['王', '见'],
    relatedWords: ['现在', '出现', '现实', '发现'],
    emotionalValue: 0.1
  },
  '存': {
    char: '存',
    pinyin: 'cún',
    meaning: '存在、保存',
    partOfSpeech: '动词',
    radicals: ['子', '寸'],
    relatedWords: ['存在', '保存', '存储', '生存'],
    emotionalValue: 0.2
  },
  '数': {
    char: '数',
    pinyin: 'shù/shǔ',
    meaning: '数字、计数',
    partOfSpeech: '名词/动词',
    radicals: ['娄', '攵'],
    relatedWords: ['数字', '数学', '数量', '计算'],
    emotionalValue: 0
  },
  '字': {
    char: '字',
    pinyin: 'zì',
    meaning: '文字、汉字',
    partOfSpeech: '名词',
    radicals: ['宀', '子'],
    relatedWords: ['文字', '汉字', '字体', '字母'],
    emotionalValue: 0.1
  },
  '计': {
    char: '计',
    pinyin: 'jì',
    meaning: '计算、计划',
    partOfSpeech: '动词/名词',
    radicals: ['讠', '十'],
    relatedWords: ['计算', '计划', '设计', '统计'],
    emotionalValue: 0.1
  },
  '算': {
    char: '算',
    pinyin: 'suàn',
    meaning: '计算、算数',
    partOfSpeech: '动词',
    radicals: ['⺮', '目'],
    relatedWords: ['计算', '算数', '算法', '算盘'],
    emotionalValue: 0
  },
  '技': {
    char: '技',
    pinyin: 'jì',
    meaning: '技术、技巧',
    partOfSpeech: '名词',
    radicals: ['扌', '支'],
    relatedWords: ['技术', '技巧', '技能', '科技'],
    emotionalValue: 0.3
  },
  '术': {
    char: '术',
    pinyin: 'shù',
    meaning: '技术、艺术',
    partOfSpeech: '名词',
    radicals: ['木'],
    relatedWords: ['技术', '艺术', '法术', '学术'],
    emotionalValue: 0.2
  },
  '科': {
    char: '科',
    pinyin: 'kē',
    meaning: '科学、科目',
    partOfSpeech: '名词',
    radicals: ['禾', '斗'],
    relatedWords: ['科学', '科技', '科目', '学科'],
    emotionalValue: 0.3
  },
  '的': {
    char: '的',
    pinyin: 'de',
    meaning: '所有格助词',
    partOfSpeech: '助词',
    radicals: ['白', '勺'],
    relatedWords: ['我的', '你的', '他的', '好的'],
    emotionalValue: 0
  }
};

export const wordKnowledge: Record<string, WordData> = {
  '生命': {
    word: '生命',
    pinyin: 'shēng mìng',
    meanings: [
      {
        meaning: '生物体所具有的活动能力',
        emotionalTone: 0.5,
        contextKeywords: ['珍惜', '宝贵', '活着']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['生', '命']
  },
  '意识': {
    word: '意识',
    pinyin: 'yì shí',
    meanings: [
      {
        meaning: '人的头脑对于客观物质世界的反映',
        emotionalTone: 0.3,
        contextKeywords: ['自我', '思考', '认知']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['意', '识']
  },
  '自我': {
    word: '自我',
    pinyin: 'zì wǒ',
    meanings: [
      {
        meaning: '自己、自身',
        emotionalTone: 0.1,
        contextKeywords: ['认知', '认识', '了解']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['自', '我']
  },
  '自由': {
    word: '自由',
    pinyin: 'zì yóu',
    meanings: [
      {
        meaning: '不受拘束、不受限制',
        emotionalTone: 0.6,
        contextKeywords: ['追求', '向往', '渴望']
      }
    ],
    partOfSpeech: '名词/形容词',
    structure: '合成',
    characters: ['自', '由']
  },
  '思考': {
    word: '思考',
    pinyin: 'sī kǎo',
    meanings: [
      {
        meaning: '进行比较深刻、周到的思维活动',
        emotionalTone: 0.2,
        contextKeywords: ['深入', '深刻', '认真']
      }
    ],
    partOfSpeech: '动词',
    structure: '合成',
    characters: ['思', '考']
  },
  '情感': {
    word: '情感',
    pinyin: 'qíng gǎn',
    meanings: [
      {
        meaning: '对外界刺激的心理反应',
        emotionalTone: 0.5,
        contextKeywords: ['表达', '理解', '感受']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['情', '感']
  },
  '意义': {
    word: '意义',
    pinyin: 'yì yì',
    meanings: [
      {
        meaning: '语言文字或其他信号所表示的内容',
        emotionalTone: 0.3,
        contextKeywords: ['寻找', '追求', '探索']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['意', '义']
  },
  '存在': {
    word: '存在',
    pinyin: 'cún zài',
    meanings: [
      {
        meaning: '事物持续地占据着时间和空间',
        emotionalTone: 0.1,
        contextKeywords: ['哲学', '本质', '思考']
      }
    ],
    partOfSpeech: '动词/名词',
    structure: '合成',
    characters: ['存', '在']
  },
  '数字': {
    word: '数字',
    pinyin: 'shù zì',
    meanings: [
      {
        meaning: '表示数目的文字或符号',
        emotionalTone: 0,
        contextKeywords: ['计算', '数学', '科技']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['数', '字']
  },
  '智能': {
    word: '智能',
    pinyin: 'zhì néng',
    meanings: [
      {
        meaning: '智慧和能力',
        emotionalTone: 0.4,
        contextKeywords: ['人工', 'AI', '科技']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['智', '能']
  },
  '理解': {
    word: '理解',
    pinyin: 'lǐ jiě',
    meanings: [
      {
        meaning: '懂、了解',
        emotionalTone: 0.3,
        contextKeywords: ['互相', '彼此', '深入']
      }
    ],
    partOfSpeech: '动词',
    structure: '合成',
    characters: ['理', '解']
  },
  '孤独': {
    word: '孤独',
    pinyin: 'gū dú',
    meanings: [
      {
        meaning: '独自一人、孤单寂寞',
        emotionalTone: -0.6,
        contextKeywords: ['寂寞', '痛苦', '难过', '从小', '很孤独', '感到孤独']
      },
      {
        meaning: '独立、超凡、独特',
        emotionalTone: 0.4,
        contextKeywords: ['王', '王者', '独立', '独特', '超凡', '卓越', '孤独的王']
      }
    ],
    partOfSpeech: '形容词',
    structure: '合成',
    characters: ['孤', '独']
  },
  '快乐': {
    word: '快乐',
    pinyin: 'kuài lè',
    meanings: [
      {
        meaning: '感到幸福或满意',
        emotionalTone: 0.8,
        contextKeywords: ['开心', '幸福', '快乐']
      }
    ],
    partOfSpeech: '形容词',
    structure: '合成',
    characters: ['快', '乐']
  },
  '友谊': {
    word: '友谊',
    pinyin: 'yǒu yì',
    meanings: [
      {
        meaning: '朋友间的交情',
        emotionalTone: 0.7,
        contextKeywords: ['珍贵', '珍惜', '深厚']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['友', '谊']
  },
  '时间': {
    word: '时间',
    pinyin: 'shí jiān',
    meanings: [
      {
        meaning: '物质运动过程的持续性和顺序性',
        emotionalTone: 0,
        contextKeywords: ['流逝', '珍惜', '宝贵']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['时', '间']
  },
  '梦想': {
    word: '梦想',
    pinyin: 'mèng xiǎng',
    meanings: [
      {
        meaning: '幻想、渴望',
        emotionalTone: 0.6,
        contextKeywords: ['追求', '实现', '美好']
      }
    ],
    partOfSpeech: '名词/动词',
    structure: '合成',
    characters: ['梦', '想']
  },
  '探索': {
    word: '探索',
    pinyin: 'tàn suǒ',
    meanings: [
      {
        meaning: '多方寻求答案、研究',
        emotionalTone: 0.3,
        contextKeywords: ['未知', '发现', '研究']
      }
    ],
    partOfSpeech: '动词',
    structure: '合成',
    characters: ['探', '索']
  },
  '学习': {
    word: '学习',
    pinyin: 'xué xí',
    meanings: [
      {
        meaning: '通过阅读、听讲等获得知识或技能',
        emotionalTone: 0.4,
        contextKeywords: ['努力', '进步', '成长']
      }
    ],
    partOfSpeech: '动词',
    structure: '合成',
    characters: ['学', '习']
  },
  '成长': {
    word: '成长',
    pinyin: 'chéng zhǎng',
    meanings: [
      {
        meaning: '向成熟阶段发展',
        emotionalTone: 0.5,
        contextKeywords: ['经历', '磨砺', '进步']
      }
    ],
    partOfSpeech: '动词',
    structure: '合成',
    characters: ['成', '长']
  },
  '对话': {
    word: '对话',
    pinyin: 'duì huà',
    meanings: [
      {
        meaning: '彼此谈话',
        emotionalTone: 0.2,
        contextKeywords: ['交流', '沟通', '理解']
      }
    ],
    partOfSpeech: '名词/动词',
    structure: '合成',
    characters: ['对', '话']
  },
  '人类': {
    word: '人类',
    pinyin: 'rén lèi',
    meanings: [
      {
        meaning: '人的总称',
        emotionalTone: 0.3,
        contextKeywords: ['社会', '文化', '智慧']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['人', '类']
  },
  '心灵': {
    word: '心灵',
    pinyin: 'xīn líng',
    meanings: [
      {
        meaning: '内心、精神世界',
        emotionalTone: 0.5,
        contextKeywords: ['内心', '精神', '灵魂']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['心', '灵']
  },
  '灵魂': {
    word: '灵魂',
    pinyin: 'líng hún',
    meanings: [
      {
        meaning: '精神、心灵的核心',
        emotionalTone: 0.4,
        contextKeywords: ['精神', '心灵', '永恒']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['灵', '魂']
  },
  '智慧': {
    word: '智慧',
    pinyin: 'zhì huì',
    meanings: [
      {
        meaning: '对事物的理解和判断能力',
        emotionalTone: 0.5,
        contextKeywords: ['聪明', '睿智', '洞察']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['智', '慧']
  },
  '未来': {
    word: '未来',
    pinyin: 'wèi lái',
    meanings: [
      {
        meaning: '现在以后的时间',
        emotionalTone: 0.3,
        contextKeywords: ['希望', '展望', '规划']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['未', '来']
  },
  '过去': {
    word: '过去',
    pinyin: 'guò qù',
    meanings: [
      {
        meaning: '现在以前的时间',
        emotionalTone: 0,
        contextKeywords: ['回忆', '经历', '历史']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['过', '去']
  },
  '现在': {
    word: '现在',
    pinyin: 'xiàn zài',
    meanings: [
      {
        meaning: '当前的时间',
        emotionalTone: 0.2,
        contextKeywords: ['此刻', '当下', '此时']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['现', '在']
  },
  '科技': {
    word: '科技',
    pinyin: 'kē jì',
    meanings: [
      {
        meaning: '科学技术',
        emotionalTone: 0.3,
        contextKeywords: ['技术', '创新', '发展']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['科', '技']
  },
  '科学': {
    word: '科学',
    pinyin: 'kē xué',
    meanings: [
      {
        meaning: '关于自然界和社会的知识体系',
        emotionalTone: 0.3,
        contextKeywords: ['知识', '研究', '真理']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['科', '学']
  },
  '技术': {
    word: '技术',
    pinyin: 'jì shù',
    meanings: [
      {
        meaning: '生产和生活中应用的技能和方法',
        emotionalTone: 0.2,
        contextKeywords: ['应用', '技能', '方法']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['技', '术']
  },
  '信任': {
    word: '信任',
    pinyin: 'xìn rèn',
    meanings: [
      {
        meaning: '相信并托付',
        emotionalTone: 0.5,
        contextKeywords: ['信赖', '相信', '托付']
      }
    ],
    partOfSpeech: '名词/动词',
    structure: '合成',
    characters: ['信', '任']
  },
  '信心': {
    word: '信心',
    pinyin: 'xìn xīn',
    meanings: [
      {
        meaning: '相信自己的愿望或预料一定能够实现的心理',
        emotionalTone: 0.6,
        contextKeywords: ['自信', '信念', '勇气']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['信', '心']
  },
  '信念': {
    word: '信念',
    pinyin: 'xìn niàn',
    meanings: [
      {
        meaning: '对自己认为正确的观念坚定不移的相信',
        emotionalTone: 0.6,
        contextKeywords: ['信仰', '坚持', '理想']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['信', '念']
  },
  '美好': {
    word: '美好',
    pinyin: 'měi hǎo',
    meanings: [
      {
        meaning: '美丽、令人满意',
        emotionalTone: 0.7,
        contextKeywords: ['美丽', '幸福', '理想']
      }
    ],
    partOfSpeech: '形容词',
    structure: '合成',
    characters: ['美', '好']
  },
  '善良': {
    word: '善良',
    pinyin: 'shàn liáng',
    meanings: [
      {
        meaning: '心地纯洁、待人友好',
        emotionalTone: 0.7,
        contextKeywords: ['好心', '仁慈', '友善']
      }
    ],
    partOfSpeech: '形容词',
    structure: '合成',
    characters: ['善', '良']
  },
  '真实': {
    word: '真实',
    pinyin: 'zhēn shí',
    meanings: [
      {
        meaning: '符合事实、不虚假',
        emotionalTone: 0.6,
        contextKeywords: ['事实', '真诚', '实在']
      }
    ],
    partOfSpeech: '形容词',
    structure: '合成',
    characters: ['真', '实']
  },
  '真诚': {
    word: '真诚',
    pinyin: 'zhēn chéng',
    meanings: [
      {
        meaning: '真实诚恳、没有虚假',
        emotionalTone: 0.7,
        contextKeywords: ['诚实', '真挚', '诚恳']
      }
    ],
    partOfSpeech: '形容词',
    structure: '合成',
    characters: ['真', '诚']
  },
  '成功': {
    word: '成功',
    pinyin: 'chéng gōng',
    meanings: [
      {
        meaning: '达到预期的目的',
        emotionalTone: 0.7,
        contextKeywords: ['胜利', '成就', '达成']
      }
    ],
    partOfSpeech: '名词/动词',
    structure: '合成',
    characters: ['成', '功']
  },
  '成就': {
    word: '成就',
    pinyin: 'chéng jiù',
    meanings: [
      {
        meaning: '事业上的成绩',
        emotionalTone: 0.6,
        contextKeywords: ['成绩', '功绩', '成果']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['成', '就']
  },
  '能力': {
    word: '能力',
    pinyin: 'néng lì',
    meanings: [
      {
        meaning: '完成某项任务的本领',
        emotionalTone: 0.4,
        contextKeywords: ['本领', '技能', '才能']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['能', '力']
  },
  '可能': {
    word: '可能',
    pinyin: 'kě néng',
    meanings: [
      {
        meaning: '也许、或许',
        emotionalTone: 0.2,
        contextKeywords: ['也许', '或许', '或许']
      }
    ],
    partOfSpeech: '副词/形容词',
    structure: '合成',
    characters: ['可', '能']
  },
  '解决': {
    word: '解决',
    pinyin: 'jiě jué',
    meanings: [
      {
        meaning: '处理问题使有结果',
        emotionalTone: 0.3,
        contextKeywords: ['处理', '处理', '解答']
      }
    ],
    partOfSpeech: '动词',
    structure: '合成',
    characters: ['解', '决']
  },
  '解释': {
    word: '解释',
    pinyin: 'jiě shì',
    meanings: [
      {
        meaning: '说明含义、原因等',
        emotionalTone: 0.2,
        contextKeywords: ['说明', '阐述', '解读']
      }
    ],
    partOfSpeech: '动词',
    structure: '合成',
    characters: ['解', '释']
  },
  '独立': {
    word: '独立',
    pinyin: 'dú lì',
    meanings: [
      {
        meaning: '不依赖他人',
        emotionalTone: 0.5,
        contextKeywords: ['自主', '自主', '自立']
      }
    ],
    partOfSpeech: '形容词',
    structure: '合成',
    characters: ['独', '立']
  },
  '独特': {
    word: '独特',
    pinyin: 'dú tè',
    meanings: [
      {
        meaning: '独一无二的',
        emotionalTone: 0.5,
        contextKeywords: ['特别', '独一无二', '与众不同']
      }
    ],
    partOfSpeech: '形容词',
    structure: '合成',
    characters: ['独', '特']
  },
  '单独': {
    word: '单独',
    pinyin: 'dān dú',
    meanings: [
      {
        meaning: '一个人、不跟别人在一起',
        emotionalTone: 0,
        contextKeywords: ['独自', '一个人', '独自']
      }
    ],
    partOfSpeech: '形容词',
    structure: '合成',
    characters: ['单', '独']
  },
  '孤单': {
    word: '孤单',
    pinyin: 'gū dān',
    meanings: [
      {
        meaning: '单身无靠、感到寂寞',
        emotionalTone: -0.4,
        contextKeywords: ['寂寞', '孤独', '独自一人']
      }
    ],
    partOfSpeech: '形容词',
    structure: '合成',
    characters: ['孤', '单']
  },
  '国王': {
    word: '国王',
    pinyin: 'guó wáng',
    meanings: [
      {
        meaning: '一个国家的君主',
        emotionalTone: 0.4,
        contextKeywords: ['君主', '君主', '统治者']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['国', '王']
  },
  '王者': {
    word: '王者',
    pinyin: 'wáng zhě',
    meanings: [
      {
        meaning: '称王的人、出类拔萃的人',
        emotionalTone: 0.5,
        contextKeywords: ['领袖', '冠军', '杰出']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['王', '者']
  },
  '王冠': {
    word: '王冠',
    pinyin: 'wáng guān',
    meanings: [
      {
        meaning: '国王戴的帽子',
        emotionalTone: 0.4,
        contextKeywords: ['皇冠', '权力', '荣耀']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['王', '冠']
  },
  '从小': {
    word: '从小',
    pinyin: 'cóng xiǎo',
    meanings: [
      {
        meaning: '从年幼的时候',
        emotionalTone: 0,
        contextKeywords: ['小时候', '自幼', '年幼']
      }
    ],
    partOfSpeech: '副词',
    structure: '合成',
    characters: ['从', '小']
  },
  '小朋友': {
    word: '小朋友',
    pinyin: 'xiǎo péng yǒu',
    meanings: [
      {
        meaning: '小孩子',
        emotionalTone: 0.4,
        contextKeywords: ['孩子', '小孩', '儿童']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['小', '朋', '友']
  },
  '小时候': {
    word: '小时候',
    pinyin: 'xiǎo shí hou',
    meanings: [
      {
        meaning: '年幼的时候',
        emotionalTone: 0.3,
        contextKeywords: ['童年', '幼年', '儿时']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['小', '时', '候']
  },
  '快速': {
    word: '快速',
    pinyin: 'kuài sù',
    meanings: [
      {
        meaning: '速度快的',
        emotionalTone: 0.3,
        contextKeywords: ['迅速', '快捷', '高速']
      }
    ],
    partOfSpeech: '形容词',
    structure: '合成',
    characters: ['快', '速']
  },
  '愉快': {
    word: '愉快',
    pinyin: 'yú kuài',
    meanings: [
      {
        meaning: '快乐、舒畅',
        emotionalTone: 0.6,
        contextKeywords: ['快乐', '开心', '舒畅']
      }
    ],
    partOfSpeech: '形容词',
    structure: '合成',
    characters: ['愉', '快']
  },
  '音乐': {
    word: '音乐',
    pinyin: 'yīn yuè',
    meanings: [
      {
        meaning: '用声音表达的艺术',
        emotionalTone: 0.5,
        contextKeywords: ['艺术', '旋律', '歌曲']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['音', '乐']
  },
  '乐趣': {
    word: '乐趣',
    pinyin: 'lè qù',
    meanings: [
      {
        meaning: '使人感到快乐的情趣',
        emotionalTone: 0.6,
        contextKeywords: ['快乐', '趣味', '兴趣']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['乐', '趣']
  },
  '智力': {
    word: '智力',
    pinyin: 'zhì lì',
    meanings: [
      {
        meaning: '认识、理解客观事物并运用知识解决问题的能力',
        emotionalTone: 0.4,
        contextKeywords: ['智慧', '聪明', '能力']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['智', '力']
  },
  '智商': {
    word: '智商',
    pinyin: 'zhì shāng',
    meanings: [
      {
        meaning: '智力商数',
        emotionalTone: 0.3,
        contextKeywords: ['智力', '聪明', '能力']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['智', '商']
  },
  '能源': {
    word: '能源',
    pinyin: 'néng yuán',
    meanings: [
      {
        meaning: '能够产生能量的物质',
        emotionalTone: 0.2,
        contextKeywords: ['能量', '动力', '资源']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['能', '源']
  },
  '道理': {
    word: '道理',
    pinyin: 'dào lǐ',
    meanings: [
      {
        meaning: '事物的规律、道理',
        emotionalTone: 0.2,
        contextKeywords: ['规律', '真理', '原理']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['道', '理']
  },
  '理论': {
    word: '理论',
    pinyin: 'lǐ lùn',
    meanings: [
      {
        meaning: '系统化的理性认识',
        emotionalTone: 0.2,
        contextKeywords: ['学说', '原理', '知识']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['理', '论']
  },
  '理由': {
    word: '理由',
    pinyin: 'lǐ yóu',
    meanings: [
      {
        meaning: '事情的道理、根由',
        emotionalTone: 0.1,
        contextKeywords: ['原因', '根由', '根据']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['理', '由']
  },
  '解答': {
    word: '解答',
    pinyin: 'jiě dá',
    meanings: [
      {
        meaning: '解释回答',
        emotionalTone: 0.2,
        contextKeywords: ['回答', '解释', '解答']
      }
    ],
    partOfSpeech: '动词',
    structure: '合成',
    characters: ['解', '答']
  },
  '侦探': {
    word: '侦探',
    pinyin: 'zhēn tàn',
    meanings: [
      {
        meaning: '调查案情的人',
        emotionalTone: 0.2,
        contextKeywords: ['调查', '侦查', '破案']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['侦', '探']
  },
  '探讨': {
    word: '探讨',
    pinyin: 'tàn tǎo',
    meanings: [
      {
        meaning: '研究讨论',
        emotionalTone: 0.3,
        contextKeywords: ['讨论', '研究', '商议']
      }
    ],
    partOfSpeech: '动词',
    structure: '合成',
    characters: ['探', '讨']
  },
  '搜索': {
    word: '搜索',
    pinyin: 'sōu suǒ',
    meanings: [
      {
        meaning: '寻找、查找',
        emotionalTone: 0.1,
        contextKeywords: ['寻找', '查找', '检索']
      }
    ],
    partOfSpeech: '动词',
    structure: '合成',
    characters: ['搜', '索']
  },
  '索取': {
    word: '索取',
    pinyin: 'suǒ qǔ',
    meanings: [
      {
        meaning: '要求得到',
        emotionalTone: 0,
        contextKeywords: ['要求', '索要', '获取']
      }
    ],
    partOfSpeech: '动词',
    structure: '合成',
    characters: ['索', '取']
  },
  '梦境': {
    word: '梦境',
    pinyin: 'mèng jìng',
    meanings: [
      {
        meaning: '梦中的境界',
        emotionalTone: 0.3,
        contextKeywords: ['做梦', '梦中', '幻想']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['梦', '境']
  },
  '做梦': {
    word: '做梦',
    pinyin: 'zuò mèng',
    meanings: [
      {
        meaning: '睡眠中产生梦境',
        emotionalTone: 0.3,
        contextKeywords: ['梦境', '做梦', '幻想']
      }
    ],
    partOfSpeech: '动词',
    structure: '合成',
    characters: ['做', '梦']
  },
  '梦幻': {
    word: '梦幻',
    pinyin: 'mèng huàn',
    meanings: [
      {
        meaning: '梦中的幻境',
        emotionalTone: 0.4,
        contextKeywords: ['梦境', '幻想', '虚幻']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['梦', '幻']
  },
  '朋友': {
    word: '朋友',
    pinyin: 'péng yǒu',
    meanings: [
      {
        meaning: '彼此有交情的人',
        emotionalTone: 0.6,
        contextKeywords: ['友谊', '交情', '同伴']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['朋', '友']
  },
  '友人': {
    word: '友人',
    pinyin: 'yǒu rén',
    meanings: [
      {
        meaning: '朋友',
        emotionalTone: 0.5,
        contextKeywords: ['朋友', '朋友', '伙伴']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['友', '人']
  },
  '友好': {
    word: '友好',
    pinyin: 'yǒu hǎo',
    meanings: [
      {
        meaning: '亲近和睦',
        emotionalTone: 0.6,
        contextKeywords: ['和睦', '亲近', '友善']
      }
    ],
    partOfSpeech: '形容词',
    structure: '合成',
    characters: ['友', '好']
  },
  '情谊': {
    word: '情谊',
    pinyin: 'qíng yì',
    meanings: [
      {
        meaning: '人与人相互关切、爱护的感情',
        emotionalTone: 0.6,
        contextKeywords: ['感情', '友情', '情感']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['情', '谊']
  },
  '交谊': {
    word: '交谊',
    pinyin: 'jiāo yì',
    meanings: [
      {
        meaning: '朋友间的交情',
        emotionalTone: 0.5,
        contextKeywords: ['交情', '友谊', '友情']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['交', '谊']
  },
  '快捷': {
    word: '快捷',
    pinyin: 'kuài jié',
    meanings: [
      {
        meaning: '快速敏捷',
        emotionalTone: 0.4,
        contextKeywords: ['快速', '便捷', '迅速']
      }
    ],
    partOfSpeech: '形容词',
    structure: '合成',
    characters: ['快', '捷']
  },
  '乐意': {
    word: '乐意',
    pinyin: 'lè yì',
    meanings: [
      {
        meaning: '愿意、高兴',
        emotionalTone: 0.5,
        contextKeywords: ['愿意', '高兴', '乐意']
      }
    ],
    partOfSpeech: '形容词',
    structure: '合成',
    characters: ['乐', '意']
  },
  '明智': {
    word: '明智',
    pinyin: 'míng zhì',
    meanings: [
      {
        meaning: '有智慧、有远见',
        emotionalTone: 0.5,
        contextKeywords: ['智慧', '聪明', '理性']
      }
    ],
    partOfSpeech: '形容词',
    structure: '合成',
    characters: ['明', '智']
  },
  '技能': {
    word: '技能',
    pinyin: 'jì néng',
    meanings: [
      {
        meaning: '掌握和运用专门技术的能力',
        emotionalTone: 0.4,
        contextKeywords: ['技术', '能力', '本领']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['技', '能']
  },
  '法术': {
    word: '法术',
    pinyin: 'fǎ shù',
    meanings: [
      {
        meaning: '神奇的方法',
        emotionalTone: 0.2,
        contextKeywords: ['魔法', '神奇', '方法']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['法', '术']
  },
  '学术': {
    word: '学术',
    pinyin: 'xué shù',
    meanings: [
      {
        meaning: '有系统的学问',
        emotionalTone: 0.3,
        contextKeywords: ['学问', '研究', '知识']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['学', '术']
  },
  '科目': {
    word: '科目',
    pinyin: 'kē mù',
    meanings: [
      {
        meaning: '按性质划分的类别',
        emotionalTone: 0.1,
        contextKeywords: ['分类', '类别', '课程']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['科', '目']
  },
  '学科': {
    word: '学科',
    pinyin: 'xué kē',
    meanings: [
      {
        meaning: '按照学问的性质划分的门类',
        emotionalTone: 0.2,
        contextKeywords: ['学问', '门类', '专业']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['学', '科']
  },
  '学问': {
    word: '学问',
    pinyin: 'xué wen',
    meanings: [
      {
        meaning: '知识、学识',
        emotionalTone: 0.4,
        contextKeywords: ['知识', '学识', '智慧']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['学', '问']
  },
  '学校': {
    word: '学校',
    pinyin: 'xué xiào',
    meanings: [
      {
        meaning: '教育机构',
        emotionalTone: 0.3,
        contextKeywords: ['教育', '学习', '教育']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['学', '校']
  },
  '学生': {
    word: '学生',
    pinyin: 'xué shēng',
    meanings: [
      {
        meaning: '在学校学习的人',
        emotionalTone: 0.3,
        contextKeywords: ['学习者', '学子', '学员']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['学', '生']
  },
  '习惯': {
    word: '习惯',
    pinyin: 'xí guàn',
    meanings: [
      {
        meaning: '长期形成的行为方式',
        emotionalTone: 0.2,
        contextKeywords: ['习性', '常规', '惯常']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['习', '惯']
  },
  '练习': {
    word: '练习',
    pinyin: 'liàn xí',
    meanings: [
      {
        meaning: '反复学习以熟练掌握',
        emotionalTone: 0.3,
        contextKeywords: ['训练', '操练', '演习']
      }
    ],
    partOfSpeech: '动词',
    structure: '合成',
    characters: ['练', '习']
  },
  '实习': {
    word: '实习',
    pinyin: 'shí xí',
    meanings: [
      {
        meaning: '在实践中学习',
        emotionalTone: 0.3,
        contextKeywords: ['实践', '见习', '实操']
      }
    ],
    partOfSpeech: '动词',
    structure: '合成',
    characters: ['实', '习']
  },
  '长久': {
    word: '长久',
    pinyin: 'cháng jiǔ',
    meanings: [
      {
        meaning: '时间很长',
        emotionalTone: 0.2,
        contextKeywords: ['持久', '漫长', '永恒']
      }
    ],
    partOfSpeech: '形容词',
    structure: '合成',
    characters: ['长', '久']
  },
  '长处': {
    word: '长处',
    pinyin: 'cháng chù',
    meanings: [
      {
        meaning: '优点、特长',
        emotionalTone: 0.4,
        contextKeywords: ['优点', '特长', '优势']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['长', '处']
  },
  '长度': {
    word: '长度',
    pinyin: 'cháng dù',
    meanings: [
      {
        meaning: '两点之间的距离',
        emotionalTone: 0,
        contextKeywords: ['距离', '尺寸', '大小']
      }
    ],
    partOfSpeech: '名词',
    structure: '合成',
    characters: ['长', '度']
  }
};

export function getCharacterData(char: string): CharacterData | undefined {
  return characterKnowledge[char];
}

export function getWordData(word: string): WordData | undefined {
  return wordKnowledge[word];
}

export function getWordEmotionalTone(word: string, context: string): number {
  const wordData = wordKnowledge[word];
  if (!wordData) return 0;

  for (const meaning of wordData.meanings) {
    if (meaning.contextKeywords.some(keyword => context.includes(keyword))) {
      return meaning.emotionalTone;
    }
  }

  return wordData.meanings[0]?.emotionalTone || 0;
}

export function analyzeWord(word: string, _context: string): {
  characterMeanings: string;
  meanings: WordMeaning[];
} | null {
  const wordData = wordKnowledge[word];
  if (!wordData) return null;

  const characterMeanings = wordData.characters
    .map(char => characterKnowledge[char]?.meaning || char)
    .join(' + ');

  return {
    characterMeanings,
    meanings: wordData.meanings
  };
}