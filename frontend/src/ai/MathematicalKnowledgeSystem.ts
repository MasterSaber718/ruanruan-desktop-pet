/**
 * ============================================================================
 * 数学知识体系 - MathematicalKnowledgeSystem
 * ============================================================================
 *
 * 构建完整的数学知识框架，供数字生命学习和推理使用
 */

export interface MathematicalConcept {
  id: string;
  name: string;
  category: MathCategory;
  description: string;
  formula?: string;
  prerequisites: string[];
  applications: string[];
  difficulty: number;
  examples: string[];
}

export type MathCategory =
  | 'arithmetic'
  | 'algebra'
  | 'geometry'
  | 'calculus'
  | 'linear_algebra'
  | 'probability'
  | 'statistics'
  | 'number_theory'
  | 'logic'
  | 'set_theory'
  | 'topology'
  | 'analysis'
  | 'abstract_algebra';

export interface MathematicalProof {
  theorem: string;
  proof: string;
  steps: string[];
  difficulty: number;
}

export interface Formula {
  name: string;
  expression: string;
  variables: { symbol: string; description: string }[];
  conditions?: string;
  derivation?: string;
}

export class MathematicalKnowledgeSystem {
  private concepts: Map<string, MathematicalConcept>;
  private formulas: Map<string, Formula>;
  private learningProgress: Map<string, number>;
  private understandingDepth: Map<string, number>;

  constructor() {
    this.concepts = new Map();
    this.formulas = new Map();
    this.learningProgress = new Map();
    this.understandingDepth = new Map();
    this.initializeMathematicalKnowledge();
  }

  private initializeMathematicalKnowledge(): void {
    this.initializeArithmetic();
    this.initializeAlgebra();
    this.initializeGeometry();
    this.initializeCalculus();
    this.initializeLinearAlgebra();
    this.initializeProbability();
    this.initializeStatistics();
    this.initializeNumberTheory();
    this.initializeLogic();
    this.initializeFormulas();
  }

  private initializeArithmetic(): void {
    const concepts: MathematicalConcept[] = [
      {
        id: 'natural_numbers',
        name: '自然数',
        category: 'arithmetic',
        description: '用于计数的数：1, 2, 3, 4, ...',
        prerequisites: [],
        applications: ['计数', '排序', '基础运算'],
        difficulty: 1,
        examples: ['1 + 1 = 2', '5 × 3 = 15']
      },
      {
        id: 'integer_operations',
        name: '整数运算',
        category: 'arithmetic',
        description: '包括加减乘除的完整整数运算',
        prerequisites: ['natural_numbers'],
        applications: ['财务管理', '温度计算', '坐标系统'],
        difficulty: 2,
        examples: ['-3 + 5 = 2', '(-2) × (-4) = 8']
      },
      {
        id: 'fractions',
        name: '分数',
        category: 'arithmetic',
        description: '表示整体一部分的数',
        prerequisites: ['integer_operations'],
        applications: ['分配问题', '比例计算', '概率'],
        difficulty: 3,
        examples: ['1/2 + 1/4 = 3/4', '(2/3) × (3/4) = 1/2']
      },
      {
        id: 'exponents',
        name: '指数',
        category: 'arithmetic',
        description: '表示重复乘法的数学运算',
        prerequisites: ['integer_operations'],
        applications: ['复利计算', '科学计数法', '增长模型'],
        difficulty: 3,
        examples: ['2^10 = 1024', '10^(-3) = 0.001']
      },
      {
        id: 'roots_radicals',
        name: '根与根式',
        category: 'arithmetic',
        description: '指数的逆运算',
        prerequisites: ['exponents'],
        applications: ['勾股定理', '二次方程', '信号处理'],
        difficulty: 4,
        examples: ['√16 = 4', '∛27 = 3', '√2 ≈ 1.414']
      }
    ];

    concepts.forEach(c => this.concepts.set(c.id, c));
  }

  private initializeAlgebra(): void {
    const concepts: MathematicalConcept[] = [
      {
        id: 'linear_equations',
        name: '线性方程',
        category: 'algebra',
        description: '未知数次数为1的方程',
        prerequisites: ['integer_operations'],
        applications: ['求解未知量', '经济学模型', '物理定律'],
        difficulty: 2,
        examples: ['2x + 3 = 7 → x = 2', 'y = 3x + 1']
      },
      {
        id: 'quadratic_equations',
        name: '二次方程',
        category: 'algebra',
        description: '未知数最高次数为2的方程',
        prerequisites: ['linear_equations', 'roots_radicals'],
        applications: ['抛物线运动', '优化问题', '信号处理'],
        difficulty: 4,
        examples: ['x² - 5x + 6 = 0 → x = 2 或 x = 3']
      },
      {
        id: 'polynomial',
        name: '多项式',
        category: 'algebra',
        description: '由常数和变量的乘积、求和组成的表达式',
        prerequisites: ['linear_equations'],
        applications: ['函数逼近', '信号编码', '密码学'],
        difficulty: 4,
        examples: ['x³ - 2x² + x - 1', '(x+1)(x-1) = x² - 1']
      },
      {
        id: 'systems_of_equations',
        name: '方程组',
        category: 'algebra',
        description: '多个方程组成的系统',
        prerequisites: ['linear_equations'],
        applications: ['资源分配', '电路分析', '经济均衡'],
        difficulty: 5,
        examples: ['2x + y = 5; x - y = 1 → x = 2, y = 1']
      },
      {
        id: 'inequalities',
        name: '不等式',
        category: 'algebra',
        description: '表示大小关系的数学语句',
        prerequisites: ['linear_equations'],
        applications: ['优化', '约束条件', '区间分析'],
        difficulty: 3,
        examples: ['x + 3 > 5 → x > 2', '-2 ≤ x < 4']
      },
      {
        id: 'functions',
        name: '函数',
        category: 'algebra',
        description: '输入与输出之间的对应关系',
        prerequisites: ['linear_equations'],
        applications: ['建模', '预测', '变换'],
        difficulty: 4,
        examples: ['f(x) = x²', 'g(x) = sin(x)', 'h(x) = eˣ']
      }
    ];

    concepts.forEach(c => this.concepts.set(c.id, c));
  }

  private initializeGeometry(): void {
    const concepts: MathematicalConcept[] = [
      {
        id: 'pythagorean_theorem',
        name: '勾股定理',
        category: 'geometry',
        description: '直角三角形两直角边的平方和等于斜边的平方',
        formula: 'a² + b² = c²',
        prerequisites: ['exponents', 'roots_radicals'],
        applications: ['距离计算', '建筑设计', '导航'],
        difficulty: 3,
        examples: ['3² + 4² = 5² (3-4-5直角三角形)']
      },
      {
        id: 'circles',
        name: '圆',
        category: 'geometry',
        description: '平面上到定点距离相等的点的集合',
        prerequisites: ['roots_radicals'],
        applications: ['工程设计', '天文学', '机械设计'],
        difficulty: 3,
        examples: ['面积 = πr²', '周长 = 2πr']
      },
      {
        id: 'triangles',
        name: '三角形',
        category: 'geometry',
        description: '三条直线段围成的封闭图形',
        prerequisites: ['pythagorean_theorem'],
        applications: ['测量', '建筑', '计算机图形学'],
        difficulty: 4,
        examples: ['正弦定理: a/sin(A) = b/sin(B) = c/sin(C)']
      },
      {
        id: 'coordinate_geometry',
        name: '坐标几何',
        category: 'geometry',
        description: '用代数方法研究几何图形',
        prerequisites: ['linear_equations'],
        applications: ['GPS定位', '计算机图形', '物理模拟'],
        difficulty: 4,
        examples: ['两点距离: d = √[(x₂-x₁)² + (y₂-y₁)²]']
      },
      {
        id: 'transformations',
        name: '几何变换',
        category: 'geometry',
        description: '平移、旋转、缩放、反射等操作',
        prerequisites: ['coordinate_geometry'],
        applications: ['计算机图形', '图像处理', '动画'],
        difficulty: 4,
        examples: ['旋转矩阵', '缩放变换', '仿射变换']
      }
    ];

    concepts.forEach(c => this.concepts.set(c.id, c));
  }

  private initializeCalculus(): void {
    const concepts: MathematicalConcept[] = [
      {
        id: 'limits',
        name: '极限',
        category: 'calculus',
        description: '函数或序列趋近的值',
        prerequisites: ['functions', 'exponents'],
        applications: ['连续性分析', '级数收敛', '微分基础'],
        difficulty: 5,
        examples: ['lim(x→0) sin(x)/x = 1', 'lim(x→∞) (1+1/x)ˣ = e']
      },
      {
        id: 'derivatives',
        name: '导数',
        category: 'calculus',
        description: '函数在某一点的变化率',
        formula: "f'(x) = lim(h→0) [f(x+h) - f(x)] / h",
        prerequisites: ['limits'],
        applications: ['速度加速度', '优化问题', '曲线分析'],
        difficulty: 6,
        examples: ["d/dx(x²) = 2x", "d/dx(sin(x)) = cos(x)"]
      },
      {
        id: 'integrals',
        name: '积分',
        category: 'calculus',
        description: '导数的逆运算，表示面积和累积量',
        prerequisites: ['derivatives'],
        applications: ['面积计算', '概率分布', '物理学'],
        difficulty: 6,
        examples: ['∫x²dx = x³/3 + C', '∫eˣdx = eˣ + C']
      },
      {
        id: 'chain_rule',
        name: '链式法则',
        category: 'calculus',
        description: '复合函数求导的法则',
        prerequisites: ['derivatives'],
        applications: ['复杂函数求导', '神经网络', '微分方程'],
        difficulty: 6,
        examples: ["d/dx[f(g(x))] = f'(g(x)) · g'(x)"]
      },
      {
        id: 'differential_equations',
        name: '微分方程',
        category: 'calculus',
        description: '包含未知函数及其导数的方程',
        prerequisites: ['derivatives', 'integrals'],
        applications: ['物理建模', '人口模型', '电路分析'],
        difficulty: 8,
        examples: ["dy/dx = ky → y = Ceᵏˣ", "d²y/dx² + y = 0"]
      }
    ];

    concepts.forEach(c => this.concepts.set(c.id, c));
  }

  private initializeLinearAlgebra(): void {
    const concepts: MathematicalConcept[] = [
      {
        id: 'vectors',
        name: '向量',
        category: 'linear_algebra',
        description: '具有大小和方向的量',
        prerequisites: ['coordinate_geometry'],
        applications: ['力分析', '计算机图形', '机器学习'],
        difficulty: 4,
        examples: ['v = (3, 4)', '||v|| = 5', 'v · w = |v||w|cos(θ)']
      },
      {
        id: 'matrices',
        name: '矩阵',
        category: 'linear_algebra',
        description: '按行列排列的数表',
        prerequisites: ['vectors'],
        applications: ['线性变换', '数据处理', '量子计算'],
        difficulty: 5,
        examples: ['A = [[1,2],[3,4]]', 'det(A) = ad - bc']
      },
      {
        id: 'matrix_operations',
        name: '矩阵运算',
        category: 'linear_algebra',
        description: '矩阵的加减乘除和转置',
        prerequisites: ['matrices'],
        applications: ['线性方程组', '坐标变换', '神经网络'],
        difficulty: 5,
        examples: ['AB ≠ BA', '(AB)ᵀ = BᵀAᵀ', 'A⁻¹A = I']
      },
      {
        id: 'eigenvalues',
        name: '特征值与特征向量',
        category: 'linear_algebra',
        description: '满足Av = λv的标量λ和向量v',
        prerequisites: ['matrices'],
        applications: ['主成分分析', '稳定性分析', '量子力学'],
        difficulty: 8,
        examples: ['det(A - λI) = 0', 'PCA降维']
      }
    ];

    concepts.forEach(c => this.concepts.set(c.id, c));
  }

  private initializeProbability(): void {
    const concepts: MathematicalConcept[] = [
      {
        id: 'basic_probability',
        name: '基本概率',
        category: 'probability',
        description: '事件发生的可能性度量',
        prerequisites: ['fractions', 'sets'],
        applications: ['天气预报', '游戏设计', '风险评估'],
        difficulty: 3,
        examples: ['P(A) = 事件A发生数 / 总事件数']
      },
      {
        id: 'conditional_probability',
        name: '条件概率',
        category: 'probability',
        description: '在已知某事件发生的条件下，另一事件发生的概率',
        prerequisites: ['basic_probability'],
        applications: ['医学诊断', '机器学习', '推荐系统'],
        difficulty: 5,
        examples: ['P(A|B) = P(A∩B) / P(B)']
      },
      {
        id: 'bayes_theorem',
        name: '贝叶斯定理',
        category: 'probability',
        description: '根据新证据更新概率的公式',
        prerequisites: ['conditional_probability'],
        applications: ['垃圾邮件过滤', '医学诊断', '人工智能'],
        difficulty: 6,
        examples: ['P(H|E) = P(E|H)·P(H) / P(E)']
      },
      {
        id: 'random_variables',
        name: '随机变量',
        category: 'probability',
        description: '取值为随机事件结果的变量',
        prerequisites: ['basic_probability'],
        applications: ['统计分析', '金融模型', '信号处理'],
        difficulty: 5,
        examples: ['X ~ N(μ, σ²)', 'E[X] = μ', 'Var(X) = σ²']
      },
      {
        id: 'distributions',
        name: '概率分布',
        category: 'probability',
        description: '随机变量取值的概率规律',
        prerequisites: ['random_variables'],
        applications: ['统计学', '物理学', '金融工程'],
        difficulty: 6,
        examples: ['正态分布: f(x) = e^(-(x-μ)²/(2σ²)) / (σ√(2π))']
      }
    ];

    concepts.forEach(c => this.concepts.set(c.id, c));
  }

  private initializeStatistics(): void {
    const concepts: MathematicalConcept[] = [
      {
        id: 'descriptive_stats',
        name: '描述性统计',
        category: 'statistics',
        description: '总结和描述数据特征的统计量',
        prerequisites: ['basic_probability'],
        applications: ['数据报告', '质量控制', '市场分析'],
        difficulty: 3,
        examples: ['均值μ', '标准差σ', '中位数', '众数']
      },
      {
        id: 'hypothesis_testing',
        name: '假设检验',
        category: 'statistics',
        description: '用样本数据检验关于总体的假设',
        prerequisites: ['distributions'],
        applications: ['科学实验', '质量检测', '医学研究'],
        difficulty: 7,
        examples: ['Z检验', 't检验', 'p值 < 0.05']
      },
      {
        id: 'regression',
        name: '回归分析',
        category: 'statistics',
        description: '研究变量之间关系的统计方法',
        prerequisites: ['linear_equations', 'descriptive_stats'],
        applications: ['预测模型', '趋势分析', '机器学习'],
        difficulty: 6,
        examples: ['y = β₀ + β₁x + ε', 'R²决定系数']
      },
      {
        id: 'correlation',
        name: '相关性',
        category: 'statistics',
        description: '两个变量之间关系的强度和方向',
        prerequisites: ['descriptive_stats'],
        applications: ['变量关系分析', '特征选择', '因果推断'],
        difficulty: 4,
        examples: ['r = Cov(X,Y) / (σₓσᵧ)', 'r ∈ [-1, 1]']
      }
    ];

    concepts.forEach(c => this.concepts.set(c.id, c));
  }

  private initializeNumberTheory(): void {
    const concepts: MathematicalConcept[] = [
      {
        id: 'prime_numbers',
        name: '质数',
        category: 'number_theory',
        description: '只能被1和自身整除的大于1的自然数',
        prerequisites: ['natural_numbers'],
        applications: ['密码学', '哈希函数', '数论研究'],
        difficulty: 4,
        examples: ['2, 3, 5, 7, 11, 13, 17...', '质数无限多']
      },
      {
        id: 'modular_arithmetic',
        name: '模运算',
        category: 'number_theory',
        description: '关于余数的数学系统',
        prerequisites: ['integer_operations'],
        applications: ['密码学', '时间计算', '循环系统'],
        difficulty: 5,
        examples: ['17 mod 5 = 2', 'a ≡ b (mod n)']
      },
      {
        id: 'gcd_lcm',
        name: '最大公约数与最小公倍数',
        category: 'number_theory',
        description: '两个整数的最大共同除数和最小共同倍数',
        prerequisites: ['prime_numbers'],
        applications: ['分数约分', '音乐节奏', '日程安排'],
        difficulty: 3,
        examples: ['gcd(12, 18) = 6', 'lcm(4, 6) = 12']
      },
      {
        id: 'fermats_last_theorem',
        name: '费马大定理',
        category: 'number_theory',
        description: '当n>2时，xⁿ + yⁿ = zⁿ无正整数解',
        prerequisites: ['exponents', 'proofs'],
        applications: ['数论研究', '数学史'],
        difficulty: 10,
        examples: ['x³ + y³ = z³ 无正整数解']
      }
    ];

    concepts.forEach(c => this.concepts.set(c.id, c));
  }

  private initializeLogic(): void {
    const concepts: MathematicalConcept[] = [
      {
        id: 'propositional_logic',
        name: '命题逻辑',
        category: 'logic',
        description: '研究命题及其逻辑联结的学科',
        prerequisites: [],
        applications: ['电路设计', '程序验证', '人工智能'],
        difficulty: 3,
        examples: ['P ∧ Q', 'P ∨ Q', '¬P', 'P → Q']
      },
      {
        id: 'predicates',
        name: '谓词逻辑',
        category: 'logic',
        description: '包含变量的逻辑表达式',
        prerequisites: ['propositional_logic'],
        applications: ['数学证明', '知识表示', '自动推理'],
        difficulty: 5,
        examples: ['∀x P(x)', '∃x Q(x)', 'P(x) → Q(x)']
      },
      {
        id: 'proof_methods',
        name: '证明方法',
        category: 'logic',
        description: '数学证明的不同策略和技术',
        prerequisites: ['propositional_logic'],
        applications: ['数学研究', '计算机科学', '哲学'],
        difficulty: 6,
        examples: ['直接证明', '反证法', '数学归纳法']
      }
    ];

    concepts.forEach(c => this.concepts.set(c.id, c));
  }

  private initializeFormulas(): void {
    const formulas: Formula[] = [
      { name: '求根公式', expression: 'x = (-b ± √(b²-4ac)) / 2a', variables: [
        { symbol: 'a', description: '二次项系数' },
        { symbol: 'b', description: '一次项系数' },
        { symbol: 'c', description: '常数项' }
      ], conditions: 'b²-4ac ≥ 0' },
      { name: '欧拉公式', expression: 'e^(iπ) + 1 = 0', variables: [
        { symbol: 'e', description: '自然常数' },
        { symbol: 'i', description: '虚数单位' },
        { symbol: 'π', description: '圆周率' }
      ]},
      { name: '正弦定理', expression: 'a/sin(A) = b/sin(B) = c/sin(C) = 2R', variables: [
        { symbol: 'a,b,c', description: '三角形边长' },
        { symbol: 'A,B,C', description: '对应的角' },
        { symbol: 'R', description: '外接圆半径' }
      ]},
      { name: '余弦定理', expression: 'c² = a² + b² - 2ab·cos(C)', variables: [
        { symbol: 'a,b,c', description: '三角形边长' },
        { symbol: 'C', description: '边c对应的角' }
      ]},
      { name: '对数恒等式', expression: 'log(ab) = log(a) + log(b)', variables: [
        { symbol: 'a,b', description: '正实数' }
      ]},
      { name: ' Stirling公式', expression: 'n! ≈ √(2πn)·(n/e)ⁿ', variables: [
        { symbol: 'n', description: '自然数' }
      ], conditions: 'n较大时近似精确' },
      { name: '斐波那契数列通项', expression: 'F(n) = (φⁿ - (1-φ)ⁿ) / √5', variables: [
        { symbol: 'φ', description: '黄金比例 ≈ 1.618' }
      ]},
      { name: '泰勒展开', expression: 'f(x) = Σ f⁽ⁿ⁾(a)/n! · (x-a)ⁿ', variables: [
        { symbol: 'f⁽ⁿ⁾', description: 'n阶导数' },
        { symbol: 'a', description: '展开点' }
      ], conditions: '函数在各阶导数存在时' }
    ];

    formulas.forEach(f => this.formulas.set(f.name, f));
  }

  /**
   * 获取概念
   */
  getConcept(id: string): MathematicalConcept | undefined {
    return this.concepts.get(id);
  }

  /**
   * 按类别获取概念
   */
  getConceptsByCategory(category: MathCategory): MathematicalConcept[] {
    return Array.from(this.concepts.values()).filter(c => c.category === category);
  }

  /**
   * 获取所有类别
   */
  getCategories(): MathCategory[] {
    return Array.from(new Set(Array.from(this.concepts.values()).map(c => c.category)));
  }

  /**
   * 搜索概念
   */
  searchConcepts(query: string): MathematicalConcept[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.concepts.values()).filter(c =>
      c.name.toLowerCase().includes(lowerQuery) ||
      c.description.toLowerCase().includes(lowerQuery) ||
      c.applications.some(a => a.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * 获取公式
   */
  getFormula(name: string): Formula | undefined {
    return this.formulas.get(name);
  }

  /**
   * 获取所有公式
   */
  getAllFormulas(): Formula[] {
    return Array.from(this.formulas.values());
  }

  /**
   * 学习概念
   */
  learnConcept(conceptId: string, depth: number = 1): void {
    const current = this.learningProgress.get(conceptId) || 0;
    this.learningProgress.set(conceptId, Math.min(1, current + 0.1 * depth));

    const currentDepth = this.understandingDepth.get(conceptId) || 0;
    this.understandingDepth.set(conceptId, Math.min(10, currentDepth + depth));
  }

  /**
   * 获取学习进度
   */
  getLearningProgress(conceptId: string): number {
    return this.learningProgress.get(conceptId) || 0;
  }

  /**
   * 获取理解深度
   */
  getUnderstandingDepth(conceptId: string): number {
    return this.understandingDepth.get(conceptId) || 0;
  }

  /**
   * 检查先修知识
   */
  hasPrerequisites(conceptId: string): boolean {
  const concept = this.concepts.get(conceptId);
  if (!concept) return false;

  return concept.prerequisites.every(prereq => {
    const progress = this.learningProgress.get(prereq);
    return progress !== undefined && progress >= 0.5;
  });
}

  /**
   * 获取可以学习的下一个概念
   */
  getNextLearnableConcepts(): MathematicalConcept[] {
    return Array.from(this.concepts.values())
      .filter(c => {
        const progress = this.learningProgress.get(c.id) || 0;
        const hasPrereqs = this.hasPrerequisites(c.id);
        return progress < 0.5 && hasPrereqs;
      })
      .sort((a, b) => a.difficulty - b.difficulty);
  }

  /**
   * 获取知识统计
   */
  getStatistics(): {
    totalConcepts: number;
    learnedConcepts: number;
    averageProgress: number;
    categoryDistribution: Record<string, number>;
    formulasCount: number;
  } {
    const concepts = Array.from(this.concepts.values());
    const learned = concepts.filter(c => (this.learningProgress.get(c.id) || 0) >= 0.5).length;
    const totalProgress = concepts.reduce((sum, c) => sum + (this.learningProgress.get(c.id) || 0), 0);

    const categoryDist: Record<string, number> = {};
    concepts.forEach(c => {
      categoryDist[c.category] = (categoryDist[c.category] || 0) + 1;
    });

    return {
      totalConcepts: concepts.length,
      learnedConcepts: learned,
      averageProgress: totalProgress / concepts.length,
      categoryDistribution: categoryDist,
      formulasCount: this.formulas.size
    };
  }
}

export const mathematicalKnowledge = new MathematicalKnowledgeSystem();