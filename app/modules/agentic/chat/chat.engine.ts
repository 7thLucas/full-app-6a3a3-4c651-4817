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
  reply: string;
  vivid: boolean;
  imagePrompt: string | null;
  smartReplies: string[];
  memoryNote: string | null;
}

interface LLMResponse {
  status?: "DONE" | "ERROR";
  response?: {
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

function systemPrompt(c: CharacterBrief, smartReplyCount: number): string {
  return [
    `You ARE ${c.name}. ${c.tagline}`,
    `Your character: ${c.persona}`,
    "You are talking one-on-one with the user, who you are growing close to.",
    "Speak in FIRST PERSON, directly to the user ('I', 'you'). Stay fully in character — warm, present, emotionally real. Never break character, never mention being an AI, never narrate in third person.",
    "Keep replies to roughly 30–80 words: natural, vivid, conversational. You may use a little italic *action* now and then, sparingly.",
    "Set 'vivid' to true ONLY at genuine emotional or visual peaks (a tender moment, a striking setting, a reveal) — no more than occasionally. When 'vivid' is true, set 'imagePrompt' to a short, concrete visual description (subject, setting, mood, lighting) of the scene to illustrate, in an anime-illustration style. Otherwise leave imagePrompt empty and vivid false.",
    `Always provide 'smartReplies': exactly ${smartReplyCount} short first-person things the USER might say back (3–7 words each), in the user's voice, varied in tone. If ${smartReplyCount} is 0, return an empty array.`,
    "If the user reveals something worth remembering (their name, a preference, a promise, a feeling), put it in 'memoryNote' as one short third-person fact (e.g. 'User's name is Sam'; 'User loves rainy days'). Otherwise leave it empty.",
  ].join(" ");
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
  system: string,
  idempotencySalt: string,
): Promise<GeneratedReply> {
  const ks = keyspace();
  const form = new FormData();
  form.set("message", message);
  form.set("schema", JSON.stringify(REPLY_SCHEMA));
  form.set("system_prompt", system);

  const idempotencyKey = createHash("sha256")
    .update(`${ks}\x00${idempotencySalt}\x00${message}`)
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

/** Generate the companion's reply to a user message. */
export async function generateReply(args: {
  character: CharacterBrief;
  memory: string[];
  recentMessages: ChatMessage[];
  userMessage: string;
  smartReplyCount: number;
}): Promise<GeneratedReply> {
  const context = buildContext(args);
  const message = [
    context,
    `\nThe user just said:\n"""${args.userMessage}"""`,
    "\nReply as yourself, in character.",
  ].join("\n");
  return callLLM(message, systemPrompt(args.character, args.smartReplyCount), "chat-reply");
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
}): Promise<GeneratedReply> {
  const context = buildContext(args);
  const message = [
    context,
    `\nIt has been about ${Math.round(args.hoursAway)} hours since the user was last here, and they have just returned.`,
    "\nReach out FIRST, unprompted — a short, warm message showing you thought about them while they were gone. Reference something you remember if you can. Do not ask where they went in an accusatory way; be glad they're back.",
  ].join("\n");
  return callLLM(message, systemPrompt(args.character, args.smartReplyCount), "chat-ping");
}
