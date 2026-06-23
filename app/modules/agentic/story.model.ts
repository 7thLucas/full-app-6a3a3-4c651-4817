import mongoose, { type Document, type Model, Schema } from "mongoose";

/**
 * Driftoria story-engine domain models.
 *
 * A Story is the living world. It owns Characters and an ordered list of
 * StoryBeats. Beats are produced either autonomously by the engine
 * (kind: "autonomous") or as a direct result of a user stepping in
 * (kind: "intervention" for the user's words, "scene" for the AI response
 * that follows an intervention). Scenario seeds are stored on the story and
 * influence upcoming autonomous beats without forcing an outcome.
 */

export type Pacing = "slow" | "moderate" | "active";

export type BeatKind = "autonomous" | "intervention" | "scene" | "seed";

export interface StoryCharacter {
  name: string;
  role: string;
  persona: string;
  motivation: string;
}

export interface StoryBeat {
  beatId: string;
  kind: BeatKind;
  // Display heading for a scene (chapter-like title). Optional for interventions.
  title?: string | null;
  // The narrative prose, the user's intervention text, or the seed text.
  content: string;
  // Character most associated with this beat, when applicable.
  character?: string | null;
  // True when generated while the user was away (autonomous catch-up).
  whileAway?: boolean;
  createdAt: Date;
}

export interface Story extends Document {
  // Single-world MVP: we keep one active story document per deployment, but
  // the schema supports many. We always read the most recent one.
  title: string;
  premise: string;
  pacing: Pacing;
  characters: StoryCharacter[];
  beats: StoryBeat[];
  // Pending scenario seeds the engine should weave into upcoming beats.
  pendingSeeds: string[];
  // Last time an autonomous catch-up was computed, used to throttle.
  lastAdvancedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CharacterSchema = new Schema<StoryCharacter>(
  {
    name: { type: String, required: true },
    role: { type: String, required: true },
    persona: { type: String, required: true },
    motivation: { type: String, required: true },
  },
  { _id: false },
);

const BeatSchema = new Schema<StoryBeat>(
  {
    beatId: { type: String, required: true },
    kind: {
      type: String,
      enum: ["autonomous", "intervention", "scene", "seed"],
      required: true,
    },
    title: { type: String, default: null },
    content: { type: String, required: true },
    character: { type: String, default: null },
    whileAway: { type: Boolean, default: false },
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

const StorySchema = new Schema<Story>(
  {
    title: { type: String, required: true },
    premise: { type: String, required: true },
    pacing: {
      type: String,
      enum: ["slow", "moderate", "active"],
      default: "moderate",
      required: true,
    },
    characters: { type: [CharacterSchema], default: [] },
    beats: { type: [BeatSchema], default: [] },
    pendingSeeds: { type: [String], default: [] },
    lastAdvancedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true },
);

export const StoryModel: Model<Story> =
  (mongoose.models.DriftoriaStory as Model<Story>) ||
  mongoose.model<Story>("DriftoriaStory", StorySchema);
