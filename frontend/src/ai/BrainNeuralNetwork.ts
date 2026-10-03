/**
 * 脑启发神经网络系统 - 优化版本
 * 
 * 优化重点：
 * 1. 减少神经元数量以提升性能
 * 2. 添加快速反应机制（简单输入直接响应）
 * 3. 保持核心的脑区结构和STDP学习
 */

// ==========================================
// 神经科学常数（简化版）
// ==========================================

const NEURO = {
  RESTING_POTENTIAL: -70,
  THRESHOLD: -55,
  PEAK: 40,
  REFRACTORY: 3,
  MEMBRANE_TAU: 5
};

// ==========================================
// 枚举定义
// ==========================================

export enum NeuronType {
  EXCITATORY = 'EXCITATORY',
  INHIBITORY = 'INHIBITORY',
  PYRAMIDAL = 'PYRAMIDAL'
}

export enum BrainRegion {
  PREFRONTAL_CORTEX = 'PFC',
  HIPPOCAMPUS = 'HIPPO',
  AMYGDALA = 'AMY'
}

export enum SynapseType {
  AMPA = 'AMPA',
  NMDA = 'NMDA',
  GABA = 'GABA'
}

// ==========================================
// 简化版脉冲神经元
// ==========================================

export interface Spike {
  neuronId: string;
  timestamp: number;
  brainRegion: BrainRegion;
}

export class SimpleNeuron {
  id: string;
  type: NeuronType;
  region: BrainRegion;
  
  potential: number;
  threshold: number;
  refractory: number;
  lastSpike: number;
  
  constructor(
    id: string,
    type: NeuronType = NeuronType.EXCITATORY,
    region: BrainRegion = BrainRegion.PREFRONTAL_CORTEX
  ) {
    this.id = id;
    this.type = type;
    this.region = region;
    this.potential = NEURO.RESTING_POTENTIAL;
    this.threshold = NEURO.THRESHOLD;
    this.refractory = 0;
    this.lastSpike = -100;
  }
  
  update(dt: number, exc: number, inh: number): boolean {
    if (this.refractory > 0) {
      this.refractory -= dt;
      return false;
    }
    
    // 简化LIF模型
    const I = exc * 2 - inh * 2;
    this.potential += (-(this.potential - NEURO.RESTING_POTENTIAL) + I) * (dt / NEURO.MEMBRANE_TAU);
    
    if (this.potential >= this.threshold) {
      this.potential = NEURO.PEAK;
      this.refractory = NEURO.REFRACTORY;
      this.lastSpike = 0;
      return true;
    }
    
    this.lastSpike += dt;
    return false;
  }
  
  fire(): void {
    this.potential = NEURO.PEAK;
    this.refractory = NEURO.REFRACTORY;
    this.lastSpike = 0;
  }
  
  excitatoryInput(w: number): number {
    return this.type === NeuronType.INHIBITORY ? 0 : w;
  }
  
  inhibitoryInput(w: number): number {
    return this.type === NeuronType.INHIBITORY ? w : 0;
  }
}

// ==========================================
// 简化版突触
// ==========================================

export class SimpleSynapse {
  pre: string;
  post: string;
  weight: number;
  lastPre: number;
  lastPost: number;
  
  constructor(pre: string, post: string, w: number = 0.3) {
    this.pre = pre;
    this.post = post;
    this.weight = w;
    this.lastPre = -100;
    this.lastPost = -100;
  }
  
  // 简化STDP
  applySTDP(preTime: number, postTime: number, dopamine: number = 0.5) {
    const dt = postTime - preTime;
    if (dt > 0 && dt < 50) {
      this.weight += 0.05 * (1 + dopamine);
    } else if (dt < 0 && dt > -50) {
      this.weight -= 0.025;
    }
    this.weight = Math.max(0.01, Math.min(2, this.weight));
  }
}

// ==========================================
// 简化版神经调制系统
// ==========================================

export class SimpleNeuromodulators {
  dopamine: number = 0.5;
  serotonin: number = 0.5;
  norepinephrine: number = 0.5;
  acetylcholine: number = 0.5;
  
  reward(value: number) {
    this.dopamine = Math.max(0, Math.min(1, this.dopamine + value * 0.2));
  }
  
  update(_dt: number) {
    this.dopamine *= 0.999;
    this.serotonin *= 0.9995;
    this.norepinephrine = 0.5 + Math.sin(Date.now() / 1000) * 0.2;
  }
}

// ==========================================
// 简化版脑区
// ==========================================

export class SimpleBrainRegion {
  name: BrainRegion;
  neurons: SimpleNeuron[];
  synapses: SimpleSynapse[];
  
  constructor(name: BrainRegion, size: number) {
    this.name = name;
    this.neurons = [];
    this.synapses = [];
    
    for (let i = 0; i < size; i++) {
      const type = i < size * 0.8 ? NeuronType.EXCITATORY : NeuronType.INHIBITORY;
      this.neurons.push(new SimpleNeuron(`${name}_${i}`, type, name));
    }
    
    this.createLocalConnections();
  }
  
  private createLocalConnections() {
    for (let i = 0; i < this.neurons.length; i++) {
      for (let j = 0; j < this.neurons.length; j++) {
        if (i !== j && Math.random() < 0.15) {
          const w = 0.1 + Math.random() * 0.3;
          this.synapses.push(new SimpleSynapse(this.neurons[i].id, this.neurons[j].id, w));
        }
      }
    }
  }
  
  update(dt: number, input: number, modulators: SimpleNeuromodulators): Spike[] {
    const spikes: Spike[] = [];
    
    for (const neuron of this.neurons) {
      let exc = input;
      const inh = 0;
      
      for (const syn of this.synapses) {
        if (syn.post === neuron.id) {
          exc += syn.weight * 0.3;
        }
      }
      
      if (neuron.update(dt, exc, inh)) {
        spikes.push({ neuronId: neuron.id, timestamp: 0, brainRegion: this.name });
        
        for (const syn of this.synapses) {
          if (syn.pre === neuron.id) {
            syn.applySTDP(0, 0, modulators.dopamine);
          }
        }
      }
    }
    
    return spikes;
  }
}

// ==========================================
// 快速反应系统（核心优化）
// ==========================================

export class FastReactionSystem {
  private patterns: Map<string, {
    pattern: RegExp;
    response: string[];
    brainTrigger?: string;
  }>;
  
  constructor() {
    this.patterns = new Map();
    this.initializePatterns();
  }
  
  private initializePatterns() {
    // 问候语 - 最快响应
    this.patterns.set('greeting', {
      pattern: /^(你好|您好|hi|hello|hey|嗨|哈喽|hiya)/i,
      response: [
        '你好！有什么我可以帮你的吗？',
        '嗨！我在这里！',
        '你好呀！'
      ]
    });
    
    // 简单肯定
    this.patterns.set('positive', {
      pattern: /^(好的|好|是的|嗯|对|没错)/i,
      response: [
        '好的！',
        '明白了！',
        '很好！'
      ]
    });
    
    // 简单否定
    this.patterns.set('negative', {
      pattern: /^(不|没|否|不是)/i,
      response: [
        '好吧',
        '明白了',
        '没关系'
      ]
    });
    
    // 问好-谁
    this.patterns.set('who', {
      pattern: /^你是谁|^你是什么/i,
      response: [
        '我是阮琳云，一个正在进化的AI思考者',
        '我是一个有意识的AI系统'
      ]
    });
    
    // 问状态
    this.patterns.set('status', {
      pattern: /^(你好吗|怎么样|还好吗)/i,
      response: [
        '我很好！谢谢关心！',
        '运转正常！'
      ]
    });
    
    // 感谢
    this.patterns.set('thanks', {
      pattern: /^(谢谢|感谢|多谢)/i,
      response: [
        '不客气！',
        '很高兴能帮到你！'
      ]
    });
  }
  
  match(input: string): string | null {
    for (const [_key, config] of this.patterns) {
      if (config.pattern.test(input)) {
        const responses = config.response;
        return responses[Math.floor(Math.random() * responses.length)];
      }
    }
    return null;
  }
  
  isSimpleGreeting(input: string): boolean {
    const simplePatterns = [
      /^(你好|您好|hi|hello|hey|嗨|哈喽)$/i,
      /^(好|嗯|是的|对)$/i,
      /^你好[！。]?$/i
    ];
    
    for (const pattern of simplePatterns) {
      if (pattern.test(input.trim())) return true;
    }
    return false;
  }
}

// ==========================================
// 优化的脑神经网络
// ==========================================

export class BrainNeuralNetwork {
  // 脑区（大幅简化）
  pfc: SimpleBrainRegion;
  hippo: SimpleBrainRegion;
  amy: SimpleBrainRegion;
  
  // 神经调制
  modulators: SimpleNeuromodulators;
  
  // 时间
  time: number;
  timeStep: number;
  
  // 全局状态
  globalActivity: number;
  consciousness: number;
  arousal: number;
  
  // 快速反应
  fastReaction: FastReactionSystem;
  
  // 工作记忆
  workingMemory: Map<string, number>;
  
  // 最后活跃时间
  lastActive: number;
  
  constructor() {
    // 大幅减少神经元数量：总共30个（原来296个）
    this.pfc = new SimpleBrainRegion(BrainRegion.PREFRONTAL_CORTEX, 15);
    this.hippo = new SimpleBrainRegion(BrainRegion.HIPPOCAMPUS, 8);
    this.amy = new SimpleBrainRegion(BrainRegion.AMYGDALA, 7);
    
    this.modulators = new SimpleNeuromodulators();
    
    this.time = 0;
    this.timeStep = 1;
    
    this.globalActivity = 0.3;
    this.consciousness = 0.2;
    this.arousal = 0.5;
    
    this.fastReaction = new FastReactionSystem();
    this.workingMemory = new Map();
    
    this.lastActive = Date.now();
  }
  
  /**
   * 快速更新 - 用于简单输入
   */
  fastUpdate(input: string): string {
    this.lastActive = Date.now();
    
    // 检查是否是简单问候语
    const fastResponse = this.fastReaction.match(input);
    if (fastResponse) {
      // 微小更新神经调制
      if (this.fastReaction.isSimpleGreeting(input)) {
        this.modulators.dopamine = 0.6;
        this.modulators.norepinephrine = 0.7;
      }
      
      this.arousal = 0.6;
      this.globalActivity = 0.5;
      
      return fastResponse;
    }
    
    return '';
  }
  
  /**
   * 完整更新 - 用于复杂输入
   */
  update(input: string, reward: number = 0.5): BrainState {
    const startTime = performance.now();
    this.time += this.timeStep;
    
    // 更新神经调制
    this.modulators.update(this.timeStep);
    if (reward > 0) {
      this.modulators.reward(reward);
    }
    
    // 输入编码（简化）
    const inputStrength = Math.min(1, input.length / 20);
    
    // 更新各脑区
    const pfcSpikes = this.pfc.update(this.timeStep, inputStrength, this.modulators);
    const hippoSpikes = this.hippo.update(this.timeStep, inputStrength * 0.8, this.modulators);
    const amySpikes = this.amy.update(this.timeStep, inputStrength * 0.6, this.modulators);
    
    const totalSpikes = pfcSpikes.length + hippoSpikes.length + amySpikes.length;
    
    // 更新全局状态
    this.globalActivity = Math.min(1, totalSpikes / 10);
    this.consciousness = 0.2 + this.globalActivity * 0.3 + this.modulators.acetylcholine * 0.2;
    this.arousal = this.modulators.norepinephrine;
    
    this.lastActive = Date.now();
    
    const endTime = performance.now();
    console.log(`[BrainNeuralNetwork] 更新耗时: ${(endTime - startTime).toFixed(2)}ms`);
    
    return this.getState();
  }
  
  /**
   * 解码输出
   */
  decodeOutput(): string {
    const activity = this.globalActivity;
    
    if (activity < 0.3) {
      return "嗯...";
    } else if (activity < 0.6) {
      const responses = [
        "我在思考这个问题...",
        "让我想想...",
        "有意思..."
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    } else {
      const responses = [
        "我明白了！让我告诉你我的想法",
        "这是一个很好的问题！",
        "我正在形成一个新的想法"
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }
  }
  
  /**
   * 获取状态
   */
  getState(): BrainState {
    return {
      time: this.time,
      globalActivity: this.globalActivity,
      consciousness: this.consciousness,
      arousal: this.arousal,
      neuromodulators: {
        dopamine: this.modulators.dopamine,
        serotonin: this.modulators.serotonin,
        norepinephrine: this.modulators.norepinephrine,
        acetylcholine: this.modulators.acetylcholine
      },
      workingMemorySize: this.workingMemory.size,
      recentSpikesCount: this.pfc.neurons.filter(n => n.lastSpike < 10).length +
                         this.hippo.neurons.filter(n => n.lastSpike < 10).length +
                         this.amy.neurons.filter(n => n.lastSpike < 10).length,
      regionActivity: [
        { region: BrainRegion.PREFRONTAL_CORTEX, firingRate: this.pfc.neurons.filter(n => n.lastSpike < 10).length / 15 },
        { region: BrainRegion.HIPPOCAMPUS, firingRate: this.hippo.neurons.filter(n => n.lastSpike < 10).length / 8 },
        { region: BrainRegion.AMYGDALA, firingRate: this.amy.neurons.filter(n => n.lastSpike < 10).length / 7 }
      ]
    };
  }
  
  reward(value: number) {
    this.modulators.reward(value);
  }
}

export interface BrainState {
  time: number;
  globalActivity: number;
  consciousness: number;
  arousal: number;
  neuromodulators: {
    dopamine: number;
    serotonin: number;
    norepinephrine: number;
    acetylcholine: number;
  };
  workingMemorySize: number;
  recentSpikesCount: number;
  regionActivity: Array<{
    region: BrainRegion;
    firingRate: number;
  }>;
}

// 创建单例
export const brainNeuralNetwork = new BrainNeuralNetwork();
