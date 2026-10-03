/**
 * ============================================================================
 * 阮琳云 AI 系统入口
 * ============================================================================
 * 
 * 统一的AI系统入口，整合所有核心模块
 */

import { cognitiveDigitalLife } from './CognitiveDigitalLifeEngine';
import { semanticEngine } from './SemanticResponseEngine';
import { trainingSystem } from './TrainingSystem';
import { naturalLanguageSystem } from './NaturalLanguageSystem';
import { moduleManager } from './ModuleManager';
import { configManager } from './core/Config';
import { eventBus } from './core/EventBus';
import { aiLogger } from './AILogger';

export interface AIResponse {
  content: string;
  confidence: number;
  emotionalTone: number;
  responseTime: number;
}

export interface SystemStatus {
  health: 'healthy' | 'degraded' | 'critical';
  modules: {
    name: string;
    status: 'idle' | 'active' | 'processing' | 'error';
  }[];
  uptime: number;
  version: string;
}

export class AI {
  private initialized = false;
  private startTime = 0;
  private version = '1.0.0';

  async initialize(): Promise<void> {
    if (this.initialized) return;

    aiLogger.info('AI', 'Initializing Ruan Linyun AI system...');
    this.startTime = Date.now();

    try {
      await this.setupModules();
      await this.setupEventListeners();

      this.initialized = true;
      aiLogger.info('AI', 'Ruan Linyun AI system initialized successfully');
    } catch (error) {
      aiLogger.error('AI', 'Failed to initialize AI system', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private async setupModules(): Promise<void> {
    aiLogger.debug('AI', 'Setting up core modules...');

    await moduleManager.startAll();

    aiLogger.debug('AI', 'Core modules setup complete');
  }

  private setupEventListeners(): void {
    eventBus.on('message:received', (event) => {
      aiLogger.debug('AI', 'Message received', event.payload);
    });

    eventBus.on('message:sent', (event) => {
      aiLogger.debug('AI', 'Message sent', event.payload);
    });

    eventBus.on('emotion:changed', (event) => {
      aiLogger.debug('AI', 'Emotion changed', event.payload);
    });

    eventBus.on('module:started', (event) => {
      aiLogger.debug('AI', 'Module started', event.payload);
    });

    eventBus.on('module:error', (event) => {
      aiLogger.error('AI', 'Module error', event.payload);
    });
  }

  async process(input: string): Promise<AIResponse> {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = performance.now();

    try {
      const response = cognitiveDigitalLife.process(input);
      
      const semanticResult = semanticEngine.parse(input);
      const emotionalTone = semanticResult.emotionalTone;

      const responseTime = performance.now() - startTime;

      return {
        content: response,
        confidence: 0.85 + Math.random() * 0.1,
        emotionalTone,
        responseTime
      };
    } catch (error) {
      aiLogger.error('AI', 'Error processing input', {
        error: error instanceof Error ? error.message : String(error),
        input
      });

      return {
        content: '抱歉，我现在有点不太舒服，让我休息一下...',
        confidence: 0.5,
        emotionalTone: -0.3,
        responseTime: performance.now() - startTime
      };
    }
  }

  async startTraining(config?: {
    epochs?: number;
    batchSize?: number;
    learningRate?: number;
  }): Promise<any> {
    aiLogger.info('AI', 'Starting training...');
    const stats = await trainingSystem.startTraining(config);
    aiLogger.info('AI', 'Training completed');
    return stats;
  }

  getStatus(): SystemStatus {
    const modules = moduleManager.getAllStatuses();
    const moduleStatuses = Object.entries(modules).map(([name, status]) => ({
      name,
      status: status.status as SystemStatus['modules'][0]['status']
    }));

    const health = moduleManager.isStarted('cognitive') ? 'healthy' : 'degraded';

    return {
      health: health as SystemStatus['health'],
      modules: moduleStatuses,
      uptime: this.startTime ? (Date.now() - this.startTime) / 1000 : 0,
      version: this.version
    };
  }

  getCharacterKnowledge(char: string) {
    return semanticEngine.generateCreativeResponse(char);
  }

  getEmotionalState() {
    return cognitiveDigitalLife.getStatus();
  }

  generateProactiveQuestion(): string {
    return cognitiveDigitalLife.generateProactiveQuestion();
  }

  shouldProactivelyAsk(): boolean {
    return cognitiveDigitalLife.shouldProactivelyAsk();
  }

  recordUserInteraction(): void {
    cognitiveDigitalLife.recordUserInteraction();
  }
}

export const ruanlinyun = new AI();

export {
  cognitiveDigitalLife,
  semanticEngine,
  trainingSystem,
  naturalLanguageSystem,
  moduleManager,
  configManager,
  eventBus,
  aiLogger
};
