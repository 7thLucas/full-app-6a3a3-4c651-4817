/**
 * Client-side helpers for Driftoria Chat Mode.
 * Thin wrappers over the /api/chat/* surface registered by the agentic module's
 * chat.routes.ts.
 */

import { apiGet, apiRequest } from "~/lib/api.client";
import { checkUpgrade } from "~/lib/billing.client";

export type ChatRole = "user" | "character";

export interface CharacterCardView {
  characterId: string;
  name: string;
  tagline: string;
  tags: string[];
  avatarUrl: string;
  category: string;
  creatorId: string;
  /** Conversations started with this companion (social proof badge). */
  chatCount: number;
}

/** Full public profile for a character's landing page (no hidden `persona`). */
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

export interface ChatSummaryView {
  characterId: string;
  name: string;
  tagline: string;
  avatarUrl: string;
  lastSnippet: string;
  lastMessageAt: string;
  messageCount: number;
}

export interface ChatMessageView {
  messageId: string;
  role: ChatRole;
  content: string;
  narration: string | null;
  imageUrl: string | null;
  vivid: boolean;
  whileAway: boolean;
  createdAt: string;
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
  messages: ChatMessageView[];
  memory: string[];
  smartReplies: string[];
}

function unwrap<T>(res: { success: boolean; data?: T; message?: string }): T {
  if (!res.success || res.data === undefined) {
    throw new Error(res.message ?? "Request failed");
  }
  return res.data;
}

/** Thrown when the backend gates a guest behind sign-in (HTTP 401, loginRequired). */
export class ChatLoginRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChatLoginRequiredError";
  }
}

export { UpgradeRequiredError } from "~/lib/billing.client";

export async function fetchCharacters(): Promise<CharacterCardView[]> {
  return unwrap(await apiGet<CharacterCardView[]>("/api/chat/characters"));
}

export async function fetchCharacterProfile(
  characterId: string,
): Promise<CharacterProfileView> {
  return unwrap(
    await apiGet<CharacterProfileView>(`/api/chat/characters/${characterId}`),
  );
}

export async function likeCharacter(characterId: string): Promise<number> {
  const { likeCount } = unwrap(
    await apiRequest<{ likeCount: number }>(`/api/chat/characters/${characterId}/like`, {
      method: "POST",
    }),
  );
  return likeCount;
}

export async function fetchSessions(): Promise<ChatSummaryView[]> {
  return unwrap(await apiGet<ChatSummaryView[]>("/api/chat/sessions"));
}

export async function openSession(characterId: string): Promise<SessionView> {
  return unwrap(await apiGet<SessionView>(`/api/chat/sessions/${characterId}`));
}

export async function sendChatMessage(
  characterId: string,
  text: string,
): Promise<SessionView> {
  const res = await apiRequest<SessionView>(
    `/api/chat/sessions/${characterId}/messages`,
    { method: "POST", data: { text } },
  );
  if ((res as { loginRequired?: boolean }).loginRequired) {
    throw new ChatLoginRequiredError(res.message ?? "Sign in to keep chatting");
  }
  checkUpgrade(res as { upgradeRequired?: boolean; requiredPlan?: string });
  return unwrap(res);
}

export interface CreateCharacterInput {
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
}

export interface PingResult {
  session: SessionView;
  advanced: boolean;
}

/**
 * Poll for a single autonomous narrative advance. Returns the updated session
 * and whether a new message was actually generated (advanced=true) or no beat
 * was owed yet (advanced=false).
 */
export async function pingSession(characterId: string): Promise<PingResult> {
  const res = await apiRequest<SessionView>(
    `/api/chat/sessions/${characterId}/ping`,
    { method: "POST" },
  );
  // The ping endpoint returns { success, data: SessionView, advanced: boolean }
  const body = res as unknown as { success: boolean; data?: SessionView; advanced?: boolean; message?: string };
  if (!body.success || !body.data) {
    throw new Error(body.message ?? "Ping failed");
  }
  return { session: body.data, advanced: body.advanced ?? false };
}

export async function createCharacter(
  input: CreateCharacterInput,
): Promise<CharacterProfileView> {
  const res = await apiRequest<CharacterProfileView>("/api/chat/characters", {
    method: "POST",
    data: input,
  });
  checkUpgrade(res as { upgradeRequired?: boolean; requiredPlan?: string });
  return unwrap(res);
}
