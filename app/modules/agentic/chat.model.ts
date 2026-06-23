import mongoose, { type Document, type Model, Schema } from "mongoose";

/**
 * Driftoria Chat Mode domain models (the Emochi-class 1:1 companion experience).
 *
 * A Character is a collectible companion shown in the discovery feed. A
 * ChatSession is a single user's 1:1 thread with one Character, owning an
 * ordered list of ChatMessages. Messages may carry an inline scene illustration
 * (imageUrl) when the engine flags an emotional beat as "vivid". The session
 * keeps a rolling memory[] of short facts the companion "remembers".
 *
 * MVP keys a single session per character (mirrors the singleton Story), so the
 * experience works without an authenticated user. The schema is ready for a
 * per-user `ownerId` when auth is wired in.
 */

export type ChatRole = "user" | "character";

export interface Character {
  characterId: string;
  name: string;
  tagline: string;
  // The hidden system prompt / "definition" — personality + voice. Never sent
  // to the public profile view.
  persona: string;
  greeting: string;
  tags: string[];
  avatarUrl: string;
  // Long public bio shown on the character's profile page (distinct from the
  // hidden `persona`). Safe to show anyone.
  description: string;
  // The opening setting/situation the conversation drops you into.
  scenario: string;
  gender: string;
  // Genre/category bucket (e.g. "Romance", "Adventure").
  category: string;
  // Display handle for the creator, shown as "by @handle" on the profile.
  creatorName: string;
  // Extra portrait shots beyond `avatarUrl`, rendered as a gallery strip.
  galleryUrls: string[];
  // Engagement counters surfaced on the profile (the "83.4k chats" numbers).
  chatCount: number;
  likeCount: number;
  followerCount: number;
  // Who created it: "system" for seeded starters, else a user id (future auth).
  creatorId: string;
  createdAt: Date;
}

export interface ChatMessage {
  messageId: string;
  role: ChatRole;
  content: string;
  // Cinematic third-person scene line (setting/location/atmosphere) painted
  // around this companion message, when the engine set one.
  narration?: string | null;
  // Inline AI scene illustration for this message, when one was generated.
  imageUrl?: string | null;
  // True when the engine flagged this beat as an emotional peak.
  vivid?: boolean;
  // True when generated autonomously while the user was away (offline ping).
  whileAway?: boolean;
  createdAt: Date;
}

export interface CharacterDoc extends Document, Character {}

export interface ChatSession extends Document {
  characterId: string;
  ownerId: string;
  messages: ChatMessage[];
  // Short facts the companion remembers about the user, capped by memoryDepth.
  memory: string[];
  // Pending direction hints the user planted. Future autonomous messages weave
  // these in, then the seed is consumed (removed from the array).
  steerSeeds: string[];
  // How many inline illustrations have been generated today (free-tier cap).
  imagesToday: number;
  imagesDayKey: string;
  lastVisitedAt: Date;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CharacterSchema = new Schema<CharacterDoc>(
  {
    characterId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    tagline: { type: String, required: true },
    persona: { type: String, required: true },
    greeting: { type: String, required: true },
    tags: { type: [String], default: [] },
    avatarUrl: { type: String, default: "" },
    description: { type: String, default: "" },
    scenario: { type: String, default: "" },
    gender: { type: String, default: "" },
    category: { type: String, default: "" },
    creatorName: { type: String, default: "" },
    galleryUrls: { type: [String], default: [] },
    chatCount: { type: Number, default: 0 },
    likeCount: { type: Number, default: 0 },
    followerCount: { type: Number, default: 0 },
    creatorId: { type: String, default: "system" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const MessageSchema = new Schema<ChatMessage>(
  {
    messageId: { type: String, required: true },
    role: { type: String, enum: ["user", "character"], required: true },
    content: { type: String, required: true },
    narration: { type: String, default: null },
    imageUrl: { type: String, default: null },
    vivid: { type: Boolean, default: false },
    whileAway: { type: Boolean, default: false },
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

const ChatSessionSchema = new Schema<ChatSession>(
  {
    characterId: { type: String, required: true, index: true },
    ownerId: { type: String, default: "anon", index: true },
    messages: { type: [MessageSchema], default: [] },
    memory: { type: [String], default: [] },
    steerSeeds: { type: [String], default: [] },
    imagesToday: { type: Number, default: 0 },
    imagesDayKey: { type: String, default: "" },
    lastVisitedAt: { type: Date, default: () => new Date() },
    lastMessageAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true },
);

export const CharacterModel: Model<CharacterDoc> =
  (mongoose.models.DriftoriaCharacter as Model<CharacterDoc>) ||
  mongoose.model<CharacterDoc>("DriftoriaCharacter", CharacterSchema);

export const ChatSessionModel: Model<ChatSession> =
  (mongoose.models.DriftoriaChatSession as Model<ChatSession>) ||
  mongoose.model<ChatSession>("DriftoriaChatSession", ChatSessionSchema);
