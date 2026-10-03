/**
 * ============================================================================
 * 物理知识体系 - PhysicsKnowledgeSystem
 * ============================================================================
 *
 * 构建完整的物理学知识框架
 */

export interface PhysicalLaw {
  id: string;
  name: string;
  category: PhysicsCategory;
  description: string;
  formula: string;
  variables: { symbol: string; name: string; unit: string }[];
  conditions?: string;
  discoveredBy?: string;
  year?: number;
}

export interface PhysicalConstant {
  name: string;
  symbol: string;
  value: string;
  unit: string;
  description: string;
}

export type PhysicsCategory =
  | 'mechanics'
  | 'thermodynamics'
  | 'electromagnetism'
  | 'optics'
  | 'wave_theory'
  | 'relativity'
  | 'quantum_mechanics'
  | 'nuclear_physics'
  | 'astrophysics'
  | 'statistical_mechanics';

export class PhysicsKnowledgeSystem {
  private laws: Map<string, PhysicalLaw>;
  private constants: Map<string, PhysicalConstant>;
  private learnedLaws: Set<string>;
  private understandingLevel: Map<string, number>;

  constructor() {
    this.laws = new Map();
    this.constants = new Map();
    this.learnedLaws = new Set();
    this.understandingLevel = new Map();
    this.initializePhysicsKnowledge();
  }

  private initializePhysicsKnowledge(): void {
    this.initializeMechanics();
    this.initializeThermodynamics();
    this.initializeElectromagnetism();
    this.initializeOptics();
    this.initializeRelativity();
    this.initializeQuantumMechanics();
    this.initializeConstants();
  }

  private initializeMechanics(): void {
    const laws: PhysicalLaw[] = [
      {
        id: 'newton_first',
        name: '牛顿第一定律（惯性定律）',
        category: 'mechanics',
        description: '一切物体在没有受到外力作用时，总保持静止状态或匀速直线运动状态',
        formula: 'F = 0 → v = 恒定',
        variables: [
          { symbol: 'F', name: '外力', unit: 'N（牛顿）' },
          { symbol: 'v', name: '速度', unit: 'm/s' }
        ]
      },
      {
        id: 'newton_second',
        name: '牛顿第二定律',
        category: 'mechanics',
        description: '物体的加速度与受到的外力成正比，与物体质量成反比',
        formula: 'F = ma',
        variables: [
          { symbol: 'F', name: '外力', unit: 'N' },
          { symbol: 'm', name: '质量', unit: 'kg' },
          { symbol: 'a', name: '加速度', unit: 'm/s²' }
        ]
      },
      {
        id: 'newton_third',
        name: '牛顿第三定律',
        category: 'mechanics',
        description: '两个物体之间的作用力和反作用力大小相等、方向相反、作用在同一直线上',
        formula: 'F₁₂ = -F₂₁',
        variables: [
          { symbol: 'F₁₂', name: '物体1对物体2的作用力', unit: 'N' },
          { symbol: 'F₂₁', name: '物体2对物体1的反作用力', unit: 'N' }
        ]
      },
      {
        id: 'universal_gravitation',
        name: '万有引力定律',
        category: 'mechanics',
        description: '任意两个物体之间都存在相互吸引的力，大小与两物体质量乘积成正比，与距离平方成反比',
        formula: 'F = Gm₁m₂/r²',
        variables: [
          { symbol: 'G', name: '万有引力常数', unit: '6.674×10⁻¹¹ N·m²/kg²' },
          { symbol: 'm₁, m₂', name: '两物体质量', unit: 'kg' },
          { symbol: 'r', name: '两物体间距离', unit: 'm' }
        ],
        discoveredBy: '艾萨克·牛顿',
        year: 1687
      },
      {
        id: 'momentum',
        name: '动量守恒定律',
        category: 'mechanics',
        description: '在一个孤立系统中，系统总动量保持不变',
        formula: 'Σpᵢ = 恒定, p = mv',
        variables: [
          { symbol: 'p', name: '动量', unit: 'kg·m/s' },
          { symbol: 'm', name: '质量', unit: 'kg' },
          { symbol: 'v', name: '速度', unit: 'm/s' }
        ]
      },
      {
        id: 'energy_conservation',
        name: '能量守恒定律',
        category: 'mechanics',
        description: '能量既不会凭空产生，也不会凭空消失，只能从一种形式转化为另一种形式',
        formula: 'E总 = 恒定',
        variables: [
          { symbol: 'E', name: '能量', unit: 'J（焦耳）' }
        ]
      },
      {
        id: 'kinetic_energy',
        name: '动能',
        category: 'mechanics',
        description: '物体由于运动而具有的能量',
        formula: 'Ek = ½mv²',
        variables: [
          { symbol: 'Ek', name: '动能', unit: 'J' },
          { symbol: 'm', name: '质量', unit: 'kg' },
          { symbol: 'v', name: '速度', unit: 'm/s' }
        ]
      },
      {
        id: 'potential_energy',
        name: '重力势能',
        category: 'mechanics',
        description: '物体由于高度而具有的势能',
        formula: 'Ep = mgh',
        variables: [
          { symbol: 'Ep', name: '重力势能', unit: 'J' },
          { symbol: 'm', name: '质量', unit: 'kg' },
          { symbol: 'g', name: '重力加速度', unit: '9.8 m/s²' },
          { symbol: 'h', name: '高度', unit: 'm' }
        ]
      },
      {
        id: 'work',
        name: '功',
        category: 'mechanics',
        description: '力与物体在力方向上位移的乘积',
        formula: 'W = Fd·cosθ',
        variables: [
          { symbol: 'W', name: '功', unit: 'J' },
          { symbol: 'F', name: '力', unit: 'N' },
          { symbol: 'd', name: '位移', unit: 'm' },
          { symbol: 'θ', name: '力与位移夹角', unit: 'rad或°' }
        ]
      },
      {
        id: 'power',
        name: '功率',
        category: 'mechanics',
        description: '单位时间内完成的功',
        formula: 'P = W/t = Fv',
        variables: [
          { symbol: 'P', name: '功率', unit: 'W（瓦特）' },
          { symbol: 'W', name: '功', unit: 'J' },
          { symbol: 't', name: '时间', unit: 's' }
        ]
      },
      {
        id: 'simple_harmonic_motion',
        name: '简谐运动',
        category: 'mechanics',
        description: '物体在平衡位置附近来回运动，加速度与位移成正比',
        formula: 'a = -ω²x, x = A·cos(ωt + φ)',
        variables: [
          { symbol: 'A', name: '振幅', unit: 'm' },
          { symbol: 'ω', name: '角频率', unit: 'rad/s' },
          { symbol: 'φ', name: '初相位', unit: 'rad' }
        ]
      },
      {
        id: 'centripetal_force',
        name: '向心力',
        category: 'mechanics',
        description: '使物体做圆周运动的指向圆心的力',
        formula: 'F = mv²/r = mω²r',
        variables: [
          { symbol: 'F', name: '向心力', unit: 'N' },
          { symbol: 'm', name: '质量', unit: 'kg' },
          { symbol: 'v', name: '线速度', unit: 'm/s' },
          { symbol: 'r', name: '轨道半径', unit: 'm' }
        ]
      }
    ];

    laws.forEach(l => this.laws.set(l.id, l));
  }

  private initializeThermodynamics(): void {
    const laws: PhysicalLaw[] = [
      {
        id: 'zeroth_law',
        name: '热力学第零定律',
        category: 'thermodynamics',
        description: '如果两个系统分别与第三个系统达到热平衡，则这两个系统也彼此热平衡',
        formula: '若 A≌C 且 B≌C，则 A≌B',
        variables: []
      },
      {
        id: 'first_law',
        name: '热力学第一定律（能量守恒）',
        category: 'thermodynamics',
        description: '系统内能的增加等于外界对系统做的功加上系统吸收的热量',
        formula: 'ΔU = Q - W',
        variables: [
          { symbol: 'ΔU', name: '内能变化', unit: 'J' },
          { symbol: 'Q', name: '吸收的热量', unit: 'J' },
          { symbol: 'W', name: '对外做的功', unit: 'J' }
        ],
        discoveredBy: '鲁道夫·克劳修斯',
        year: 1850
      },
      {
        id: 'second_law',
        name: '热力学第二定律',
        category: 'thermodynamics',
        description: '热量不能自发地从低温物体传递到高温物体',
        formula: 'ΔS ≥ 0',
        variables: [
          { symbol: 'S', name: '熵', unit: 'J/K' }
        ],
        discoveredBy: '鲁道夫·克劳修斯',
        year: 1865
      },
      {
        id: 'third_law',
        name: '热力学第三定律',
        category: 'thermodynamics',
        description: '绝对零度不可能达到，只能无限接近',
        formula: 'T → 0K 时，S → S₀（常数）',
        variables: [
          { symbol: 'T', name: '温度', unit: 'K' },
          { symbol: 'S', name: '熵', unit: 'J/K' }
        ],
        discoveredBy: '瓦尔特·能斯特',
        year: 1906
      },
      {
        id: 'ideal_gas_law',
        name: '理想气体状态方程',
        category: 'thermodynamics',
        description: '理想气体状态参量之间的定量关系',
        formula: 'PV = nRT',
        variables: [
          { symbol: 'P', name: '压强', unit: 'Pa' },
          { symbol: 'V', name: '体积', unit: 'm³' },
          { symbol: 'n', name: '物质的量', unit: 'mol' },
          { symbol: 'R', name: '气体常数', unit: '8.314 J/(mol·K)' },
          { symbol: 'T', name: '温度', unit: 'K' }
        ],
        discoveredBy: '埃米·克拉佩龙',
        year: 1834
      },
      {
        id: 'heat_capacity',
        name: '热容',
        category: 'thermodynamics',
        description: '物体温度升高1K所需吸收的热量',
        formula: 'Q = mcΔT',
        variables: [
          { symbol: 'Q', name: '热量', unit: 'J' },
          { symbol: 'm', name: '质量', unit: 'kg' },
          { symbol: 'c', name: '比热容', unit: 'J/(kg·K)' },
          { symbol: 'ΔT', name: '温度变化', unit: 'K' }
        ]
      }
    ];

    laws.forEach(l => this.laws.set(l.id, l));
  }

  private initializeElectromagnetism(): void {
    const laws: PhysicalLaw[] = [
      {
        id: 'coulomb_law',
        name: '库仑定律',
        category: 'electromagnetism',
        description: '两个静止点电荷之间的相互作用力与它们电量乘积成正比，与距离平方成反比',
        formula: 'F = kq₁q₂/r²',
        variables: [
          { symbol: 'k', name: '静电常数', unit: '8.99×10⁹ N·m²/C²' },
          { symbol: 'q', name: '电荷量', unit: 'C（库仑）' },
          { symbol: 'r', name: '距离', unit: 'm' }
        ],
        discoveredBy: '查尔斯·库仑',
        year: 1785
      },
      {
        id: 'electric_field',
        name: '电场强度',
        category: 'electromagnetism',
        description: '单位正电荷在电场中某点所受的电场力',
        formula: 'E = F/q = kQ/r²',
        variables: [
          { symbol: 'E', name: '电场强度', unit: 'N/C 或 V/m' },
          { symbol: 'F', name: '电场力', unit: 'N' },
          { symbol: 'q', name: '试探电荷', unit: 'C' }
        ]
      },
      {
        id: 'ohms_law',
        name: '欧姆定律',
        category: 'electromagnetism',
        description: '通过导体的电流与导体两端电压成正比',
        formula: 'V = IR',
        variables: [
          { symbol: 'V', name: '电压', unit: 'V（伏特）' },
          { symbol: 'I', name: '电流', unit: 'A（安培）' },
          { symbol: 'R', name: '电阻', unit: 'Ω（欧姆）' }
        ],
        discoveredBy: '乔治·欧姆',
        year: 1827
      },
      {
        id: 'magnetic_field',
        name: '磁感应强度',
        category: 'electromagnetism',
        description: '描述磁场强弱和方向的物理量',
        formula: 'B = F/(IL)',
        variables: [
          { symbol: 'B', name: '磁感应强度', unit: 'T（特斯拉）' },
          { symbol: 'F', name: '安培力', unit: 'N' },
          { symbol: 'I', name: '电流', unit: 'A' },
          { symbol: 'L', name: '导线长度', unit: 'm' }
        ]
      },
      {
        id: 'faraday_law',
        name: '法拉第电磁感应定律',
        category: 'electromagnetism',
        description: '闭合电路中磁通量变化产生的感应电动势与磁通量变化率成正比',
        formula: 'ε = -dΦ/dt',
        variables: [
          { symbol: 'ε', name: '感应电动势', unit: 'V' },
          { symbol: 'Φ', name: '磁通量', unit: 'Wb' },
          { symbol: 't', name: '时间', unit: 's' }
        ],
        discoveredBy: '迈克尔·法拉第',
        year: 1831
      },
      {
        id: 'maxwell_equations',
        name: '麦克斯韦方程组',
        category: 'electromagnetism',
        description: '描述电场、磁场与电荷、电流之间关系的四个基本方程',
        formula: '∇·E = ρ/ε₀, ∇×E = -∂B/∂t, ∇·B = 0, ∇×B = μ₀J + μ₀ε₀∂E/∂t',
        variables: [
          { symbol: 'E', name: '电场', unit: 'V/m' },
          { symbol: 'B', name: '磁场', unit: 'T' },
          { symbol: 'ρ', name: '电荷密度', unit: 'C/m³' },
          { symbol: 'J', name: '电流密度', unit: 'A/m²' }
        ],
        discoveredBy: '詹姆斯·麦克斯韦',
        year: 1865
      },
      {
        id: 'electric_power',
        name: '电功率',
        category: 'electromagnetism',
        description: '电流做功的功率',
        formula: 'P = UI = I²R = U²/R',
        variables: [
          { symbol: 'P', name: '电功率', unit: 'W' },
          { symbol: 'U', name: '电压', unit: 'V' },
          { symbol: 'I', name: '电流', unit: 'A' },
          { symbol: 'R', name: '电阻', unit: 'Ω' }
        ]
      }
    ];

    laws.forEach(l => this.laws.set(l.id, l));
  }

  private initializeOptics(): void {
    const laws: PhysicalLaw[] = [
      {
        id: 'law_of_reflection',
        name: '光的反射定律',
        category: 'optics',
        description: '反射光线、入射光线和法线在同一平面内，反射角等于入射角',
        formula: 'θᵣ = θᵢ',
        variables: [
          { symbol: 'θᵢ', name: '入射角', unit: '° 或 rad' },
          { symbol: 'θᵣ', name: '反射角', unit: '° 或 rad' }
        ]
      },
      {
        id: 'law_of_refraction',
        name: '光的折射定律（斯涅尔定律）',
        category: 'optics',
        description: '入射角的正弦与折射角的正弦之比等于两种介质中的光速之比',
        formula: 'n₁sinθ₁ = n₂sinθ₂',
        variables: [
          { symbol: 'n₁, n₂', name: '两种介质的折射率', unit: '无量纲' },
          { symbol: 'θ₁', name: '入射角', unit: '° 或 rad' },
          { symbol: 'θ₂', name: '折射角', unit: '° 或 rad' }
        ]
      },
      {
        id: 'lens_equation',
        name: '透镜成像公式',
        category: 'optics',
        description: '描述物体通过透镜成像位置关系的公式',
        formula: '1/f = 1/u + 1/v',
        variables: [
          { symbol: 'f', name: '焦距', unit: 'm' },
          { symbol: 'u', name: '物距', unit: 'm' },
          { symbol: 'v', name: '像距', unit: 'm' }
        ]
      },
      {
        id: 'thin_lens_magnification',
        name: '透镜放大率',
        category: 'optics',
        description: '像高与物高的比值',
        formula: 'M = h\'/h = -v/u',
        variables: [
          { symbol: 'M', name: '放大率', unit: '无量纲' },
          { symbol: 'h\'', name: '像高', unit: 'm' },
          { symbol: 'h', name: '物高', unit: 'm' }
        ]
      }
    ];

    laws.forEach(l => this.laws.set(l.id, l));
  }

  private initializeRelativity(): void {
    const laws: PhysicalLaw[] = [
      {
        id: 'mass_energy',
        name: '质能方程',
        category: 'relativity',
        description: '质量和能量是等价的，可以相互转化',
        formula: 'E = mc²',
        variables: [
          { symbol: 'E', name: '能量', unit: 'J' },
          { symbol: 'm', name: '质量', unit: 'kg' },
          { symbol: 'c', name: '光速', unit: '3×10⁸ m/s' }
        ],
        discoveredBy: '阿尔伯特·爱因斯坦',
        year: 1905
      },
      {
        id: 'time_dilation',
        name: '时间膨胀',
        category: 'relativity',
        description: '运动中的时钟走得比静止时钟慢',
        formula: 'Δt\' = Δt/√(1-v²/c²)',
        variables: [
          { symbol: 'Δt\'', name: '运动参考系中的时间', unit: 's' },
          { symbol: 'Δt', name: '静止参考系中的时间', unit: 's' },
          { symbol: 'v', name: '相对速度', unit: 'm/s' }
        ],
        discoveredBy: '阿尔伯特·爱因斯坦',
        year: 1905
      },
      {
        id: 'length_contraction',
        name: '长度收缩',
        category: 'relativity',
        description: '运动方向上的长度会收缩',
        formula: 'L\' = L√(1-v²/c²)',
        variables: [
          { symbol: 'L\'', name: '运动物体长度', unit: 'm' },
          { symbol: 'L', name: '静止物体长度', unit: 'm' }
        ],
        discoveredBy: '阿尔伯特·爱因斯坦',
        year: 1905
      },
      {
        id: 'lorentz_factor',
        name: '洛伦兹因子',
        category: 'relativity',
        description: '相对论中的重要修正因子',
        formula: 'γ = 1/√(1-v²/c²)',
        variables: [
          { symbol: 'γ', name: '洛伦兹因子', unit: '无量纲' },
          { symbol: 'v', name: '相对速度', unit: 'm/s' },
          { symbol: 'c', name: '光速', unit: '3×10⁸ m/s' }
        ]
      },
      {
        id: 'relativistic_momentum',
        name: '相对论动量',
        category: 'relativity',
        description: '考虑相对论效应的动量公式',
        formula: 'p = γmv',
        variables: [
          { symbol: 'p', name: '动量', unit: 'kg·m/s' },
          { symbol: 'γ', name: '洛伦兹因子', unit: '无量纲' },
          { symbol: 'm', name: '质量', unit: 'kg' },
          { symbol: 'v', name: '速度', unit: 'm/s' }
        ],
        discoveredBy: '阿尔伯特·爱因斯坦',
        year: 1905
      }
    ];

    laws.forEach(l => this.laws.set(l.id, l));
  }

  private initializeQuantumMechanics(): void {
    const laws: PhysicalLaw[] = [
      {
        id: 'planck_equation',
        name: '普朗克方程',
        category: 'quantum_mechanics',
        description: '黑体辐射能量是不连续的，只能取基本单位的整数倍',
        formula: 'E = hf',
        variables: [
          { symbol: 'E', name: '能量', unit: 'J' },
          { symbol: 'h', name: '普朗克常数', unit: '6.626×10⁻³⁴ J·s' },
          { symbol: 'f', name: '频率', unit: 'Hz' }
        ],
        discoveredBy: '马克斯·普朗克',
        year: 1900
      },
      {
        id: 'photoelectric_effect',
        name: '光电效应方程',
        category: 'quantum_mechanics',
        description: '光电子的最大动能与入射光频率呈线性关系',
        formula: 'Ek = hf - φ',
        variables: [
          { symbol: 'Ek', name: '光电子最大动能', unit: 'J' },
          { symbol: 'h', name: '普朗克常数', unit: '6.626×10⁻³⁴ J·s' },
          { symbol: 'f', name: '入射光频率', unit: 'Hz' },
          { symbol: 'φ', name: '逸出功', unit: 'J' }
        ],
        discoveredBy: '阿尔伯特·爱因斯坦',
        year: 1905
      },
      {
        id: 'de_broglie',
        name: '德布罗意波长',
        category: 'quantum_mechanics',
        description: '一切粒子都具有波动性，波长与动量成反比',
        formula: 'λ = h/p = h/(mv)',
        variables: [
          { symbol: 'λ', name: '波长', unit: 'm' },
          { symbol: 'h', name: '普朗克常数', unit: '6.626×10⁻³⁴ J·s' },
          { symbol: 'p', name: '动量', unit: 'kg·m/s' }
        ],
        discoveredBy: '路易·德布罗意',
        year: 1924
      },
      {
        id: 'heisenberg_uncertainty',
        name: '海森堡不确定性原理',
        category: 'quantum_mechanics',
        description: '粒子的位置和动量不能同时被精确测量',
        formula: 'Δx·Δp ≥ ℏ/2',
        variables: [
          { symbol: 'Δx', name: '位置不确定度', unit: 'm' },
          { symbol: 'Δp', name: '动量不确定度', unit: 'kg·m/s' },
          { symbol: 'ℏ', name: '约化普朗克常数', unit: '1.055×10⁻³⁴ J·s' }
        ],
        discoveredBy: '维尔纳·海森堡',
        year: 1927
      },
      {
        id: 'schrodinger_equation',
        name: '薛定谔方程',
        category: 'quantum_mechanics',
        description: '描述量子系统随时间演化的基本方程',
        formula: 'iℏ∂ψ/∂t = Ĥψ',
        variables: [
          { symbol: 'ψ', name: '波函数', unit: '无量纲' },
          { symbol: 'Ĥ', name: '哈密顿算符', unit: 'J' },
          { symbol: 'ℏ', name: '约化普朗克常数', unit: '1.055×10⁻³⁴ J·s' }
        ],
        discoveredBy: '埃尔温·薛定谔',
        year: 1926
      },
      {
        id: 'wave_function',
        name: '波函数与概率',
        category: 'quantum_mechanics',
        description: '波函数的模平方表示粒子在某处出现的概率密度',
        formula: 'P(x) = |ψ(x)|²',
        variables: [
          { symbol: 'ψ', name: '波函数', unit: '无量纲' },
          { symbol: 'P', name: '概率密度', unit: '1/m' }
        ],
        discoveredBy: '马克斯·玻恩',
        year: 1926
      }
    ];

    laws.forEach(l => this.laws.set(l.id, l));
  }

  private initializeConstants(): void {
    const constants: PhysicalConstant[] = [
      { name: '光速', symbol: 'c', value: '2.998×10⁸', unit: 'm/s', description: '光在真空中传播的速度' },
      { name: '引力常数', symbol: 'G', value: '6.674×10⁻¹¹', unit: 'N·m²/kg²', description: '万有引力定律中的常数' },
      { name: '普朗克常数', symbol: 'h', value: '6.626×10⁻³⁴', unit: 'J·s', description: '量子力学的基本常数' },
      { name: '约化普朗克常数', symbol: 'ℏ', value: '1.055×10⁻³⁴', unit: 'J·s', description: 'h/(2π)' },
      { name: '基本电荷', symbol: 'e', value: '1.602×10⁻¹⁹', unit: 'C', description: '一个电子所带的电荷量' },
      { name: '电子质量', symbol: 'mₑ', value: '9.109×10⁻³¹', unit: 'kg', description: '电子的质量' },
      { name: '质子质量', symbol: 'mₚ', value: '1.673×10⁻²⁷', unit: 'kg', description: '质子的质量' },
      { name: '中子质量', symbol: 'mₙ', value: '1.675×10⁻²⁷', unit: 'kg', description: '中子的质量' },
      { name: '阿伏伽德罗常数', symbol: 'Nₐ', value: '6.022×10²³', unit: 'mol⁻¹', description: '1mol物质所含的粒子数' },
      { name: '气体常数', symbol: 'R', value: '8.314', unit: 'J/(mol·K)', description: '理想气体状态方程中的常数' },
      { name: '玻尔兹曼常数', symbol: 'k', value: '1.381×10⁻²³', unit: 'J/K', description: '热力学中的基本常数' },
      { name: '真空介电常数', symbol: 'ε₀', value: '8.854×10⁻¹²', unit: 'F/m', description: '真空中的电容率' },
      { name: '真空磁导率', symbol: 'μ₀', value: '1.257×10⁻⁶', unit: 'H/m', description: '真空中的磁导率' },
      { name: '静电常数', symbol: 'k', value: '8.99×10⁹', unit: 'N·m²/C²', description: '库仑定律中的常数' },
      { name: '标准重力加速度', symbol: 'g', value: '9.807', unit: 'm/s²', description: '地球表面的标准重力加速度' },
      { name: '精细结构常数', symbol: 'α', value: '7.297×10⁻³', unit: '无量纲', description: '描述电磁相互作用强度的常数' },
      { name: '黄金比例', symbol: 'φ', value: '1.618', unit: '无量纲', description: '(1+√5)/2' }
    ];

    constants.forEach(c => this.constants.set(c.name, c));
  }

  /**
   * 获取物理定律
   */
  getLaw(id: string): PhysicalLaw | undefined {
    return this.laws.get(id);
  }

  /**
   * 按类别获取定律
   */
  getLawsByCategory(category: PhysicsCategory): PhysicalLaw[] {
    return Array.from(this.laws.values()).filter(l => l.category === category);
  }

  /**
   * 搜索定律
   */
  searchLaws(query: string): PhysicalLaw[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.laws.values()).filter(l =>
      l.name.toLowerCase().includes(lowerQuery) ||
      l.description.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * 获取常数
   */
  getConstant(name: string): PhysicalConstant | undefined {
    return this.constants.get(name);
  }

  /**
   * 获取所有常数
   */
  getAllConstants(): PhysicalConstant[] {
    return Array.from(this.constants.values());
  }

  /**
   * 学习定律
   */
  learnLaw(lawId: string): void {
    this.learnedLaws.add(lawId);
    const current = this.understandingLevel.get(lawId) || 0;
    this.understandingLevel.set(lawId, current + 1);
  }

  /**
   * 获取已学习定律
   */
  getLearnedLaws(): string[] {
    return Array.from(this.learnedLaws);
  }

  /**
   * 获取理解水平
   */
  getUnderstandingLevel(lawId: string): number {
    return this.understandingLevel.get(lawId) || 0;
  }

  /**
   * 获取统计
   */
  getStatistics(): {
    totalLaws: number;
    learnedLaws: number;
    lawsByCategory: Record<string, number>;
    constantsCount: number;
  } {
    const laws = Array.from(this.laws.values());
    const lawsByCategory: Record<string, number> = {};
    laws.forEach(l => {
      lawsByCategory[l.category] = (lawsByCategory[l.category] || 0) + 1;
    });

    return {
      totalLaws: laws.length,
      learnedLaws: this.learnedLaws.size,
      lawsByCategory,
      constantsCount: this.constants.size
    };
  }
}

export const physicsKnowledge = new PhysicsKnowledgeSystem();