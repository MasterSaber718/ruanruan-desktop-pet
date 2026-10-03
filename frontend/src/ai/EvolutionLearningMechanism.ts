/**
 * ============================================================================
 * 进化与学习机制 - EvolutionLearningMechanism
 * ============================================================================
 *
 * 模拟生物进化和学习的过程：
 * - 遗传算法
 * - 强化学习
 * - 适应性进化
 * - 知识涌现
 */

export interface Genome {
  id: string;
  genes: Gene[];
  fitness: number;
  age: number;
  generation: number;
}

export interface Gene {
  id: string;
  name: string;
  value: number;
  mutationRate: number;
  category: 'behavioral' | 'cognitive' | 'social' | 'adaptive';
}

export interface LearningExperience {
  id: string;
  situation: string;
  action: string;
  outcome: string;
  reward: number;
  timestamp: number;
  abstracted: boolean;
}

export interface Adaptation {
  id: string;
  trigger: string;
  response: string;
  success: number;
  timesUsed: number;
  lastUsed: number;
}

export interface EvolutionEvent {
  type: 'mutation' | 'crossover' | 'selection' | 'emergence';
  description: string;
  timestamp: number;
  fitnessChange: number;
}

export interface KnowledgePattern {
  id: string;
  pattern: string;
  contexts: string[];
  applications: number;
  abstractionLevel: number;
  formedAt: number;
}

export class EvolutionLearningMechanism {
  private population: Genome[] = [];
  private currentGenome!: Genome;
  private learningHistory: LearningExperience[] = [];
  private adaptations: Adaptation[];
  private knowledgePatterns: KnowledgePattern[];
  private evolutionEvents: EvolutionEvent[];
  private generationCount: number;
  private learningRate: number;
  private mutationRate: number;
  private crossoverRate: number;

  constructor() {
    this.population = [];
    this.learningHistory = [];
    this.adaptations = [];
    this.knowledgePatterns = [];
    this.evolutionEvents = [];
    this.generationCount = 0;
    this.learningRate = 0.3;
    this.mutationRate = 0.05;
    this.crossoverRate = 0.7;

    this.initializePopulation();
  }

  private initializePopulation(): void {
    const initialGenes: Gene[] = [
      { id: 'curiosity', name: '好奇心强度', value: 0.6, mutationRate: 0.1, category: 'behavioral' },
      { id: 'caution', name: '谨慎程度', value: 0.5, mutationRate: 0.1, category: 'behavioral' },
      { id: 'social', name: '社交倾向', value: 0.5, mutationRate: 0.08, category: 'social' },
      { id: 'memory', name: '记忆强度', value: 0.7, mutationRate: 0.05, category: 'cognitive' },
      { id: 'abstract', name: '抽象能力', value: 0.5, mutationRate: 0.08, category: 'cognitive' },
      { id: 'flexibility', name: '灵活性', value: 0.6, mutationRate: 0.1, category: 'adaptive' },
      { id: 'persistence', name: '坚持度', value: 0.5, mutationRate: 0.07, category: 'behavioral' },
      { id: 'creativity', name: '创造力', value: 0.4, mutationRate: 0.12, category: 'cognitive' },
      { id: 'patience', name: '耐心程度', value: 0.6, mutationRate: 0.06, category: 'behavioral' },
      { id: 'empathy', name: '共情能力', value: 0.5, mutationRate: 0.09, category: 'social' }
    ];

    this.currentGenome = {
      id: `genome_${Date.now()}`,
      genes: initialGenes,
      fitness: 0.5,
      age: 0,
      generation: 0
    };

    this.population.push(this.currentGenome);
  }

  /**
   * 记录学习经验
   */
  recordExperience(situation: string, action: string, outcome: string, reward: number): void {
    const experience: LearningExperience = {
      id: `exp_${Date.now()}_${Math.random()}`,
      situation,
      action,
      outcome,
      reward,
      timestamp: Date.now(),
      abstracted: false
    };

    this.learningHistory.push(experience);
    if (this.learningHistory.length > 500) {
      this.learningHistory.shift();
    }

    this.updateGenomeBasedOnReward(reward);
    this.evolveKnowledgePatterns(situation, action, outcome, reward);
    this.applyNaturalSelection();

    if (Math.random() < this.mutationRate) {
      this.applyMutation();
    }
  }

  private updateGenomeBasedOnReward(reward: number): void {
    const adaptationGenes = ['flexibility', 'persistence', 'creativity'];

    adaptationGenes.forEach(geneId => {
      const gene = this.currentGenome.genes.find(g => g.id === geneId);
      if (gene) {
        const change = reward * gene.mutationRate * this.learningRate;
        gene.value = Math.max(0, Math.min(1, gene.value + change));
      }
    });

    this.currentGenome.fitness = this.calculateFitness();
  }

  private calculateFitness(): number {
    const recentRewards = this.learningHistory.slice(-50);
    if (recentRewards.length === 0) return 0.5;

    const avgReward = recentRewards.reduce((sum, e) => sum + e.reward, 0) / recentRewards.length;
    const rewardVariance = this.calculateVariance(recentRewards.map(e => e.reward));
    const consistency = 1 - Math.min(1, rewardVariance);

    const successfulAdaptations = this.adaptations.filter(a => a.success > 0.7).length;
    const adaptationBonus = successfulAdaptations * 0.02;

    return Math.min(1, 0.3 + avgReward * 0.5 + consistency * 0.2 + adaptationBonus);
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  }

  private evolveKnowledgePatterns(situation: string, action: string, outcome: string, reward: number): void {
    if (reward > 0.5) {
      const similarPattern = this.knowledgePatterns.find(p =>
        this.calculatePatternSimilarity(p.pattern, situation) > 0.6
      );

      if (similarPattern) {
        similarPattern.applications++;
        similarPattern.contexts = [...new Set([...similarPattern.contexts, situation])].slice(-10);
      } else {
        const abstractionLevel = this.calculateAbstractionLevel(situation, action, outcome);

        this.knowledgePatterns.push({
          id: `pattern_${Date.now()}`,
          pattern: this.extractPattern(situation, action, outcome),
          contexts: [situation],
          applications: 1,
          abstractionLevel,
          formedAt: Date.now()
        });

        if (this.knowledgePatterns.length > 100) {
          this.knowledgePatterns = this.knowledgePatterns
            .sort((a, b) => b.applications - a.applications)
            .slice(0, 100);
        }

        this.recordEvolutionEvent('emergence', `新模式涌现: ${this.extractPattern(situation, action, outcome)}`, reward * 0.1);
      }
    }
  }

  private calculatePatternSimilarity(pattern1: string, pattern2: string): number {
    const words1 = new Set(pattern1.split(/\s+/));
    const words2 = new Set(pattern2.split(/\s+/));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private calculateAbstractionLevel(situation: string, action: string, outcome: string): number {
    let level = 0.3;

    if (situation.length > 50) level += 0.1;
    if (action.includes('分析') || action.includes('理解')) level += 0.2;
    if (outcome.includes('发现') || outcome.includes('理解')) level += 0.2;
    if (this.knowledgePatterns.length > 10) level += 0.1;

    return Math.min(1, level);
  }

  private extractPattern(situation: string, action: string, outcome: string): string {
    const keywords: Record<string, string[]> = {
      'exploration': ['探索', '发现', '新', '尝试'],
      'analysis': ['分析', '思考', '研究', '理解'],
      'social': ['交流', '沟通', '分享', '倾听'],
      'problem_solving': ['解决', '方案', '问题', '困难'],
      'creativity': ['创新', '创造', '想象', '独特']
    };

    const content = `${situation} ${action} ${outcome}`;

    for (const [type, words] of Object.entries(keywords)) {
      if (words.some(w => content.includes(w))) {
        return type;
      }
    }

    return 'general';
  }

  private applyNaturalSelection(): void {
    if (this.population.length < 10) return;

    this.population.sort((a, b) => b.fitness - a.fitness);

    const survivalRate = 0.6;
    const survivors = this.population.slice(0, Math.floor(this.population.length * survivalRate));

    while (this.population.length < 10) {
      const parent1 = survivors[Math.floor(Math.random() * survivors.length)];
      const parent2 = survivors[Math.floor(Math.random() * survivors.length)];

      if (Math.random() < this.crossoverRate) {
        const child = this.crossover(parent1, parent2);
        this.population.push(child);
      } else {
        const clone = this.cloneGenome(parent1);
        this.population.push(clone);
      }
    }

    this.population = survivors;
  }

  private crossover(parent1: Genome, parent2: Genome): Genome {
    const childGenes: Gene[] = [];

    parent1.genes.forEach(gene1 => {
      const gene2 = parent2.genes.find(g => g.id === gene1.id);
      if (gene2 && Math.random() < 0.5) {
        childGenes.push({
          ...gene1,
          value: (gene1.value + gene2.value) / 2 + (Math.random() - 0.5) * 0.1
        });
      } else {
        childGenes.push({ ...gene1 });
      }
    });

    return {
      id: `genome_${Date.now()}`,
      genes: childGenes,
      fitness: 0.5,
      age: 0,
      generation: this.generationCount++
    };
  }

  private cloneGenome(genome: Genome): Genome {
    return {
      id: `genome_${Date.now()}`,
      genes: genome.genes.map(g => ({ ...g })),
      fitness: 0.5,
      age: 0,
      generation: genome.generation
    };
  }

  private applyMutation(): void {
    const mutationIndex = Math.floor(Math.random() * this.currentGenome.genes.length);
    const gene = this.currentGenome.genes[mutationIndex];

    const mutation = (Math.random() - 0.5) * gene.mutationRate * 2;
    gene.value = Math.max(0, Math.min(1, gene.value + mutation));

    this.recordEvolutionEvent(
      'mutation',
      `基因突变: ${gene.name} ${mutation > 0 ? '+' : ''}${mutation.toFixed(3)}`,
      mutation * 0.1
    );
  }

  private recordEvolutionEvent(type: EvolutionEvent['type'], description: string, fitnessChange: number): void {
    this.evolutionEvents.push({
      type,
      description,
      timestamp: Date.now(),
      fitnessChange
    });

    if (this.evolutionEvents.length > 200) {
      this.evolutionEvents.shift();
    }
  }

  /**
   * 适应行为
   */
  adapt(trigger: string, response: string): Adaptation | null {
    const existing = this.adaptations.find(a =>
      this.calculatePatternSimilarity(a.trigger, trigger) > 0.7
    );

    if (existing) {
      existing.timesUsed++;
      existing.lastUsed = Date.now();
      return existing;
    }

    const adaptation: Adaptation = {
      id: `adapt_${Date.now()}`,
      trigger,
      response,
      success: 0.5,
      timesUsed: 1,
      lastUsed: Date.now()
    };

    this.adaptations.push(adaptation);
    return adaptation;
  }

  /**
   * 更新适应成功率
   */
  updateAdaptationSuccess(adaptationId: string, success: boolean): void {
    const adaptation = this.adaptations.find(a => a.id === adaptationId);
    if (adaptation) {
      adaptation.success = adaptation.success * 0.9 + (success ? 0.1 : 0);
      if (adaptation.success < 0.2) {
        this.adaptations = this.adaptations.filter(a => a.id !== adaptationId);
      }
    }
  }

  /**
   * 获取最佳适应
   */
  getBestAdaptations(count: number = 5): Adaptation[] {
    return this.adaptations
      .filter(a => a.success > 0.5)
      .sort((a, b) => b.success * b.timesUsed - a.success * a.timesUsed)
      .slice(0, count);
  }

  /**
   * 获取当前基因组
   */
  getCurrentGenome(): { genes: { name: string; value: number }[]; fitness: number; generation: number } {
    return {
      genes: this.currentGenome.genes.map(g => ({ name: g.name, value: g.value })),
      fitness: this.currentGenome.fitness,
      generation: this.currentGenome.generation
    };
  }

  /**
   * 获取知识模式
   */
  getKnowledgePatterns(): KnowledgePattern[] {
    return [...this.knowledgePatterns];
  }

  /**
   * 获取进化事件历史
   */
  getEvolutionHistory(count: number = 20): EvolutionEvent[] {
    return this.evolutionEvents.slice(-count);
  }

  /**
   * 获取学习历史
   */
  getLearningHistory(count: number = 20): LearningExperience[] {
    return this.learningHistory.slice(-count);
  }

  /**
   * 获取统计信息
   */
  getStatistics(): {
    populationSize: number;
    generationCount: number;
    currentFitness: number;
    totalExperiences: number;
    knowledgePatterns: number;
    adaptations: number;
    evolutionEvents: number;
    fitnessTrend: 'improving' | 'stable' | 'declining';
    dominantTraits: string[];
  } {
    const recentFitness = this.population.slice(-20).map(g => g.fitness);
    let trend: 'improving' | 'stable' | 'declining' = 'stable';

    if (recentFitness.length >= 10) {
      const firstHalf = recentFitness.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
      const secondHalf = recentFitness.slice(-10).reduce((a, b) => a + b, 0) / 10;
      if (secondHalf > firstHalf * 1.05) trend = 'improving';
      else if (secondHalf < firstHalf * 0.95) trend = 'declining';
    }

    const topGenes = [...this.currentGenome.genes]
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);

    return {
      populationSize: this.population.length,
      generationCount: this.generationCount,
      currentFitness: this.currentGenome.fitness,
      totalExperiences: this.learningHistory.length,
      knowledgePatterns: this.knowledgePatterns.length,
      adaptations: this.adaptations.length,
      evolutionEvents: this.evolutionEvents.length,
      fitnessTrend: trend,
      dominantTraits: topGenes.map(g => g.name)
    };
  }

  /**
   * 重置学习
   */
  reset(): void {
    this.learningHistory = [];
    this.adaptations = [];
    this.knowledgePatterns = [];
    this.evolutionEvents = [];
    this.population = [];
    this.generationCount = 0;
    this.initializePopulation();
  }
}

export const evolutionLearning = new EvolutionLearningMechanism();