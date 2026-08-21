import mongoose, { Schema, Document } from 'mongoose';
import { UserProfile } from '../types';

export interface IUser extends Omit<UserProfile, 'userId'>, Document {}

const BehaviorPatternSchema = new Schema({
  pattern: { type: String, required: true },
  frequency: { type: Number, default: 1 },
  lastOccurrence: { type: Date, default: Date.now },
  trendDirection: { type: String, enum: ['improving', 'declining', 'stable'], default: 'stable' },
  confidence: { type: Number, default: 50, min: 0, max: 100 }
});

const InteractionSchema = new Schema({
  timestamp: { type: Date, default: Date.now },
  type: { 
    type: String, 
    enum: ['chat', 'simulation', 'action', 'activity'],
    required: true 
  },
  input: { type: String, required: true },
  output: { type: String, required: true },
  mode: { 
    type: String, 
    enum: ['reflection', 'simulation', 'action'],
    required: false
  }
});

const UserSchema = new Schema({
  name: { type: String, required: true },
  goals: [{ type: String }],
  habits: [{ type: String }],
  preferences: {
    workStyle: String,
    productivityPeaks: [String],
    distractions: [String]
  },
  personality: {
    traits: [String],
    strengths: [String],
    weaknesses: [String]
  },
  extraContext: {
    age: String,
    occupation: String,
    timeline: String,
    biggestObstacle: String,
    focusDuration: String,
    stressResponse: String,
  },
  behaviorPatterns: [BehaviorPatternSchema],
  productivityScore: { type: Number, default: 50, min: 0, max: 100 },
  history: [InteractionSchema]
}, { timestamps: true });

// Index for faster queries
UserSchema.index({ name: 1 });
UserSchema.index({ createdAt: -1 });

export const User = mongoose.model<IUser>('User', UserSchema);
