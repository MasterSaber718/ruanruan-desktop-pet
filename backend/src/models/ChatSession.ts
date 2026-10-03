import mongoose, { Schema, Document } from 'mongoose';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  sentiment?: 'positive' | 'negative' | 'neutral';
  intent?: string;
}

interface UserInfo {
  name?: string;
  preferences?: Record<string, any>;
}

export interface ChatSessionDocument extends Document {
  id: string;
  messages: ChatMessage[];
  created_at: number;
  last_updated: number;
  user_info?: UserInfo;
}

const ChatMessageSchema = new Schema<ChatMessage>({
  id: { type: String, required: true },
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Number, required: true },
  sentiment: { type: String, enum: ['positive', 'negative', 'neutral'] },
  intent: { type: String }
});

const UserInfoSchema = new Schema<UserInfo>({
  name: { type: String },
  preferences: { type: Object }
});

const ChatSessionSchema = new Schema<ChatSessionDocument>({
  id: { type: String, required: true, unique: true },
  messages: { type: [ChatMessageSchema], default: [] },
  created_at: { type: Number, required: true },
  last_updated: { type: Number, required: true },
  user_info: { type: UserInfoSchema }
});

// 索引
ChatSessionSchema.index({ id: 1 });
ChatSessionSchema.index({ last_updated: 1 });

export default mongoose.model<ChatSessionDocument>('ChatSession', ChatSessionSchema);
