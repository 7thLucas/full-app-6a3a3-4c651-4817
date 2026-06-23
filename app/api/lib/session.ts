/**
 * Stateless signed-session tokens — HMAC-SHA256 over a small JSON payload.
 *
 * Format: `<base64url(payload)>.<base64url(hmac)>` where payload = { uid, exp }.
 * No jsonwebtoken/jose dependency. The signing secret comes from AUTH_SECRET
 * (fall back to QB_SCAFFOLDER_KEY, else a dev-only constant with a loud warning).
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { createLogger } from "~/lib/logger";

const logger = createLogger("Session");

function resolveSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.QB_SCAFFOLDER_KEY;
  if (secret) return secret;
  logger.warn(
    "AUTH_SECRET is not set — using an insecure dev fallback. Sessions are NOT secure. Set AUTH_SECRET in the environment for production.",
  );
  return "driftoria-dev-insecure-secret-change-me";
}

const SECRET = resolveSecret();

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface SessionPayload {
  uid: string;
}

export function signSession(uid: string, ttlSec = SESSION_TTL_SECONDS): string {
  const exp = Date.now() + ttlSec * 1000;
  const payload = Buffer.from(JSON.stringify({ uid, exp })).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySession(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;

  const expected = createHmac("sha256", SECRET).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      uid?: unknown;
      exp?: unknown;
    };
    if (typeof data.uid !== "string" || typeof data.exp !== "number") return null;
    if (data.exp < Date.now()) return null;
    return { uid: data.uid };
  } catch {
    return null;
  }
}
