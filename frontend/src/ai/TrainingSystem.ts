import { TrainingDataManager, TrainingSample } from './TrainingDataManager';
import { TrainingScheduler, TrainingConfig, TrainingStats } from './TrainingScheduler';
import { EvaluationEngine, PredictionResult } from './EvaluationEngine';
import { cognitiveDigitalLife } from './CognitiveDigitalLifeEngine';

export interface TrainingConfigExtended extends TrainingConfig {
  aiFeedbackRatio?: number;
}

export class TrainingSystem {
  private dataManager: TrainingDataManager;
  private scheduler: TrainingScheduler;
  private evaluator: EvaluationEngine;
  private trainingHistory: TrainingStats[] = [];
  private isTraining = false;

  constructor(config: Partial<TrainingConfigExtended> = {}) {
    this.dataManager = new TrainingDataManager();
    this.scheduler = new TrainingScheduler(config);
    this.evaluator = new EvaluationEngine();
    
    this.setupListeners();
  }

  private setupListeners(): void {
    this.scheduler.on('training_start', (event) => {
      console.log(`🚀 ${event.message}`);
    });

    this.scheduler.on('epoch_start', (event) => {
      console.log(`📚 ${event.message}`);
    });

    this.scheduler.on('epoch_end', (event) => {
      if (event.stats) {
        console.log(`✅ 第 ${event.stats.epoch} 轮 - Loss: ${event.stats.loss.toFixed(4)} | Accuracy: ${(event.stats.accuracy * 100).toFixed(2)}% | Val Loss: ${event.stats.valLoss.toFixed(4)} | Val Accuracy: ${(event.stats.valAccuracy * 100).toFixed(2)}%`);
      }
    });

    this.scheduler.on('checkpoint', (event) => {
      console.log(`💾 ${event.message}`);
    });

    this.scheduler.on('training_end', (event) => {
      console.log(`🎉 ${event.message}`);
      this.isTraining = false;
    });
  }

  async startTraining(config?: Partial<TrainingConfigExtended>): Promise<TrainingStats[]> {
    if (this.isTraining) {
      console.log('⚠️ 训练已在进行中');
      return this.trainingHistory;
    }

    if (config) {
      if (config.epochs !== undefined) this.scheduler.setEpochs(config.epochs);
      if (config.batchSize !== undefined) this.scheduler.setBatchSize(config.batchSize);
      if (config.learningRate !== undefined) this.scheduler.setLearningRate(config.learningRate);
    }

    this.isTraining = true;
    this.trainingHistory = [];

    const trainFn = async (epoch: number, batchSize: number, lr: number): Promise<TrainingStats> => {
      return this.trainOneEpoch(epoch, batchSize, lr);
    };

    this.trainingHistory = await this.scheduler.startTraining(trainFn);
    
    return this.trainingHistory;
  }

  private async trainOneEpoch(epoch: number, batchSize: number, lr: number): Promise<TrainingStats> {
    let totalLoss = 0;
    let totalAccuracy = 0;
    let batchCount = 0;

    this.dataManager.reset();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const batch = this.dataManager.getBatch(batchSize);
      if (batch.length === 0) break;

      const batchLoss = await this.trainBatch(batch, lr);
      const batchAccuracy = await this.evaluateBatch(batch);

      totalLoss += batchLoss;
      totalAccuracy += batchAccuracy;
      batchCount++;
    }

    const valStats = await this.validate();

    return {
      epoch,
      loss: totalLoss / batchCount,
      accuracy: totalAccuracy / batchCount,
      valLoss: valStats.loss,
      valAccuracy: valStats.accuracy,
      learningRate: lr,
      timestamp: Date.now()
    };
  }

  private async trainBatch(batch: TrainingSample[], _lr: number): Promise<number> {
    let totalLoss = 0;

    for (const sample of batch) {
      const response = cognitiveDigitalLife.process(sample.input);
      const loss = this.calculateLoss(sample.output, response);
      totalLoss += loss;
    }

    return totalLoss / batch.length;
  }

  private async evaluateBatch(batch: TrainingSample[]): Promise<number> {
    let correct = 0;

    for (const sample of batch) {
      const response = cognitiveDigitalLife.process(sample.input);
      const similarity = this.calculateSimilarity(sample.output, response);
      if (similarity > 0.7) correct++;
    }

    return correct / batch.length;
  }

  private async validate(): Promise<{ loss: number; accuracy: number }> {
    const valData = this.dataManager.getValidationData();
    let totalLoss = 0;
    let correct = 0;

    for (const sample of valData) {
      const response = cognitiveDigitalLife.process(sample.input);
      const loss = this.calculateLoss(sample.output, response);
      totalLoss += loss;
      
      const similarity = this.calculateSimilarity(sample.output, response);
      if (similarity > 0.7) correct++;
    }

    return {
      loss: valData.length > 0 ? totalLoss / valData.length : 0,
      accuracy: valData.length > 0 ? correct / valData.length : 0
    };
  }

  private calculateLoss(target: string, prediction: string): number {
    const similarity = this.calculateSimilarity(target, prediction);
    return 1 - similarity;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const longerLength = longer.length;
    const editDistance = this.editDistance(longer, shorter);

    return (longerLength - editDistance) / longerLength;
  }

  private editDistance(str1: string, str2: string): number {
    const costs: number[] = [];

    for (let i = 0; i <= str1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= str2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (str1.charAt(i - 1) !== str2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) {
        costs[str2.length] = lastValue;
      }
    }

    return costs[str2.length];
  }

  addTrainingData(samples: TrainingSample[]): void {
    this.dataManager.addData(samples);
  }

  getTrainingStats(): TrainingStats[] {
    return this.trainingHistory;
  }

  getEvaluationResult(): any {
    const valData = this.dataManager.getValidationData();
    const predictions: PredictionResult[] = [];

    for (const sample of valData) {
      const response = cognitiveDigitalLife.process(sample.input);
      const confidence = this.calculateSimilarity(sample.output, response);
      predictions.push({
        input: sample.input,
        target: sample.output,
        prediction: response,
        correct: confidence > 0.7,
        confidence
      });
    }

    return this.evaluator.evaluate(predictions);
  }

  isTrainingInProgress(): boolean {
    return this.isTraining;
  }

  getConfig(): TrainingConfig {
    return this.scheduler.getConfig();
  }

  getTotalSamples(): number {
    return this.dataManager.getTotalSamples();
  }
}

export const trainingSystem = new TrainingSystem();