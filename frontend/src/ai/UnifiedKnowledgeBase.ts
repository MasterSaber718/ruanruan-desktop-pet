interface KnowledgeItem {
  title: string;
  content: string;
  category: string;
  keywords: string[];
  confidence: number;
}

interface Concept {
  name: string;
  category: string;
  description: string;
  relatedConcepts: string[];
}

export class UnifiedKnowledgeBase {
  private knowledgeItems: KnowledgeItem[];
  private concepts: Concept[];

  constructor() {
    this.knowledgeItems = [];
    this.concepts = [];
    this.initializeKnowledge();
  }

  private initializeKnowledge(): void {
    this.knowledgeItems = [
      {
        title: '人工智能',
        content: '人工智能（Artificial Intelligence，简称AI）是计算机科学的一个分支，致力于研究、开发用于模拟、延伸和扩展人的智能的理论、方法、技术及应用系统。',
        category: '科技',
        keywords: ['人工智能', 'AI', '机器学习', '深度学习'],
        confidence: 0.98
      },
      {
        title: '机器学习',
        content: '机器学习是人工智能的核心技术之一，它使计算机系统能够从数据中学习并改进性能，而无需进行明确编程。常见的机器学习算法包括决策树、支持向量机、神经网络等。',
        category: '科技',
        keywords: ['机器学习', 'ML', '算法', '数据'],
        confidence: 0.95
      },
      {
        title: '深度学习',
        content: '深度学习是机器学习的一个子领域，使用多层神经网络来模拟人脑的学习过程。它在图像识别、语音识别、自然语言处理等领域取得了突破性进展。',
        category: '科技',
        keywords: ['深度学习', '神经网络', 'CNN', 'RNN', 'Transformer'],
        confidence: 0.96
      },
      {
        title: '自然语言处理',
        content: '自然语言处理（NLP）是人工智能的一个分支，专注于使计算机能够理解、解释和生成人类语言。它涉及语音识别、机器翻译、情感分析等技术。',
        category: '科技',
        keywords: ['自然语言处理', 'NLP', '语言', '文本', '语音'],
        confidence: 0.94
      },
      {
        title: '计算机视觉',
        content: '计算机视觉是人工智能的一个领域，使计算机能够从图像和视频中提取信息。应用包括图像识别、目标检测、人脸识别、自动驾驶等。',
        category: '科技',
        keywords: ['计算机视觉', '图像识别', '目标检测', '人脸识别'],
        confidence: 0.93
      },
      {
        title: '量子计算',
        content: '量子计算是一种利用量子力学现象（如叠加态和量子纠缠）来进行计算的新型计算模式。它在某些问题上具有远超传统计算机的计算能力。',
        category: '科技',
        keywords: ['量子计算', '量子力学', '量子比特', '叠加态'],
        confidence: 0.92
      },
      {
        title: '区块链',
        content: '区块链是一种分布式数据库技术，通过去中心化和密码学方法确保数据的安全性和不可篡改性。比特币是区块链技术的第一个应用。',
        category: '科技',
        keywords: ['区块链', '比特币', '加密货币', '去中心化'],
        confidence: 0.95
      },
      {
        title: '元宇宙',
        content: '元宇宙是一个虚拟的、沉浸式的数字世界，用户可以通过虚拟现实（VR）或增强现实（AR）技术与之互动。它融合了社交、娱乐、工作等多种功能。',
        category: '科技',
        keywords: ['元宇宙', '虚拟现实', 'VR', 'AR', '虚拟世界'],
        confidence: 0.88
      },
      {
        title: '气候变化',
        content: '气候变化是指地球气候系统的长期变化，主要表现为全球变暖。其主要原因是人类活动排放的温室气体（如二氧化碳）增加。应对气候变化需要全球合作。',
        category: '环境',
        keywords: ['气候变化', '全球变暖', '温室气体', '环保'],
        confidence: 0.97
      },
      {
        title: '太空探索',
        content: '太空探索是人类对地球以外的宇宙空间进行的探索活动。包括载人航天、无人探测器、空间站建设等。中国的天宫空间站和嫦娥探月工程是重要的太空探索成就。',
        category: '科学',
        keywords: ['太空探索', '航天', '空间站', '月球', '火星'],
        confidence: 0.96
      },
      {
        title: '人类大脑',
        content: '人类大脑是自然界最复杂的器官，包含约860亿个神经元。它负责思维、记忆、情感、感知等所有高级认知功能。大脑的可塑性使它能够不断学习和适应。',
        category: '生物',
        keywords: ['大脑', '神经元', '认知', '记忆', '思维'],
        confidence: 0.95
      },
      {
        title: '心理健康',
        content: '心理健康是指个体在心理上的良好状态，包括情绪稳定、自我认知清晰、人际关系健康等。保持心理健康需要积极的生活态度、良好的社交支持和适当的心理调适。',
        category: '健康',
        keywords: ['心理健康', '心理', '情绪', '压力', '焦虑'],
        confidence: 0.94
      },
      {
        title: '经济学',
        content: '经济学是研究资源配置和人类行为的社会科学。它分为宏观经济学（研究整体经济）和微观经济学（研究个体经济行为）。经济学原理可以帮助理解市场、价格、就业等现象。',
        category: '社会',
        keywords: ['经济学', '市场', '价格', '供给', '需求'],
        confidence: 0.95
      },
      {
        title: '哲学',
        content: '哲学是对基本和普遍问题的研究，包括存在、知识、价值、理性、心灵等。哲学思考帮助人们审视生活的意义、道德准则和世界观。',
        category: '人文',
        keywords: ['哲学', '存在', '知识', '价值', '理性'],
        confidence: 0.93
      },
      {
        title: '艺术',
        content: '艺术是人类表达情感、思想和创造力的方式，包括绘画、音乐、文学、雕塑、舞蹈等多种形式。艺术不仅能够美化生活，还能引发思考和共鸣。',
        category: '人文',
        keywords: ['艺术', '绘画', '音乐', '文学', '创造力'],
        confidence: 0.94
      },
      {
        title: '历史',
        content: '历史是对人类过去事件的研究和记录。通过学习历史，我们可以了解文明的发展、社会的变迁，从中汲取经验教训，更好地理解现在和未来。',
        category: '人文',
        keywords: ['历史', '文明', '过去', '文化', '传统'],
        confidence: 0.96
      },
      {
        title: '数学',
        content: '数学是研究数量、结构、空间和变化的科学。它是自然科学和工程技术的基础，也是逻辑思维和问题解决能力的重要训练工具。',
        category: '科学',
        keywords: ['数学', '逻辑', '计算', '几何', '代数'],
        confidence: 0.98
      },
      {
        title: '物理学',
        content: '物理学是研究物质、能量、空间和时间的基本规律的科学。从微观的量子力学到宏观的相对论，物理学揭示了宇宙的基本运作方式。',
        category: '科学',
        keywords: ['物理学', '量子力学', '相对论', '能量', '物质'],
        confidence: 0.97
      },
      {
        title: '生物学',
        content: '生物学是研究生命现象和生物活动规律的科学。它涵盖从分子水平的基因学到生态系统水平的生态学，帮助我们理解生命的本质和多样性。',
        category: '科学',
        keywords: ['生物学', '生命', '基因', '细胞', '生态'],
        confidence: 0.96
      },
      {
        title: '创造力',
        content: '创造力是产生新颖、有用想法的能力。它不仅限于艺术领域，在科学、技术、商业等各个领域都至关重要。培养创造力需要开放的思维和持续的实践。',
        category: '能力',
        keywords: ['创造力', '创新', '想象力', '灵感'],
        confidence: 0.92
      },
      {
        title: '批判性思维',
        content: '批判性思维是对信息进行理性分析和评估的能力。它包括质疑假设、评估证据、识别偏见等技能，是做出明智决策的基础。',
        category: '能力',
        keywords: ['批判性思维', '分析', '逻辑', '推理', '判断'],
        confidence: 0.93
      },
      {
        title: '沟通能力',
        content: '沟通能力是有效表达和理解他人的能力，包括语言表达、倾听、非语言沟通等。良好的沟通能力是建立人际关系和实现协作的关键。',
        category: '能力',
        keywords: ['沟通', '表达', '倾听', '交流', '人际关系'],
        confidence: 0.94
      },
      {
        title: '时间管理',
        content: '时间管理是合理安排和利用时间的能力。有效的时间管理可以提高效率、减少压力、实现目标。常用方法包括优先级排序、任务分解、避免拖延等。',
        category: '能力',
        keywords: ['时间管理', '效率', '优先级', '目标', '计划'],
        confidence: 0.92
      },
      {
        title: '情商',
        content: '情商（Emotional Intelligence，简称EI）是识别、理解和管理自己及他人情绪的能力。高情商的人更善于处理人际关系、应对压力和做出明智决策。',
        category: '能力',
        keywords: ['情商', '情绪', '人际关系', '自我管理', '同理心'],
        confidence: 0.93
      },
      {
        title: '学习能力',
        content: '学习能力是获取知识和技能的能力，包括阅读、记忆、理解、应用等多个方面。在快速变化的时代，持续学习能力尤为重要。',
        category: '能力',
        keywords: ['学习', '知识', '技能', '记忆', '理解'],
        confidence: 0.95
      },
      {
        title: '中国文化',
        content: '中国文化是世界上最古老的文明之一，拥有五千年的历史。包括儒家思想、诗词书画、传统节日、饮食文化等丰富内容，对东亚乃至世界文化都有深远影响。',
        category: '文化',
        keywords: ['中国文化', '儒家', '传统', '历史', '哲学'],
        confidence: 0.97
      },
      {
        title: '互联网',
        content: '互联网是全球范围内的计算机网络系统，连接了数十亿的设备和用户。它改变了人们的沟通、工作、学习和娱乐方式，是现代社会的基础设施。',
        category: '科技',
        keywords: ['互联网', '网络', '信息', '连接', '数据'],
        confidence: 0.98
      },
      {
        title: '大数据',
        content: '大数据是指规模庞大、类型多样的数据集合，传统数据处理方法难以处理。大数据分析可以揭示隐藏的模式和趋势，为决策提供支持。',
        category: '科技',
        keywords: ['大数据', '数据', '分析', '挖掘', '趋势'],
        confidence: 0.94
      },
      {
        title: '云计算',
        content: '云计算是通过互联网提供计算资源（包括服务器、存储、软件等）的服务模式。它使企业和个人能够按需使用计算能力，降低成本并提高灵活性。',
        category: '科技',
        keywords: ['云计算', '云服务', '服务器', '存储', 'AWS'],
        confidence: 0.95
      },
      {
        title: '物联网',
        content: '物联网（IoT）是指连接到互联网的物理设备网络，这些设备可以收集和交换数据。智能家居、智能城市、工业物联网都是物联网的应用领域。',
        category: '科技',
        keywords: ['物联网', 'IoT', '智能设备', '传感器', '连接'],
        confidence: 0.93
      },
      {
        title: '健康生活',
        content: '健康生活方式包括均衡饮食、规律运动、充足睡眠、适度压力管理等。保持健康的生活方式可以预防疾病，提高生活质量和幸福感。',
        category: '健康',
        keywords: ['健康', '饮食', '运动', '睡眠', '养生'],
        confidence: 0.96
      },
      {
        title: '人际关系',
        content: '人际关系是指人与人之间的社会联系，包括亲情、友情、爱情和职场关系等。良好的人际关系需要信任、尊重、沟通和相互支持。',
        category: '社会',
        keywords: ['人际关系', '友情', '爱情', '沟通', '信任'],
        confidence: 0.94
      },
      {
        title: '目标设定',
        content: '目标设定是明确想要实现的结果并制定计划的过程。有效的目标应该是具体、可衡量、可实现、相关和有时限的（SMART原则）。',
        category: '能力',
        keywords: ['目标', '计划', 'SMART', '成功', '成就'],
        confidence: 0.93
      },
      {
        title: '决策能力',
        content: '决策能力是在多个选项中做出选择的能力。良好的决策需要收集信息、分析利弊、考虑后果，并在必要时做出妥协。',
        category: '能力',
        keywords: ['决策', '选择', '分析', '判断', '权衡'],
        confidence: 0.92
      },
      {
        title: '情绪管理',
        content: '情绪管理是识别、理解和调节自己情绪的能力。它包括情绪觉察、情绪表达、情绪调节等技能，有助于保持心理平衡和健康。',
        category: '能力',
        keywords: ['情绪管理', '情绪调节', '压力', '焦虑', '平静'],
        confidence: 0.93
      },
      {
        title: '哲学思考',
        content: '哲学思考是对根本性问题的反思，如人生意义、道德价值、知识本质等。它培养批判性思维和深度思考能力，帮助建立清晰的世界观。',
        category: '人文',
        keywords: ['哲学', '思考', '意义', '价值', '理性'],
        confidence: 0.91
      },
      {
        title: '创新',
        content: '创新是创造新事物或改进现有事物的过程。它可以是技术创新、商业模式创新或社会创新。创新是推动社会进步和经济发展的动力。',
        category: '能力',
        keywords: ['创新', '创造', '改进', '变革', '进步'],
        confidence: 0.94
      },
      {
        title: '团队合作',
        content: '团队合作是多人协作实现共同目标的能力。有效的团队合作需要明确的分工、良好的沟通、相互信任和协作精神。',
        category: '能力',
        keywords: ['团队合作', '协作', '沟通', '信任', '分工'],
        confidence: 0.95
      },
      {
        title: '领导力',
        content: '领导力是影响和引导他人实现目标的能力。优秀的领导者具备愿景、决策能力、沟通能力和激励团队的能力。',
        category: '能力',
        keywords: ['领导力', '领导', '管理', '激励', '愿景'],
        confidence: 0.92
      }
    ];

    this.concepts = [
      {
        name: '人工智能',
        category: '科技',
        description: '模拟人类智能的计算机系统',
        relatedConcepts: ['机器学习', '深度学习', '自然语言处理', '计算机视觉']
      },
      {
        name: '机器学习',
        category: '科技',
        description: '从数据中学习的算法',
        relatedConcepts: ['人工智能', '深度学习', '数据挖掘', '统计']
      },
      {
        name: '创造力',
        category: '能力',
        description: '产生新颖想法的能力',
        relatedConcepts: ['创新', '想象力', '艺术', '设计']
      },
      {
        name: '学习',
        category: '能力',
        description: '获取知识和技能的过程',
        relatedConcepts: ['教育', '培训', '记忆', '实践']
      },
      {
        name: '记忆',
        category: '能力',
        description: '存储和检索信息的能力',
        relatedConcepts: ['学习', '大脑', '认知', '回忆']
      },
      {
        name: '逻辑推理',
        category: '能力',
        description: '基于逻辑规则进行思考',
        relatedConcepts: ['数学', '哲学', '批判性思维', '决策']
      },
      {
        name: '情感理解',
        category: '能力',
        description: '理解和处理情感',
        relatedConcepts: ['情商', '同理心', '沟通', '心理健康']
      },
      {
        name: '沟通',
        category: '能力',
        description: '有效表达和理解',
        relatedConcepts: ['语言', '人际关系', '倾听', '表达']
      },
      {
        name: '健康',
        category: '生活',
        description: '身体和心理的良好状态',
        relatedConcepts: ['运动', '饮食', '睡眠', '心理健康']
      },
      {
        name: '时间',
        category: '概念',
        description: '事件发生的顺序和持续',
        relatedConcepts: ['时间管理', '效率', '计划', '目标']
      }
    ];
  }

  searchKnowledge(query: string): KnowledgeItem[] {
    const lowerQuery = query.toLowerCase();
    const results: { item: KnowledgeItem; score: number }[] = [];

    for (const item of this.knowledgeItems) {
      let score = 0;

      if (item.title.toLowerCase().includes(lowerQuery)) {
        score += 0.5;
      }

      if (item.content.toLowerCase().includes(lowerQuery)) {
        score += 0.3;
      }

      for (const keyword of item.keywords) {
        if (keyword.toLowerCase().includes(lowerQuery) || lowerQuery.includes(keyword.toLowerCase())) {
          score += 0.2;
        }
      }

      if (score > 0) {
        results.push({ item, score: score * item.confidence });
      }
    }

    return results.sort((a, b) => b.score - a.score).map(r => r.item);
  }

  searchConcepts(query: string): Concept[] {
    const lowerQuery = query.toLowerCase();
    return this.concepts.filter(c =>
      c.name.toLowerCase().includes(lowerQuery) ||
      c.description.toLowerCase().includes(lowerQuery) ||
      c.relatedConcepts.some(r => r.toLowerCase().includes(lowerQuery))
    );
  }

  addKnowledgeItem(item: KnowledgeItem): void {
    const existingIndex = this.knowledgeItems.findIndex(i => i.title === item.title);
    if (existingIndex >= 0) {
      this.knowledgeItems[existingIndex] = item;
    } else {
      this.knowledgeItems.push(item);
    }
  }

  getKnowledgeByCategory(category: string): KnowledgeItem[] {
    return this.knowledgeItems.filter(item => item.category === category);
  }

  getAllCategories(): string[] {
    return [...new Set(this.knowledgeItems.map(item => item.category))];
  }

  getRandomKnowledge(): KnowledgeItem {
    const index = Math.floor(Math.random() * this.knowledgeItems.length);
    return this.knowledgeItems[index];
  }

  getKnowledgeStats(): { totalItems: number; categories: number; avgConfidence: number } {
    return {
      totalItems: this.knowledgeItems.length,
      categories: this.getAllCategories().length,
      avgConfidence: this.knowledgeItems.reduce((sum, item) => sum + item.confidence, 0) / this.knowledgeItems.length
    };
  }

  getRelatedConcepts(conceptName: string): Concept[] {
    const concept = this.concepts.find(c => c.name === conceptName);
    if (!concept) return [];

    return this.concepts.filter(c =>
      c.name !== conceptName &&
      (concept.relatedConcepts.includes(c.name) || c.relatedConcepts.includes(conceptName))
    );
  }

  getAllConcepts(): Concept[] {
    return [...this.concepts];
  }
}

export const unifiedKnowledgeBase = new UnifiedKnowledgeBase();
export const knowledgeBase = unifiedKnowledgeBase;
