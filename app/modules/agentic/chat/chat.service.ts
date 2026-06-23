/**
 * Chat service — orchestrates Chat Mode (the 1:1 companion experience).
 *
 * Owns the Character collection (seeded from configurables on first use) and a
 * ChatSession per character. Coordinates the chat engine for replies + offline
 * pings, generates avatar/scene art URLs, and enforces the free-tier daily image
 * cap. Pulls all tunables (image gen URL, illustration frequency, memory depth,
 * smart-reply count, ping threshold) from the configurables module.
 */

import { createHash, randomUUID } from "node:crypto";
import { ConfigurablesService } from "~/modules/configurables/src/services/configurables.service";
import { defaultConfigurablesData } from "~/modules/configurables/src/constants/configurables.default";
import type {
  TDefaultConfigurableData,
  TPlanLimits,
} from "~/modules/configurables/src/constants/configurables.default";
import { createLogger } from "~/lib/logger";
import {
  getLimitsFor,
  getUsageToday,
  GuestGateError,
  isGuestOwner,
  QuotaError,
  recordUsage,
  withinLimit,
} from "~/api/services/usage.service";
import {
  CharacterModel,
  ChatSessionModel,
  type ChatMessage,
  type ChatSession,
  type CharacterDoc,
} from "../chat.model";
import { avatarPrompt, buildGalleryUrls, buildImageUrl, scenePrompt } from "./chat.image";
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

/** Model id for this owner's tier: premium when their plan allows it, else base. */
function pickModel(cfg: TDefaultConfigurableData, limits: TPlanLimits): string | undefined {
  const id = limits.premiumModel ? cfg.aiModelPremium : cfg.aiModelBase;
  return id?.trim() ? id.trim() : undefined;
}

/**
 * Seed believable-looking engagement numbers for a starter from its name, so
 * profiles don't all read "0 chats" before any real traffic. Deterministic, so
 * a given starter always shows the same counts across reseeds/reloads. Real
 * user-created characters start at zero and grow from actual use.
 */
function seedStats(name: string): { chatCount: number; likeCount: number; followerCount: number } {
  const n = parseInt(createHash("sha256").update(name).digest("hex").slice(0, 8), 16);
  const chatCount = 2_000 + (n % 90_000);
  return {
    chatCount,
    likeCount: Math.round(chatCount * (0.18 + ((n >> 8) % 12) / 100)),
    followerCount: Math.round(chatCount * (0.04 + ((n >> 16) % 6) / 100)),
  };
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
  if (seededCount >= starters.length) {
    await backfillStarterProfiles(cfg, starters);
    return;
  }

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
            description: s.description ?? "",
            scenario: s.scenario ?? "",
            gender: s.gender ?? "",
            category: s.category ?? "",
            creatorName: "system",
            galleryUrls: cfg.enableCharacterAvatars
              ? buildGalleryUrls(cfg.imageGenUrl, s.name, s.avatarPrompt)
              : [],
            ...seedStats(s.name),
            creatorId: "system",
          },
        },
        upsert: true,
      },
    })),
  );

  const added = result.upsertedCount ?? 0;
  if (added > 0) logger.info(`Seeded ${added} starter chat companion(s)`);

  await backfillStarterProfiles(cfg, starters);
}

/** Aggregation expression: true when a string field is missing or empty. */
function isBlank(field: string) {
  return { $eq: [{ $ifNull: [field, ""] }, ""] };
}

/** Aggregation expression: true when an array field is missing or empty. */
function isEmptyArray(field: string) {
  return { $eq: [{ $size: { $ifNull: [field, []] } }, 0] };
}

/**
 * Back-fill profile fields onto starters seeded before those fields existed.
 *
 * Idempotent and self-guarding: a cheap count skips the write once every
 * starter row has a profile. Each field is only overwritten when blank, via an
 * aggregation-pipeline update — so manual edits, real chat growth, or accrued
 * likes on existing rows are preserved. Safe to run on every feed hit.
 */
async function backfillStarterProfiles(
  cfg: TDefaultConfigurableData,
  starters: TDefaultConfigurableData["starterChatCharacters"],
): Promise<void> {
  const staleOr: Record<string, unknown>[] = [
    { description: { $in: ["", null] } },
    { description: { $exists: false } },
  ];
  // Only treat an empty gallery as stale when avatars are on — otherwise it's
  // intentionally empty and would make the guard loop forever.
  if (cfg.enableCharacterAvatars) staleOr.push({ galleryUrls: { $size: 0 } });

  const stale = await CharacterModel.countDocuments({
    creatorId: "system",
    $or: staleOr,
  }).exec();
  if (!stale) return;

  const result = await CharacterModel.bulkWrite(
    starters.map((s) => {
      const stats = seedStats(s.name);
      const gallery = cfg.enableCharacterAvatars
        ? buildGalleryUrls(cfg.imageGenUrl, s.name, s.avatarPrompt)
        : [];
      const avatar = cfg.enableCharacterAvatars
        ? buildImageUrl(cfg.imageGenUrl, avatarPrompt(s.name, s.avatarPrompt), { seedKey: s.name })
        : "";
      return {
        updateOne: {
          filter: { name: s.name, creatorId: "system" },
          update: [
            {
              $set: {
                description: { $cond: [isBlank("$description"), s.description ?? s.tagline, "$description"] },
                scenario: { $cond: [isBlank("$scenario"), s.scenario ?? "", "$scenario"] },
                gender: { $cond: [isBlank("$gender"), s.gender ?? "", "$gender"] },
                category: { $cond: [isBlank("$category"), s.category ?? "", "$category"] },
                creatorName: { $cond: [isBlank("$creatorName"), "system", "$creatorName"] },
                avatarUrl: { $cond: [isBlank("$avatarUrl"), avatar, "$avatarUrl"] },
                galleryUrls: { $cond: [isEmptyArray("$galleryUrls"), gallery, "$galleryUrls"] },
                chatCount: { $cond: [{ $lte: [{ $ifNull: ["$chatCount", 0] }, 0] }, stats.chatCount, "$chatCount"] },
                likeCount: { $cond: [{ $lte: [{ $ifNull: ["$likeCount", 0] }, 0] }, stats.likeCount, "$likeCount"] },
                followerCount: {
                  $cond: [{ $lte: [{ $ifNull: ["$followerCount", 0] }, 0] }, stats.followerCount, "$followerCount"],
                },
              },
            },
          ],
        },
      };
    }),
  );

  const touched = result.modifiedCount ?? 0;
  if (touched > 0) logger.info(`Back-filled profiles for ${touched} starter companion(s)`);
}

export async function listCharacters(): Promise<CharacterDoc[]> {
  await ensureSeedCharacters();
  return CharacterModel.find().sort({ createdAt: 1 }).exec();
}

/** Discovery feed as view models. Stats come from the character's own counters. */
export async function listCharacterCards(): Promise<CharacterCardView[]> {
  const characters = await listCharacters();
  return characters.map(toCardView);
}

export interface ChatSummaryView {
  characterId: string;
  name: string;
  tagline: string;
  avatarUrl: string;
  lastSnippet: string;
  lastMessageAt: string;
  messageCount: number;
}

/** The signed-in (or cookie-identified) owner's existing conversations, newest first. */
export async function listSessionsForOwner(
  ownerId: string,
): Promise<ChatSummaryView[]> {
  const sessions = await ChatSessionModel.find({ ownerId })
    .sort({ lastMessageAt: -1 })
    .exec();
  if (!sessions.length) return [];

  const characters = await CharacterModel.find({
    characterId: { $in: sessions.map((s) => s.characterId) },
  }).exec();
  const byId = new Map(characters.map((c) => [c.characterId, c]));

  const summaries: ChatSummaryView[] = [];
  for (const s of sessions) {
    const c = byId.get(s.characterId);
    if (!c) continue; // character deleted — skip orphaned thread
    const last = s.messages[s.messages.length - 1];
    summaries.push({
      characterId: c.characterId,
      name: c.name,
      tagline: c.tagline,
      avatarUrl: c.avatarUrl,
      lastSnippet: last?.content?.slice(0, 120) ?? "",
      lastMessageAt: (s.lastMessageAt ?? s.createdAt).toISOString(),
      messageCount: s.messages.length,
    });
  }
  return summaries;
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
    description?: string;
    scenario?: string;
    gender?: string;
    category?: string;
    creatorName?: string;
  },
  ownerId = "user",
): Promise<CharacterDoc> {
  const cfg = await getConfig();
  const { plan, limits } = await getLimitsFor(ownerId);

  // Enforce the owner's companion-count cap (their own creations only).
  const owned = await CharacterModel.countDocuments({ creatorId: ownerId }).exec();
  if (!withinLimit(owned, limits.maxCompanions)) {
    throw new QuotaError({
      lever: "companions",
      plan,
      limit: limits.maxCompanions,
      used: owned,
    });
  }

  // Avatar art is a paid perk: both the global toggle and the plan must allow it.
  const avatarsAllowed = cfg.enableCharacterAvatars && limits.characterAvatars;

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
    avatarUrl: avatarsAllowed
      ? buildImageUrl(cfg.imageGenUrl, avatarPrompt(name, promptText), { seedKey: name + persona })
      : "",
    description: input.description?.trim() || tagline,
    scenario: input.scenario?.trim() || "",
    gender: input.gender?.trim() || "",
    category: input.category?.trim() || "",
    creatorName: input.creatorName?.trim() || "you",
    galleryUrls: avatarsAllowed
      ? buildGalleryUrls(cfg.imageGenUrl, name, promptText)
      : [],
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
    // First time anyone opens a thread with this character counts as a chat.
    await CharacterModel.updateOne(
      { characterId: character.characterId },
      { $inc: { chatCount: 1 } },
    ).exec();
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
  limits: TPlanLimits,
  gen: GeneratedReply,
  whileAway: boolean,
  setting: string,
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
    // Daily image cap is per-owner across all their sessions, driven by plan.
    const imagesUsed = (await getUsageToday(session.ownerId)).images;
    const underCap = withinLimit(imagesUsed, limits.dailyImages);
    if (underCap && turnGate) {
      imageUrl = buildImageUrl(cfg.imageGenUrl, scenePrompt(gen.imagePrompt, setting), {
        width: 768,
        height: 512,
        seedKey: gen.imagePrompt + session.messages.length,
      });
      session.imagesToday += 1;
      // Meter inline-image generation against the owner's daily plan budget.
      void recordUsage(session.ownerId, "images").catch(() => {});
    }
  }

  session.messages.push(
    newMessage({
      role: "character",
      content: gen.reply,
      narration: gen.narration,
      imageUrl,
      vivid: Boolean(imageUrl),
      whileAway,
    }),
  );

  if (gen.memoryNote && limits.memoryDepth > 0) {
    if (!session.memory.includes(gen.memoryNote)) {
      session.memory.push(gen.memoryNote);
      session.memory = clampMemory(session.memory, limits.memoryDepth);
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
    narration: string | null;
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
      narration: m.narration ?? null,
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
  const { limits } = await getLimitsFor(ownerId);
  const session = await getOrCreateSession(character, ownerId);

  let smartReplies: string[] = [];
  const hoursAway =
    (Date.now() - new Date(session.lastMessageAt).getTime()) / (1000 * 60 * 60);
  const lastFromUser = session.messages.at(-1)?.role === "user";

  if (
    cfg.enableOfflinePings &&
    limits.offlinePings &&
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
        model: pickModel(cfg, limits),
      });
      ({ smartReplies } = await applyGenerated(
        session,
        cfg,
        limits,
        gen,
        true,
        character.scenario || character.persona,
      ));
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
  const { plan, limits } = await getLimitsFor(ownerId);

  // Enforce the owner's daily message cap before spending an LLM call.
  const usedMessages = (await getUsageToday(ownerId)).messages;
  if (!withinLimit(usedMessages, limits.dailyMessages)) {
    throw new QuotaError({
      lever: "messages",
      plan,
      limit: limits.dailyMessages,
      used: usedMessages,
    });
  }

  const session = await getOrCreateSession(character, ownerId);

  // Guests get a taste before the login gate: cap their user turns per companion.
  if (isGuestOwner(ownerId) && cfg.guestMessageLimit >= 0) {
    const guestTurns = session.messages.filter((m) => m.role === "user").length;
    if (guestTurns >= cfg.guestMessageLimit) {
      throw new GuestGateError(cfg.guestMessageLimit);
    }
  }

  session.messages.push(newMessage({ role: "user", content: trimmed, whileAway: false }));

  const gen = await generateReply({
    character: brief(character),
    memory: session.memory,
    recentMessages: recent(session),
    userMessage: trimmed,
    smartReplyCount: cfg.smartReplyCount,
    model: pickModel(cfg, limits),
  });

  const { smartReplies } = await applyGenerated(
    session,
    cfg,
    limits,
    gen,
    false,
    character.scenario || character.persona,
  );
  await session.save();
  // Meter the user turn against the owner's daily plan budget.
  void recordUsage(ownerId, "messages").catch(() => {});
  return toSessionView(character, session, smartReplies);
}

export interface CharacterCardView {
  characterId: string;
  name: string;
  tagline: string;
  tags: string[];
  avatarUrl: string;
  category: string;
  creatorId: string;
  // Number of conversations started with this companion (social proof badge).
  chatCount: number;
}

export function toCardView(c: CharacterDoc): CharacterCardView {
  return {
    characterId: c.characterId,
    name: c.name,
    tagline: c.tagline,
    tags: c.tags,
    avatarUrl: c.avatarUrl,
    category: c.category || c.tags?.[0] || "",
    creatorId: c.creatorId,
    chatCount: c.chatCount,
  };
}

/**
 * Full public profile for the character's landing page. Exposes everything the
 * card lacks — bio, scenario, gallery, stats, greeting preview — but never the
 * hidden `persona` definition.
 */
export interface CharacterProfileView {
  characterId: string;
  name: string;
  tagline: string;
  description: string;
  scenario: string;
  greeting: string;
  gender: string;
  category: string;
  creatorName: string;
  tags: string[];
  avatarUrl: string;
  galleryUrls: string[];
  chatCount: number;
  likeCount: number;
  followerCount: number;
  creatorId: string;
}

export function toProfileView(c: CharacterDoc): CharacterProfileView {
  return {
    characterId: c.characterId,
    name: c.name,
    tagline: c.tagline,
    description: c.description || c.tagline,
    scenario: c.scenario,
    greeting: c.greeting,
    gender: c.gender,
    category: c.category || c.tags?.[0] || "",
    creatorName: c.creatorName || (c.creatorId === "system" ? "system" : "you"),
    tags: c.tags,
    avatarUrl: c.avatarUrl,
    galleryUrls: c.galleryUrls ?? [],
    chatCount: c.chatCount,
    likeCount: c.likeCount,
    followerCount: c.followerCount,
    creatorId: c.creatorId,
  };
}

/** Increment a character's like counter and return the new total. */
export async function likeCharacter(characterId: string): Promise<number | null> {
  const updated = await CharacterModel.findOneAndUpdate(
    { characterId },
    { $inc: { likeCount: 1 } },
    { new: true },
  ).exec();
  return updated ? updated.likeCount : null;
}
