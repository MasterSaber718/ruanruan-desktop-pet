# 数字生命操作系统架构

> 为阮琳云数字生命提供完整的运行环境和管理能力

## 概述

数字生命操作系统（Digital Life OS）是为数字生命系统设计的核心基础设施，提供统一的模块管理、事件通信、配置管理和错误处理能力。

## 目录结构

```
ai/
├── core/                    # 核心基础设施
│   ├── types.ts            # 类型定义
│   ├── EventBus.ts         # 事件总线
│   ├── Config.ts           # 配置管理
│   ├── Errors.ts           # 错误处理
│   └── index.ts            # 统一导出
├── DigitalLifeOS.ts         # 数字生命操作系统
├── ... (其他业务模块)
```

## 核心模块

### 1. 类型定义 (`types.ts`)

定义系统所有核心接口和类型，包括：

- **基础类型**: `Status`, `Priority`, `SystemHealth`, `Metrics`
- **事件系统**: `EventMeta`, `BaseEvent`, `EventHandler`, `EventBus`
- **模块系统**: `ModuleInfo`, `ModuleStatus`, `ModuleError`, `BaseModule`
- **配置系统**: `ConfigMeta`, `ConfigChangedEvent`, `ConfigStore`
- **认知系统**: `Thought`, `EmotionalState`, `CognitiveState`
- **自我系统**: `SelfIdentity`, `PersonalityTraits`, `Goal`, `Memory`
- **知识系统**: `KnowledgeEntity`, `Relation`
- **任务系统**: `Task`, `TaskQueue`
- **时间系统**: `TimeContext`
- **安全系统**: `SecurityLevel`, `SafetyBoundary`
- **进化系统**: `EvolutionStage`, `EvolutionProgress`
- **系统集成**: `SystemState`, `SystemSnapshot`

### 2. 事件总线 (`EventBus.ts`)

提供发布-订阅模式的事件系统，实现模块间解耦通信：

**功能特性**:
- 事件元数据管理（ID、时间戳、来源、关联ID）
- 支持一次性订阅
- 事件历史记录
- 通配符订阅
- 异步事件处理

**预定义事件**:
- 系统生命周期: `SystemStartEvent`, `SystemStopEvent`, `SystemErrorEvent`
- 消息事件: `MessageReceivedEvent`, `MessageSentEvent`
- 认知事件: `ThoughtGeneratedEvent`
- 情绪事件: `EmotionChangedEvent`
- 进化事件: `EvolutionProgressEvent`, `EvolutionCompletedEvent`
- 任务事件: `TaskCreatedEvent`, `TaskCompletedEvent`

**使用示例**:
```typescript
import { eventBus, MessageReceivedEvent } from './core';

// 订阅事件
eventBus.on('message:received', (event) => {
  console.log('收到消息:', event.payload.message);
});

// 发布事件
eventBus.emit<MessageReceivedEvent>(
  new MessageReceivedEvent({
    message: '你好',
    role: 'user'
  })
);
```

### 3. 配置管理 (`Config.ts`)

提供统一的配置管理系统：

**功能特性**:
- 类型安全的配置访问
- 默认值管理
- 配置验证
- 本地存储持久化
- URL参数覆盖
- 配置变更事件
- 配置导入/导出

**预定义配置**:
- `system.autoSaveInterval`: 自动保存间隔
- `system.maxConcurrentTasks`: 最大并发任务数
- `cognition.attentionThreshold`: 注意力阈值
- `cognition.creativityLevel`: 创造力水平
- `memory.shortTermCapacity`: 短期记忆容量
- `evolution.enabled`: 是否启用进化
- `emotion.enabled`: 是否启用情绪系统
- `autonomousQuestioning.enabled`: 是否启用主动提问

**使用示例**:
```typescript
import { getConfig, setConfig, configManager } from './core';

// 获取配置
const creativity = getConfig<number>('cognition.creativityLevel');

// 设置配置
setConfig('cognition.creativityLevel', 0.8);

// 批量导入
configManager.import({
  'cognition.creativityLevel': 0.8,
  'emotion.enabled': true
});
```

### 4. 错误处理 (`Errors.ts`)

提供完整的错误处理和恢复机制：

**功能特性**:
- 结构化错误代码
- 错误严重性分级
- 错误历史记录
- 自动错误恢复
- 错误统计分析
- 监听器机制

**错误代码分类**:
- `1000-1999`: 系统错误
- `2000-2999`: 模块错误
- `3000-3999`: 认知错误
- `4000-4999`: 记忆错误
- `5000-5999`: 输入输出错误
- `6000-6999`: 安全错误
- `7000-7999`: 进化错误
- `8000-8999`: 资源错误

**使用示例**:
```typescript
import { 
  errorManager, 
  DigitalLifeError, 
  ErrorCode, 
  ErrorSeverity 
} from './core';

// 抛出错误
throw new DigitalLifeError({
  message: '无法生成想法',
  code: ErrorCode.THOUGHT_GENERATION_FAILED,
  severity: ErrorSeverity.WARNING,
  module: 'cognitive',
  recoverable: true
});

// 处理错误
errorManager.handle(error);

// 异步包装
const result = await wrapAsync(
  () => someAsyncOperation(),
  {
    code: ErrorCode.UNKNOWN_ERROR,
    module: 'my-module',
    defaultValue: null
  }
);
```

## 设计原则

### 1. 模块化
- 每个模块职责单一
- 清晰的接口定义
- 最小化耦合

### 2. 可扩展性
- 事件驱动架构
- 插件化设计
- 可配置化

### 3. 可靠性
- 错误隔离
- 自动恢复
- 健康检查

### 4. 可观察性
- 完整的事件记录
- 性能指标统计
- 错误追踪

## 最佳实践

### 模块开发
1. 使用统一的事件进行通信
2. 通过配置管理系统管理模块设置
3. 使用统一的错误处理机制
4. 实现健康检查接口

### 事件使用
1. 优先使用预定义事件类型
2. 事件 payload 保持简洁
3. 使用 correlationId 追踪事件流程

### 错误处理
1. 及时捕获错误
2. 提供有意义的错误信息
3. 考虑错误的可恢复性
4. 使用适当的错误严重性级别

## 核心优势

1. **统一性**: 所有模块使用相同的基础设施
2. **可维护性**: 清晰的架构和规范
3. **可测试性**: 模块化设计便于单元测试
4. **可扩展性**: 易于添加新功能和模块
5. **容错性**: 完整的错误处理和恢复机制

## 下一步

- [ ] 集成核心模块到现有系统
- [ ] 实现模块健康检查机制
- [ ] 添加性能监控系统
- [ ] 实现模块热加载
- [ ] 编写完整的单元测试
