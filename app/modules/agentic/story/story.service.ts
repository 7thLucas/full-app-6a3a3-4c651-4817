/**
 * Story service — orchestrates the Driftoria living world.
 *
 * Owns the singleton story document, pulls engine behavior (pacing rates,
 * catch-up cap, starter world) from the configurables module, and coordinates
 * the story engine to produce beats.
 */

import { randomUUID } from "node:crypto";
import { ConfigurablesService } from "~/modules/configurables/src/services/configurables.service";
import { defaultConfigurablesData } from "~/modules/configurables/src/constants/configurables.default";
import type { TDefaultConfigurableData } from "~/modules/configurables/src/constants/configurables.default";
import { createLogger } from "~/lib/logger";
import { StoryModel, type Pacing, type Story, type StoryBeat } from "../story.model";
import {
  beatsPerDayForPacing,
  computeOwedBeats,
  generateAutonomousBeat,
  generateInterventionScene,
} from "./story.engine";

const logger = createLogger("StoryService");

const RECENT_BEAT_WINDOW = 8;

function newBeat(partial: Omit<StoryBeat, "beatId" | "createdAt">): StoryBeat {
  return {
    beatId: randomUUID(),
    createdAt: new Date(),
    ...partial,
  };
}

async function getEngineConfig(): Promise<TDefaultConfigurableData> {
  const data = (await ConfigurablesService.getData()) as Partial<TDefaultConfigurableData>;
  // Merge over defaults so missing fields always have sane values.
  return { ...defaultConfigurablesData, ...data } as TDefaultConfigurableData;
}

/** Get the active story, creating it from configurables if none exists. */
export async function getOrCreateStory(): Promise<Story> {
  const existing = await StoryModel.findOne().sort({ createdAt: -1 }).exec();
  if (existing) return existing;

  const cfg = await getEngineConfig();
  const story = await StoryModel.create({
    title: cfg.starterStoryTitle || "An Untitled World",
    premise:
      cfg.starterStoryPremise ||
      "A world waiting for its first scene to unfold.",
    pacing: (cfg.defaultPacing as Pacing) || "moderate",
    characters: (cfg.starterCharacters ?? []).map((c) => ({
      name: c.name,
      role: c.role,
      persona: c.persona,
      motivation: c.motivation,
    })),
    beats: [],
    pendingSeeds: [],
    lastAdvancedAt: new Date(),
  });
  logger.info(`Created starter story "${story.title}"`);
  return story;
}

function recentBeats(story: Story): StoryBeat[] {
  return story.beats.slice(-RECENT_BEAT_WINDOW);
}

async function pacingRates(): Promise<{
  rates: { slow: number; moderate: number; active: number };
  maxCatchUp: number;
}> {
  const cfg = await getEngineConfig();
  return {
    rates: {
      slow: cfg.slowBeatsPerDay,
      moderate: cfg.moderateBeatsPerDay,
      active: cfg.activeBeatsPerDay,
    },
    maxCatchUp: cfg.autonomousCatchUpBeats,
  };
}

/**
 * Generate a single autonomous beat now and append it. The defining feature:
 * the world advances on its own.
 */
export async function advanceStory(): Promise<Story> {
  const story = await getOrCreateStory();

  const generated = await generateAutonomousBeat({
    title: story.title,
    premise: story.premise,
    characters: story.characters,
    recentBeats: recentBeats(story),
    pendingSeeds: story.pendingSeeds,
  });

  story.beats.push(
    newBeat({
      kind: "autonomous",
      title: generated.title,
      content: generated.content,
      character: generated.character,
      whileAway: false,
    }),
  );
  story.pendingSeeds = [];
  story.lastAdvancedAt = new Date();
  await story.save();
  return story;
}

/**
 * On the reader's return, generate any autonomous beats "owed" by elapsed time
 * and pacing — the "while you were away" catch-up. Returns how many were added.
 */
export async function catchUpStory(): Promise<{ story: Story; added: number }> {
  const story = await getOrCreateStory();
  const { rates, maxCatchUp } = await pacingRates();
  const beatsPerDay = beatsPerDayForPacing(story.pacing, rates);

  const owed = computeOwedBeats({
    since: story.lastAdvancedAt,
    now: new Date(),
    beatsPerDay,
    maxCatchUp,
  });

  if (owed <= 0) {
    return { story, added: 0 };
  }

  let added = 0;
  for (let i = 0; i < owed; i++) {
    try {
      const generated = await generateAutonomousBeat({
        title: story.title,
        premise: story.premise,
        characters: story.characters,
        recentBeats: recentBeats(story),
        pendingSeeds: story.pendingSeeds,
      });
      story.beats.push(
        newBeat({
          kind: "autonomous",
          title: generated.title,
          content: generated.content,
          character: generated.character,
          whileAway: true,
        }),
      );
      story.pendingSeeds = [];
      added += 1;
    } catch (err) {
      logger.warn(`Catch-up beat ${i + 1}/${owed} failed; stopping early`, {
        reason: err instanceof Error ? err.message : String(err),
      });
      break;
    }
  }

  story.lastAdvancedAt = new Date();
  await story.save();
  return { story, added };
}

/** Record a user intervention and generate the responding scene. */
export async function intervene(text: string): Promise<Story> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Intervention text is required");

  const story = await getOrCreateStory();

  story.beats.push(
    newBeat({ kind: "intervention", content: trimmed, whileAway: false }),
  );

  const generated = await generateInterventionScene({
    title: story.title,
    premise: story.premise,
    characters: story.characters,
    recentBeats: recentBeats(story),
    pendingSeeds: story.pendingSeeds,
    intervention: trimmed,
  });

  story.beats.push(
    newBeat({
      kind: "scene",
      title: generated.title,
      content: generated.content,
      character: generated.character,
      whileAway: false,
    }),
  );
  story.pendingSeeds = [];
  story.lastAdvancedAt = new Date();
  await story.save();
  return story;
}

/** Plant a scenario seed to influence upcoming autonomous beats. */
export async function seedScenario(text: string): Promise<Story> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Seed text is required");

  const story = await getOrCreateStory();
  story.pendingSeeds.push(trimmed);
  story.beats.push(
    newBeat({ kind: "seed", content: trimmed, whileAway: false }),
  );
  await story.save();
  return story;
}

/** Update the story's pacing. */
export async function setPacing(pacing: Pacing): Promise<Story> {
  const story = await getOrCreateStory();
  story.pacing = pacing;
  await story.save();
  return story;
}

/** Add a character to the world. */
export async function addCharacter(input: {
  name: string;
  role: string;
  persona: string;
  motivation: string;
}): Promise<Story> {
  const story = await getOrCreateStory();
  story.characters.push({
    name: input.name.trim(),
    role: input.role.trim(),
    persona: input.persona.trim(),
    motivation: input.motivation.trim(),
  });
  await story.save();
  return story;
}

export interface StoryView {
  id: string;
  title: string;
  premise: string;
  pacing: Pacing;
  characters: Array<{
    name: string;
    role: string;
    persona: string;
    motivation: string;
  }>;
  beats: Array<{
    beatId: string;
    kind: StoryBeat["kind"];
    title: string | null;
    content: string;
    character: string | null;
    whileAway: boolean;
    createdAt: string;
  }>;
  pendingSeeds: string[];
  lastAdvancedAt: string;
}

export function toStoryView(story: Story): StoryView {
  return {
    id: String(story._id),
    title: story.title,
    premise: story.premise,
    pacing: story.pacing,
    characters: story.characters.map((c) => ({
      name: c.name,
      role: c.role,
      persona: c.persona,
      motivation: c.motivation,
    })),
    beats: story.beats.map((b) => ({
      beatId: b.beatId,
      kind: b.kind,
      title: b.title ?? null,
      content: b.content,
      character: b.character ?? null,
      whileAway: Boolean(b.whileAway),
      createdAt: new Date(b.createdAt).toISOString(),
    })),
    pendingSeeds: story.pendingSeeds,
    lastAdvancedAt: new Date(story.lastAdvancedAt).toISOString(),
  };
}
