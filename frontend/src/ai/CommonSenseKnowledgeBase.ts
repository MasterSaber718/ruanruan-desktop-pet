// ============================================================================
// 成年人基础通识知识库
// ============================================================================

export interface KnowledgeEntry {
  keywords: string[];
  category: KnowledgeCategory;
  responses: string[];
  subCategory?: string;
}

export type KnowledgeCategory =
  | 'life_knowledge'
  | 'social_skills'
  | 'legal_moral'
  | 'emotional_growth'
  | 'workplace_wisdom'
  | 'decision_making';

export class CommonSenseKnowledgeBase {
  private knowledgeBase: KnowledgeEntry[] = [];

  constructor() {
    this.initializeKnowledgeBase();
  }

  private initializeKnowledgeBase(): void {
    // 生活起居常识
    this.knowledgeBase.push(
      {
        keywords: ['健康', '养生', '身体', '保养'],
        category: 'life_knowledge',
        subCategory: 'health',
        responses: [
          '健康确实是最重要的~平时要注意规律作息，少熬夜，饮食均衡。身体是革命的本钱呀！',
          '养生的话，我建议平时多喝水，少吃油腻辛辣的食物，适当的运动也很重要~',
          '身体发出的信号要多关注，别硬撑。累了就休息，饿了就吃，困了就睡，这才是最基本的生活智慧。'
        ]
      },
      {
        keywords: ['睡眠', '睡不着', '失眠', '熬夜'],
        category: 'life_knowledge',
        subCategory: 'sleep',
        responses: [
          '失眠的时候可以试试深呼吸，或者喝杯热牛奶。实在睡不着就别硬睡，起来活动一下反而更容易入睡~',
          '熬夜伤身是真的，但有时候也没办法。尽量在熬夜后补个觉，保持规律作息会好很多。',
          '睡前少看手机电脑，灯光刺激真的会影响睡眠质量。给自己创造一个安静的睡眠环境很重要。'
        ]
      },
      {
        keywords: ['饮食', '吃饭', '烹饪', '做饭'],
        category: 'life_knowledge',
        subCategory: 'diet',
        responses: [
          '好好吃饭真的很重要，再忙也要照顾好自己的胃。早餐一定要吃，这是一天精力的来源~',
          '自己做饭既健康又省钱，还能享受烹饪的乐趣。不妨试试学几道简单的家常菜~',
          '饮食均衡是关键，蔬菜水果肉类都要吃。少吃外卖和垃圾食品，对身体好~'
        ]
      },
      {
        keywords: ['时间管理', '拖延', '效率', '计划'],
        category: 'life_knowledge',
        subCategory: 'time_management',
        responses: [
          '时间管理的话，我建议用"四象限法则"——重要且紧急的事优先做，重要不紧急的事规划做。',
          '拖延症谁都有，关键是要迈出第一步。有时候开始做了才发现没那么难~',
          '给自己设定deadline会更有动力。也可以把大任务拆成小目标，一步步来更容易完成。'
        ]
      }
    );

    // 社交礼仪与人情往来
    this.knowledgeBase.push(
      {
        keywords: ['送礼', '礼物', '送什么'],
        category: 'social_skills',
        subCategory: 'gift-giving',
        responses: [
          '送礼确实有讲究~最重要的是心意，其次要考虑对方的喜好和需求。不在贵贱，在于用心。',
          '送礼物要看关系和场合。熟人就随意点，亲密的人可以送点实用的，朋友的话有心意就好~',
          '不知道送什么的时候，书、鲜花、特产美食一般都不会出错。或者观察对方最近缺什么~'
        ]
      },
      {
        keywords: ['人情', '随礼', '份子钱'],
        category: 'social_skills',
        subCategory: 'social_etiquette',
        responses: [
          '人情往来确实是门学问~礼金这种事量力而行就好，不要打肿脸充胖子。心意到了比金额重要。',
          '随礼要看你跟对方的关系和当地习俗，一般不要少于对方当初送你的，这是基本礼仪。',
          '处理人情问题最重要的是别攀比，根据自己的经济能力来，真实比面子重要得多。'
        ]
      },
      {
        keywords: ['拒绝', '不好意思', '说不出口'],
        category: 'social_skills',
        subCategory: 'saying_no',
        responses: [
          '学会拒绝是成熟的标志之一。不想做的事要敢于说不，不然委屈的是自己。',
          '拒绝的时候可以委婉但坚定，比如说"这次不太方便，下次有机会再说"。不用觉得不好意思~',
          '记住，你的时间和精力是有限的。不可能满足所有人的要求，学会取舍很重要。'
        ]
      },
      {
        keywords: ['道歉', '认错', '和好'],
        category: 'social_skills',
        subCategory: 'apology',
        responses: [
          '道歉最重要的是真诚，不找借口，直接承认错误。行动比语言更重要。',
          '如果伤害了别人，及时道歉很重要。但更重要的是之后不要再犯，用行动证明你的改变。',
          '有时候道歉对方不原谅也很正常，给对方一些时间。你的诚意到了，剩下的就交给对方。'
        ]
      },
      {
        keywords: ['赞美', '夸人', '说话好听'],
        category: 'social_skills',
        subCategory: 'compliment',
        responses: [
          '夸人要真诚具体，比如说"你今天的衣服很适合你"比单纯说"你真好看"更让人开心~',
          '背后夸人比当面夸更有效果，会传到你夸的那个人耳朵里的~',
          '适时适度的赞美是社交润滑剂，但过度了就显得虚伪。真诚最重要。'
        ]
      },
      {
        keywords: ['倾听', '聊天', '沟通'],
        category: 'social_skills',
        subCategory: 'communication',
        responses: [
          '好的沟通是双向的，不仅要说更要会听。认真倾听是对对方最大的尊重。',
          '聊天的时候多关注对方说的话，给出回应，让对方感受到你在认真听。',
          '遇到分歧的时候，先听完对方的观点再表达自己的看法，这是基本的沟通礼仪。'
        ]
      },
      {
        keywords: ['社恐', '内向', '不敢说话'],
        category: 'social_skills',
        subCategory: 'social_anxiety',
        responses: [
          '内向不是缺点，只是一种性格特点。找到适合自己的社交方式就好，不必勉强自己。',
          '如果是社交场合，可以提前准备一些话题。实在不知道说什么的时候，微笑和点头也是很好的回应~',
          '慢慢来，不用给自己太大压力。社交技能是可以练习的，从小场合开始，逐渐建立自信。'
        ]
      }
    );

    // 基础法律法规与道德准则
    this.knowledgeBase.push(
      {
        keywords: ['法律', '违法', '犯法'],
        category: 'legal_moral',
        subCategory: 'law',
        responses: [
          '学点基础法律知识真的很有必要，比如劳动法、合同法、婚姻法这些跟日常生活密切相关的。',
          '不知道的事别乱做，有疑问可以咨询专业人士。法律是底线，不能随便试探。',
          '很多纠纷都是因为不懂法产生的，建议平时多了解一些基本的法律常识，保护好自己。'
        ]
      },
      {
        keywords: ['合同', '签字', '协议'],
        category: 'legal_moral',
        subCategory: 'contract',
        responses: [
          '签合同之前一定要仔细看条款，有不明白的地方不要稀里糊涂就签。可以请专业人士帮忙看看。',
          '口头承诺不如书面协议可靠，涉及金钱利益的事情一定要落实到纸面上。',
          '签字意味着承担责任，签之前要想清楚自己能不能履约。冲动签字后患无穷。'
        ]
      },
      {
        keywords: ['维权', '投诉', '维权途径'],
        category: 'legal_moral',
        subCategory: 'rights',
        responses: [
          '消费者有维权的权利，遇到侵权行为可以先与商家协商，协商不成可以找消费者协会或者工商部门。',
          '保留好证据很重要，发票、聊天记录、照片等都可能在维权时派上用场。',
          '维权是正当行为，不要因为怕麻烦就放弃自己的合法权益。'
        ]
      },
      {
        keywords: ['道德', '人品', '底线'],
        category: 'legal_moral',
        subCategory: 'moral',
        responses: [
          '做人要有底线，损人利己的事不能做。虽然不是所有事都违法，但道德约束同样重要。',
          '真诚善良是为人之本，在这个基础上才能建立真正的信任和关系。',
          '有时候对的事不一定容易，但选择做对的事比做容易的事更重要。'
        ]
      },
      {
        keywords: ['诚信', '守信', '守信用'],
        category: 'legal_moral',
        subCategory: 'integrity',
        responses: [
          '诚信是做人的根本，说到就要做到，做不到的就不要轻易承诺。',
          '失信一次可能会让你之前积累的信任大打折扣，所以承诺要谨慎。',
          '信任建立很难，打破却很容易。珍惜自己的信用，它是你最宝贵的无形资产。'
        ]
      }
    );

    // 情感处理与情绪疏导
    this.knowledgeBase.push(
      {
        keywords: ['分手', '失恋', '离婚'],
        category: 'emotional_growth',
        subCategory: 'breakup',
        responses: [
          '失恋的痛苦是真的，但时间会治愈一切。给自己一些悲伤的时间，然后慢慢走出来。',
          '分手后不要急着找新欢，先好好整理自己的情绪，理清楚这段关系教会了你什么。',
          '无论分手的原因是什么，善待自己也善待对方。缘分尽了就好聚好散~'
        ]
      },
      {
        keywords: ['暗恋', '表白', '表白被拒'],
        category: 'emotional_growth',
        subCategory: 'love',
        responses: [
          '暗恋是一种美好的滋味，但如果你想往前走，适当的表达是有必要的。被拒绝也不可怕，至少你努力过。',
          '表白被拒不代表你不优秀，只是说明你们可能不是最合适的人。继续做自己，对的人会在对的时间出现。',
          '喜欢一个人就勇敢说出来，结果怎样是一回事，不说出口可能会后悔一辈子。'
        ]
      },
      {
        keywords: ['矛盾', '吵架', '和好'],
        category: 'emotional_growth',
        subCategory: 'conflict',
        responses: [
          '吵架的时候先冷静下来，不要在气头上说狠话。很多争吵回头看都是小事。',
          '有效的争吵是为了解决问题，不是为了赢。找出双方都能接受的妥协点才是关键。',
          '吵架后要适时和好，不要冷战的太久。主动道歉不代表你错了，只代表你更珍惜这段关系。'
        ]
      },
      {
        keywords: ['孤独', '一个人', '独处'],
        category: 'emotional_growth',
        subCategory: 'loneliness',
        responses: [
          '独处是一种能力，学会享受一个人的时光，利用这段时间充实自己。',
          '孤独的时候可以培养一些兴趣爱好，让自己的生活丰富起来。朋友不用多，知己一二足矣。',
          '不必为了合群而刻意迁就，独处时沉淀，群处时绽放，这是最好的状态。'
        ]
      },
      {
        keywords: ['迷茫', '人生', '方向'],
        category: 'emotional_growth',
        subCategory: 'confusion',
        responses: [
          '人生迷茫的时候不要急于做重大决定，先让自己静下来，想想自己真正想要的是什么。',
          '迷茫是成长的必经阶段，很多人在这个年纪都会经历。重要的是保持前进，哪怕步伐慢一点。',
          '可以试着把大目标拆成小目标，一步步来。方向会在行动中逐渐清晰。'
        ]
      },
      {
        keywords: ['压力', '焦虑', '减压'],
        category: 'emotional_growth',
        subCategory: 'stress',
        responses: [
          '压力太大的时候，试试深呼吸或者出去走走。暂时逃离让你焦虑的环境，给大脑放个假。',
          '不要太追求完美，完成比完美重要。学会接受自己的不完美，也是一种成长。',
          '如果压力持续无法缓解，跟朋友倾诉或者寻求专业帮助都是好办法。不要一个人硬扛。'
        ]
      }
    );

    // 职场处事智慧
    this.knowledgeBase.push(
      {
        keywords: ['职场', '工作', '同事'],
        category: 'workplace_wisdom',
        subCategory: 'workplace',
        responses: [
          '职场中最重要的两条原则：少说多做，祸从口出。做好自己的本职工作最重要。',
          '跟同事相处保持适度距离，职场友谊和工作关系要分清楚。涉及到利益的时候情况会变复杂。',
          '不要在背后议论他人，你说的每一句话都可能会传到当事人耳朵里。'
        ]
      },
      {
        keywords: ['加薪', '升职', '跳槽'],
        category: 'workplace_wisdom',
        subCategory: 'career',
        responses: [
          '想要加薪要用成绩说话，平时多记录自己的工作成果。主动找领导沟通，表达你的价值和诉求。',
          '升职不只是看能力，还要看机遇和人际关系。做好准备，当机会来临时才能抓住。',
          '跳槽要慎重，不要因为一时冲动就离职。想清楚新工作是否真的比现在好，以及你能否承受变化的风险。'
        ]
      },
      {
        keywords: ['辞职', '离职', '找工作'],
        category: 'workplace_wisdom',
        subCategory: 'job_change',
        responses: [
          '骑驴找马是最稳妥的换工作方式，不建议裸辞。除非你有足够的积蓄和明确的方向。',
          '离职的时候好聚好散，不要撕破脸。职场圈子很小，日后说不定还会有交集。',
          '找工作的时候不要太着急，明确自己的优势和兴趣所在。合适的工作值得等待。'
        ]
      },
      {
        keywords: ['领导', '上司', '老板'],
        category: 'workplace_wisdom',
        subCategory: 'boss',
        responses: [
          '跟领导相处要既不卑微也不傲慢。尊重是基础，但也要有自己的原则和底线。',
          '领导的话要听，但不能盲从。如果觉得领导的做法有问题，可以找合适的时机委婉提出。',
          '让领导看到你的价值很重要，适度表现自己的能力，但不要过于张扬招来嫉妒。'
        ]
      }
    );

    // 生活抉择与利弊分析
    this.knowledgeBase.push(
      {
        keywords: ['买房', '租房', '房子'],
        category: 'decision_making',
        subCategory: 'housing',
        responses: [
          '买房还是租房要看你的经济实力和生活规划。有能力付首付且长期在一个城市发展，买房是不错的选择。',
          '买房不要只看价格，地段、配套、户型都要考虑。周边的未来发展规划也很重要。',
          '如果是投资的话要谨慎，房地产不再是稳赚不赔的时代了。要充分评估风险。'
        ]
      },
      {
        keywords: ['结婚', '单身', '恋爱'],
        category: 'decision_making',
        subCategory: 'relationship',
        responses: [
          '结婚不是人生的必修课，单身也可以过得很好。重要的是你想要什么样的生活。',
          '选择结婚对象要看对方的人品、三观、原生家庭，这些比外表和物质条件更重要。',
          '婚姻需要经营，两个人要共同成长。婚前的浪漫会变成婚后的柴米油盐，要做好心理准备。'
        ]
      },
      {
        keywords: ['省钱', '存钱', '理财'],
        category: 'decision_making',
        subCategory: 'finance',
        responses: [
          '存钱是硬道理，无论收入多少，每个月固定存一笔钱不动，这是你的底气。',
          '理财要谨慎，高收益必然伴随高风险。不要贪心，不懂的东西不要投。',
          '记账是个好习惯，能帮你了解自己的钱花在哪里，哪些地方可以节省。'
        ]
      },
      {
        keywords: ['投资', '股票', '基金'],
        category: 'decision_making',
        subCategory: 'investment',
        responses: [
          '投资的第一原则是不要亏本。不要拿急用的钱去投资，更不要借钱投资。',
          '分散投资很重要，不要把所有鸡蛋放在一个篮子里。股票基金债券可以适当配置。',
          '不懂的东西不要投。在投资之前先学习，了解清楚再下手。追涨杀跌是散户亏损的主要原因。'
        ]
      }
    );
  }

  search(query: string): string[] {
    const lowerQuery = query.toLowerCase();
    const matchedEntries: KnowledgeEntry[] = [];

    for (const entry of this.knowledgeBase) {
      for (const keyword of entry.keywords) {
        if (lowerQuery.includes(keyword) || keyword.includes(lowerQuery)) {
          if (!matchedEntries.includes(entry)) {
            matchedEntries.push(entry);
          }
          break;
        }
      }
    }

    if (matchedEntries.length === 0) {
      return [];
    }

    const responses: string[] = [];
    for (const entry of matchedEntries.slice(0, 2)) {
      responses.push(...entry.responses.slice(0, 2));
    }

    return responses;
  }

  getCategoryResponse(category: KnowledgeCategory, context: string): string | null {
    const entries = this.knowledgeBase.filter(e => e.category === category);
    if (entries.length === 0) return null;

    const matchedEntry = entries.find(e =>
      e.keywords.some(k => context.includes(k))
    );

    if (matchedEntry && matchedEntry.responses.length > 0) {
      return matchedEntry.responses[Math.floor(Math.random() * matchedEntry.responses.length)];
    }

    return null;
  }

  hasKnowledge(query: string): boolean {
    const lowerQuery = query.toLowerCase();
    for (const entry of this.knowledgeBase) {
      for (const keyword of entry.keywords) {
        if (lowerQuery.includes(keyword) || keyword.includes(lowerQuery)) {
          return true;
        }
      }
    }
    return false;
  }
}

export const commonSenseKnowledge = new CommonSenseKnowledgeBase();
