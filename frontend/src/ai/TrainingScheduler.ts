export interface TrainingConfig {
  epochs: number;
  batchSize: number;
  learningRate: number;
  earlyStopping: boolean;
  earlyStoppingPatience: number;
  checkpointInterval: number;
}

export interface TrainingStats {
  epoch: number;
  loss: number;
  accuracy: number;
  valLoss: number;
  valAccuracy: number;
  learningRate: number;
  timestamp: number;
}

export interface TrainingEvent {
  type: 'epoch_start' | 'epoch_end' | 'batch_end' | 'training_start' | 'training_end' | 'checkpoint';
  stats?: TrainingStats;
  message?: string;
}

export class TrainingScheduler {
  private config: TrainingConfig;
  private currentEpoch = 0;
  private bestLoss = Infinity;
  private patienceCounter = 0;
  private learningRateDecay = 0.95;
  private listeners: Map<string, Set<(event: TrainingEvent) => void>> = new Map();

  constructor(config: Partial<TrainingConfig> = {}) {
    this.config = {
      epochs: 100,
      batchSize: 32,
      learningRate: 0.001,
      earlyStopping: true,
      earlyStoppingPatience: 10,
      checkpointInterval: 10,
      ...config
    };
  }

  on(eventType: string, callback: (event: TrainingEvent) => void): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);
  }

  off(eventType: string, callback: (event: TrainingEvent) => void): void {
    this.listeners.get(eventType)?.delete(callback);
  }

  private emit(event: TrainingEvent): void {
    this.listeners.get(event.type)?.forEach(callback => callback(event));
  }

  async startTraining(trainFn: (epoch: number, batchSize: number, lr: number) => Promise<TrainingStats>): Promise<TrainingStats[]> {
    const history: TrainingStats[] = [];
    
    this.emit({ type: 'training_start', message: '训练开始' });
    
    for (let epoch = 1; epoch <= this.config.epochs; epoch++) {
      this.currentEpoch = epoch;
      
      this.emit({ type: 'epoch_start', message: `第 ${epoch} 轮训练开始` });
      
      const stats = await trainFn(epoch, this.config.batchSize, this.config.learningRate);
      history.push(stats);
      
      this.emit({ 
        type: 'epoch_end', 
        stats,
        message: `第 ${epoch} 轮训练结束 - Loss: ${stats.loss.toFixed(4)}, Accuracy: ${(stats.accuracy * 100).toFixed(2)}%`
      });

      if (epoch % this.config.checkpointInterval === 0) {
        this.emit({ type: 'checkpoint', stats, message: `保存检查点 - 第 ${epoch} 轮` });
      }

      if (this.config.earlyStopping) {
        if (stats.valLoss < this.bestLoss) {
          this.bestLoss = stats.valLoss;
          this.patienceCounter = 0;
        } else {
          this.patienceCounter++;
          
          if (this.patienceCounter >= this.config.earlyStoppingPatience) {
            this.emit({ type: 'training_end', message: `早停触发 - 在第 ${epoch} 轮停止训练` });
            break;
          }
        }
      }

      this.config.learningRate *= this.learningRateDecay;
    }
    
    this.emit({ type: 'training_end', message: '训练完成' });
    
    return history;
  }

  getCurrentEpoch(): number {
    return this.currentEpoch;
  }

  getConfig(): TrainingConfig {
    return { ...this.config };
  }

  setLearningRate(rate: number): void {
    this.config.learningRate = rate;
  }

  setEpochs(epochs: number): void {
    this.config.epochs = epochs;
  }

  setBatchSize(batchSize: number): void {
    this.config.batchSize = batchSize;
  }
}