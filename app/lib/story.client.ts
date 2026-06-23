/**
 * Client-side helpers for the Driftoria story engine.
 * Thin wrappers over the /api/story/* surface registered by the agentic
 * module's story.routes.ts.
 */

import { apiGet, apiRequest } from "~/lib/api.client";
import { checkUpgrade } from "~/lib/billing.client";

export type Pacing = "slow" | "moderate" | "active";
export type BeatKind = "autonomous" | "intervention" | "scene" | "seed";

export interface StoryCharacterView {
  name: string;
  role: string;
  persona: string;
  motivation: string;
}

export interface StoryBeatView {
  beatId: string;
  kind: BeatKind;
  title: string | null;
  content: string;
  character: string | null;
  whileAway: boolean;
  createdAt: string;
}

export interface StoryView {
  id: string;
  title: string;
  premise: string;
  pacing: Pacing;
  characters: StoryCharacterView[];
  beats: StoryBeatView[];
  pendingSeeds: string[];
  lastAdvancedAt: string;
}

function unwrap<T>(res: { success: boolean; data?: T; message?: string }): T {
  checkUpgrade(res as { upgradeRequired?: boolean; requiredPlan?: string; message?: string });
  if (!res.success || res.data === undefined) {
    throw new Error(res.message ?? "Request failed");
  }
  return res.data;
}

export async function fetchStory(): Promise<StoryView> {
  return unwrap(await apiGet<StoryView>("/api/story"));
}

export async function catchUpStory(): Promise<{ story: StoryView; added: number }> {
  return unwrap(
    await apiRequest<{ story: StoryView; added: number }>("/api/story/catch-up", {
      method: "POST",
    }),
  );
}

export async function advanceStory(): Promise<StoryView> {
  return unwrap(await apiRequest<StoryView>("/api/story/advance", { method: "POST" }));
}

export async function interveneStory(text: string): Promise<StoryView> {
  return unwrap(
    await apiRequest<StoryView>("/api/story/intervene", {
      method: "POST",
      data: { text },
    }),
  );
}

export async function seedStory(text: string): Promise<StoryView> {
  return unwrap(
    await apiRequest<StoryView>("/api/story/seed", {
      method: "POST",
      data: { text },
    }),
  );
}

export async function setPacing(pacing: Pacing): Promise<StoryView> {
  return unwrap(
    await apiRequest<StoryView>("/api/story/pacing", {
      method: "POST",
      data: { pacing },
    }),
  );
}

export async function addCharacter(input: StoryCharacterView): Promise<StoryView> {
  return unwrap(
    await apiRequest<StoryView>("/api/story/characters", {
      method: "POST",
      data: input,
    }),
  );
}
