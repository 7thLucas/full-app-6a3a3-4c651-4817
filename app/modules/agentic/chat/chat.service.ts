/**
 * Chat service — orchestrates Chat Mode (the 1:1 companion experience).
 *
 * Owns the Character collection (seeded from configurables on first use) and a
 * ChatSession per character. Coordinates the chat engine for replies + offline
 * pings, generates avatar/scene art URLs, and enforces the free-tier daily image
 * cap. Pulls all tunables (image gen URL, illustration frequency, memory depth,
 * smart-reply count, ping threshold) from the configurables module.
 */

import { randomUUID } from "node:crypto";
import { ConfigurablesService } from "~/modules/configurables/src/services/configurables.service";
import { defaultConfigurablesData } from "~/modules/configurables/src/constants/configurables.default";
import type { TDefaultConfigurableData } from "~/modules/configurables/src/constants/configurables.default";
import { createLogger } from "~/lib/logger";
import {
  CharacterModel,
  ChatSessionModel,
  type ChatMessage,
  type ChatSession,
  type CharacterDoc,
} from "../chat.model";
import { avatarPrompt, buildImageUrl } from "./chat.image";
import {
  generateOfflinePing,
  generateReply,
  type CharacterBrief,
  type GeneratedReply,
} from "./chat.engine";

const logger = createLogger("ChatService");

const RECENT_MESSAGE_WINDOW = 12;

async function getConfig(): Promise<TDefaultConfigurableData> {
  const data = (await ConfigurablesService.getData()) as Partial<TDefaultConfigurableData>;
  return { ...defaultConfigurablesData, ...data } as TDefaultConfigurableData;
}

function newMessage(partial: Omit<ChatMessage, "messageId" | "createdAt">): ChatMessage {
  return { messageId: randomUUID(), createdAt: new Date(), ...partial };
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function brief(c: CharacterDoc): CharacterBrief {
  return { name: c.name, tagline: c.tagline, persona: c.persona };
}

/**
 * Seed the discovery feed from configurables, idempotently.
 *
 * Each starter is upserted by (name, creatorId:"system") with `$setOnInsert`,
 * so this is safe to call any time: missing starters get added, ones already
 * present are left untouched (preserving their stable characterId and any
 * later edits). That means growing `starterChatCharacters` in configurables
 * back-fills new companions into an existing DB on the next feed access —
 * no manual reseed. User-created characters never collide (different
 * creatorId), and the cheap count guard skips the write once all starters
 * are present.
 */
export async function ensureSeedCharacters(): Promise<void> {
  const cfg = await getConfig();
  const starters = cfg.starterChatCharacters ?? [];
  if (!starters.length) return;

  const seededCount = await CharacterModel.countDocuments({ creatorId: "system" }).exec();
  if (seededCount >= starters.length) return;

  const result = await CharacterModel.bulkWrite(
    starters.map((s) => ({
      updateOne: {
        filter: { name: s.name, creatorId: "system" },
        update: {
          $setOnInsert: {
            characterId: randomUUID(),
            name: s.name,
            tagline: s.tagline,
            persona: s.persona,
            greeting: s.greeting,
            tags: s.tags ?? [],
            avatarUrl: cfg.enableCharacterAvatars
              ? buildImageUrl(cfg.imageGenUrl, avatarPrompt(s.name, s.avatarPrompt), {
                  seedKey: s.name,
                })
              : "",
            creatorId: "system",
          },
        },
        upsert: true,
      },
    })),
  );

  const added = result.upsertedCount ?? 0;
  if (added > 0) logger.info(`Seeded ${added} starter chat companion(s)`);
}

export async function listCharacters(): Promise<CharacterDoc[]> {
  await ensureSeedCharacters();
  return CharacterModel.find().sort({ createdAt: 1 }).exec();
}

export async function getCharacter(characterId: string): Promise<CharacterDoc | null> {
  await ensureSeedCharacters();
  return CharacterModel.findOne({ characterId }).exec();
}

export async function createCharacter(
  input: {
    name: string;
    tagline: string;
    persona: string;
    greeting?: string;
    tags?: string[];
    avatarPrompt?: string;
  },
  ownerId = "user",
): Promise<CharacterDoc> {
  const cfg = await getConfig();
  const name = input.name.trim();
  const tagline = input.tagline.trim();
  const persona = input.persona.trim();
  const promptText = (input.avatarPrompt?.trim() || `${tagline} ${persona}`).slice(0, 400);

  const character = await CharacterModel.create({
    characterId: randomUUID(),
    name,
    tagline,
    persona,
    greeting:
      input.greeting?.trim() ||
      `*${name} looks up as you arrive* …Oh. Hello, you. I was hoping you'd come.`,
    tags: (input.tags ?? []).map((t) => t.trim()).filter(Boolean),
    avatarUrl: cfg.enableCharacterAvatars
      ? buildImageUrl(cfg.imageGenUrl, avatarPrompt(name, promptText), { seedKey: name + persona })
      : "",
    creatorId: ownerId,
  });
  logger.info(`Created chat companion "${name}"`);
  return character;
}

async function getOrCreateSession(
  character: CharacterDoc,
  ownerId: string,
): Promise<ChatSession> {
  let session = await ChatSessionModel.findOne({
    characterId: character.characterId,
    ownerId,
  }).exec();

  if (!session) {
    session = await ChatSessionModel.create({
      characterId: character.characterId,
      ownerId,
      messages: [
        newMessage({ role: "character", content: character.greeting, whileAway: false }),
      ],
      memory: [],
      lastVisitedAt: new Date(),
      lastMessageAt: new Date(),
    });
  }
  return session;
}

function recent(session: ChatSession): ChatMessage[] {
  return session.messages.slice(-RECENT_MESSAGE_WINDOW);
}

function clampMemory(memory: string[], depth: number): string[] {
  // Keep most recent facts within the character budget.
  const out: string[] = [];
  let used = 0;
  for (const fact of [...memory].reverse()) {
    used += fact.length + 1;
    if (used > depth) break;
    out.unshift(fact);
  }
  return out;
}

/** Apply a generated reply to the session: append message, art, memory. */
async function applyGenerated(
  session: ChatSession,
  cfg: TDefaultConfigurableData,
  gen: GeneratedReply,
  whileAway: boolean,
): Promise<{ smartReplies: string[] }> {
  let imageUrl: string | null = null;

  if (cfg.enableInlineIllustrations && gen.vivid && gen.imagePrompt) {
    const today = dayKey(new Date());
    if (session.imagesDayKey !== today) {
      session.imagesDayKey = today;
      session.imagesToday = 0;
    }
    const turnGate =
      session.messages.filter((m) => m.role === "character").length %
        Math.max(1, cfg.illustrationFrequency) ===
      0;
    const underCap = session.imagesToday < cfg.freeTierDailyImages;
    if (underCap && turnGate) {
      imageUrl = buildImageUrl(cfg.imageGenUrl, gen.imagePrompt, {
        width: 768,
        height: 512,
        seedKey: gen.imagePrompt + session.messages.length,
      });
      session.imagesToday += 1;
    }
  }

  session.messages.push(
    newMessage({
      role: "character",
      content: gen.reply,
      imageUrl,
      vivid: Boolean(imageUrl),
      whileAway,
    }),
  );

  if (gen.memoryNote && cfg.memoryDepth > 0) {
    if (!session.memory.includes(gen.memoryNote)) {
      session.memory.push(gen.memoryNote);
      session.memory = clampMemory(session.memory, cfg.memoryDepth);
    }
  }

  session.lastMessageAt = new Date();
  return { smartReplies: gen.smartReplies.slice(0, cfg.smartReplyCount) };
}

export interface SessionView {
  characterId: string;
  character: {
    characterId: string;
    name: string;
    tagline: string;
    persona: string;
    tags: string[];
    avatarUrl: string;
  };
  messages: Array<{
    messageId: string;
    role: ChatMessage["role"];
    content: string;
    imageUrl: string | null;
    vivid: boolean;
    whileAway: boolean;
    createdAt: string;
  }>;
  memory: string[];
  smartReplies: string[];
}

function toSessionView(
  character: CharacterDoc,
  session: ChatSession,
  smartReplies: string[],
): SessionView {
  return {
    characterId: character.characterId,
    character: {
      characterId: character.characterId,
      name: character.name,
      tagline: character.tagline,
      persona: character.persona,
      tags: character.tags,
      avatarUrl: character.avatarUrl,
    },
    messages: session.messages.map((m) => ({
      messageId: m.messageId,
      role: m.role,
      content: m.content,
      imageUrl: m.imageUrl ?? null,
      vivid: Boolean(m.vivid),
      whileAway: Boolean(m.whileAway),
      createdAt: new Date(m.createdAt).toISOString(),
    })),
    memory: session.memory,
    smartReplies,
  };
}

/**
 * Open a session: create on first visit, and — if enabled and enough time has
 * passed — generate one autonomous "while you were away" ping before returning.
 */
export async function openSession(
  characterId: string,
  ownerId: string,
): Promise<SessionView> {
  const character = await getCharacter(characterId);
  if (!character) throw new Error("Character not found");

  const cfg = await getConfig();
  const session = await getOrCreateSession(character, ownerId);

  let smartReplies: string[] = [];
  const hoursAway =
    (Date.now() - new Date(session.lastMessageAt).getTime()) / (1000 * 60 * 60);
  const lastFromUser = session.messages.at(-1)?.role === "user";

  if (
    cfg.enableOfflinePings &&
    session.messages.length > 1 &&
    !lastFromUser &&
    hoursAway >= cfg.offlinePingAfterHours
  ) {
    try {
      const gen = await generateOfflinePing({
        character: brief(character),
        memory: session.memory,
        recentMessages: recent(session),
        hoursAway,
        smartReplyCount: cfg.smartReplyCount,
      });
      ({ smartReplies } = await applyGenerated(session, cfg, gen, true));
    } catch (err) {
      logger.warn("Offline ping failed; skipping", {
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  session.lastVisitedAt = new Date();
  await session.save();
  return toSessionView(character, session, smartReplies);
}

/** Send a user message and generate the companion's reply. */
export async function sendMessage(
  characterId: string,
  ownerId: string,
  text: string,
): Promise<SessionView> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Message text is required");

  const character = await getCharacter(characterId);
  if (!character) throw new Error("Character not found");

  const cfg = await getConfig();
  const session = await getOrCreateSession(character, ownerId);

  session.messages.push(newMessage({ role: "user", content: trimmed, whileAway: false }));

  const gen = await generateReply({
    character: brief(character),
    memory: session.memory,
    recentMessages: recent(session),
    userMessage: trimmed,
    smartReplyCount: cfg.smartReplyCount,
  });

  const { smartReplies } = await applyGenerated(session, cfg, gen, false);
  await session.save();
  return toSessionView(character, session, smartReplies);
}

export interface CharacterCardView {
  characterId: string;
  name: string;
  tagline: string;
  tags: string[];
  avatarUrl: string;
  creatorId: string;
}

export function toCardView(c: CharacterDoc): CharacterCardView {
  return {
    characterId: c.characterId,
    name: c.name,
    tagline: c.tagline,
    tags: c.tags,
    avatarUrl: c.avatarUrl,
    creatorId: c.creatorId,
  };
}
