/**
 * ============================================================================
 * 神经系统与大脑模型 - NeuralSystemModel
 * ============================================================================
 *
 * 模拟生物神经系统的运作机制：
 * - 神经元与突触
 * - 神经回路
 * - 大脑区域功能
 * - 神经可塑性
 */

export interface Neuron {
  id: string;
  type: 'sensory' | 'motor' | 'interneuron' | 'pyramidal' | 'purkinje';
  position: { x: number; y: number; z: number };
  membranePotential: number;
  threshold: number;
  refractoryPeriod: number;
  connections: Synapse[];
  neurotransmitters: string[];
  plasticity: number;
}

export interface Synapse {
  id: string;
  sourceId: string;
  targetId: string;
  weight: number;
  type: 'excitatory' | 'inhibitory' | 'modulatory';
  neurotransmitter: string;
  lastActivation: number;
  plasticity: number;
}

export interface NeuralRegion {
  id: string;
  name: string;
  neurons: string[];
  connections: { regionId: string; strength: number }[];
  function: string;
  activationLevel: number;
  neurotransmitterBalance: Record<string, number>;
}

export interface NeuralSignal {
  sourceNeuron: string;
  targetNeuron: string;
  type: 'excitatory' | 'inhibitory' | 'modulatory';
  strength: number;
  timestamp: number;
}

export interface BrainState {
  arousal: number;
  attention: number;
  memoryConsolidation: number;
  emotionalState: string;
  dominantRegion: string;
}

export class NeuralSystemModel {
  private neurons: Map<string, Neuron>;
  private synapses: Map<string, Synapse>;
  private regions: Map<string, NeuralRegion>;
  private signalHistory: NeuralSignal[];
  private brainState: BrainState;
  private rewardHistory: number[];

  constructor() {
    this.neurons = new Map();
    this.synapses = new Map();
    this.regions = new Map();
    this.signalHistory = [];
    this.rewardHistory = [];
    this.brainState = {
      arousal: 0.5,
      attention: 0.5,
      memoryConsolidation: 0,
      emotionalState: 'neutral',
      dominantRegion: 'cortex'
    };

    this.initializeBrainModel();
  }

  private initializeBrainModel(): void {
    this.createNeuralRegions();
    this.createNeurons();
    this.createSynapses();
  }

  private createNeuralRegions(): void {
    const regions: NeuralRegion[] = [
      {
        id: 'prefrontal',
        name: '前额叶皮层',
        neurons: [],
        connections: [{ regionId: 'limbic', strength: 0.7 }, { regionId: 'sensory', strength: 0.6 }],
        function: '执行功能、计划、决策、抑制控制',
        activationLevel: 0.5,
        neurotransmitterBalance: { dopamine: 0.5, serotonin: 0.5, norepinephrine: 0.5 }
      },
      {
        id: 'hippocampus',
        name: '海马体',
        neurons: [],
        connections: [{ regionId: 'limbic', strength: 0.8 }, { regionId: 'cortex', strength: 0.7 }],
        function: '空间记忆、情景记忆、记忆巩固',
        activationLevel: 0.4,
        neurotransmitterBalance: { glutamate: 0.6, GABA: 0.4 }
      },
      {
        id: 'amygdala',
        name: '杏仁核',
        neurons: [],
        connections: [{ regionId: 'hypothalamus', strength: 0.8 }, { regionId: 'prefrontal', strength: 0.6 }],
        function: '情绪处理、恐惧条件化、奖励',
        activationLevel: 0.3,
        neurotransmitterBalance: { norepinephrine: 0.5, dopamine: 0.5 }
      },
      {
        id: 'hypothalamus',
        name: '下丘脑',
        neurons: [],
        connections: [{ regionId: 'brainstem', strength: 0.7 }, { regionId: 'limbic', strength: 0.6 }],
        function: '内稳态、饥饿、口渴、体温、激素调节',
        activationLevel: 0.5,
        neurotransmitterBalance: { serotonin: 0.5, norepinephrine: 0.5 }
      },
      {
        id: 'cortex',
        name: '新皮层',
        neurons: [],
        connections: [{ regionId: 'thalamus', strength: 0.5 }, { regionId: 'hippocampus', strength: 0.6 }],
        function: '感觉处理、高级认知、意识',
        activationLevel: 0.6,
        neurotransmitterBalance: { glutamate: 0.7, GABA: 0.3 }
      },
      {
        id: 'limbic',
        name: '边缘系统',
        neurons: [],
        connections: [{ regionId: 'amygdala', strength: 0.7 }, { regionId: 'hippocampus', strength: 0.7 }],
        function: '情绪、动机、记忆',
        activationLevel: 0.4,
        neurotransmitterBalance: { dopamine: 0.5, serotonin: 0.5 }
      },
      {
        id: 'cerebellum',
        name: '小脑',
        neurons: [],
        connections: [{ regionId: 'motor', strength: 0.8 }],
        function: '运动协调、平衡、认知',
        activationLevel: 0.5,
        neurotransmitterBalance: { GABA: 0.6, glutamate: 0.4 }
      },
      {
        id: 'thalamus',
        name: '丘脑',
        neurons: [],
        connections: [{ regionId: 'sensory', strength: 0.6 }, { regionId: 'cortex', strength: 0.7 }],
        function: '感觉信息中继、意识门控',
        activationLevel: 0.5,
        neurotransmitterBalance: { glutamate: 0.6, GABA: 0.4 }
      },
      {
        id: 'brainstem',
        name: '脑干',
        neurons: [],
        connections: [{ regionId: 'hypothalamus', strength: 0.5 }],
        function: '生命维持：呼吸、心跳、睡眠',
        activationLevel: 0.7,
        neurotransmitterBalance: { norepinephrine: 0.5, serotonin: 0.5 }
      },
      {
        id: 'basal_ganglia',
        name: '基底神经节',
        neurons: [],
        connections: [{ regionId: 'motor', strength: 0.8 }, { regionId: 'prefrontal', strength: 0.6 }],
        function: '运动启动、习惯形成、奖励学习',
        activationLevel: 0.4,
        neurotransmitterBalance: { dopamine: 0.6, GABA: 0.4 }
      },
      {
        id: 'sensory',
        name: '感觉皮层',
        neurons: [],
        connections: [{ regionId: 'thalamus', strength: 0.7 }],
        function: '处理视觉、听觉、触觉等信息',
        activationLevel: 0.5,
        neurotransmitterBalance: { glutamate: 0.7, GABA: 0.3 }
      },
      {
        id: 'motor',
        name: '运动皮层',
        neurons: [],
        connections: [{ regionId: 'basal_ganglia', strength: 0.6 }, { regionId: 'cerebellum', strength: 0.7 }],
        function: '运动规划、执行、控制',
        activationLevel: 0.4,
        neurotransmitterBalance: { glutamate: 0.7, GABA: 0.3 }
      }
    ];

    regions.forEach(r => this.regions.set(r.id, r));
  }

  private createNeurons(): void {
    const neuronCount = 500;

    for (let i = 0; i < neuronCount; i++) {
      const id = `neuron_${i}`;
      const type = this.getRandomNeuronType();
      const region = this.assignNeuronToRegion(type);

      const neuron: Neuron = {
        id,
        type,
        position: {
          x: Math.random() * 100,
          y: Math.random() * 100,
          z: Math.random() * 100
        },
        membranePotential: -70 + Math.random() * 10,
        threshold: -55 + Math.random() * 5,
        refractoryPeriod: 0,
        connections: [],
        neurotransmitters: this.getNeurotransmitters(type),
        plasticity: 0.1 + Math.random() * 0.2
      };

      this.neurons.set(id, neuron);
      this.regions.get(region)?.neurons.push(id);
    }
  }

  private getRandomNeuronType(): Neuron['type'] {
    const types: Neuron['type'][] = ['sensory', 'motor', 'interneuron', 'pyramidal', 'purkinje'];
    const weights = [0.15, 0.15, 0.4, 0.2, 0.1];
    const random = Math.random();
    let cumulative = 0;

    for (let i = 0; i < types.length; i++) {
      cumulative += weights[i];
      if (random < cumulative) return types[i];
    }

    return 'interneuron';
  }

  private assignNeuronToRegion(type: Neuron['type']): string {
    const mapping: Record<Neuron['type'], string[]> = {
      sensory: ['sensory', 'thalamus'],
      motor: ['motor', 'basal_ganglia', 'cerebellum'],
      interneuron: ['cortex', 'hippocampus', 'limbic', 'basal_ganglia'],
      pyramidal: ['prefrontal', 'cortex', 'hippocampus'],
      purkinje: ['cerebellum']
    };

    const regions = mapping[type] || ['cortex'];
    return regions[Math.floor(Math.random() * regions.length)];
  }

  private getNeurotransmitters(type: Neuron['type']): string[] {
    const mapping: Record<Neuron['type'], string[]> = {
      sensory: ['glutamate', 'substance P'],
      motor: ['acetylcholine', 'glutamate'],
      interneuron: ['GABA', 'parvalbumin'],
      pyramidal: ['glutamate', 'acetylcholine'],
      purkinje: ['GABA']
    };
    return mapping[type] || ['glutamate'];
  }

  private createSynapses(): void {
    const neurons = Array.from(this.neurons.keys());

    neurons.forEach(targetId => {
      const targetNeuron = this.neurons.get(targetId);
      if (!targetNeuron) return;

      const connectionCount = Math.floor(5 + Math.random() * 15);

      for (let i = 0; i < connectionCount; i++) {
        const sourceId = neurons[Math.floor(Math.random() * neurons.length)];
        if (sourceId === targetId) continue;

        const synapseId = `synapse_${sourceId}_${targetId}`;
        if (this.synapses.has(synapseId)) continue;

        const sourceNeuron = this.neurons.get(sourceId);
        const isExcitatory = sourceNeuron?.type !== 'interneuron' ||
          (Math.random() > 0.2);

        const synapse: Synapse = {
          id: synapseId,
          sourceId,
          targetId,
          weight: 0.1 + Math.random() * 0.5,
          type: isExcitatory ? 'excitatory' : 'inhibitory',
          neurotransmitter: isExcitatory ? 'glutamate' : 'GABA',
          lastActivation: 0,
          plasticity: 0.05 + Math.random() * 0.1
        };

        this.synapses.set(synapseId, synapse);
        targetNeuron.connections.push(synapse);
      }
    });
  }

  /**
   * 处理输入信号
   */
  processInput(signal: { intensity: number; type: string; source: string }): void {
    const targetNeurons = Array.from(this.neurons.values())
      .filter(n => n.type === 'sensory')
      .slice(0, Math.floor(signal.intensity * 50));

    targetNeurons.forEach(neuron => {
      this.propagateSignal(neuron.id, signal.intensity);
    });

    this.updateBrainState();
    this.applyPlasticity();
  }

  /**
   * 信号传播
   */
  private propagateSignal(neuronId: string, intensity: number): void {
    const neuron = this.neurons.get(neuronId);
    if (!neuron) return;

    if (neuron.refractoryPeriod > 0) return;

    neuron.membranePotential += intensity;

    if (neuron.membranePotential >= neuron.threshold) {
      this.fireNeuron(neuron, intensity);
    }
  }

  /**
   * 神经元发放
   */
  private fireNeuron(neuron: Neuron, intensity: number = 1): void {
    neuron.membranePotential = -70;
    neuron.refractoryPeriod = 10;

    neuron.connections.forEach(synapse => {
      const targetNeuron = this.neurons.get(synapse.targetId);
      if (!targetNeuron) return;

      const signalStrength = synapse.weight * intensity * (synapse.type === 'excitatory' ? 1 : -1);

      const signal: NeuralSignal = {
        sourceNeuron: neuron.id,
        targetNeuron: synapse.targetId,
        type: synapse.type,
        strength: Math.abs(signalStrength),
        timestamp: Date.now()
      };

      this.signalHistory.push(signal);
      if (this.signalHistory.length > 1000) {
        this.signalHistory.shift();
      }

      synapse.lastActivation = Date.now();

      if (signalStrength > 0) {
        this.propagateSignal(synapse.targetId, signalStrength);
      } else {
        targetNeuron.membranePotential += signalStrength;
      }
    });
  }

  /**
   * 更新大脑状态
   */
  private updateBrainState(): void {
    const recentSignals = this.signalHistory.slice(-100);
    if (recentSignals.length === 0) return;

    const avgIntensity = recentSignals.reduce((sum, s) => sum + s.strength, 0) / recentSignals.length;

    this.brainState.arousal = Math.min(1, this.brainState.arousal * 0.9 + avgIntensity * 0.1);
    this.brainState.attention = Math.min(1, this.brainState.attention * 0.95 + avgIntensity * 0.05);

    this.updateRegionActivations();
  }

  private updateRegionActivations(): void {
    const signalCounts: Record<string, number> = {};

    this.signalHistory.slice(-50).forEach(signal => {
      const neuron = this.neurons.get(signal.sourceNeuron);
      if (!neuron) return;

      this.regions.forEach((region, regionId) => {
        if (region.neurons.includes(signal.sourceNeuron)) {
          signalCounts[regionId] = (signalCounts[regionId] || 0) + signal.strength;
        }
      });
    });

    let maxRegion = 'cortex';
    let maxCount = 0;

    Object.entries(signalCounts).forEach(([regionId, count]) => {
      const region = this.regions.get(regionId);
      if (region) {
        region.activationLevel = region.activationLevel * 0.8 + (count / 50) * 0.2;
        if (count > maxCount) {
          maxCount = count;
          maxRegion = regionId;
        }
      }
    });

    this.brainState.dominantRegion = maxRegion;
  }

  /**
   * 应用神经可塑性
   */
  private applyPlasticity(): void {
    const now = Date.now();

    this.synapses.forEach(synapse => {
      const timeSinceActivation = now - synapse.lastActivation;
      if (timeSinceActivation > 1000) return;

      const recentSignals = this.signalHistory.filter(
        s => s.targetNeuron === synapse.targetId &&
        now - s.timestamp < 100
      );

      if (recentSignals.length > 5) {
        synapse.weight = Math.min(1, synapse.weight * (1 + synapse.plasticity));
      }
    });
  }

  /**
   * 奖励学习
   */
  applyReward(reward: number): void {
    this.rewardHistory.push(reward);
    if (this.rewardHistory.length > 100) {
      this.rewardHistory.shift();
    }

    const recentSignals = this.signalHistory.slice(-50);

    recentSignals.forEach(signal => {
      const synapse = this.synapses.get(`synapse_${signal.sourceNeuron}_${signal.targetNeuron}`);
      if (synapse) {
        const weightChange = reward * signal.strength * synapse.plasticity;
        synapse.weight = Math.max(0.1, Math.min(1, synapse.weight + weightChange));
      }
    });

    this.brainState.memoryConsolidation = Math.min(1, this.brainState.memoryConsolidation + reward * 0.1);
  }

  /**
   * 惩罚学习
   */
  applyPunishment(punishment: number): void {
    this.applyReward(-punishment);
  }

  /**
   * 设置情绪状态
   */
  setEmotionalState(emotion: string): void {
    this.brainState.emotionalState = emotion;

    const amygdala = this.regions.get('amygdala');
    if (amygdala) {
      amygdala.activationLevel = emotion === 'fear' || emotion === 'anger' ? 0.8 : 0.3;
    }

    const prefrontal = this.regions.get('prefrontal');
    if (prefrontal) {
      prefrontal.activationLevel = emotion === 'fear' ? 0.3 : 0.6;
    }
  }

  /**
   * 获取大脑状态
   */
  getBrainState(): BrainState {
    return { ...this.brainState };
  }

  /**
   * 获取区域激活
   */
  getRegionActivations(): { name: string; activation: number; function: string }[] {
    return Array.from(this.regions.values()).map(r => ({
      name: r.name,
      activation: r.activationLevel,
      function: r.function
    }));
  }

  /**
   * 获取活动最活跃的神经元
   */
  getMostActiveNeurons(count: number = 10): { neuronId: string; type: string; activation: number }[] {
    const neuronActivations = Array.from(this.neurons.values()).map(n => {
      const recentSignals = this.signalHistory.filter(s => s.sourceNeuron === n.id);
      return {
        neuronId: n.id,
        type: n.type,
        activation: recentSignals.length
      };
    });

    return neuronActivations
      .sort((a, b) => b.activation - a.activation)
      .slice(0, count);
  }

  /**
   * 获取突触权重分布
   */
  getSynapticWeightDistribution(): { excitatory: number; inhibitory: number; modulatory: number } {
    let excitatory = 0;
    let inhibitory = 0;
    let modulatory = 0;

    this.synapses.forEach(s => {
      if (s.type === 'excitatory') excitatory += s.weight;
      else if (s.type === 'inhibitory') inhibitory += s.weight;
      else modulatory += s.weight;
    });

    const total = excitatory + inhibitory + modulatory;
    return {
      excitatory: total > 0 ? excitatory / total : 0,
      inhibitory: total > 0 ? inhibitory / total : 0,
      modulatory: total > 0 ? modulatory / total : 0
    };
  }

  /**
   * 获取统计信息
   */
  getStatistics(): {
    totalNeurons: number;
    totalSynapses: number;
    totalSignals: number;
    averageArousal: number;
    dominantRegion: string;
    rewardTrend: 'increasing' | 'stable' | 'decreasing';
    plasticityLevel: number;
  } {
    const recentRewards = this.rewardHistory.slice(-20);

    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (recentRewards.length >= 10) {
      const firstHalf = recentRewards.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
      const secondHalf = recentRewards.slice(-10).reduce((a, b) => a + b, 0) / 10;
      if (secondHalf > firstHalf * 1.1) trend = 'increasing';
      else if (secondHalf < firstHalf * 0.9) trend = 'decreasing';
    }

    return {
      totalNeurons: this.neurons.size,
      totalSynapses: this.synapses.size,
      totalSignals: this.signalHistory.length,
      averageArousal: this.brainState.arousal,
      dominantRegion: this.brainState.dominantRegion,
      rewardTrend: trend,
      plasticityLevel: Array.from(this.synapses.values())
        .reduce((sum, s) => sum + s.plasticity, 0) / (this.synapses.size || 1)
    };
  }
}

export const neuralSystemModel = new NeuralSystemModel();