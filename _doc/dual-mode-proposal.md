# Dual-Mode Proposal — Story Mode + Chat Mode

> **Status:** Implemented (2026-06-23). Both modes live over one backend; P1–P3
> features below are wired (discovery feed, 1:1 chat, avatar + inline art, memory,
> smart replies, offline pings, character creation). Direction confirmed by product owner.
> **Thesis:** Keep the autonomous Story engine, but add an Emochi-style visual 1:1 Chat
> experience as the new front door. *Yang penting jual mimpinya* — sell the dream:
> a beautiful character who likes you, with art.

---

## 1. Why

Current Driftoria is literary, slow, text-only, single shared story world. Beautiful,
but heady and high-friction. The benchmark — **Emochi** — wins on intimacy, visuals,
and zero friction. Different drug, bigger market.

We do not throw away the Story engine. We split the entry into **two doors over one
backend**.

---

## 2. Emochi Benchmark — the wow mechanics

Researched 2026-06. What makes Emochi sticky:

1. **Discovery feed** — 800k–1M+ character cards, browse by mood/genre/tag, swipe to
   find. Feels like a gacha collection, not a blank page.
2. **Instant guest chat** — tap card → chatting in ~1 sec. No setup, no account.
3. **1:1 first-person companion** — you talk *to* a character ("I"/"you"), not read
   *about* a cast. Direct, parasocial, addictive.
4. **AI illustrations mid-chat** — emotional scene art pops in at key beats. The
   dopamine hit.
5. **Memory system** — companion remembers your name, milestones, preferences across
   sessions. Sells "she knows me." (Emochi markets ~600 chars enhanced memory.)
6. **Create character from reference image + text** — male/female/nb, describe face,
   body, clothing, vibe.
7. **Smart replies + voice** — suggested responses lower typing friction; voice adds
   presence.

Pricing lever for reference: Emochi free tier = unlimited text chat but caps voice
(5/day) and smart replies (5/day); paid unlocks unlimited.

### Sources
- https://aichief.com/ai-chatbots/emochi/
- https://online.hitpaw.com/learn/how-to-use-emochi.html
- https://www.seaart.ai/features/emochi
- https://navtools.ai/tool/emochi
- https://gptonline.ai/emochi-ai/

---

## 3. Gap analysis — Driftoria (now) vs Emochi (target)

| Axis | Driftoria (now) | Emochi (target) |
|---|---|---|
| POV | 3rd-person cinematic prose | 1st-person, talk *to* char |
| Unit | 1 shared story world | many collectible characters |
| Pace | slow autonomous beats | instant, reactive |
| Visual | text only | illustration-forward |
| Friction | premise / pacing / seeds setup | tap → chat |
| Feel | literary, "Director" | parasocial, "Companion" |

---

## 4. The Proposal — dual mode, shared spine

Split at entry. Two doors, one backend. The autonomous engine becomes a *differentiator
inside both modes*, not the whole product.

### Mode A — Story Mode (current, keep)
"Be the director." Third-person living world, pacing, almanac, autonomous offline beats,
slow burn. For the lit-fiction crowd. Already built — leave it, label it.

### Mode B — Chat Mode (new, Emochi-like) ← the dream-seller
First-person 1:1 companion chat, visual-forward, instant.

```
Landing → [ Story Mode ]   [ Chat Mode ]

Chat Mode:
  Discovery Feed (character cards, hero art, mood/genre tags)
    → tap card → instant 1:1 chat (guest OK)
        → first-person in-character dialogue
        → illustration auto-drops at emotional beats
        → memory ribbon ("remembers: your name, that promise…")
        → smart-reply chips + free type
  [ + Create Character ] → prompt face/persona/vibe
        → generate avatar art via image-gen URL → publish to feed
```

**Autonomous edge inside Chat Mode (our moat vs Emochi):** the companion can send a
message *while you were away* ("Lyra texted you 2h ago"). Reuses the existing offline
beat engine — Emochi cannot do this.

---

## 5. Wow moments to engineer (priority order)

1. **Hero character art on every card** — feed must look like a gallery. Generate
   avatar via image-gen URL at character creation, cache it. ~80% of the "wow."
2. **Inline scene illustration** — when the engine flags a beat as `vivid` (emotional
   spike), call image-gen with the scene description → drop image inline. Rare enough
   to feel special (~1 per 5–8 turns).
3. **Memory ribbon** — visible "she remembers" chip line. Cheap (we already store
   beats), huge parasocial payoff.
4. **Instant gratification** — guest chat, no premise wizard. First reply < 2 sec.
5. **Smart-reply chips** — 3 suggested responses under composer. Kills blank-page
   paralysis.
6. **Offline companion ping** — autonomous "while you were away" message. Our unique
   retention lever, free from existing engine.

---

## 6. Build plan — backend reuse

| Piece | Action |
|---|---|
| `StoryCharacter` model | Promote to standalone **Character**: add `avatarUrl`, `tags[]`, `greeting`, `vividness`, `creatorId`, `visibility`. |
| **ChatSession** model (new) | 1 user ↔ 1 character, message list, `memory` summary blob. Lighter than story beats. |
| **ChatMessage** model (new) | `role` (user\|character), `content`, `imageUrl?`, `vivid` flag, `createdAt`. |
| `story.engine.ts` | Fork → `chat.engine.ts`: same LLM service, swap system prompt to **first-person in-character dialogue**; add image-prompt extraction + `vivid` detection. |
| Image generation | Call shared image-gen URL. Avatar = once/character (cached). Inline scene = throttled. |
| Discovery feed | New route + API: list characters by tag/popularity, paginate. |
| Smart replies | Engine returns 3 suggested user responses alongside each char message. |
| Memory | Summarize session → `memory` blob, inject into context each turn. |

### New module layout (auto-scaffolded under `app/modules/`)
```
app/modules/<chat-module>/
  api/        (character.model, chat-session.model, chat.engine, chat.service, routes)
  components/ (DiscoveryFeed, CharacterCard, ChatThread, MessageBubble, SceneImage,
               MemoryRibbon, SmartReplyChips, CreateCharacterForm)
  hooks/      (useDiscovery, useChatSession, useCharacterCreate)
```

### Frontend wiring
- `app/routes/_index.tsx` → two-door landing (Story Mode / Chat Mode).
- `app/routes/chat+/_index.tsx` → discovery feed.
- `app/routes/chat+/$characterId.tsx` → 1:1 chat thread.
- `app/routes/chat+/create.tsx` → character creation.
- Backend mounted in `app/api/routes.ts` via `router.use("/chat", authGuard, chatRoutes)`.

---

## 7. Configurables (new — owner-customizable, no hardcoding)

| Key | Type | Default | Purpose |
|---|---|---|---|
| `enableStoryMode` | boolean | true | Toggle Story door |
| `enableChatMode` | boolean | true | Toggle Chat door |
| `imageGenUrl` | string | (shared gen endpoint) | Avatar + scene art source |
| `enableCharacterAvatars` | boolean | true | Gen avatar on create |
| `enableInlineIllustrations` | boolean | true | Scene art mid-chat |
| `illustrationFrequency` | number | 6 | ~1 scene image per N turns |
| `freeTierDailyImages` | number | 5 | Free cap on inline art |
| `memoryDepth` | number | 600 | Chars of companion memory |
| `smartReplyCount` | number | 3 | Suggested replies per turn |
| `discoveryTags[]` | string[] | (mood/genre presets) | Feed filter chips |
| `enableOfflinePings` | boolean | true | Autonomous "while away" message |
| `starterChatCharacters[]` | array | (seed cast w/ art) | Pre-populate feed |

---

## 8. Cost control — sell the dream, control the burn

Image gen = money. Gate it:
- **Avatar** = once per character, cached. Cheap.
- **Inline scene art** = throttled by `illustrationFrequency` + `freeTierDailyImages`
  cap.
- **Monetize illustrations** as the premium upgrade — same playbook as Emochi's voice
  cap. Free = text + capped art; Paid = unlimited art + offline pings + more memory.

---

## 9. Recommendation

Build **Chat Mode as the new front door**; keep Story Mode as a labeled second option.
Highest-leverage piece = the **visual character feed + inline illustration** — that is
where the *jual mimpi* lives. Memory ribbon + smart replies = cheap polish multipliers.
The autonomous **offline companion ping** is our defensible edge Emochi cannot copy.

**Phasing:**
- **P1:** Two-door landing, discovery feed (static art ok), 1:1 chat, avatar gen.
- **P2:** Inline scene illustration + `vivid` trigger, smart-reply chips, memory ribbon.
- **P3:** Offline companion pings, character creation publishing, monetization gates.

---

## 10. Implementation status (2026-06-23)

| Feature | Status | Notes |
|---|---|---|
| Two-door landing (Story / Chat) | ✅ Done | `app/routes/_index.tsx`, toggled by `enableChatMode`/`enableStoryMode`. |
| Discovery feed + tag filter | ✅ Done | `chat._index.tsx`, seeds 3 starter companions from config. |
| 1:1 first-person chat | ✅ Done | `chat.$characterId.tsx` + `chat.engine.ts` (first-person system prompt). |
| Avatar art generation | ✅ Done | Keyless Pollinations URL via `imageGenUrl`; cached on character doc. |
| Inline scene illustration (`vivid`) | ✅ Done | Throttled by `illustrationFrequency` + `freeTierDailyImages` cap. |
| Smart-reply chips | ✅ Done | Count via `smartReplyCount`; engine returns them per turn. |
| Companion memory + ribbon | ✅ Done | Rolling `memory[]` capped by `memoryDepth`; `MemoryRibbon` UI. |
| Offline companion ping | ✅ Done | On session open after `offlinePingAfterHours`; reuses engine. |
| Character creation | ✅ Done | `chat.create.tsx` → `POST /api/chat/characters`, auto-avatar. |
| **Per-user threads (`ownerId`)** | ✅ Done | Anonymous per-browser cookie (`chat.owner.ts`); auth-ready. |
| Monetization gates (paywall UI) | ⚠️ Partial | Free-tier image cap enforced server-side; **no billing/upgrade UI**. |
| Multi-room per character (new chat) | ❌ Not done | One thread per (character, owner). No "start fresh" / alt scenarios. |
| Multi-story (Story Mode) | ❌ Not done | Story Mode still singleton — unchanged. |
| Group chat (many chars, one room) | ❌ Not done | Out of scope this pass. |
| Voice / TTS | ❌ Not done | Emochi has it; intentionally deferred. |
| Real auth / accounts | ❌ Not done | Cookie identity only; no login, no cross-device. |

---

## 11. What's missing vs Emochi

Honest gaps remaining after this build:

1. **Accounts & cross-device sync** — Emochi has real login; we have an anonymous
   per-browser cookie. Clear cookies / switch device = new identity. Wire auth →
   `resolveOwnerId` already prefers an authenticated id when present.
2. **Voice messages / TTS** — Emochi speaks; we are text + image only.
3. **Scale of catalog** — Emochi: 800k–1M creator characters with ratings, trending,
   search. We have a flat feed + tag filter + create. No popularity ranking, no search,
   no creator profiles, no moderation queue.
4. **Multiple chats per character** — Emochi lets you branch/restart scenarios; we keep
   one continuous thread per character.
5. **Richer memory** — Emochi markets a tuned long-term memory system; ours is a simple
   capped fact list injected each turn (no summarization/embeddings/retrieval).
6. **Image quality/consistency** — keyless Pollinations is "good enough to sell the
   dream" but not character-consistent across scenes (no seed-locked identity / LoRA).
   Swap `imageGenUrl` for a controllable generator for production polish.
7. **Monetization surface** — server caps exist; no plans, paywall, upgrade flow, or
   billing.
8. **Safety/moderation** — no content filter on user-created characters, generated text,
   or generated images. Required before public launch.

**Our edge Emochi lacks:** the autonomous **offline companion ping** + the whole Story
Mode living-world engine. Lean into these — they are the differentiation.
