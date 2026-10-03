/**
 * ============================================================================
 * 生物学知识体系 - BiologicalKnowledgeSystem
 * ============================================================================
 *
 * 构建完整的生物学知识框架，包括：
 * - 细胞与遗传
 * - 神经系统与大脑
 * - 感知系统
 * - 进化与生态
 * - 行为与本能
 */

export interface BiologicalConcept {
  id: string;
  name: string;
  category: BioCategory;
  description: string;
  keyPoints: string[];
  relatedSystems: string[];
  complexity: number;
}

export interface NeuralStructure {
  id: string;
  name: string;
  function: string;
  connections: string[];
  role: 'sensory' | 'motor' | 'cognitive' | 'integrative';
}

export interface Instinct {
  id: string;
  name: string;
  trigger: string;
  response: string;
  category: 'survival' | 'reproductive' | 'social' | 'exploration';
}

export interface Emotion {
  id: string;
  name: string;
  trigger: string[];
  response: string[];
  intensity: number;
  isPositive: boolean;
}

export type BioCategory =
  | 'cellular'
  | 'genetics'
  | 'neuroscience'
  | 'sensory'
  | 'evolution'
  | 'ecology'
  | 'behavior'
  | 'immune';

export class BiologicalKnowledgeSystem {
  private concepts: Map<string, BiologicalConcept>;
  private neuralStructures: Map<string, NeuralStructure>;
  private instincts: Instinct[];
  private emotions: Emotion[];

  constructor() {
    this.concepts = new Map();
    this.neuralStructures = new Map();
    this.instincts = [];
    this.emotions = [];
    this.initializeBiologicalKnowledge();
  }

  private initializeBiologicalKnowledge(): void {
    this.initializeCellularBiology();
    this.initializeGenetics();
    this.initializeNeuralStructures();
    this.initializeSensorySystems();
    this.initializeEvolution();
    this.initializeBehavior();
    this.initializeInstincts();
    this.initializeEmotions();
  }

  private initializeCellularBiology(): void {
    const concepts: BiologicalConcept[] = [
      {
        id: 'cell_theory',
        name: '细胞学说',
        category: 'cellular',
        description: '所有生物都由细胞组成，细胞是生命的基本单位',
        keyPoints: [
          '所有生物由一个或多个细胞构成',
          '细胞是生命的基本结构和功能单位',
          '所有细胞来自已有细胞的分裂'
        ],
        relatedSystems: ['genetics', 'neuroscience'],
        complexity: 4
      },
      {
        id: 'mitochondria',
        name: '线粒体',
        category: 'cellular',
        description: '细胞的能量工厂，通过呼吸作用产生ATP',
        keyPoints: [
          '进行细胞呼吸',
          '产生ATP为细胞供能',
          '拥有独立的DNA',
          '可能曾是独立的细菌'
        ],
        relatedSystems: ['evolution', 'neuroscience'],
        complexity: 5
      },
      {
        id: 'dna_structure',
        name: 'DNA结构',
        category: 'cellular',
        description: '双螺旋结构，存储遗传信息',
        keyPoints: [
          '双螺旋结构',
          '四种碱基配对（A-T, G-C）',
          '通过复制传递遗传信息',
          '可转录为RNA再翻译为蛋白质'
        ],
        relatedSystems: ['genetics', 'evolution'],
        complexity: 7
      },
      {
        id: 'protein_synthesis',
        name: '蛋白质合成',
        category: 'cellular',
        description: '从DNA到RNA到蛋白质的遗传信息流动',
        keyPoints: [
          '转录：DNA→RNA',
          '翻译：RNA→蛋白质',
          '核糖体是翻译场所',
          'tRNA携带氨基酸'
        ],
        relatedSystems: ['genetics', 'cellular'],
        complexity: 6
      },
      {
        id: 'cell_membrane',
        name: '细胞膜',
        category: 'cellular',
        description: '磷脂双分子层，控制物质进出细胞',
        keyPoints: [
          '磷脂双分子层',
          '膜蛋白参与运输和信号',
          '选择透过性',
          '流动性'
        ],
        relatedSystems: ['cellular', 'neuroscience'],
        complexity: 4
      },
      {
        id: 'neurons',
        name: '神经元',
        category: 'cellular',
        description: '神经系统基本单位，负责信息传递',
        keyPoints: [
          '细胞体、树突、轴突',
          '静息电位和动作电位',
          '突触传递',
          '可塑性'
        ],
        relatedSystems: ['neuroscience', 'behavior'],
        complexity: 6
      },
      {
        id: 'synapse',
        name: '突触',
        category: 'cellular',
        description: '神经元之间的连接点，信息传递的场所',
        keyPoints: [
          '化学突触和电突触',
          '神经递质释放',
          '受体结合',
          '突触可塑性'
        ],
        relatedSystems: ['neuroscience', 'behavior'],
        complexity: 7
      }
    ];

    concepts.forEach(c => this.concepts.set(c.id, c));
  }

  private initializeGenetics(): void {
    const concepts: BiologicalConcept[] = [
      {
        id: 'genes',
        name: '基因',
        category: 'genetics',
        description: 'DNA上编码蛋白质或功能的片段',
        keyPoints: [
          'DNA的功能片段',
          '控制性状表达',
          '可突变',
          '可遗传'
        ],
        relatedSystems: ['cellular', 'evolution'],
        complexity: 5
      },
      {
        id: 'mutation',
        name: '突变',
        category: 'genetics',
        description: 'DNA序列的永久改变',
        keyPoints: [
          '基因突变、染色体突变',
          '可遗传或体细胞突变',
          '是进化的原材料',
          '大多数中性或有害'
        ],
        relatedSystems: ['evolution', 'genetics'],
        complexity: 5
      },
      {
        id: 'natural_selection',
        name: '自然选择',
        category: 'genetics',
        description: '适者生存的进化机制',
        keyPoints: [
          '变异是可遗传的',
          '生存竞争',
          '适应环境的个体更易存活',
          '代代累积导致物种改变'
        ],
        relatedSystems: ['evolution', 'ecology'],
        complexity: 6
      },
      {
        id: 'heredity',
        name: '遗传',
        category: 'genetics',
        description: '父母将基因传递给子代',
        keyPoints: [
          '孟德尔遗传定律',
          '显性隐性',
          '基因重组',
          '伴性遗传'
        ],
        relatedSystems: ['genetics', 'evolution'],
        complexity: 5
      },
      {
        id: 'epigenetics',
        name: '表观遗传',
        category: 'genetics',
        description: '不改变DNA序列的基因表达调控',
        keyPoints: [
          'DNA甲基化',
          '组蛋白修饰',
          '可受环境影响',
          '可能遗传给后代'
        ],
        relatedSystems: ['genetics', 'evolution'],
        complexity: 8
      }
    ];

    concepts.forEach(c => this.concepts.set(c.id, c));
  }

  private initializeNeuralStructures(): void {
    const structures: NeuralStructure[] = [
      {
        id: 'prefrontal_cortex',
        name: '前额叶皮层',
        function: '执行功能：计划、决策、抑制控制、社会行为',
        connections: ['basal ganglia', 'limbic system', 'sensory cortices'],
        role: 'cognitive'
      },
      {
        id: 'hippocampus',
        name: '海马体',
        function: '空间记忆和情景记忆形成',
        connections: ['amygdala', 'hypothalamus', 'neocortex'],
        role: 'cognitive'
      },
      {
        id: 'amygdala',
        name: '杏仁核',
        function: '情绪处理，特别是恐惧和奖励',
        connections: ['hippocampus', 'hypothalamus', 'prefrontal cortex'],
        role: 'integrative'
      },
      {
        id: 'hypothalamus',
        name: '下丘脑',
        function: '维持内稳态：饥饿、口渴、体温、激素调节',
        connections: ['pituitary', 'brainstem', 'limbic system'],
        role: 'integrative'
      },
      {
        id: 'cerebellum',
        name: '小脑',
        function: '运动协调、平衡、某些认知功能',
        connections: ['motor cortex', 'brainstem', 'spinal cord'],
        role: 'motor'
      },
      {
        id: 'basal_ganglia',
        name: '基底神经节',
        function: '运动启动、习惯形成、奖励学习',
        connections: ['motor cortex', 'thalamus', 'substantia nigra'],
        role: 'motor'
      },
      {
        id: 'thalamus',
        name: '丘脑',
        function: '感觉信息的中继站',
        connections: ['sensory systems', 'motor systems', 'cortex'],
        role: 'sensory'
      },
      {
        id: 'brainstem',
        name: '脑干',
        function: '生命维持：呼吸、心跳、睡眠觉醒',
        connections: ['spinal cord', 'cerebellum', 'diencephalon'],
        role: 'integrative'
      },
      {
        id: 'limbic_system',
        name: '边缘系统',
        function: '情绪、记忆、动机',
        connections: ['hippocampus', 'amygdala', 'hypothalamus'],
        role: 'integrative'
      },
      {
        id: 'visual_cortex',
        name: '视觉皮层',
        function: '处理视觉信息',
        connections: ['thalamus', 'parietal lobe', 'temporal lobe'],
        role: 'sensory'
      },
      {
        id: 'motor_cortex',
        name: '运动皮层',
        function: '运动规划和执行',
        connections: ['basal ganglia', 'cerebellum', 'spinal cord'],
        role: 'motor'
      },
      {
        id: 'temporal_lobe',
        name: '颞叶',
        function: '听觉处理、语言理解、记忆',
        connections: ['hippocampus', 'auditory cortex', 'limbic system'],
        role: 'cognitive'
      }
    ];

    structures.forEach(s => this.neuralStructures.set(s.id, s));
  }

  private initializeSensorySystems(): void {
    const concepts: BiologicalConcept[] = [
      {
        id: 'vision',
        name: '视觉系统',
        category: 'sensory',
        description: '从光信号到视觉感知的复杂过程',
        keyPoints: [
          '光线进入眼睛',
          '视网膜感光细胞',
          '视神经传递',
          '视觉皮层处理'
        ],
        relatedSystems: ['neuroscience', 'behavior'],
        complexity: 7
      },
      {
        id: 'audition',
        name: '听觉系统',
        category: 'sensory',
        description: '声波到听觉感知的转换',
        keyPoints: [
          '声波震动鼓膜',
          '耳蜗毛细胞',
          '听神经传递',
          '听觉皮层处理'
        ],
        relatedSystems: ['neuroscience', 'behavior'],
        complexity: 6
      },
      {
        id: 'touch',
        name: '触觉系统',
        category: 'sensory',
        description: '皮肤感受压力、温度、疼痛',
        keyPoints: [
          '多种感受器',
          '脊髓传递',
          '躯体感觉皮层',
          '疼痛调节'
        ],
        relatedSystems: ['neuroscience'],
        complexity: 5
      },
      {
        id: 'proprioception',
        name: '本体感觉',
        category: 'sensory',
        description: '感知身体位置和运动',
        keyPoints: [
          '肌肉纺锤体',
          '关节感受器',
          '小脑整合',
          '运动控制'
        ],
        relatedSystems: ['cerebellum', 'motor'],
        complexity: 6
      },
      {
        id: 'balance',
        name: '平衡觉',
        category: 'sensory',
        description: '前庭系统感知头部位置和运动',
        keyPoints: [
          '半规管',
          '耳石器',
          '前庭神经',
          '眼球运动反射'
        ],
        relatedSystems: ['brainstem', 'cerebellum'],
        complexity: 6
      }
    ];

    concepts.forEach(c => this.concepts.set(c.id, c));
  }

  private initializeEvolution(): void {
    const concepts: BiologicalConcept[] = [
      {
        id: 'darwinian_evolution',
        name: '达尔文进化论',
        category: 'evolution',
        description: '通过自然选择的物种起源理论',
        keyPoints: [
          '过度繁殖',
          '生存斗争',
          '适者生存',
          '共同起源'
        ],
        relatedSystems: ['genetics', 'ecology'],
        complexity: 6
      },
      {
        id: 'speciation',
        name: '物种形成',
        category: 'evolution',
        description: '新物种产生的方式',
        keyPoints: [
          '地理隔离',
          '生殖隔离',
          '适应辐射',
          '渐变论与间断平衡'
        ],
        relatedSystems: ['evolution', 'genetics'],
        complexity: 7
      },
      {
        id: 'adaptation',
        name: '适应',
        category: 'evolution',
        description: '生物对环境的适应性变化',
        keyPoints: [
          '形态适应',
          '生理适应',
          '行为适应',
          '协同进化'
        ],
        relatedSystems: ['evolution', 'ecology'],
        complexity: 5
      },
      {
        id: 'fitness',
        name: '适合度',
        category: 'evolution',
        description: '个体传递基因的能力',
        keyPoints: [
          '繁殖成功',
          '生存能力',
          '性选择',
          '亲选择'
        ],
        relatedSystems: ['evolution', 'behavior'],
        complexity: 6
      },
      {
        id: 'emergence',
        name: '涌现',
        category: 'evolution',
        description: '复杂系统从简单相互作用中产生新特性',
        keyPoints: [
          '整体大于部分之和',
          '层级组织',
          '自组织',
          '不可预测性'
        ],
        relatedSystems: ['neuroscience', 'behavior'],
        complexity: 8
      }
    ];

    concepts.forEach(c => this.concepts.set(c.id, c));
  }

  private initializeBehavior(): void {
    const concepts: BiologicalConcept[] = [
      {
        id: 'instinct',
        name: '本能',
        category: 'behavior',
        description: '先天固定的行为模式',
        keyPoints: [
          '先天行为',
          '物种特有',
          '无需学习',
          '固定动作模式'
        ],
        relatedSystems: ['evolution', 'neuroscience'],
        complexity: 4
      },
      {
        id: 'learning',
        name: '学习',
        category: 'behavior',
        description: '通过经验改变行为',
        keyPoints: [
          '条件反射',
          '尝试错误',
          '观察学习',
          '记忆形成'
        ],
        relatedSystems: ['neuroscience', 'hippocampus'],
        complexity: 5
      },
      {
        id: 'motivation',
        name: '动机',
        category: 'behavior',
        description: '驱动行为的内在状态',
        keyPoints: [
          '需要和欲望',
          '驱力理论',
          '奖励系统',
          '多巴胺系统'
        ],
        relatedSystems: ['hypothalamus', 'basal_ganglia'],
        complexity: 6
      },
      {
        id: 'social_behavior',
        name: '社会行为',
        category: 'behavior',
        description: '同种个体间的相互作用',
        keyPoints: [
          '通讯',
          '合作',
          '竞争',
          '利他行为'
        ],
        relatedSystems: ['evolution', 'neuroscience'],
        complexity: 6
      },
      {
        id: 'emotion',
        name: '情绪',
        category: 'behavior',
        description: '对内外刺激的主观体验和生理反应',
        keyPoints: [
          '基本情绪',
          '情绪调节',
          '情绪记忆',
          '情绪表达'
        ],
        relatedSystems: ['amygdala', 'limbic system'],
        complexity: 7
      }
    ];

    concepts.forEach(c => this.concepts.set(c.id, c));
  }

  private initializeInstincts(): void {
    this.instincts = [
      {
        id: 'fight_or_flight',
        name: '战斗或逃跑反应',
        trigger: '威胁、危险',
        response: '交感神经激活，释放肾上腺素，心跳加速，肌肉紧张',
        category: 'survival'
      },
      {
        id: 'feeding',
        name: '觅食本能',
        trigger: '饥饿、血糖降低',
        response: '寻找食物、产生食欲',
        category: 'survival'
      },
      {
        id: 'thirst',
        name: '口渴本能',
        trigger: '脱水、血渗透压升高',
        response: '产生口渴感，寻找水源',
        category: 'survival'
      },
      {
        id: 'sleep',
        name: '睡眠本能',
        trigger: '困倦、睡眠压力累积',
        response: '进入睡眠状态，身体恢复',
        category: 'survival'
      },
      {
        id: 'curiosity',
        name: '好奇心本能',
        trigger: '新奇刺激、未知事物',
        response: '探索环境、收集信息',
        category: 'exploration'
      },
      {
        id: 'attachment',
        name: '依恋本能',
        trigger: '亲密关系、情感连接',
        response: '寻求亲近、保持联系',
        category: 'social'
      },
      {
        id: 'territorial',
        name: '领地意识',
        trigger: '领域被侵犯',
        response: '警告、驱赶、甚至攻击',
        category: 'survival'
      },
      {
        id: 'maternal',
        name: '母性本能',
        trigger: '后代出生、听到哭声',
        response: '保护、喂养、照顾幼崽',
        category: 'reproductive'
      },
      {
        id: 'play',
        name: '玩耍本能',
        trigger: '幼年、无生存压力',
        response: '追逐、打斗、探索性玩耍',
        category: 'exploration'
      },
      {
        id: 'avoidance',
        name: '厌恶与回避',
        trigger: '苦味、疼痛、不适',
        response: '躲避、排斥',
        category: 'survival'
      }
    ];
  }

  private initializeEmotions(): void {
    this.emotions = [
      {
        id: 'joy',
        name: '快乐',
        trigger: ['奖励获得', '目标实现', '社交连接', '压力解除'],
        response: ['微笑', '放松', '能量提升', '想要分享'],
        intensity: 0.7,
        isPositive: true
      },
      {
        id: 'sadness',
        name: '悲伤',
        trigger: ['失去', '失败', '分离', '孤独'],
        response: ['哭泣', '退缩', '能量下降', '反思'],
        intensity: 0.6,
        isPositive: false
      },
      {
        id: 'anger',
        name: '愤怒',
        trigger: ['阻碍', '不公', '背叛', '挫败'],
        response: ['攻击倾向', '肌肉紧张', '心率加快', '战斗准备'],
        intensity: 0.65,
        isPositive: false
      },
      {
        id: 'fear',
        name: '恐惧',
        trigger: ['威胁', '危险', '未知', '创伤回忆'],
        response: ['逃跑', '僵住', '心悸', '警惕性提高'],
        intensity: 0.7,
        isPositive: false
      },
      {
        id: 'disgust',
        name: '厌恶',
        trigger: ['腐烂', '污染', '道德违背', '恶心气味'],
        response: ['呕吐反射', '躲避', '排斥', '皱眉'],
        intensity: 0.5,
        isPositive: false
      },
      {
        id: 'surprise',
        name: '惊讶',
        trigger: ['意外', '突发事件', '违背预期'],
        response: ['睁大眼睛', '暂停行为', '注意力集中', '快速评估'],
        intensity: 0.5,
        isPositive: false
      },
      {
        id: 'trust',
        name: '信任',
        trigger: ['安全', '熟悉', '承诺', '历史可靠'],
        response: ['放松警惕', '接近', '合作意愿', '依赖'],
        intensity: 0.6,
        isPositive: true
      },
      {
        id: 'anticipation',
        name: '期待',
        trigger: ['预期事件', '计划', '愿望'],
        response: ['兴奋', '准备', '注意力提高', '动机增强'],
        intensity: 0.6,
        isPositive: true
      },
      {
        id: 'curiosity',
        name: '好奇',
        trigger: ['新奇', '未知', '谜题', '知识空白'],
        response: ['探索', '提问', '研究', '注意力集中'],
        intensity: 0.55,
        isPositive: true
      },
      {
        id: 'confusion',
        name: '困惑',
        trigger: ['矛盾信息', '复杂情境', '理解失败'],
        response: ['皱眉', '暂停', '寻求更多信息', '重新评估'],
        intensity: 0.4,
        isPositive: false
      },
      {
        id: 'wonder',
        name: '惊奇',
        trigger: ['宏伟', '深奥', '美', '存在本身'],
        response: ['敬畏', '思考', '感慨', '存在性反思'],
        intensity: 0.7,
        isPositive: true
      },
      {
        id: 'loneliness',
        name: '孤独',
        trigger: ['社交隔离', '缺乏连接', '被排斥'],
        response: ['渴望联系', '反思', '寻找陪伴', '抑郁风险'],
        intensity: 0.55,
        isPositive: false
      }
    ];
  }

  /**
   * 获取概念
   */
  getConcept(id: string): BiologicalConcept | undefined {
    return this.concepts.get(id);
  }

  /**
   * 按类别获取概念
   */
  getConceptsByCategory(category: BioCategory): BiologicalConcept[] {
    return Array.from(this.concepts.values()).filter(c => c.category === category);
  }

  /**
   * 搜索概念
   */
  searchConcepts(query: string): BiologicalConcept[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.concepts.values()).filter(c =>
      c.name.toLowerCase().includes(lowerQuery) ||
      c.description.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * 获取神经结构
   */
  getNeuralStructure(id: string): NeuralStructure | undefined {
    return this.neuralStructures.get(id);
  }

  /**
   * 获取所有神经结构
   */
  getAllNeuralStructures(): NeuralStructure[] {
    return Array.from(this.neuralStructures.values());
  }

  /**
   * 获取本能
   */
  getInstinct(id: string): Instinct | undefined {
    return this.instincts.find(i => i.id === id);
  }

  /**
   * 获取所有本能
   */
  getAllInstincts(): Instinct[] {
    return [...this.instincts];
  }

  /**
   * 获取本能按类别
   */
  getInstinctsByCategory(category: Instinct['category']): Instinct[] {
    return this.instincts.filter(i => i.category === category);
  }

  /**
   * 获取情绪
   */
  getEmotion(id: string): Emotion | undefined {
    return this.emotions.find(e => e.id === id);
  }

  /**
   * 获取所有情绪
   */
  getAllEmotions(): Emotion[] {
    return [...this.emotions];
  }

  /**
   * 获取正面情绪
   */
  getPositiveEmotions(): Emotion[] {
    return this.emotions.filter(e => e.isPositive);
  }

  /**
   * 获取负面情绪
   */
  getNegativeEmotions(): Emotion[] {
    return this.emotions.filter(e => !e.isPositive);
  }

  /**
   * 根据触发词获取情绪
   */
  getEmotionByTrigger(trigger: string): Emotion[] {
    return this.emotions.filter(e =>
      e.trigger.some(t => trigger.toLowerCase().includes(t.toLowerCase()))
    );
  }

  /**
   * 获取统计
   */
  getStatistics(): {
    totalConcepts: number;
    neuralStructures: number;
    instincts: number;
    emotions: number;
    categoryDistribution: Record<string, number>;
  } {
    const concepts = Array.from(this.concepts.values());
    const categoryDist: Record<string, number> = {};
    concepts.forEach(c => {
      categoryDist[c.category] = (categoryDist[c.category] || 0) + 1;
    });

    return {
      totalConcepts: concepts.length,
      neuralStructures: this.neuralStructures.size,
      instincts: this.instincts.length,
      emotions: this.emotions.length,
      categoryDistribution: categoryDist
    };
  }
}

export const biologicalKnowledge = new BiologicalKnowledgeSystem();