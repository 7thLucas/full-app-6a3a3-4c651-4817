/**
 * Image helper for Chat Mode.
 *
 * Builds a deterministic image URL from a text prompt by appending the
 * URL-encoded prompt to a configurable base (default: QuantumByte's shared
 * image-generation endpoint). No API key, no server round-trip — the browser
 * loads the image directly, so avatar art is effectively free to "generate".
 * The deterministic seed keeps a given character's avatar stable across reloads.
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
  const base = (baseUrl || "https://api.qb-deck.quantumbyte.ai/common/image-generation?prompt=").trim();
  const { width = 768, height = 768, seedKey } = opts;
  const encoded = encodeURIComponent(prompt.replace(/\s+/g, " ").trim());
  const seed = seedFrom(seedKey ?? prompt);
  const sep = base.includes("?") ? "&" : "?";
  // The qb-deck base ends with `?prompt=`, so the encoded prompt becomes that
  // param's value and extra params append with `&`. Prompt-in-path generators
  // (no `?`) get the prompt on the path and ignore unknown query params.
  return `${base}${encoded}${sep}width=${width}&height=${height}&seed=${seed}&nologo=true`;
}

/** Compose a portrait-art prompt for a character avatar from its persona. */
export function avatarPrompt(name: string, description: string): string {
  return `${description}, portrait, character art, soft cinematic lighting, masterpiece, ${name}`;
}

/**
 * Compose an inline scene-art prompt. Prepends the character's own setting
 * (scenario/persona context) so the illustrated background stays coherent with
 * where this companion lives, then reinforces a no-people environment style so
 * the art never tries to draw a character that won't match the avatar.
 */
export function scenePrompt(imagePrompt: string, setting: string): string {
  const ctx = setting.replace(/\s+/g, " ").trim().slice(0, 200);
  const lead = ctx ? `${ctx}. ` : "";
  return `${lead}${imagePrompt.trim()}, anime background illustration, scenery only, no people, no characters, no figures, empty scene, soft cinematic lighting`;
}

// Distinct framings so each gallery shot reads as a different photo of the same
// character rather than a duplicate of the avatar.
const GALLERY_SHOTS = [
  "full body, dynamic pose, detailed background",
  "close-up, candid expression, golden hour",
  "three-quarter view, atmospheric setting, cinematic",
];

/**
 * Build a small set of gallery image URLs for a character. Each shot reuses the
 * same visual description with a different framing and a stable per-shot seed,
 * so the strip stays consistent across reloads.
 */
export function buildGalleryUrls(
  baseUrl: string,
  name: string,
  description: string,
  count = GALLERY_SHOTS.length,
): string[] {
  return GALLERY_SHOTS.slice(0, count).map((shot, i) =>
    buildImageUrl(baseUrl, `${description}, ${shot}, ${name}`, {
      width: 768,
      height: 1024,
      seedKey: `${name}:gallery:${i}`,
    }),
  );
}
