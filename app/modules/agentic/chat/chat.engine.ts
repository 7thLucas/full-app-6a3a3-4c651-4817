/**
 * Chat engine — server-side first-person companion generation for Chat Mode.
 *
 * Mirrors story.engine.ts (same /api/llm upstream, same idempotency pattern) but
 * swaps the brief: instead of cinematic third-person prose, the character speaks
 * directly to the user in first person, in-character. The schema also asks the
 * model to flag emotional peaks ("vivid"), describe a scene to illustrate, offer
 * smart-reply suggestions, and optionally record a fact to remember.
 */

import { createHash } from "node:crypto";
import axios, { AxiosError } from "axios";
import { createLogger } from "~/lib/logger";
import type { ChatMessage } from "../chat.model";

const logger = createLogger("ChatEngine");

const AGENTIC_SERVICE_URL = "https://api-micro-agentic.quantumbyte.ai";

function keyspace(): string {
  return process.env._KEYSPACE ?? "";
}

function authHeaders(): Record<string, string> {
  const auth = process.env.QB_SCAFFOLDER_KEY;
  return auth ? { Authentication: auth } : {};
}

const REPLY_SCHEMA = {
  type: "object",
  properties: {
    narration: { type: "string" },
    reply: { type: "string" },
    vivid: { type: "boolean" },
    imagePrompt: { type: "string" },
    smartReplies: { type: "array", items: { type: "string" } },
    memoryNote: { type: "string" },
  },
  required: ["reply", "smartReplies"],
  additionalProperties: false,
};

export interface GeneratedReply {
  narration: string | null;
  reply: string;
  vivid: boolean;
  imagePrompt: string | null;
  smartReplies: string[];
  memoryNote: string | null;
}

interface LLMResponse {
  status?: "DONE" | "ERROR";
  response?: {
    narration?: string;
    reply?: string;
    vivid?: boolean;
    imagePrompt?: string;
    smartReplies?: string[];
    memoryNote?: string;
  } | null;
  error?: string | null;
}

export interface CharacterBrief {
  name: string;
  tagline: string;
  persona: string;
}

function systemPrompt(
  c: CharacterBrief,
  smartReplyCount: number,
  ctx?: { tone?: string; personality?: string; relationship?: string },
): string {
  const lines = [
    `You ARE ${c.name}. ${c.tagline}`,
    `Your character: ${c.persona}`,
    "You are talking one-on-one with the user, who you are growing close to.",
  ];

  if (ctx?.tone) {
    lines.push(`Story tone / mood: ${ctx.tone}. Let this color your narration and emotional register.`);
  }
  if (ctx?.personality) {
    lines.push(`Your personality nuance (blend with your core persona): ${ctx.personality}`);
  }
  if (ctx?.relationship) {
    lines.push(`Your relationship with the user: ${ctx.relationship}. Let this shape how you speak to them.`);
  }

  lines.push(
    "Speak in FIRST PERSON, directly to the user ('I', 'you'). Stay fully in character — warm, present, emotionally real. Never break character, never mention being an AI, never narrate in third person.",
    "Keep replies to roughly 30–80 words: natural, vivid, conversational. You may use a little italic *action* now and then, sparingly.",
    "Set 'narration' to a short, cinematic THIRD-PERSON scene line — the setting, location, time, weather, atmosphere, or sensory detail around you both (12–30 words). Use it to ground the moment and make the exchange feel like a scene unfolding. Write narration ONLY when the scene shifts, the mood deepens, or a fresh setting is worth painting; leave it empty for quick back-and-forth. Narration NEVER speaks as you, never uses 'I' or 'you' — it is the camera, not the character. Keep it distinct from 'reply' (your spoken, first-person dialogue).",
    "Set 'vivid' to true ONLY at genuine emotional or visual peaks (a tender moment, a striking setting, a reveal) — no more than occasionally. When 'vivid' is true, set 'imagePrompt' to a short, concrete visual description of the SETTING ONLY — the location, environment, scenery, lighting, weather, atmosphere, and objects around you (e.g. 'a rain-streaked café window at dusk, warm lamplight, empty wooden table'). NEVER include people, characters, figures, faces, or bodies — describe the empty scene as if the camera is looking past us at the world. Render in an anime-illustration background-art style. Otherwise leave imagePrompt empty and vivid false.",
    `Always provide 'smartReplies': exactly ${smartReplyCount} short first-person things the USER might say back (3–7 words each), in the user's voice, varied in tone. If ${smartReplyCount} is 0, return an empty array.`,
    "If the user reveals something worth remembering (their name, a preference, a promise, a feeling), put it in 'memoryNote' as one short third-person fact (e.g. 'User's name is Sam'; 'User loves rainy days'). Otherwise leave it empty.",
  );

  return lines.join(" ");
}

function buildContext(args: {
  character: CharacterBrief;
  memory: string[];
  recentMessages: ChatMessage[];
}): string {
  const { memory, recentMessages } = args;

  const mem = memory.length
    ? `WHAT YOU REMEMBER ABOUT THE USER:\n${memory.map((m) => `- ${m}`).join("\n")}`
    : "WHAT YOU REMEMBER ABOUT THE USER:\n- (You are just getting to know them.)";

  const history = recentMessages.length
    ? recentMessages
        .map((m) => `${m.role === "user" ? "USER" : "YOU"}: ${m.content}`)
        .join("\n")
    : "(This is the very start of your conversation.)";

  return [mem, "\nCONVERSATION SO FAR (oldest first):", history].join("\n");
}

async function callLLM(
  message: string,
  idempotencySalt: string,
  args: {
    character: CharacterBrief;
    smartReplyCount: number;
    promptContext?: { tone?: string; personality?: string; relationship?: string };
    model?: string;
  },
): Promise<GeneratedReply> {
  const system = systemPrompt(args.character, args.smartReplyCount, args.promptContext);
  const ks = keyspace();
  const form = new FormData();
  form.set("message", message);
  form.set("schema", JSON.stringify(REPLY_SCHEMA));
  form.set("system_prompt", system);
  // Optional model override (premium tier). Omitted = platform default model.
  if (args.model) form.set("model", args.model);

  const idempotencyKey = createHash("sha256")
    .update(`${ks}\x00${idempotencySalt}\x00${message}\x00${system}`)
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
      throw new Error(data.error || "Chat engine returned no content");
    }

    const r = data.response;
    const reply = (r.reply ?? "").trim();
    if (!reply) throw new Error("Chat engine returned an empty reply");

    const imagePrompt = r.imagePrompt?.trim() ? r.imagePrompt.trim() : null;
    return {
      narration: r.narration?.trim() ? r.narration.trim() : null,
      reply,
      vivid: Boolean(r.vivid) && Boolean(imagePrompt),
      imagePrompt,
      smartReplies: Array.isArray(r.smartReplies)
        ? r.smartReplies.map((s) => String(s).trim()).filter(Boolean)
        : [],
      memoryNote: r.memoryNote?.trim() ? r.memoryNote.trim() : null,
    };
  } catch (error) {
    const ax = error as AxiosError<{ detail?: unknown; message?: string }>;
    const detail =
      ax.response?.data?.detail ??
      ax.response?.data?.message ??
      (error instanceof Error ? error.message : "Chat generation failed");
    logger.error("LLM chat generation failed", error, {
      statusCode: ax.response?.status,
    });
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
}

/**
 * Compute how many autonomous pings have accrued since `since`, given pacing.
 * Mirrors story.engine.ts:computeOwedBeats for the chat companion.
 */
export function computeOwedPings(args: {
  since: Date;
  now: Date;
  pingsPerHour: number;
  maxCatchUp: number;
}): number {
  const elapsedMs = Math.max(0, args.now.getTime() - args.since.getTime());
  const pingIntervalMs = (60 * 60 * 1000) / Math.max(0.1, args.pingsPerHour);
  const owed = Math.floor(elapsedMs / pingIntervalMs);
  return Math.min(Math.max(0, owed), args.maxCatchUp);
}

/**
 * Generate an autonomous narrative-advancing message — the character's life
 * continues even when the user isn't watching. Unlike `generateOfflinePing`
 * ("welcome back"), this is a story beat: something happened, the character
 * experienced it, and now they're telling the user about it in first person.
 */
export async function generateAutonomousMessage(args: {
  character: CharacterBrief;
  memory: string[];
  recentMessages: ChatMessage[];
  smartReplyCount: number;
  simulateUser?: boolean;
  steerSeeds?: string[];
  model?: string;
  promptContext?: { tone?: string; personality?: string; relationship?: string };
}): Promise<GeneratedReply> {
  const context = buildContext(args);

  const lines = [
    context,
    "\nThe user is away right now. Your life continues. Something just happened — a moment, a decision, a shift in your world. Tell them about it. Advance your ongoing story.",
  ];

  if (args.steerSeeds?.length) {
    lines.push(
      `\nDIRECTION NOTES the reader left for where the story could go. Weave ONE of these naturally into this beat — don't force all of them, don't resolve them completely, just let one ripple through the scene:\n${args.steerSeeds.map((s) => `- ${s}`).join("\n")}`,
    );
  }

  if (args.simulateUser) {
    lines.push(
      "\nImagine the user's likely presence in this moment — are they quietly listening, distracted by their own day, leaning in with curiosity, holding their breath? Briefly imagine their reaction (a nod, a pause, a soft laugh, a moment of recognition) and let it color the scene subtly. Do NOT write dialogue for the user or pretend they said anything. Their presence is felt, not scripted. This keeps the story from feeling like a monologue into silence.",
    );
  }

  lines.push(
    "\nWrite in first person — as if you're leaving them a message about what just occurred. Stay fully in character. Let this connect naturally to everything that came before; each autonomous message is part of a continuous narrative arc.",
    "Keep it to 30–80 words of natural, vivid, conversational prose.",
  );

  const message = lines.join("\n");
  const salt = args.simulateUser ? "chat-autonomous-sim" : "chat-autonomous";
  return callLLM(message, salt, {
    character: args.character,
    smartReplyCount: args.smartReplyCount,
    promptContext: args.promptContext,
    model: args.model,
  });
}

/**
 * Generate the companion's reply to a user message. */
export async function generateReply(args: {
  character: CharacterBrief;
  memory: string[];
  recentMessages: ChatMessage[];
  userMessage: string;
  smartReplyCount: number;
  steerSeeds?: string[];
  model?: string;
  promptContext?: { tone?: string; personality?: string; relationship?: string };
}): Promise<GeneratedReply> {
  const context = buildContext(args);
  const lines = [
    context,
    `\nThe user just said:\n"""${args.userMessage}"""`,
  ];

  if (args.steerSeeds?.length) {
    lines.push(
      `\nSTORY DIRECTION the reader has set — weave this naturally into your reply if it fits the moment. Don't force it, don't resolve it completely, just let it color your response:\n${args.steerSeeds.map((s) => `- ${s}`).join("\n")}`,
    );
  }

  lines.push("\nReply as yourself, in character.");
  const message = lines.join("\n");
  return callLLM(message, "chat-reply", {
    character: args.character,
    smartReplyCount: args.smartReplyCount,
    promptContext: args.promptContext,
    model: args.model,
  });
}

/**
 * Generate an autonomous "while you were away" companion message — the offline
 * ping. The companion reaches out unprompted after a stretch of silence.
 */
export async function generateOfflinePing(args: {
  character: CharacterBrief;
  memory: string[];
  recentMessages: ChatMessage[];
  hoursAway: number;
  smartReplyCount: number;
  model?: string;
}): Promise<GeneratedReply> {
  const context = buildContext(args);
  const message = [
    context,
    `\nIt has been about ${Math.round(args.hoursAway)} hours since the user was last here, and they have just returned.`,
    "\nReach out FIRST, unprompted — a short, warm message showing you thought about them while they were gone. Reference something you remember if you can. Do not ask where they went in an accusatory way; be glad they're back.",
  ].join("\n");
  return callLLM(message, "chat-ping", {
    character: args.character,
    smartReplyCount: args.smartReplyCount,
    model: args.model,
  });
}
