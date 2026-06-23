/**
 * Anonymous owner identity for Chat Mode.
 *
 * No auth is wired in this scaffold, but Chat Mode still needs per-user threads
 * and memory (so a companion remembers *you*, not whoever last visited). We mint
 * a stable per-browser id in an httpOnly cookie and use it as the session owner.
 * When real auth lands, prefer the authenticated user id and fall back to this
 * cookie for guests (Emochi-style guest chat).
 */

import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";

const COOKIE_NAME = "driftoria_uid";
const ONE_YEAR = 60 * 60 * 24 * 365;

function parseCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

/**
 * Resolve the owner id for this request: an authenticated user id if present,
 * otherwise a stable anonymous cookie id (minted + set on first contact).
 */
export function resolveOwnerId(req: Request, res: Response): string {
  // Future: prefer an authenticated identity when middleware provides one.
  const authed =
    (req as unknown as { user?: { id?: string } }).user?.id ??
    (res.locals as { userId?: string } | undefined)?.userId;
  if (authed) return String(authed);

  const existing = parseCookie(req.headers.cookie, COOKIE_NAME);
  if (existing) return existing;

  const id = `anon_${randomUUID()}`;
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(id)}; Path=/; Max-Age=${ONE_YEAR}; HttpOnly; SameSite=Lax`,
  );
  return id;
}
