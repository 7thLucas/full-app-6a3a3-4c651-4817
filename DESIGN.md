# Driftoria — Design Guidelines

## Design Philosophy

Premium, editorial, cinematic, and unhurried — the interface should feel like opening a beautifully typeset living novel. Calm depth over gamified noise. Generous whitespace, confident typography, and quiet motion that suggests a world breathing on its own.

## Color

- **Base / canvas:** Deep ink night — `#0E0D14` (near-black with a violet undertone) for an immersive, reading-at-dusk mood.
- **Surface:** `#17151F` raised panels; `#1F1C2A` for elevated cards.
- **Primary accent (Aurora violet):** `#8B7BF0` → gradient to `#B58CF2`, evoking the drift of an aurora / a story unfolding.
- **Secondary accent (Ember):** `#E8A87C` warm highlight for "live" autonomous activity and active story beats.
- **Text primary:** `#F4F1EC` (warm paper white). **Text secondary:** `#A9A4B8`. **Muted:** `#6F6A80`.
- **Borders / hairlines:** `rgba(244,241,236,0.08)`.
- Use the Ember accent sparingly to signal autonomous, living motion (e.g., "the story advanced while you were away").

## Typography

- **Display / headings:** A literary serif (e.g., "Fraunces" or "Newsreader") — gives editorial, novel-like gravitas.
- **Body / narrative text:** A readable serif or refined sans for long-form reading comfort; comfortable line-height (1.6–1.75), measure ~66ch for story passages.
- **UI / labels / meta:** A clean geometric sans (e.g., "Inter") for controls, timestamps, and navigation.
- Strong type scale; large, calm headlines. Avoid all-caps shouting; prefer small-caps or letter-spaced labels for meta.

## Layout & Spacing

- Generous spacing scale (8px base; lean on 16/24/32/48/64). Let content breathe.
- Reading-first layouts: centered narrative column for story content, with timeline and characters as supportive rails.
- Rounded corners (12–20px) on cards; soft, subtle elevation rather than hard shadows.

## Components

- **Story Beat cards:** editorial blocks with a timestamp, optional character avatar, and prose. Autonomous beats subtly marked (Ember dot / "while you were away" label).
- **Timeline:** vertical chronological spine alternating AI scenes and user interventions.
- **Pacing control:** elegant segmented control (Slow burn / Moderate / Active) — calm, not gamified.
- **Intervention composer:** quiet, inviting input — "Step into the story…" placeholder; never demanding.
- **Character cards:** portrait-forward with personality/arc snippets.

## Motion

- Slow, ambient, cinematic. Gentle fades and drifts (suggesting the aurora / passing time). Nothing bouncy or playful.
- Subtle "breathing" or live indicator to convey the engine is always running.

## Imagery & Texture

- Atmospheric, dusky, dreamlike gradients (aurora violet → ember). Optional fine grain/noise texture for premium editorial feel. Avoid clip-art, stock cheeriness, or game-y iconography.

---

## Personal Touch — Signature Easter Eggs

A quiet layer of personality woven into the living story, inspired by the client (Jun Wei Tan, Square Peg). These are *narrative-native* details, never gamified overlays — each one bends to the premium editorial brand rather than breaking it. They should feel discovered, not advertised.

### The Moonlit Hare (primary motif)
- A recurring AI character: a hare that drifts through autonomous beats under the aurora — appearing in quiet, "while you were away" moments. Reads as part of the living world, not a mascot.
- Visual treatment: fine-line, single-stroke silhouette in Aurora violet (`#8B7BF0`) or paper white at low opacity. No cartoon styling, no clip-art — same editorial restraint as the rest of the surface.
- Allowed surfaces: empty states ("the world is quiet… the hare keeps watch"), the live/breathing indicator, the 404 / offline screen. Sparingly, like the Ember accent.

### Feast Scenes (seed-scenario motif)
- The scenario-seeding library ships a curated set of tavern / feast / shared-meal story starters — a nod to gathering over food. Surfaced only as optional narrative seeds, never as food UI chrome.

### Hidden Arena (developer easter egg)
- A Konami-style key sequence reveals a single hidden line of flavor copy (e.g. a wry narrator aside) — a private nod to gaming/esports culture.
- **Hard constraint:** this stays a hidden flourish. No points, streaks, badges, leaderboards, or progression UI ever reach the surface — that would violate Driftoria's core anti-gamified principle. The nod lives in voice, not in mechanics.

### Rules for these touches
- Subtlety over presence: if a touch reads as "branded mascot" or "gamification," it is wrong — rework or remove.
- Theme-aware only: use existing tokens (Aurora violet, Ember, paper white), never hardcoded colors. Honor `prefers-reduced-motion`.
- All copy, the hare's visibility, and the feast-seed pack must flow through the Configurables module so the owner can dial them up or off.