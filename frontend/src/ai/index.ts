/**
 * ============================================================================
 * 阮琳云 AI 系统 - 统一导出
 * ============================================================================
 */

export { AI, ruanlinyun } from './AI';
export type { AIResponse, SystemStatus } from './AI';

export { cognitiveDigitalLife } from './CognitiveDigitalLifeEngine';
export { semanticEngine } from './SemanticResponseEngine';
export type { SemanticParseResult, Token, Entity, DependencyNode, IntentType } from './SemanticResponseEngine';

export { trainingSystem } from './TrainingSystem';
export { TrainingSystem } from './TrainingSystem';
export type { TrainingSample } from './TrainingDataManager';
export type { TrainingConfig, TrainingStats } from './TrainingScheduler';
export type { PredictionResult } from './EvaluationEngine';

export { naturalLanguageSystem } from './NaturalLanguageSystem';

export { characterKnowledge, wordKnowledge, getCharacterData, getWordData, getWordEmotionalTone, analyzeWord } from './ChineseCharacterKnowledge';
export type { CharacterData, WordData, WordMeaning } from './ChineseCharacterKnowledge';

export { moduleManager } from './ModuleManager';
export { ModuleManager } from './ModuleManager';
export type { ModuleConfig } from './ModuleManager';

export { eventBus } from './core/EventBus';
export { EventBus, SystemStartEvent, SystemStopEvent } from './core/EventBus';

export { configManager, getConfig, setConfig, useConfig } from './core/Config';

export { aiLogger } from './AILogger';


export { IntentRecognizer } from './IntentRecognizer';
export { SafetyGuardian } from './SafetyGuardian';
export { AutonomousQuestioning } from './AutonomousQuestioning';
export { CentralScheduler } from './CentralScheduler';
export { DigitalSelfCore, digitalSelfCore } from './DigitalSelfCore';
export type { DigitalIdentity, PersonalityProfile, Desire, SelfImage, GrowthStage, Experience, PrivacyBoundary, ConsciousnessState, EmotionalState } from './DigitalSelfCore';

export { EthicalFramework, ethicalFramework } from './EthicalFramework';
export type { EthicalPrinciple, EthicalAssessment, EthicalDecision } from './EthicalFramework';
export { EvolutionLearningMechanism } from './EvolutionLearningMechanism';
export { HumanLikeThinkingEngine } from './HumanLikeThinkingEngine';
export { InnerExperienceSystem } from './InnerExperienceSystem';
export { KnowledgeGraph } from './KnowledgeGraph';
export { NeuralSystemModel } from './NeuralSystemModel';
export { PerformanceAndStability } from './PerformanceAndStability';
export { PerceptionBehaviorSystem } from './PerceptionBehaviorSystem';
export { PhilosophicalThinkingEngine } from './PhilosophicalThinkingEngine';
export { ReasoningEngine } from './ReasoningEngine';
export { SelfAwarenessSystem } from './SelfAwarenessSystem';
export { TimePerceptionEngine } from './TimePerceptionEngine';
export { UnifiedKnowledgeBase } from './UnifiedKnowledgeBase';

export { BiologicalKnowledgeSystem } from './BiologicalKnowledgeSystem';
export { MathematicalKnowledgeSystem } from './MathematicalKnowledgeSystem';
export { MathematicalPhysicsEngine } from './MathematicalPhysicsEngine';
export { PhysicsKnowledgeSystem } from './PhysicsKnowledgeSystem';
export { PhilosophicalKnowledgeLearner } from './PhilosophicalKnowledgeLearner';
export { ScientificReasoningEngine } from './ScientificReasoningEngine';

export * from './core/types';
