import mongoose, { Schema, Document } from 'mongoose';

export interface IActivity extends Document {
  userId: string;
  site: string;
  duration: number; // in seconds
  timestamp: Date;
  productive: boolean;
}

const ActivitySchema = new Schema({
  userId: { type: String, required: true, index: true },
  site: { type: String, required: true },
  duration: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  productive: { type: Boolean, default: true },
}, {
  timestamps: true,
});

ActivitySchema.index({ userId: 1, timestamp: -1 });

export const Activity = mongoose.model<IActivity>('Activity', ActivitySchema);
