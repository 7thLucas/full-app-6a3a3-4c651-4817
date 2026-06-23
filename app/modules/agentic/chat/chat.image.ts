/**
 * Image helper for Chat Mode.
 *
 * Builds a deterministic image URL from a text prompt by appending the
 * URL-encoded prompt to a configurable base (default: a keyless Pollinations
 * endpoint). No API key, no server round-trip — the browser loads the image
 * directly, so avatar art is effectively free to "generate". The deterministic
 * seed keeps a given character's avatar stable across reloads.
 */

import { createHash } from "node:crypto";

function seedFrom(text: string): number {
  const hex = createHash("sha256").update(text).digest("hex").slice(0, 8);
  return parseInt(hex, 16);
}

export function buildImageUrl(
  baseUrl: string,
  prompt: string,
  opts: { width?: number; height?: number; seedKey?: string } = {},
): string {
  const base = (baseUrl || "https://image.pollinations.ai/prompt/").trim();
  const { width = 768, height = 768, seedKey } = opts;
  const encoded = encodeURIComponent(prompt.replace(/\s+/g, " ").trim());
  const seed = seedFrom(seedKey ?? prompt);
  const sep = base.includes("?") ? "&" : "?";
  // Pollinations honors width/height/seed/nologo query params; other generators
  // that take a prompt-in-path will simply ignore unknown params.
  return `${base}${encoded}${sep}width=${width}&height=${height}&seed=${seed}&nologo=true`;
}

/** Compose a portrait-art prompt for a character avatar from its persona. */
export function avatarPrompt(name: string, description: string): string {
  return `${description}, portrait, character art, soft cinematic lighting, masterpiece, ${name}`;
}
