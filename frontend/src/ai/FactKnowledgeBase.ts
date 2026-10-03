export interface KnowledgeEntry {
  id: string;
  category: string;
  keywords: string[];
  questionPatterns: string[];
  answer: string;
  unit?: string;
  value?: number;
  relatedTopics?: string[];
}

export interface UnitConversion {
  from: string;
  to: string;
  factor: number;
  label: string;
}

class FactKnowledgeBase {
  private knowledge: Map<string, KnowledgeEntry[]> = new Map();
  private unitConversions: Map<string, UnitConversion[]> = new Map();

  constructor() {
    this.initializeKnowledge();
    this.initializeUnitConversions();
  }

  private initializeKnowledge(): void {
    const knowledgeEntries: KnowledgeEntry[] = [
      {
        id: 'animal_cat_legs',
        category: 'animal',
        keywords: ['猫', '猫咪', '小猫'],
        questionPatterns: ['猫有几条腿', '猫咪几条腿', '小猫有几条腿'],
        answer: '4条腿'
      },
      {
        id: 'animal_dog_legs',
        category: 'animal',
        keywords: ['狗', '狗狗', '小狗', '犬'],
        questionPatterns: ['狗有几条腿', '狗狗几条腿', '小狗有几条腿', '犬有几条腿'],
        answer: '4条腿'
      },
      {
        id: 'animal_cow_legs',
        category: 'animal',
        keywords: ['牛', '黄牛', '奶牛', '水牛'],
        questionPatterns: ['牛有几条腿', '黄牛几条腿', '奶牛有几条腿', '水牛有几条腿'],
        answer: '4条腿'
      },
      {
        id: 'animal_yak_legs',
        category: 'animal',
        keywords: ['牦牛', '犛牛'],
        questionPatterns: ['牦牛有几条腿', '犛牛几条腿'],
        answer: '4条腿'
      },
      {
        id: 'animal_frog_legs',
        category: 'animal',
        keywords: ['蛙', '青蛙', '蛤蟆'],
        questionPatterns: ['蛙有几条腿', '青蛙几条腿', '蛤蟆有几条腿'],
        answer: '4条腿'
      },
      {
        id: 'animal_elephant_legs',
        category: 'animal',
        keywords: ['大象', '象'],
        questionPatterns: ['大象有几条腿', '象有几条腿'],
        answer: '4条腿'
      },
      {
        id: 'animal_human_legs',
        category: 'animal',
        keywords: ['人', '人类', '我们'],
        questionPatterns: ['人有几条腿', '人类有几条腿', '我们有几条腿'],
        answer: '2条腿'
      },
      {
        id: 'animal_bird_legs',
        category: 'animal',
        keywords: ['鸟', '小鸟', '鸟类'],
        questionPatterns: ['鸟有几条腿', '小鸟几条腿', '鸟类有几条腿'],
        answer: '2条腿'
      },
      {
        id: 'animal_chicken_legs',
        category: 'animal',
        keywords: ['鸡', '公鸡', '母鸡', '小鸡'],
        questionPatterns: ['鸡有几条腿', '公鸡几条腿', '母鸡有几条腿'],
        answer: '2条腿'
      },
      {
        id: 'animal_fish_legs',
        category: 'animal',
        keywords: ['鱼', '鱼儿', '鱼类'],
        questionPatterns: ['鱼有几条腿', '鱼儿几条腿', '鱼类有几条腿'],
        answer: '0条腿，鱼用鳍游泳'
      },
      {
        id: 'animal_snake_legs',
        category: 'animal',
        keywords: ['蛇', '长虫'],
        questionPatterns: ['蛇有几条腿', '长虫有几条腿'],
        answer: '0条腿，蛇靠身体蠕动爬行'
      },
      {
        id: 'animal_spider_legs',
        category: 'animal',
        keywords: ['蜘蛛'],
        questionPatterns: ['蜘蛛有几条腿'],
        answer: '8条腿'
      },
      {
        id: 'animal_centipede_legs',
        category: 'animal',
        keywords: ['蜈蚣'],
        questionPatterns: ['蜈蚣有几条腿'],
        answer: '常见蜈蚣有30-40条腿，不同种类腿数不同'
      },
      {
        id: 'nature_sky_color',
        category: 'nature',
        keywords: ['天空', '天', '蓝天'],
        questionPatterns: ['天空是什么颜色', '天是什么颜色', '天空的颜色'],
        answer: '蓝色'
      },
      {
        id: 'nature_sun_rise',
        category: 'nature',
        keywords: ['太阳', '日', '朝阳'],
        questionPatterns: ['太阳从哪里升起', '太阳从哪边升起', '日出方向'],
        answer: '东方'
      },
      {
        id: 'nature_sun_set',
        category: 'nature',
        keywords: ['太阳', '日落', '夕阳'],
        questionPatterns: ['太阳从哪里落下', '太阳从哪边落下', '日落方向'],
        answer: '西方'
      },
      {
        id: 'nature_water_flow',
        category: 'nature',
        keywords: ['水', '水流', '河水'],
        questionPatterns: ['水往哪里流', '水流向哪里', '水往低处流'],
        answer: '水往低处流'
      },
      {
        id: 'time_day_hours',
        category: 'time',
        keywords: ['一天', '一日', '白天'],
        questionPatterns: ['一天有多少小时', '一日有几小时', '一天几小时'],
        answer: '24小时'
      },
      {
        id: 'time_year_days',
        category: 'time',
        keywords: ['一年', '年度'],
        questionPatterns: ['一年有多少天', '一年有几天'],
        answer: '平年365天，闰年366天'
      },
      {
        id: 'time_month_days',
        category: 'time',
        keywords: ['一个月', '月份'],
        questionPatterns: ['一个月有多少天', '一个月有几天'],
        answer: '不同月份天数不同，通常28-31天'
      },
      {
        id: 'math_one_plus_one',
        category: 'math',
        keywords: ['1+1', '一加一', '1加1'],
        questionPatterns: ['1+1等于几', '一加一等于几', '1加1等于多少'],
        answer: '2'
      },
      {
        id: 'math_two_plus_two',
        category: 'math',
        keywords: ['2+2', '二加二'],
        questionPatterns: ['2+2等于几', '二加二等于几'],
        answer: '4'
      },
      {
        id: 'science_atom_size',
        category: 'science',
        keywords: ['原子', 'atom'],
        questionPatterns: ['原子有多大', '原子的尺寸', '原子直径'],
        answer: '约0.1纳米，即0.0000000001米',
        value: 0.1,
        unit: '纳米'
      },
      {
        id: 'science_human_height',
        category: 'science',
        keywords: ['人', '人类', '身高'],
        questionPatterns: ['人的平均身高是多少', '人类平均身高', '平均身高'],
        answer: '中国成年男性平均约1.72米，女性约1.60米',
        value: 1.66,
        unit: '米'
      },
      {
        id: 'science_tree_height',
        category: 'science',
        keywords: ['树', '树木', '大树'],
        questionPatterns: ['一棵树有多高', '树的高度', '树木高度'],
        answer: '不同树木高度差异很大，常见树木约5-20米，最高的红杉可达100米以上',
        value: 10,
        unit: '米'
      },
      {
        id: 'science_universe_size',
        category: 'science',
        keywords: ['宇宙', '太空', '世界'],
        questionPatterns: ['宇宙有多大', '宇宙的大小', '宇宙直径'],
        answer: '可观测宇宙直径约930亿光年，整个宇宙的大小未知',
        value: 930,
        unit: '亿光年'
      },
      {
        id: 'science_sky_height',
        category: 'science',
        keywords: ['天', '天空', '大气层'],
        questionPatterns: ['天有多高', '天空有多高', '大气层高度'],
        answer: '地球大气层约1000公里，通常所说的天空指对流层，约12公里高',
        value: 12,
        unit: '公里'
      },
      {
        id: 'science_mountain_height',
        category: 'science',
        keywords: ['山', '山峰', '高山'],
        questionPatterns: ['山有多高', '山峰高度', '高山有多高'],
        answer: '世界最高峰珠穆朗玛峰约8848米，普通山峰约500-3000米',
        value: 1000,
        unit: '米'
      },
      {
        id: 'science_ocean_depth',
        category: 'science',
        keywords: ['海洋', '海', '深海'],
        questionPatterns: ['海洋有多深', '海有多深', '深海深度'],
        answer: '海洋平均深度约3800米，最深的马里亚纳海沟约11000米',
        value: 3800,
        unit: '米'
      },
      {
        id: 'science_earth_radius',
        category: 'science',
        keywords: ['地球', '地球半径', '地球大小'],
        questionPatterns: ['地球半径是多少', '地球有多大', '地球直径'],
        answer: '地球平均半径约6371公里，赤道半径约6378公里',
        value: 6371,
        unit: '公里'
      },
      {
        id: 'science_moon_distance',
        category: 'science',
        keywords: ['月亮', '月球', '月亮距离'],
        questionPatterns: ['月亮离地球有多远', '月球距离', '地月距离'],
        answer: '月球与地球平均距离约38.4万公里',
        value: 384000,
        unit: '公里'
      },
      {
        id: 'science_sun_distance',
        category: 'science',
        keywords: ['太阳', '太阳距离', '日地距离'],
        questionPatterns: ['太阳离地球有多远', '日地距离', '太阳距离'],
        answer: '太阳与地球平均距离约1.5亿公里，即1个天文单位',
        value: 1.5,
        unit: '亿公里'
      },
      {
        id: 'science_light_speed',
        category: 'science',
        keywords: ['光速', '光的速度'],
        questionPatterns: ['光速是多少', '光的速度', '光每秒跑多远'],
        answer: '真空中光速约每秒30万公里',
        value: 300000,
        unit: '公里/秒'
      },
      {
        id: 'science_sound_speed',
        category: 'science',
        keywords: ['声速', '声音速度'],
        questionPatterns: ['声速是多少', '声音的速度', '声音每秒跑多远'],
        answer: '空气中声速约每秒340米（常温下）',
        value: 340,
        unit: '米/秒'
      },
      {
        id: 'color_apple',
        category: 'life',
        keywords: ['苹果', '苹果颜色'],
        questionPatterns: ['苹果是什么颜色', '苹果的颜色'],
        answer: '红色、绿色或黄色'
      },
      {
        id: 'color_grass',
        category: 'life',
        keywords: ['草', '草的颜色', '青草'],
        questionPatterns: ['草是什么颜色', '草的颜色'],
        answer: '绿色'
      },
      {
        id: 'taste_rice',
        category: 'life',
        keywords: ['米饭', '米', '饭'],
        questionPatterns: ['米饭是什么味道', '米的味道', '饭的味道'],
        answer: '淡淡的甜味'
      },
      {
        id: 'temperature_season',
        category: 'life',
        keywords: ['夏天', '冬天', '季节'],
        questionPatterns: ['夏天热还是冬天热', '哪个季节热'],
        answer: '夏天比冬天热'
      }
    ];

    for (const entry of knowledgeEntries) {
      if (!this.knowledge.has(entry.category)) {
        this.knowledge.set(entry.category, []);
      }
      this.knowledge.get(entry.category)!.push(entry);
    }
  }

  private initializeUnitConversions(): void {
    const conversions: UnitConversion[] = [
      { from: '米', to: '分米', factor: 10, label: '1米 = 10分米' },
      { from: '米', to: '厘米', factor: 100, label: '1米 = 100厘米' },
      { from: '米', to: '毫米', factor: 1000, label: '1米 = 1000毫米' },
      { from: '米', to: '微米', factor: 1000000, label: '1米 = 1000000微米' },
      { from: '米', to: '纳米', factor: 1000000000, label: '1米 = 10亿纳米' },
      { from: '分米', to: '厘米', factor: 10, label: '1分米 = 10厘米' },
      { from: '分米', to: '毫米', factor: 100, label: '1分米 = 100毫米' },
      { from: '厘米', to: '毫米', factor: 10, label: '1厘米 = 10毫米' },
      { from: '厘米', to: '微米', factor: 10000, label: '1厘米 = 10000微米' },
      { from: '毫米', to: '微米', factor: 1000, label: '1毫米 = 1000微米' },
      { from: '毫米', to: '纳米', factor: 1000000, label: '1毫米 = 100万纳米' },
      { from: '微米', to: '纳米', factor: 1000, label: '1微米 = 1000纳米' },
      { from: '公里', to: '米', factor: 1000, label: '1公里 = 1000米' },
      { from: '公里', to: '厘米', factor: 100000, label: '1公里 = 10万厘米' },
      { from: '光年', to: '公里', factor: 9460730472580.8, label: '1光年 ≈ 9.46万亿公里' }
    ];

    for (const conv of conversions) {
      if (!this.unitConversions.has(conv.from)) {
        this.unitConversions.set(conv.from, []);
      }
      this.unitConversions.get(conv.from)!.push(conv);
    }
  }

  search(input: string): string[] {
    const lower = input.toLowerCase().trim();
    
    for (const entries of this.knowledge.values()) {
      for (const entry of entries) {
        for (const pattern of entry.questionPatterns) {
          if (lower.includes(pattern.toLowerCase())) {
            return [entry.answer];
          }
        }
        
        for (const keyword of entry.keywords) {
          if (lower.includes(keyword) && (lower.includes('多少') || lower.includes('几') || 
              lower.includes('多大') || lower.includes('多高') || lower.includes('多深') ||
              lower.includes('什么颜色') || lower.includes('什么味道') ||
              lower.includes('哪里') || lower.includes('哪边'))) {
            return [entry.answer];
          }
        }
      }
    }

    const conversionResult = this.tryUnitConversion(lower);
    if (conversionResult) {
      return [conversionResult];
    }

    return [];
  }

  private tryUnitConversion(input: string): string | null {
    const numberMatch = input.match(/(\d+(?:\.\d+)?)\s*([^\d\s]+)/);
    if (!numberMatch) return null;

    const value = parseFloat(numberMatch[1]);
    const fromUnit = numberMatch[2];

    if (!this.unitConversions.has(fromUnit)) return null;

    const conversions = this.unitConversions.get(fromUnit)!;
    const results: string[] = [];

    for (const conv of conversions) {
      const converted = value * conv.factor;
      results.push(`${value}${fromUnit} = ${converted}${conv.to}`);
    }

    if (results.length > 0) {
      return results.join('；');
    }

    return null;
  }

  convertUnit(value: number, fromUnit: string, toUnit: string): string | null {
    if (!this.unitConversions.has(fromUnit)) return null;

    const conversions = this.unitConversions.get(fromUnit)!;
    const conversion = conversions.find(c => c.to === toUnit);

    if (!conversion) return null;

    const converted = value * conversion.factor;
    return `${value}${fromUnit} = ${converted}${toUnit}`;
  }

  hasKnowledge(input: string): boolean {
    return this.search(input).length > 0;
  }

  getCategories(): string[] {
    return Array.from(this.knowledge.keys());
  }

  getEntriesByCategory(category: string): KnowledgeEntry[] {
    return this.knowledge.get(category) || [];
  }

  addKnowledge(entry: KnowledgeEntry): void {
    if (!this.knowledge.has(entry.category)) {
      this.knowledge.set(entry.category, []);
    }
    this.knowledge.get(entry.category)!.push(entry);
  }
}

export const factKnowledgeBase = new FactKnowledgeBase();