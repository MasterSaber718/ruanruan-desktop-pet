import mongoose, { Document, Schema } from 'mongoose';

interface UpdateDocument extends Document {
  platform: string;
  version: string;
  updateUrl: string;
  releaseNotes: string;
  forceUpdate: boolean;
  createdAt: Date;
}

const updateSchema = new Schema<UpdateDocument>({
  platform: {
    type: String,
    required: true,
    enum: ['web', 'android', 'ios', 'windows']
  },
  version: {
    type: String,
    required: true
  },
  updateUrl: {
    type: String,
    required: true
  },
  releaseNotes: {
    type: String,
    required: true
  },
  forceUpdate: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 确保平台和版本的组合是唯一的
updateSchema.index({ platform: 1, version: 1 }, { unique: true });

export const Update = mongoose.model<UpdateDocument>('Update', updateSchema);
