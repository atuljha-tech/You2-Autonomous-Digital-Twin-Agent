import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
  userId: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'dsa' | 'development' | 'learning' | 'career' | 'revision' | 'other';
  timeEstimate: string;
  estimatedMinutes: number;
  launchUrl: string;
  completed: boolean;
  completedAt?: Date;
  startedAt?: Date;
  status: 'pending' | 'active' | 'completed' | 'skipped';
  order: number;
  progressPercent: number;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema({
  userId:           { type: String, required: true, index: true },
  title:            { type: String, required: true },
  description:      { type: String, default: '' },
  priority:         { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  category:         { type: String, enum: ['dsa', 'development', 'learning', 'career', 'revision', 'other'], default: 'other' },
  timeEstimate:     { type: String, default: '' },
  estimatedMinutes: { type: Number, default: 30 },
  launchUrl:        { type: String, default: '' },
  completed:        { type: Boolean, default: false },
  completedAt:      { type: Date },
  startedAt:        { type: Date },
  status:           { type: String, enum: ['pending', 'active', 'completed', 'skipped'], default: 'pending' },
  order:            { type: Number, default: 0 },
  progressPercent:  { type: Number, default: 0, min: 0, max: 100 },
}, { timestamps: true });

TaskSchema.index({ userId: 1, order: 1 });
TaskSchema.index({ userId: 1, status: 1 });

export const Task = mongoose.model<ITask>('Task', TaskSchema);
