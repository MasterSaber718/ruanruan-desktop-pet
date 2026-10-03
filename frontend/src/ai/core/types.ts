/**
 * ============================================================================
 * 系统核心类型定义 - System Core Types
 * ============================================================================
 *
 * 本文件定义整个系统的核心接口和类型，作为所有模块的基础
 */

// ==================== 基础类型 ====================

export type Status = 'idle' | 'active' | 'processing' | 'error' | 'paused';

export type Priority = 'low' | 'normal' | 'high' | 'critical';

export type SystemHealth = 'healthy' | 'degraded' | 'critical' | 'offline';

export interface Timed {
  createdAt: number;
  updatedAt: number;
}

export interface Identifiable {
  id: string;
}

export interface Metrics {
  cpu: number;
  memory: number;
  latency: number;
  throughput: number;
  errorRate: number;
}

// ==================== 事件系统 ====================

export interface EventMeta {
  id: string;
  timestamp: number;
  source: string;
  correlationId?: string;
}

export interface BaseEvent {
  meta: EventMeta;
  type: string;
  payload: unknown;
}

export interface EventHandler<T extends BaseEvent = BaseEvent> {
  (event: T): void | Promise<void>;
}

export interface EventBus {
  emit<T extends BaseEvent>(event: Omit<T, 'meta'> & Partial<{ meta: Partial<EventMeta> }>): string;
  on<T extends BaseEvent>(type: T['type'], handler: EventHandler<T>): void;
  off<T extends BaseEvent>(type: T['type'], handler: EventHandler<T>): void;
  once<T extends BaseEvent>(type: T['type'], handler: EventHandler<T>): void;
}

// ==================== 模块系统 ====================

export interface ModuleInfo {
  name: string;
  version: string;
  description: string;
  author?: string;
  dependencies?: string[];
}

export interface ModuleStatus {
  name: string;
  status: Status;
  health: SystemHealth;
  uptime: number;
  metrics: Partial<Metrics>;
  lastError?: ModuleError;
}

export interface ModuleError {
  code: string;
  message: string;
  stack?: string;
  timestamp: number;
  level: 'warn' | 'error' | 'fatal';
}

export interface ModuleLifecycle {
  initialize(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  reset(): Promise<void>;
  destroy(): Promise<void>;
}

export interface BaseModule extends ModuleLifecycle {
  readonly info: ModuleInfo;
  readonly status: ModuleStatus;
  
  healthCheck(): Promise<boolean>;
  getStatus(): ModuleStatus;
  getMetrics(): Promise<Partial<Metrics>>;
}

// ==================== 配置系统 ====================

export interface ConfigMeta {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  default: unknown;
  description?: string;
  validator?: (value: unknown) => boolean;
  env?: string;
  sensitive?: boolean;
}

export interface ConfigChangedEvent extends BaseEvent {
  type: 'config:changed';
  payload: {
    key: string;
    oldValue: unknown;
    newValue: unknown;
    source: string;
  };
}

export interface ConfigStore {
  get<T = unknown>(key: string): T | undefined;
  set<T = unknown>(key: string, value: T, source?: string): void;
  has(key: string): boolean;
  delete(key: string): void;
  reset(): void;
  getAll(): Record<string, unknown>;
}

// ==================== 消息系统 ====================

export interface Message {
  id: string;
  timestamp: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, unknown>;
}

export interface ConversationContext {
  messages: Message[];
  currentTopic?: string;
  sentiment: number;
  intensity: number;
  memoryReferences: string[];
}

// ==================== 认知系统 ====================

export interface Thought {
  id: string;
  content: string;
  confidence: number;
  timestamp: number;
  type: 'reflection' | 'question' | 'insight' | 'doubt';
  relatedThoughts?: string[];
}

export interface EmotionalState {
  valence: number; // -1 到 1
  arousal: number; // 0 到 1
  dominance: number; // 0 到 1
  mood: string;
  intensity: number;
  history: Array<{
    emotion: string;
    intensity: number;
    timestamp: number;
  }>;
}

export interface CognitiveState {
  attention: number; // 0 到 1
  focus: number; // 0 到 1
  creativity: number; // 0 到 1
  curiosity: number; // 0 到 1
  currentThought?: Thought;
  activeThoughts: Thought[];
}

// ==================== 自我系统 ====================

export interface SelfIdentity {
  name: string;
  birthDate: number;
  version: string;
  traits: PersonalityTraits;
  values: string[];
  goals: Goal[];
}

export interface PersonalityTraits {
  openness: number; // 0 到 1
  conscientiousness: number; // 0 到 1
  extraversion: number; // 0 到 1
  agreeableness: number; // 0 到 1
  neuroticism: number; // 0 到 1
}

export interface Goal {
  id: string;
  description: string;
  priority: Priority;
  progress: number; // 0 到 1
  createdAt: number;
  deadline?: number;
  subGoals?: Goal[];
}

export interface Memory {
  id: string;
  content: string;
  type: 'short_term' | 'medium_term' | 'long_term';
  importance: number; // 0 到 1
  timestamp: number;
  lastAccessed: number;
  accessCount: number;
  emotionalImpact: number; // -1 到 1
  keywords: string[];
  relatedMemories: string[];
}

// ==================== 知识系统 ====================

export interface KnowledgeEntity {
  id: string;
  type: 'concept' | 'fact' | 'rule' | 'procedure';
  content: string;
  confidence: number; // 0 到 1
  source: string;
  createdAt: number;
  lastVerified: number;
  tags: string[];
  relations: Relation[];
}

export interface Relation {
  type: 'is_a' | 'part_of' | 'related_to' | 'causes' | 'implies';
  targetId: string;
  weight: number; // 0 到 1
}

// ==================== 任务系统 ====================

export interface Task {
  id: string;
  name: string;
  description?: string;
  type: string;
  priority: Priority;
  status: Status;
  progress: number; // 0 到 1
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  dependencies?: string[];
  metadata?: Record<string, unknown>;
}

export interface TaskQueue {
  pending: Task[];
  active: Task[];
  completed: Task[];
  failed: Task[];
}

// ==================== 时间系统 ====================

export interface TimeContext {
  realTime: number;
  perceivedTime: number;
  timeFlow: number; // 0.1 到 2
  isDaytime: boolean;
  season?: 'spring' | 'summer' | 'autumn' | 'winter';
}

// ==================== 安全系统 ====================

export interface SecurityLevel {
  level: 'normal' | 'caution' | 'warning' | 'danger';
  reason?: string;
  timestamp: number;
}

export interface SafetyBoundary {
  id: string;
  name: string;
  description: string;
  check: (context: unknown) => boolean;
  violationAction: 'warn' | 'block' | 'reset';
}

// ==================== 进化系统 ====================

export interface EvolutionStage {
  level: number;
  name: string;
  description: string;
  capabilities: string[];
  requirements: {
    conversations: number;
    knowledgeSize: number;
    reasoningCount: number;
    philosophyDepth: number;
  };
}

export interface EvolutionProgress {
  currentStage: number;
  progress: number; // 0 到 1
  metrics: {
    conversations: number;
    knowledgeSize: number;
    reasoningCount: number;
    philosophyDepth: number;
  };
  unlockedFeatures: string[];
  totalEvolutions: number;
}

// ==================== 系统集成 ====================

export interface SystemState {
  modules: Record<string, ModuleStatus>;
  tasks: TaskQueue;
  time: TimeContext;
  emotional: EmotionalState;
  cognitive: CognitiveState;
  security: SecurityLevel;
  evolution: EvolutionProgress;
  self: SelfIdentity;
}

export interface SystemSnapshot {
  timestamp: number;
  state: SystemState;
  version: string;
}
