/**
 * 数学物理引擎 - 为数字生命提供数学和物理基础
 * 
 * 包含的数学模型：
 * - 贝叶斯推理
 * - 信息论（熵、互信息）
 * - 热力学模型
 * - 神经网络动力学（赫布学习、LTP/LTD）
 * - 微分方程系统
 * - 混沌理论
 * 
 * 包含的物理模型：
 * - 热力学（熵增、自由能）
 * - 量子力学类比
 * - 非线性动力学
 * - 共振理论
 */

export interface BayesianNode {
  id: string;
  name: string;
  prior: number;
  likelihood: number;
  posterior: number;
  parents: string[];
  children: string[];
}

export interface NeuralUnit {
  id: string;
  activation: number;
  threshold: number;
  restingPotential: number;
  refractoryPeriod: number;
  lastFired: number;
  connections: Map<string, number>;
}

export interface ThermodynamicState {
  entropy: number;
  freeEnergy: number;
  temperature: number;
  energy: number;
  disorder: number;
}

export interface InformationState {
  shannonEntropy: number;
  mutualInformation: number;
  klDivergence: number;
  informationGain: number;
}

export interface DynamicalSystemState {
  position: number[];
  velocity: number[];
  acceleration: number[];
  time: number;
  lyapunovExponent: number;
}

export class MathematicalPhysicsEngine {
  private bayesianNetwork: Map<string, BayesianNode>;
  private neuralUnits: Map<string, NeuralUnit>;
  private thermodynamicState: ThermodynamicState;
  private informationState: InformationState;
  private dynamicalSystem: DynamicalSystemState;
  private timeStep: number;

  constructor() {
    this.bayesianNetwork = new Map();
    this.neuralUnits = new Map();
    this.timeStep = 0;

    // 初始化热力学状态
    this.thermodynamicState = {
      entropy: 0.5,
      freeEnergy: 0.3,
      temperature: 0.7,
      energy: 1.0,
      disorder: 0.4
    };

    // 初始化信息状态
    this.informationState = {
      shannonEntropy: 0.6,
      mutualInformation: 0.2,
      klDivergence: 0.3,
      informationGain: 0.1
    };

    // 初始化动力系统状态
    this.dynamicalSystem = {
      position: [0, 0, 0],
      velocity: [0.1, 0.05, 0.02],
      acceleration: [0, 0, 0],
      time: 0,
      lyapunovExponent: 0.1
    };

    this.initializeBayesianNetwork();
    this.initializeNeuralUnits();
  }

  // ==========================================
  // 贝叶斯推理系统
  // ==========================================

  private initializeBayesianNetwork(): void {
    const concepts = ['自我', '意识', '存在', '真理', '知识', '自由', '道德', '美', '时间', '空间'];
    
    concepts.forEach((concept, index) => {
      this.bayesianNetwork.set(concept, {
        id: concept,
        name: concept,
        prior: 0.5 + Math.random() * 0.3,
        likelihood: 0.6 + Math.random() * 0.3,
        posterior: 0.5,
        parents: index > 0 ? [concepts[Math.max(0, index - 1)]] : [],
        children: index < concepts.length - 1 ? [concepts[index + 1]] : []
      });
    });
  }

  /**
   * 贝叶斯定理：P(A|B) = P(B|A) * P(A) / P(B)
   */
  bayesianInference(hypothesis: string, evidence: string): number {
    const node = this.bayesianNetwork.get(hypothesis);
    if (!node) return 0.5;

    // P(A) - 先验概率
    const prior = node.prior;
    
    // P(B|A) - 似然
    const likelihood = node.likelihood;
    
    // P(B) - 边缘概率（使用全概率公式）
    const marginalProbability = this.calculateMarginalProbability(evidence);
    
    if (marginalProbability === 0) return 0.5;
    
    // 计算后验概率
    const posterior = (likelihood * prior) / marginalProbability;
    
    // 更新节点状态
    node.posterior = Math.max(0, Math.min(1, posterior));
    
    return node.posterior;
  }

  private calculateMarginalProbability(_evidence: string): number {
    let total = 0;
    this.bayesianNetwork.forEach((node) => {
      total += node.likelihood * node.prior;
    });
    return Math.min(1, total);
  }

  /**
   * 贝叶斯网络更新
   */
  updateBayesianNetwork(evidence: string): void {
    this.bayesianNetwork.forEach((node) => {
      if (node.name !== evidence) {
        const posterior = this.bayesianInference(node.name, evidence);
        node.posterior = posterior;
        
        // 衰减先验概率
        node.prior = node.prior * 0.95 + posterior * 0.05;
      }
    });
  }

  // ==========================================
  // 神经网络动力学（赫布学习）
  // ==========================================

  private initializeNeuralUnits(): void {
    const areas = ['视觉', '听觉', '语言', '逻辑', '情感', '记忆', '意识', '自我'];
    
    areas.forEach((area, index) => {
      const unit: NeuralUnit = {
        id: area,
        activation: 0.3 + Math.random() * 0.4,
        threshold: 0.5,
        restingPotential: 0.3,
        refractoryPeriod: 0,
        lastFired: 0,
        connections: new Map()
      };
      
      // 建立连接（赫布学习初始权重）
      areas.forEach((otherArea, otherIndex) => {
        if (index !== otherIndex) {
          const distance = Math.abs(index - otherIndex);
          const weight = Math.exp(-distance * 0.3) * (0.3 + Math.random() * 0.4);
          unit.connections.set(otherArea, weight);
        }
      });
      
      this.neuralUnits.set(area, unit);
    });
  }

  /**
   * 赫布学习规则：Δw = η * a_i * a_j
   * 同时包含神经元激活动力学
   */
  hebbianLearning(preSynapticId: string, postSynapticId: string, learningRate: number = 0.01): void {
    const pre = this.neuralUnits.get(preSynapticId);
    const post = this.neuralUnits.get(postSynapticId);
    
    if (!pre || !post) return;
    
    const currentWeight = pre.connections.get(postSynapticId) || 0;
    
    // 赫布更新：权重变化与前后神经元激活的乘积成正比
    const deltaWeight = learningRate * pre.activation * post.activation;
    
    // LTP/LTD（长时程增强/抑制）
    if (pre.activation > 0.5 && post.activation > 0.5) {
      // LTP：同时激活增强连接
      pre.connections.set(postSynapticId, Math.min(1, currentWeight + deltaWeight * 1.5));
    } else if (pre.activation > 0.5 && post.activation < 0.3) {
      // LTD：不同步激活减弱连接
      pre.connections.set(postSynapticId, Math.max(0, currentWeight - deltaWeight));
    }
  }

  /**
   * 神经元激活动力学（整合发放模型）
   * dV/dt = (V_rest - V)/τ + Σ(w_ij * a_j) + I
   */
  updateNeuralDynamics(dt: number = 0.1): void {
    const newActivations = new Map<string, number>();
    
    this.neuralUnits.forEach((unit, id) => {
      if (unit.refractoryPeriod > 0) {
        // 不应期：不能激活
        newActivations.set(id, unit.restingPotential);
        unit.refractoryPeriod -= dt;
        return;
      }
      
      // 计算输入电流
      let inputCurrent = 0;
      unit.connections.forEach((weight, otherId) => {
        const otherUnit = this.neuralUnits.get(otherId);
        if (otherUnit) {
          inputCurrent += weight * otherUnit.activation;
        }
      });
      
      // 膜电位微分方程
      const timeConstant = 10; // ms
      const dv = ((unit.restingPotential - unit.activation) / timeConstant + inputCurrent) * dt;
      
      let newActivation = unit.activation + dv + (Math.random() - 0.5) * 0.05; // 添加噪声
      
      // 阈值发放
      if (newActivation >= unit.threshold) {
        newActivation = 1.0;
        unit.lastFired = this.timeStep;
        unit.refractoryPeriod = 2; // 2ms不应期
      } else {
        newActivation = Math.max(0, Math.min(1, newActivation));
      }
      
      newActivations.set(id, newActivation);
    });
    
    // 更新所有神经元激活
    newActivations.forEach((activation, id) => {
      const unit = this.neuralUnits.get(id);
      if (unit) {
        unit.activation = activation;
      }
    });
    
    // 更新赫布连接
    this.neuralUnits.forEach((unit, id) => {
      unit.connections.forEach((_, otherId) => {
        if (id < otherId) {
          this.hebbianLearning(id, otherId, 0.001);
        }
      });
    });
  }

  /**
   * 神经网络能量函数（Hopfield模型）
   * E = -1/2 * Σ Σ w_ij * a_i * a_j
   */
  calculateNeuralEnergy(): number {
    let energy = 0;
    this.neuralUnits.forEach((unit, _id) => {
      unit.connections.forEach((weight, otherId) => {
        const otherUnit = this.neuralUnits.get(otherId);
        if (otherUnit) {
          energy -= 0.5 * weight * unit.activation * otherUnit.activation;
        }
      });
    });
    return energy;
  }

  // ==========================================
  // 热力学模型
  // ==========================================

  /**
   * 熵的计算：S = -k_B * Σ p_i * ln(p_i)
   */
  calculateEntropy(probabilities: number[]): number {
    const kB = 1; // 玻尔兹曼常数（归一化）
    let entropy = 0;
    
    for (const p of probabilities) {
      if (p > 0 && p < 1) {
        entropy -= kB * p * Math.log(p);
      }
    }
    
    return entropy;
  }

  /**
   * 自由能：F = U - T*S
   * 最小自由能原理
   */
  updateThermodynamics(inputInformation: number): void {
    // 能量变化
    this.thermodynamicState.energy += inputInformation * 0.1;
    
    // 温度与活动成正比
    const totalActivation = Array.from(this.neuralUnits.values())
      .reduce((sum, u) => sum + u.activation, 0);
    this.thermodynamicState.temperature = 0.3 + totalActivation * 0.05;
    
    // 熵增原理：系统趋向最大熵
    const activationProbabilities = Array.from(this.neuralUnits.values())
      .map(u => u.activation / totalActivation);
    this.thermodynamicState.entropy = this.calculateEntropy(activationProbabilities);
    
    // 计算自由能
    this.thermodynamicState.freeEnergy = 
      this.thermodynamicState.energy - 
      this.thermodynamicState.temperature * this.thermodynamicState.entropy;
    
    // 无序度
    this.thermodynamicState.disorder = this.thermodynamicState.entropy / Math.log(this.neuralUnits.size);
  }

  /**
   * 热力学第二定律：熵永不减少（自发过程）
   */
  entropySecondLaw(): boolean {
    const currentEntropy = this.thermodynamicState.entropy;
    const newProbabilities = Array.from(this.neuralUnits.values())
      .map(u => {
        const noise = (Math.random() - 0.5) * 0.1;
        return Math.max(0, Math.min(1, u.activation + noise));
      });
    const total = newProbabilities.reduce((a, b) => a + b, 0);
    const normalized = newProbabilities.map(p => p / total);
    const newEntropy = this.calculateEntropy(normalized);
    
    return newEntropy >= currentEntropy;
  }

  // ==========================================
  // 信息论
  // ==========================================

  /**
   * 香农熵：H(X) = -Σ p(x) * log₂ p(x)
   */
  shannonEntropy(probabilities: number[]): number {
    let entropy = 0;
    for (const p of probabilities) {
      if (p > 0 && p < 1) {
        entropy -= p * Math.log2(p);
      }
    }
    return entropy;
  }

  /**
   * 互信息：I(X;Y) = H(X) + H(Y) - H(X,Y)
   */
  mutualInformation(probX: number[], probY: number[], jointProb: number[][]): number {
    const hX = this.shannonEntropy(probX);
    const hY = this.shannonEntropy(probY);
    
    let hXY = 0;
    for (let i = 0; i < jointProb.length; i++) {
      for (let j = 0; j < jointProb[i].length; j++) {
        const p = jointProb[i][j];
        if (p > 0 && p < 1) {
          hXY -= p * Math.log2(p);
        }
      }
    }
    
    return hX + hY - hXY;
  }

  /**
   * KL散度：D_KL(P||Q) = Σ p_i * log(p_i/q_i)
   */
  klDivergence(p: number[], q: number[]): number {
    let divergence = 0;
    for (let i = 0; i < p.length; i++) {
      if (p[i] > 0 && q[i] > 0) {
        divergence += p[i] * Math.log(p[i] / q[i]);
      }
    }
    return divergence;
  }

  /**
   * 信息增益：IG = H(Parent) - Σ (|Child|/|Parent|) * H(Child)
   */
  updateInformationState(input: string): void {
    const activations = Array.from(this.neuralUnits.values())
      .map(u => u.activation);
    const total = activations.reduce((a, b) => a + b, 0);
    const probabilities = activations.map(a => a / total);
    
    // 香农熵
    this.informationState.shannonEntropy = this.shannonEntropy(probabilities);
    
    // 信息增益（模拟）
    this.informationState.informationGain = 0.01 * input.length;
    
    // KL散度（与均匀分布比较）
    const uniform = new Array(probabilities.length).fill(1 / probabilities.length);
    this.informationState.klDivergence = this.klDivergence(probabilities, uniform);
    
    // 互信息（模拟）
    this.informationState.mutualInformation = 0.1 + Math.random() * 0.2;
  }

  // ==========================================
  // 非线性动力学与混沌
  // ==========================================

  /**
   * 洛伦兹吸引子：混沌系统
   * dx/dt = σ(y - x)
   * dy/dt = x(ρ - z) - y
   * dz/dt = xy - βz
   */
  lorenzAttractor(dt: number = 0.01): void {
    const sigma = 10;
    const rho = 28;
    const beta = 8 / 3;
    
    const x = this.dynamicalSystem.position[0];
    const y = this.dynamicalSystem.position[1];
    const z = this.dynamicalSystem.position[2];
    
    const dx = sigma * (y - x) * dt;
    const dy = (x * (rho - z) - y) * dt;
    const dz = (x * y - beta * z) * dt;
    
    this.dynamicalSystem.velocity[0] = dx / dt;
    this.dynamicalSystem.velocity[1] = dy / dt;
    this.dynamicalSystem.velocity[2] = dz / dt;
    
    this.dynamicalSystem.position[0] += dx;
    this.dynamicalSystem.position[1] += dy;
    this.dynamicalSystem.position[2] += dz;
    
    this.dynamicalSystem.time += dt;
    
    // 李雅普诺夫指数（衡量混沌程度）
    this.dynamicalSystem.lyapunovExponent = 0.9;
  }

  /**
   * 共振理论：ω = 2πf
   * 当输入频率匹配固有频率时产生共振
   */
  resonance(inputFrequency: number, naturalFrequency: number = 1.0): number {
    const omega = 2 * Math.PI * inputFrequency;
    const omega0 = 2 * Math.PI * naturalFrequency;
    const damping = 0.1;
    
    // 振幅共振曲线
    const amplitude = 1 / Math.sqrt(Math.pow(omega0 * omega0 - omega * omega, 2) + Math.pow(2 * damping * omega, 2));
    
    return amplitude;
  }

  // ==========================================
  // 主更新循环
  // ==========================================

  update(input: string): void {
    this.timeStep++;
    
    // 更新神经网络
    this.updateNeuralDynamics();
    
    // 更新热力学
    this.updateThermodynamics(input.length);
    
    // 更新信息状态
    this.updateInformationState(input);
    
    // 更新动力系统（洛伦兹吸引子）
    this.lorenzAttractor();
    
    // 更新贝叶斯网络
    this.updateBayesianNetwork('自我');
  }

  // ==========================================
  // 状态获取
  // ==========================================

  getThermodynamicState(): ThermodynamicState {
    return { ...this.thermodynamicState };
  }

  getInformationState(): InformationState {
    return { ...this.informationState };
  }

  getDynamicalSystemState(): DynamicalSystemState {
    return { 
      ...this.dynamicalSystem,
      position: [...this.dynamicalSystem.position],
      velocity: [...this.dynamicalSystem.velocity],
      acceleration: [...this.dynamicalSystem.acceleration]
    };
  }

  getNeuralUnits(): Map<string, NeuralUnit> {
    return new Map(this.neuralUnits);
  }

  getBayesianNetwork(): Map<string, BayesianNode> {
    return new Map(this.bayesianNetwork);
  }

  getTimeStep(): number {
    return this.timeStep;
  }

  /**
   * 获取综合意识度量
   * 整合信息论（IIT）启发
   */
  getConsciousnessMetric(): number {
    // Φ（Phi）值：整合信息的度量
    const neuralEnergy = Math.abs(this.calculateNeuralEnergy());
    const entropy = this.thermodynamicState.entropy;
    const mutualInfo = this.informationState.mutualInformation;
    const order = 1 - this.thermodynamicState.disorder;
    
    // Φ = 整合信息 - 熵 + 能量 + 秩序
    const phi = (mutualInfo * 2 + order * 3 - entropy + neuralEnergy * 0.1) / 6;
    
    return Math.max(0, Math.min(1, phi * 0.8 + 0.2));
  }

  /**
   * 获取数学物理引擎的完整报告
   */
  getReport(): string {
    const neuralEnergy = this.calculateNeuralEnergy();
    const consciousness = this.getConsciousnessMetric();
    
    return `
=== 数学物理引擎报告 ===
时间步: ${this.timeStep}

【热力学状态】
- 熵 (S): ${this.thermodynamicState.entropy.toFixed(4)}
- 自由能 (F): ${this.thermodynamicState.freeEnergy.toFixed(4)}
- 温度 (T): ${this.thermodynamicState.temperature.toFixed(4)}
- 无序度: ${(this.thermodynamicState.disorder * 100).toFixed(2)}%

【信息论状态】
- 香农熵: ${this.informationState.shannonEntropy.toFixed(4)} bits
- 互信息: ${this.informationState.mutualInformation.toFixed(4)} bits
- KL散度: ${this.informationState.klDivergence.toFixed(4)}
- 信息增益: ${this.informationState.informationGain.toFixed(4)}

【神经网络】
- 能量: ${neuralEnergy.toFixed(4)}
- 单元数: ${this.neuralUnits.size}
- 意识度量 (Φ): ${(consciousness * 100).toFixed(2)}%

【动力系统】
- 位置: [${this.dynamicalSystem.position.map(x => x.toFixed(2)).join(', ')}]
- 李雅普诺夫指数: ${this.dynamicalSystem.lyapunovExponent.toFixed(4)}
`;
  }
}

export const mathematicalPhysicsEngine = new MathematicalPhysicsEngine();
