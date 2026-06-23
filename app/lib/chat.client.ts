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
  creatorId: string;
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
}

export async function createCharacter(
  input: CreateCharacterInput,
): Promise<CharacterCardView> {
  return unwrap(
    await apiRequest<CharacterCardView>("/api/chat/characters", {
      method: "POST",
      data: input,
    }),
  );
}
