/**
 * Client-side helpers for Driftoria Chat Mode.
 * Thin wrappers over the /api/chat/* surface registered by the agentic module's
 * chat.routes.ts.
 */

import { apiGet, apiRequest } from "~/lib/api.client";

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
  return unwrap(
    await apiRequest<SessionView>(`/api/chat/sessions/${characterId}/messages`, {
      method: "POST",
      data: { text },
    }),
  );
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

export async function createCharacter(
  input: CreateCharacterInput,
): Promise<CharacterProfileView> {
  return unwrap(
    await apiRequest<CharacterProfileView>("/api/chat/characters", {
      method: "POST",
      data: input,
    }),
  );
}
