import ChatSession, { ChatSessionDocument, ChatMessage } from '../models/ChatSession';
import mongoose from 'mongoose';

interface UserInfo {
  name?: string;
  preferences?: Record<string, any>;
}

// 内存存储作为备用
const memoryStorage: Record<string, any> = {
  chatSessions: []
};

class DbStorage {
  private useMemoryStorage: boolean = false;

  constructor() {
    // 初始检查MongoDB连接状态
    // 重要：MongoDB 未连接时立即降级到内存存储，避免 Mongoose buffer 导致 10 秒超时
    //   - readyState 0: disconnected → 内存
    //   - readyState 2: connecting → 内存（连接成功后会自动切换）
    //   - readyState 1: connected → 数据库
    this.checkMongoConnection();

    // 监听MongoDB连接状态变化
    mongoose.connection.on('connected', () => {
      console.log('MongoDB connected, switching to database storage');
      this.useMemoryStorage = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected, switching to memory storage');
      this.useMemoryStorage = true;
    });
  }

  private checkMongoConnection() {
    // readyState 1 = connected，其他状态（0/2/3）都用内存存储
    // 这样避免 MongoDB 正在连接时（state=2）操作被 buffer 10 秒超时
    if (mongoose.connection.readyState !== 1) {
      console.warn(`MongoDB not ready (readyState=${mongoose.connection.readyState}), using memory storage`);
      this.useMemoryStorage = true;
    }
  }

  /** 实时检查 MongoDB 是否真正可用（避免 buffer 超时） */
  private isMongoReady(): boolean {
    return mongoose.connection.readyState === 1 && !this.useMemoryStorage;
  }

  // 获取对话会话（内存存储备用）
  async getChatSessionById(sessionId: string) {
    // 实时检查 MongoDB 是否可用，避免 buffer 超时
    if (!this.isMongoReady()) {
      return memoryStorage.chatSessions.find((session: any) => session.id === sessionId) || null;
    }

    try {
      const session = await ChatSession.findOne({ id: sessionId });
      return session;
    } catch (error) {
      console.error('获取对话会话失败:', error);
      this.useMemoryStorage = true;
      return memoryStorage.chatSessions.find((session: any) => session.id === sessionId) || null;
    }
  }

  // 创建对话会话（内存存储备用）
  async createChatSession(sessionId: string, userInfo?: UserInfo) {
    // 实时检查 MongoDB 是否可用，避免 buffer 超时
    if (!this.isMongoReady()) {
      const existingSession = memoryStorage.chatSessions.find((session: any) => session.id === sessionId);
      if (existingSession) {
        return existingSession;
      }

      const newSession = {
        id: sessionId,
        messages: [],
        created_at: Date.now(),
        last_updated: Date.now(),
        user_info: userInfo
      };

      memoryStorage.chatSessions.push(newSession);
      return newSession;
    }

    try {
      const existingSession = await this.getChatSessionById(sessionId);
      if (existingSession) {
        return existingSession;
      }

      const newSession = new ChatSession({
        id: sessionId,
        messages: [],
        created_at: Date.now(),
        last_updated: Date.now(),
        user_info: userInfo
      });

      await newSession.save();
      return newSession;
    } catch (error) {
      console.error('创建对话会话失败:', error);
      this.useMemoryStorage = true;
      
      // 回退到内存存储
      const existingSession = memoryStorage.chatSessions.find((session: any) => session.id === sessionId);
      if (existingSession) {
        return existingSession;
      }

      const newSession = {
        id: sessionId,
        messages: [],
        created_at: Date.now(),
        last_updated: Date.now(),
        user_info: userInfo
      };

      memoryStorage.chatSessions.push(newSession);
      return newSession;
    }
  }

  // 添加对话消息（内存存储备用）
  async addChatMessage(sessionId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) {
    // 实时检查 MongoDB 是否可用，避免 buffer 超时
    if (!this.isMongoReady()) {
      let session = memoryStorage.chatSessions.find((s: any) => s.id === sessionId);
      if (!session) {
        session = {
          id: sessionId,
          messages: [],
          created_at: Date.now(),
          last_updated: Date.now()
        };
        memoryStorage.chatSessions.push(session);
      }

      const newMessage: ChatMessage = {
        ...message,
        id: Date.now().toString(),
        timestamp: Date.now()
      };

      session.messages.push(newMessage);
      session.last_updated = Date.now();
      return newMessage;
    }

    try {
      const session = await this.getChatSessionById(sessionId) || await this.createChatSession(sessionId);
      if (!session) {
        throw new Error('无法获取或创建对话会话');
      }

      const newMessage: ChatMessage = {
        ...message,
        id: Date.now().toString(),
        timestamp: Date.now()
      };

      if (session instanceof ChatSession) {
        session.messages.push(newMessage);
        session.last_updated = Date.now();
        await session.save();
      } else {
        // 处理内存存储的情况
        session.messages.push(newMessage);
        session.last_updated = Date.now();
      }

      return newMessage;
    } catch (error) {
      console.error('添加对话消息失败:', error);
      this.useMemoryStorage = true;
      
      // 回退到内存存储
      let session = memoryStorage.chatSessions.find((s: any) => s.id === sessionId);
      if (!session) {
        session = {
          id: sessionId,
          messages: [],
          created_at: Date.now(),
          last_updated: Date.now()
        };
        memoryStorage.chatSessions.push(session);
      }

      const newMessage: ChatMessage = {
        ...message,
        id: Date.now().toString(),
        timestamp: Date.now()
      };

      session.messages.push(newMessage);
      session.last_updated = Date.now();
      return newMessage;
    }
  }

  // 获取对话消息（内存存储备用）
  async getChatMessages(sessionId: string) {
    // 实时检查 MongoDB 是否可用，避免 buffer 超时
    if (!this.isMongoReady()) {
      const session = memoryStorage.chatSessions.find((s: any) => s.id === sessionId);
      return session ? session.messages : [];
    }

    try {
      const session = await this.getChatSessionById(sessionId);
      return session ? session.messages : [];
    } catch (error) {
      console.error('获取对话消息失败:', error);
      this.useMemoryStorage = true;
      const session = memoryStorage.chatSessions.find((s: any) => s.id === sessionId);
      return session ? session.messages : [];
    }
  }

  // 清除对话会话（内存存储备用）
  async clearChatSession(sessionId: string) {
    // 实时检查 MongoDB 是否可用，避免 buffer 超时
    if (!this.isMongoReady()) {
      const sessionIndex = memoryStorage.chatSessions.findIndex((s: any) => s.id === sessionId);
      if (sessionIndex !== -1) {
        memoryStorage.chatSessions.splice(sessionIndex, 1);
        return true;
      }
      return false;
    }

    try {
      const result = await ChatSession.deleteOne({ id: sessionId });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('清除对话会话失败:', error);
      this.useMemoryStorage = true;
      const sessionIndex = memoryStorage.chatSessions.findIndex((s: any) => s.id === sessionId);
      if (sessionIndex !== -1) {
        memoryStorage.chatSessions.splice(sessionIndex, 1);
        return true;
      }
      return false;
    }
  }

  // 获取所有对话会话（内存存储备用）
  async getChatSessions() {
    // 实时检查 MongoDB 是否可用，避免 buffer 超时
    if (!this.isMongoReady()) {
      return memoryStorage.chatSessions;
    }

    try {
      const sessions = await ChatSession.find();
      return sessions;
    } catch (error) {
      console.error('获取所有对话会话失败:', error);
      this.useMemoryStorage = true;
      return memoryStorage.chatSessions;
    }
  }
}

export default new DbStorage();
