/**
 * Server-side auth for Remix loaders/actions.
 *
 * The bottom-nav sheet gates navigation in the UI, but routes must be gated on
 * the server too — otherwise a guest can deep-link straight to a gated page.
 * These helpers read the signed session cookie and, for `requireUserId`, throw
 * a redirect to /login when no valid session is present.
 *
 * `.server.ts` keeps the node-crypto session code out of the client bundle.
 */

import { redirect } from "react-router";
import { parseCookies, SESSION_COOKIE } from "~/api/lib/cookies";
import { verifySession } from "~/api/lib/session";

/** Resolve the signed-in user id from the request cookie, or null for guests. */
export function getUserId(request: Request): string | null {
  const token = parseCookies(request.headers.get("cookie") ?? undefined)[SESSION_COOKIE];
  return verifySession(token)?.uid ?? null;
}

/**
 * Require an authenticated user. Returns the user id, or throws a redirect to
 * /login carrying the originally-requested path so the user lands back here
 * after signing in.
 */
export function requireUserId(request: Request): string {
  const uid = getUserId(request);
  if (!uid) {
    const url = new URL(request.url);
    throw redirect(`/login?redirect=${encodeURIComponent(url.pathname + url.search)}`);
  }
  return uid;
}
