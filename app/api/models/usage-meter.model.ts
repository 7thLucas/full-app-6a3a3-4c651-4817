import mongoose, { type Document, type Model, Schema } from "mongoose";

/**
 * Per-owner daily usage counters, the metering backbone for plan enforcement.
 *
 * Keyed by (ownerId, dayKey) where ownerId is the same identity the chat/story
 * services use — an authenticated user id, or the anonymous `anon_*` cookie id
 * for guests (guests are always treated as the free tier). One document per
 * owner per UTC day; counters reset implicitly because a new day = a new key.
 */

export type UsageLever = "messages" | "images" | "beats";

export interface UsageMeter extends Document {
  ownerId: string;
  dayKey: string; // YYYY-MM-DD (UTC)
  messages: number;
  images: number;
  beats: number;
  createdAt: Date;
  updatedAt: Date;
}

const UsageMeterSchema = new Schema<UsageMeter>(
  {
    ownerId: { type: String, required: true },
    dayKey: { type: String, required: true },
    messages: { type: Number, default: 0 },
    images: { type: Number, default: 0 },
    beats: { type: Number, default: 0 },
  },
  { timestamps: true },
);

UsageMeterSchema.index({ ownerId: 1, dayKey: 1 }, { unique: true });

export const UsageMeterModel: Model<UsageMeter> =
  (mongoose.models.DriftoriaUsageMeter as Model<UsageMeter>) ||
  mongoose.model<UsageMeter>("DriftoriaUsageMeter", UsageMeterSchema);
