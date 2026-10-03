export interface LogicRule {
  id: string;
  premise: string[];
  conclusion: string;
  confidence: number;
  type: 'deductive' | 'inductive' | 'analogical' | 'causal' | 'common_sense' | 'scientific';
  examples?: string[];
}

export interface ReasoningChain {
  steps: ReasoningStep[];
  finalConclusion: string;
  confidence: number;
}

export interface ReasoningStep {
  rule: LogicRule;
  matchedPremises: string[];
  conclusion: string;
  intermediateResult: boolean;
}

export interface Concept {
  name: string;
  attributes: string[];
  relations: Map<string, string[]>;
  instances: string[];
}

class LogicReasoningEngine {
  private rules: LogicRule[] = [];
  private concepts: Map<string, Concept> = new Map();

  constructor() {
    this.initializeCommonSenseRules();
    this.initializeConcepts();
  }

  private initializeCommonSenseRules(): void {
    this.rules = [
      {
        id: 'animal_legs_human',
        premise: ['人有几条腿', '人类有几条腿', '我们有几条腿'],
        conclusion: '2条腿',
        confidence: 1.0,
        type: 'common_sense'
      },
      {
        id: 'animal_legs_cat',
        premise: ['猫有几条腿', '猫咪几条腿', '小猫有几条腿'],
        conclusion: '4条腿',
        confidence: 1.0,
        type: 'common_sense'
      },
      {
        id: 'animal_legs_dog',
        premise: ['狗有几条腿', '狗狗几条腿', '小狗有几条腿'],
        conclusion: '4条腿',
        confidence: 1.0,
        type: 'common_sense'
      },
      {
        id: 'animal_legs_cow',
        premise: ['牛有几条腿', '黄牛几条腿', '奶牛有几条腿', '水牛有几条腿'],
        conclusion: '4条腿',
        confidence: 1.0,
        type: 'common_sense'
      },
      {
        id: 'animal_legs_yak',
        premise: ['牦牛有几条腿', '犛牛几条腿'],
        conclusion: '4条腿',
        confidence: 1.0,
        type: 'common_sense'
      },
      {
        id: 'animal_legs_frog',
        premise: ['蛙有几条腿', '青蛙几条腿', '蛤蟆有几条腿'],
        conclusion: '4条腿',
        confidence: 1.0,
        type: 'common_sense'
      },
      {
        id: 'animal_legs_elephant',
        premise: ['大象有几条腿', '象有几条腿'],
        conclusion: '4条腿',
        confidence: 1.0,
        type: 'common_sense'
      },
      {
        id: 'animal_legs_bird',
        premise: ['鸟有几条腿', '小鸟几条腿', '鸟类有几条腿'],
        conclusion: '2条腿',
        confidence: 0.98,
        type: 'common_sense'
      },
      {
        id: 'animal_legs_chicken',
        premise: ['鸡有几条腿', '公鸡几条腿', '母鸡有几条腿'],
        conclusion: '2条腿',
        confidence: 0.98,
        type: 'common_sense'
      },
      {
        id: 'animal_legs_fish',
        premise: ['鱼有几条腿', '鱼儿几条腿', '鱼类有几条腿'],
        conclusion: '0条腿，鱼用鳍游泳',
        confidence: 1.0,
        type: 'common_sense'
      },
      {
        id: 'animal_legs_snake',
        premise: ['蛇有几条腿', '长虫有几条腿'],
        conclusion: '0条腿，蛇靠身体蠕动爬行',
        confidence: 1.0,
        type: 'common_sense'
      },
      {
        id: 'animal_legs_spider',
        premise: ['蜘蛛有几条腿'],
        conclusion: '8条腿',
        confidence: 1.0,
        type: 'common_sense'
      },
      {
        id: 'animal_legs_centipede',
        premise: ['蜈蚣有几条腿'],
        conclusion: '常见蜈蚣有30-40条腿，不同种类腿数不同',
        confidence: 0.95,
        type: 'common_sense'
      },
      {
        id: 'nature_sky_color',
        premise: ['天空是什么颜色', '天是什么颜色', '天空的颜色'],
        conclusion: '蓝色',
        confidence: 1.0,
        type: 'common_sense'
      },
      {
        id: 'nature_sun_rise',
        premise: ['太阳从哪里升起', '太阳从哪边升起', '日出方向'],
        conclusion: '东方',
        confidence: 1.0,
        type: 'common_sense'
      },
      {
        id: 'nature_sun_set',
        premise: ['太阳从哪里落下', '太阳从哪边落下', '日落方向'],
        conclusion: '西方',
        confidence: 1.0,
        type: 'common_sense'
      },
      {
        id: 'nature_water_flow',
        premise: ['水往哪里流', '水流向哪里', '水往低处流'],
        conclusion: '水往低处流',
        confidence: 1.0,
        type: 'common_sense'
      },
      {
        id: 'time_day_hours',
        premise: ['一天有多少小时', '一日有几小时', '一天几小时'],
        conclusion: '24小时',
        confidence: 1.0,
        type: 'common_sense'
      },
      {
        id: 'time_year_days',
        premise: ['一年有多少天', '一年有几天'],
        conclusion: '平年365天，闰年366天',
        confidence: 1.0,
        type: 'common_sense'
      },
      {
        id: 'math_one_plus_one',
        premise: ['1+1等于几', '一加一等于几', '1加1等于多少'],
        conclusion: '2',
        confidence: 1.0,
        type: 'deductive'
      },
      {
        id: 'science_atom_size',
        premise: ['原子有多大', '原子的尺寸', '原子直径'],
        conclusion: '约0.1纳米，即10^-10米',
        confidence: 0.98,
        type: 'scientific'
      },
      {
        id: 'science_human_height',
        premise: ['人的平均身高是多少', '人类平均身高', '平均身高'],
        conclusion: '中国成年男性平均约1.72米，女性约1.60米',
        confidence: 0.9,
        type: 'scientific'
      },
      {
        id: 'science_tree_height',
        premise: ['一棵树有多高', '树的高度', '树木高度'],
        conclusion: '不同树木高度差异很大，常见树木约5-20米，最高的红杉可达100米以上',
        confidence: 0.85,
        type: 'scientific'
      },
      {
        id: 'science_universe_size',
        premise: ['宇宙有多大', '宇宙的大小', '宇宙直径'],
        conclusion: '可观测宇宙直径约930亿光年，整个宇宙的大小未知',
        confidence: 0.9,
        type: 'scientific'
      },
      {
        id: 'science_sky_height',
        premise: ['天有多高', '天空有多高', '大气层高度'],
        conclusion: '地球大气层约1000公里，通常所说的天空指对流层，约12公里高',
        confidence: 0.95,
        type: 'scientific'
      },
      {
        id: 'science_light_speed',
        premise: ['光速是多少', '光的速度', '光每秒跑多远'],
        conclusion: '真空中光速约每秒30万公里',
        confidence: 1.0,
        type: 'scientific'
      },
      {
        id: 'science_sound_speed',
        premise: ['声速是多少', '声音的速度', '声音每秒跑多远'],
        conclusion: '空气中声速约每秒340米（常温下）',
        confidence: 0.98,
        type: 'scientific'
      },
      {
        id: 'science_earth_radius',
        premise: ['地球半径是多少', '地球有多大', '地球直径'],
        conclusion: '地球平均半径约6371公里，赤道半径约6378公里',
        confidence: 1.0,
        type: 'scientific'
      },
      {
        id: 'science_moon_distance',
        premise: ['月亮离地球有多远', '月球距离', '地月距离'],
        conclusion: '月球与地球平均距离约38.4万公里',
        confidence: 1.0,
        type: 'scientific'
      },
      {
        id: 'science_sun_distance',
        premise: ['太阳离地球有多远', '日地距离', '太阳距离'],
        conclusion: '太阳与地球平均距离约1.5亿公里，即1个天文单位',
        confidence: 1.0,
        type: 'scientific'
      },
      {
        id: 'color_apple',
        premise: ['苹果是什么颜色', '苹果的颜色'],
        conclusion: '红色、绿色或黄色',
        confidence: 0.95,
        type: 'common_sense'
      },
      {
        id: 'color_grass',
        premise: ['草是什么颜色', '草的颜色'],
        conclusion: '绿色',
        confidence: 1.0,
        type: 'common_sense'
      },
      {
        id: 'taste_rice',
        premise: ['米饭是什么味道', '米的味道', '饭的味道'],
        conclusion: '淡淡的甜味',
        confidence: 0.9,
        type: 'common_sense'
      },
      {
        id: 'temperature_season',
        premise: ['夏天热还是冬天热', '哪个季节热'],
        conclusion: '夏天比冬天热',
        confidence: 1.0,
        type: 'common_sense'
      }
    ];
  }

  private initializeConcepts(): void {
    const conceptDefs: Concept[] = [
      {
        name: '哺乳动物',
        attributes: ['四条腿', '恒温', '胎生', '哺乳'],
        relations: new Map([
          ['包括', ['猫', '狗', '牛', '羊', '猪', '马', '大象', '狮子', '老虎']]
        ]),
        instances: ['猫', '狗', '牛', '羊']
      },
      {
        name: '人',
        attributes: ['两条腿', '直立行走', '高智商', '使用工具', '有语言'],
        relations: new Map([['属于', ['哺乳动物', '灵长目']]]),
        instances: ['人类']
      },
      {
        name: '鸟',
        attributes: ['两条腿', '有翅膀', '会飞', '羽毛', '卵生'],
        relations: new Map([['包括', ['麻雀', '鸽子', '老鹰', '燕子']]]),
        instances: ['鸟']
      },
      {
        name: '鱼',
        attributes: ['没有腿', '用鳍游泳', '用腮呼吸', '水中生活'],
        relations: new Map([['包括', ['鲤鱼', '金鱼', '鲨鱼']]]),
        instances: ['鱼']
      },
      {
        name: '爬行动物',
        attributes: ['冷血', '鳞片', '卵生', '无腿或短腿'],
        relations: new Map([['包括', ['蛇', '蜥蜴', '乌龟', '鳄鱼']]]),
        instances: ['蛇', '蜥蜴']
      },
      {
        name: '昆虫',
        attributes: ['六条腿', '三节身体', '一对触角', '外骨骼'],
        relations: new Map([['包括', ['蚂蚁', '蜜蜂', '蝴蝶']]]),
        instances: ['蚂蚁', '蜜蜂']
      },
      {
        name: '节肢动物',
        attributes: ['多足', '外骨骼', '分节'],
        relations: new Map([['包括', ['蜘蛛(8条腿)', '蜈蚣(多足)', '螃蟹(8条腿)']]]),
        instances: ['蜘蛛', '蜈蚣', '螃蟹']
      }
    ];

    for (const concept of conceptDefs) {
      this.concepts.set(concept.name, concept);
    }
  }

  reason(input: string): ReasoningChain | null {
    const lowerInput = input.toLowerCase();

    const directMatch = this.matchDirectly(lowerInput);
    if (directMatch) {
      return {
        steps: [{
          rule: directMatch,
          matchedPremises: directMatch.premise,
          conclusion: directMatch.conclusion,
          intermediateResult: true
        }],
        finalConclusion: directMatch.conclusion,
        confidence: directMatch.confidence
      };
    }

    const animalLegsResult = this.reasonAnimalLegs(lowerInput);
    if (animalLegsResult) {
      return animalLegsResult;
    }

    const attributeResult = this.reasonByAttributes(lowerInput);
    if (attributeResult) {
      return attributeResult;
    }

    const unitConversionResult = this.tryUnitConversion(lowerInput);
    if (unitConversionResult) {
      return unitConversionResult;
    }

    return null;
  }

  private matchDirectly(input: string): LogicRule | null {
    for (const rule of this.rules) {
      for (const premise of rule.premise) {
        if (input.includes(premise.toLowerCase())) {
          return rule;
        }
      }
    }
    return null;
  }

  private reasonAnimalLegs(input: string): ReasoningChain | null {
    const animalKeywords: { [key: string]: { legs: string; category?: string } } = {
      '猫': { legs: '4条腿', category: '哺乳动物' },
      '狗': { legs: '4条腿', category: '哺乳动物' },
      '牛': { legs: '4条腿', category: '哺乳动物' },
      '牦牛': { legs: '4条腿', category: '哺乳动物' },
      '羊': { legs: '4条腿', category: '哺乳动物' },
      '猪': { legs: '4条腿', category: '哺乳动物' },
      '马': { legs: '4条腿', category: '哺乳动物' },
      '大象': { legs: '4条腿', category: '哺乳动物' },
      '老虎': { legs: '4条腿', category: '哺乳动物' },
      '狮子': { legs: '4条腿', category: '哺乳动物' },
      '兔子': { legs: '4条腿', category: '哺乳动物' },
      '青蛙': { legs: '4条腿', category: '两栖动物' },
      '人': { legs: '2条腿', category: '人类' },
      '鸟': { legs: '2条腿', category: '鸟类' },
      '鸡': { legs: '2条腿', category: '鸟类' },
      '鱼': { legs: '0条腿，用鳍游泳', category: '鱼类' },
      '蛇': { legs: '0条腿，靠身体蠕动爬行', category: '爬行动物' },
      '蜘蛛': { legs: '8条腿', category: '节肢动物' },
      '蜈蚣': { legs: '多足动物，常见30-40条腿', category: '节肢动物' }
    };

    for (const [animal, info] of Object.entries(animalKeywords)) {
      if (input.includes(animal) && (input.includes('腿') || input.includes('几只'))) {
        const rule: LogicRule = {
          id: `animal_legs_${animal}`,
          premise: [`${animal}有几条腿`],
          conclusion: info.legs,
          confidence: 0.98,
          type: 'common_sense'
        };

        return {
          steps: [{
            rule,
            matchedPremises: [`${animal}有几条腿`],
            conclusion: info.legs,
            intermediateResult: true
          }],
          finalConclusion: info.legs,
          confidence: 0.98
        };
      }
    }

    return null;
  }

  private reasonByAttributes(input: string): ReasoningChain | null {
    for (const [conceptName, concept] of this.concepts.entries()) {
      if (input.includes(conceptName) && input.includes('有') && (input.includes('什么') || input.includes('哪些'))) {
        const rule: LogicRule = {
          id: `concept_${conceptName}_attributes`,
          premise: [`${conceptName}有什么特点`],
          conclusion: concept.attributes.join('、'),
          confidence: 0.9,
          type: 'common_sense'
        };

        return {
          steps: [{
            rule,
            matchedPremises: [`${conceptName}有什么特点`],
            conclusion: concept.attributes.join('、'),
            intermediateResult: true
          }],
          finalConclusion: concept.attributes.join('、'),
          confidence: 0.9
        };
      }
    }
    return null;
  }

  private tryUnitConversion(input: string): ReasoningChain | null {
    const conversions: { [key: string]: { [key: string]: number } } = {
      '米': { '分米': 10, '厘米': 100, '毫米': 1000, '微米': 1000000, '纳米': 1000000000, '公里': 0.001 },
      '分米': { '厘米': 10, '毫米': 100, '微米': 100000 },
      '厘米': { '毫米': 10, '微米': 10000, '纳米': 10000000 },
      '毫米': { '微米': 1000, '纳米': 1000000 },
      '微米': { '纳米': 1000 },
      '公里': { '米': 1000 }
    };

    for (const [fromUnit, toUnits] of Object.entries(conversions)) {
      if (input.includes(fromUnit) && (input.includes('转换') || input.includes('换算') || input.includes('等于'))) {
        const results: string[] = [];
        for (const [toUnit, factor] of Object.entries(toUnits)) {
          results.push(`1${fromUnit} = ${factor}${toUnit}`);
        }

        if (results.length > 0) {
          const rule: LogicRule = {
            id: 'unit_conversion',
            premise: [`长度单位转换`],
            conclusion: results.join('；'),
            confidence: 1.0,
            type: 'deductive'
          };

          return {
            steps: [{
              rule,
              matchedPremises: ['长度单位转换'],
              conclusion: results.join('；'),
              intermediateResult: true
            }],
            finalConclusion: results.join('；'),
            confidence: 1.0
          };
        }
      }
    }

    return null;
  }

  hasReasoning(input: string): boolean {
    return this.reason(input) !== null;
  }

  getConclusion(input: string): string | null {
    const result = this.reason(input);
    return result ? result.finalConclusion : null;
  }

  addRule(rule: LogicRule): void {
    this.rules.push(rule);
  }

  getAllRules(): LogicRule[] {
    return [...this.rules];
  }
}

export const logicReasoningEngine = new LogicReasoningEngine();