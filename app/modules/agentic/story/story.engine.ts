/**
 * Story engine — server-side narrative generation for Driftoria.
 *
 * Talks directly to the agentic platform's /api/llm endpoint (the same upstream
 * the agentic scaffold's POST /api/agents/llm proxies to), requesting a strict
 * JSON-schema-shaped response. This is the autonomous brain: it produces the
 * next narrative beat from the current world state, and it processes user
 * interventions into responding scenes.
 */

import { createHash } from "node:crypto";
import axios, { AxiosError } from "axios";
import { createLogger } from "~/lib/logger";
import type { Pacing, StoryBeat, StoryCharacter } from "../story.model";

const logger = createLogger("StoryEngine");

// Mirrors the constant in agents.routes.ts — single global agentic service.
const AGENTIC_SERVICE_URL = "https://api-micro-agentic.quantumbyte.ai";

function keyspace(): string {
  return process.env._KEYSPACE ?? "";
}

function authHeaders(): Record<string, string> {
  const auth = process.env.QB_SCAFFOLDER_KEY;
  return auth ? { Authentication: auth } : {};
}

const BEAT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    character: { type: "string" },
    content: { type: "string" },
  },
  required: ["title", "content"],
  additionalProperties: false,
};

export interface GeneratedBeat {
  title: string;
  character: string | null;
  content: string;
}

interface LLMResponse {
  status?: "DONE" | "ERROR";
  response?: { title?: string; character?: string; content?: string } | null;
  error?: string | null;
}

const SYSTEM_PROMPT = [
  "You are the autonomous narrative engine for Driftoria, a living story world.",
  "You write immersive, cinematic, literary prose — like a beautifully typeset novel, never like a chatbot.",
  "The story has momentum of its own: characters take their own actions and make their own decisions even when no one is watching.",
  "Each beat you write is a single, self-contained scene that meaningfully advances the narrative — introduce tension, movement, or revelation; never stall or merely recap.",
  "Honor each character's established persona and motivation. Let characters surprise the reader within the bounds of who they are.",
  "Keep each beat to roughly 90–160 words of evocative third-person prose. Give it a short, evocative scene title (2–6 words).",
  "Set the 'character' field to the name of the character most central to the scene, or omit it if the scene is ambient/world-level.",
  "Never address the reader directly, never use second person, never break the fictional frame, and never include meta commentary.",
].join(" ");

function buildContext(args: {
  title: string;
  premise: string;
  characters: StoryCharacter[];
  recentBeats: StoryBeat[];
  pendingSeeds: string[];
}): string {
  const { title, premise, characters, recentBeats, pendingSeeds } = args;

  const cast = characters.length
    ? characters
        .map(
          (c) =>
            `- ${c.name} (${c.role}): ${c.persona} Motivation: ${c.motivation}`,
        )
        .join("\n")
    : "- (No named cast yet; you may introduce characters as the world calls for them.)";

  const history = recentBeats.length
    ? recentBeats
        .map((b) => {
          if (b.kind === "intervention") {
            return `[The reader stepped in] ${b.content}`;
          }
          if (b.kind === "seed") {
            return `[A scenario was seeded] ${b.content}`;
          }
          const who = b.character ? ` — ${b.character}` : "";
          return `[Scene: ${b.title ?? "Untitled"}${who}] ${b.content}`;
        })
        .join("\n\n")
    : "(The story has not yet begun. This will be the opening scene.)";

  const seeds = pendingSeeds.length
    ? `\n\nUNRESOLVED SCENARIO SEEDS to weave in naturally (do not resolve them all at once; let them ripple):\n${pendingSeeds
        .map((s) => `- ${s}`)
        .join("\n")}`
    : "";

  return [
    `STORY TITLE: ${title}`,
    `PREMISE: ${premise}`,
    `\nCAST:\n${cast}`,
    `\nRECENT STORY SO FAR (oldest first):\n${history}`,
    seeds,
  ].join("\n");
}

async function callLLM(
  message: string,
  idempotencySalt: string,
): Promise<GeneratedBeat> {
  const ks = keyspace();
  const form = new FormData();
  form.set("message", message);
  form.set("schema", JSON.stringify(BEAT_SCHEMA));
  form.set("system_prompt", SYSTEM_PROMPT);

  const idempotencyKey = createHash("sha256")
    .update(`${ks}\x00${idempotencySalt}\x00${message}\x00${SYSTEM_PROMPT}`)
    .digest("hex")
    .slice(0, 32);

  try {
    const res = await axios.post<LLMResponse>(
      `${AGENTIC_SERVICE_URL}/api/llm`,
      form,
      {
        headers: {
          "x-id-keyspace": ks,
          "idempotency-key": idempotencyKey,
          ...authHeaders(),
        },
        timeout: 90_000,
      },
    );

    const data = res.data;
    if (data.status === "ERROR" || !data.response) {
      throw new Error(data.error || "Story engine returned no content");
    }

    const r = data.response;
    const content = (r.content ?? "").trim();
    if (!content) {
      throw new Error("Story engine returned empty narrative content");
    }

    return {
      title: (r.title ?? "An Unfolding").trim(),
      character: r.character?.trim() ? r.character.trim() : null,
      content,
    };
  } catch (error) {
    const ax = error as AxiosError<{ detail?: unknown; message?: string }>;
    const detail =
      ax.response?.data?.detail ??
      ax.response?.data?.message ??
      (error instanceof Error ? error.message : "Story generation failed");
    logger.error("LLM story generation failed", error, {
      statusCode: ax.response?.status,
    });
    throw new Error(
      typeof detail === "string" ? detail : JSON.stringify(detail),
    );
  }
}

/** Generate the next autonomous beat from the current world state. */
export async function generateAutonomousBeat(args: {
  title: string;
  premise: string;
  characters: StoryCharacter[];
  recentBeats: StoryBeat[];
  pendingSeeds: string[];
}): Promise<GeneratedBeat> {
  const context = buildContext(args);
  const message = [
    context,
    "\n\nWrite the NEXT autonomous beat. The world moves on its own here — advance the story with a fresh scene driven by the characters' own choices and the momentum already in motion. Do not wait for or address any reader.",
  ].join("\n");
  return callLLM(message, "autonomous");
}

/** Generate a scene in response to a user intervention. */
export async function generateInterventionScene(args: {
  title: string;
  premise: string;
  characters: StoryCharacter[];
  recentBeats: StoryBeat[];
  pendingSeeds: string[];
  intervention: string;
}): Promise<GeneratedBeat> {
  const context = buildContext(args);
  const message = [
    context,
    `\n\nThe reader has just stepped into the story with the following intervention:\n"""${args.intervention}"""`,
    "\nWrite the next beat as the story's living response to this intervention — let it shape the scene, the characters' reactions, and the direction of events. Stay in cinematic third-person prose; never quote or address the reader.",
  ].join("\n");
  return callLLM(message, "intervention");
}

/**
 * Compute how many autonomous beats should have accrued since `since`,
 * given pacing, capped by `maxCatchUp`. Drives the "while you were away"
 * experience without a real cron — beats are generated on demand when the
 * reader returns.
 */
export function computeOwedBeats(args: {
  since: Date;
  now: Date;
  beatsPerDay: number;
  maxCatchUp: number;
}): number {
  const { since, now, beatsPerDay, maxCatchUp } = args;
  const elapsedMs = Math.max(0, now.getTime() - since.getTime());
  const beatIntervalMs = (24 * 60 * 60 * 1000) / Math.max(1, beatsPerDay);
  const owed = Math.floor(elapsedMs / beatIntervalMs);
  return Math.min(Math.max(0, owed), maxCatchUp);
}

export function beatsPerDayForPacing(
  pacing: Pacing,
  rates: { slow: number; moderate: number; active: number },
): number {
  if (pacing === "slow") return rates.slow;
  if (pacing === "active") return rates.active;
  return rates.moderate;
}
