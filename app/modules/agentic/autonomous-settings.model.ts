import mongoose, { type Document, type Model, Schema } from "mongoose";

export type Cadence = "slow" | "normal" | "active";
export type NotifyFrequency = "off" | "daily" | "weekly";

export interface UserAutonomousSettings {
  ownerId: string;
  tickIntervalMinutes: number;
  cadence: Cadence;
  simulateUser: boolean;
  storyTone: string;
  personality: string;
  relationship: string;
  memoryDepth: number;
  notifyFrequency: NotifyFrequency;
}

export interface UserAutonomousSettingsDoc extends Document, UserAutonomousSettings {}

const UserAutonomousSettingsSchema = new Schema<UserAutonomousSettingsDoc>(
  {
    ownerId: { type: String, required: true, unique: true, index: true },
    tickIntervalMinutes: { type: Number, default: 240 },
    cadence: { type: String, enum: ["slow", "normal", "active"], default: "normal" },
    simulateUser: { type: Boolean, default: true },
    storyTone: { type: String, default: "" },
    personality: { type: String, default: "" },
    relationship: { type: String, default: "" },
    memoryDepth: { type: Number, default: 600 },
    notifyFrequency: { type: String, enum: ["off", "daily", "weekly"], default: "off" },
  },
  { timestamps: true },
);

export const UserAutonomousSettingsModel: Model<UserAutonomousSettingsDoc> =
  (mongoose.models.UserAutonomousSettings as Model<UserAutonomousSettingsDoc>) ||
  mongoose.model<UserAutonomousSettingsDoc>("UserAutonomousSettings", UserAutonomousSettingsSchema);
