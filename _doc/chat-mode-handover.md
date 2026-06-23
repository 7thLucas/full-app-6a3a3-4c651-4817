# Chat Mode — Engineering Handover

> Companion to [dual-mode-proposal.md](./dual-mode-proposal.md) (strategy) and
> [product-overview.md](./product-overview.md) (product). This doc = how the code
> actually works, what's wired, and what's left. As-built 2026-06-23.

---

## 1. What shipped

An Emochi-class **Chat Mode** living beside the existing **Story Mode**, over one
backend (the `agentic` module). Visitors land on a two-door page, enter Chat Mode, browse
a visual companion feed, and chat 1:1 — first-person, with generated avatars, inline scene
art at emotional peaks, a memory that recalls them, smart-reply chips, and an autonomous
"while you were away" ping. They can also create their own companion.

Build: `npm run build` passes. Typecheck: `npx tsc --noEmit` clean.

---

## 2. File map

### Backend (in `app/modules/agentic/` — existing module, extended)
| File | Role |
|---|---|
| `chat.model.ts` | Mongoose models: `Character`, `ChatSession` (embedded `ChatMessage[]`, `memory[]`). |
| `chat/chat.engine.ts` | LLM calls → first-person reply + `vivid` flag + `imagePrompt` + `smartReplies` + `memoryNote`. Also `generateOfflinePing`. Same `/api/llm` upstream as story engine. |
| `chat/chat.image.ts` | `buildImageUrl(base, prompt)` — deterministic URL for keyless image gen; `avatarPrompt()`. |
| `chat/chat.owner.ts` | `resolveOwnerId(req,res)` — auth id if present, else stable anonymous cookie (`driftoria_uid`). |
| `chat/chat.service.ts` | Orchestration: seed feed, list/get/create characters, get-or-create per-owner session, send message, apply art/memory/caps, offline ping, view mappers. |
| `chat.routes.ts` | Express routes (auto-discovered by `app/api/routes.ts` — `*.routes.ts` glob). |

### Frontend
| File | Role |
|---|---|
| `app/lib/chat.client.ts` | Typed wrappers over `/api/chat/*`. |
| `app/routes/_index.tsx` | Two-door landing (updated). |
| `app/routes/chat._index.tsx` | Discovery feed + tag filter. |
| `app/routes/chat.$characterId.tsx` | 1:1 chat thread (optimistic send, typing, smart replies, memory). |
| `app/routes/chat.create.tsx` | Create-a-companion form. |
| `app/components/chat/character-card.tsx` | Feed card + `Avatar`. |
| `app/components/chat/message-bubble.tsx` | Message bubble (renders `*action*`, inline image, "while away" tag) + `TypingBubble`. |
| `app/components/chat/smart-replies.tsx` | Suggested-reply chips. |
| `app/components/chat/memory-ribbon.tsx` | "Remembers about you" ribbon. |

### Config (in `app/modules/configurables/`)
`schemas/configurables.schema.ts` + `constants/configurables.default.ts` extended with the
mode switch + Chat Mode block (see §4).

---

## 3. API surface

All under `/api/chat`, standard `{ success, data, message }` envelope.

| Endpoint | Method | Body | Returns |
|---|---|---|---|
| `/chat/characters` | GET | — | `CharacterCardView[]` (seeds starters on first hit) |
| `/chat/characters` | POST | `{ name, tagline, persona, greeting?, tags?, avatarPrompt? }` | `CharacterCardView` |
| `/chat/characters/:id` | GET | — | `CharacterCardView` |
| `/chat/sessions/:id` | GET | — | `SessionView` (may include an offline ping) |
| `/chat/sessions/:id/messages` | POST | `{ text }` | `SessionView` |

`:id` = `characterId`. Sessions are keyed `(characterId, ownerId)`.

---

## 4. Configurables (owner-tunable, no hardcoding)

Mode switch: `enableStoryMode`, `enableChatMode`, `storyModeLabel/Tagline`,
`chatModeLabel/Tagline`.

Chat engine/visuals: `imageGenUrl` (default keyless Pollinations base),
`enableCharacterAvatars`, `enableInlineIllustrations`, `illustrationFrequency` (≈1 scene
image per N character turns), `freeTierDailyImages` (daily inline-art cap),
`memoryDepth` (chars of memory kept), `smartReplyCount`, `enableOfflinePings`,
`offlinePingAfterHours`, `chatComposerPlaceholder`, `discoveryTags[]`,
`starterChatCharacters[]` (name, tagline, persona, greeting, tags, avatarPrompt).

To turn Chat Mode off entirely: set `enableChatMode=false` → landing hides the door and the
home CTA falls back to Story Mode. Routes still exist but aren't surfaced.

---

## 5. How key mechanics work

- **Avatars / inline art** — `buildImageUrl` URL-encodes the prompt onto `imageGenUrl` with
  a deterministic seed. The browser loads it directly; no server image round-trip, no key.
  Swap `imageGenUrl` for any prompt-in-URL generator. Avatar is generated once at character
  create and stored on the doc.
- **`vivid` illustrations** — engine sets `vivid=true` + `imagePrompt` only at emotional
  peaks. Service further gates by a turn counter (`illustrationFrequency`) and the daily cap
  (`freeTierDailyImages`), then attaches `imageUrl` to that message.
- **Memory** — engine may return a one-line `memoryNote`; service dedupes, appends, and
  trims to `memoryDepth` chars (newest kept). Injected into the system context each turn.
- **Offline ping** — on `GET /chat/sessions/:id`, if the last message wasn't the user's and
  `>= offlinePingAfterHours` elapsed, generate one autonomous companion message flagged
  `whileAway` before returning.
- **Owner identity** — `resolveOwnerId` prefers `req.user.id` / `res.locals.userId` (future
  auth), else mints/reads `driftoria_uid` httpOnly cookie. Frontend sends it via
  `withCredentials: true` (already set in `api.client.ts`).

---

## 6. Run / verify

```bash
npm run dev        # tsx watch server.ts
# visit /            → two doors
# visit /chat        → feed (seeds 3 companions on first load)
# tap a card         → chat; type → reply + smart replies; emotional beats → image
# /chat/create       → make one; redirects into its thread
```
Env: LLM uses `_KEYSPACE` + `QB_SCAFFOLDER_KEY` (same as story engine). Image gen needs no
key. Mongo connection is the app's existing one.

---

## 8. Auth (email + password) — as-built

Real auth, **zero new dependencies** (Node `crypto` only).

### Files (under `app/api/`)
| File | Role |
|---|---|
| `models/user.model.ts` | `User` (email unique, name, `passwordHash`, `roles[]`) + `toUserView`. |
| `lib/password.ts` | scrypt hash/verify. Stored as `scrypt$<salt>$<hash>`. |
| `lib/session.ts` | HMAC-SHA256 signed session token `payload.sig` (`{uid,exp}`), 30-day TTL. Secret from `AUTH_SECRET` → `QB_SCAFFOLDER_KEY` → dev fallback (warns). |
| `lib/cookies.ts` | Cookie parse + `driftoria_session` build/clear (HttpOnly, SameSite=Lax, Secure in prod). |
| `services/auth.service.ts` | `registerUser` / `loginUser` / `getUserById`. Email + min-8 password validation; constant-ish verify to blunt enumeration. |
| `middleware/auth.guard.ts` | `attachOptionalUser` (global, never blocks), `authGuard` (401), `permissionGuard(...roles)` (403). |
| `auth/auth.routes.ts` | `POST /api/auth/register\|login\|logout`, `GET /api/auth/me`. |

### Wiring
- `app/api/routes.ts` mounts `attachOptionalUser` **first** (populates `req.user` for
  every `/api` request), then the auth router, then auto-discovered module routes.
- `chat/chat.owner.ts` `resolveOwnerId` already prefers `req.user.id` → **logged-in users
  get account-keyed chat threads + memory automatically**; guests fall back to the
  anonymous `driftoria_uid` cookie.

### Frontend
- `app/lib/auth.client.ts` — register/login/logout/me wrappers (`withCredentials` already on).
- `app/hooks/use-auth.tsx` — `useAuth()`: shared store via `useSyncExternalStore`, fetches
  `/api/auth/me` once; exposes `user, isAuthenticated, login, register, logout, refresh`.
  No root.tsx provider needed.
- `app/routes/login.tsx`, `app/routes/register.tsx` — themed pages, `?redirect=` support.
- Chat discovery header shows name + Sign out, or Sign in.

### Verified (runtime smoke test)
register → me(cookie) → weak-pw 400 → dup 409 → wrong-pw 401 → logout → me null → re-login.
Logged-in session uses `driftoria_session` (no anon cookie minted); guest mints
`driftoria_uid`. All pass.

### To protect a route
```ts
import { authGuard, permissionGuard } from "~/api/middleware/auth.guard";
router.post("/admin/thing", authGuard, permissionGuard("admin"), handler);
```

### Env
`AUTH_SECRET` (required for secure sessions in prod — falls back with a warning).

### Not done
OAuth/social login, email verification, password reset, rate limiting on auth endpoints.

---

## 7. Not done / next (see proposal §10–11 for the full grid)

- **Monetization UI** — server caps exist; no plans/paywall/upgrade/billing.
- **Multi-room per character**, **multi-story**, **group chat** — not built.
- **Real auth** — cookie identity only; no login / cross-device sync.
- **Voice/TTS** — text + image only.
- **Catalog scale** — flat feed + tags; no search, trending, ratings, creator profiles.
- **Safety/moderation** — none on user characters, generated text, or images. **Required
  before public launch.**
- **Image consistency** — Pollinations isn't character-consistent across scenes; swap the
  generator for production.

**Lowest-effort, highest-value next:** wire real auth into `resolveOwnerId` (one function),
then a moderation pass before any public exposure.
