/**
 * Narrative-native retention derivations.
 *
 * Driftoria's brand forbids overt gamification (XP bars, streak counters,
 * badges, leaderboards — see DESIGN.md + product-overview "Non-Goals"). These
 * helpers reframe the same proven retention mechanics as *narrative artifacts*
 * derived purely from the story's own beats and timestamps — no new backend
 * state, no points. Everything here is computed client-side from a StoryView.
 */

import type { StoryBeatView, StoryCharacterView } from "~/lib/story.client";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Beats that move the plot forward — the substance a chapter is made of. */
function isNarrative(b: StoryBeatView): boolean {
  return b.kind === "autonomous" || b.kind === "scene";
}

const ROMAN: Array<[number, string]> = [
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

export function toRoman(n: number): string {
  if (n <= 0) return "0";
  let out = "";
  let rest = n;
  for (const [value, glyph] of ROMAN) {
    while (rest >= value) {
      out += glyph;
      rest -= value;
    }
  }
  return out;
}

export interface StoryDepth {
  /** Act number (1-based), surfaced as a Roman numeral. */
  act: number;
  actLabel: string;
  /** Chapter number within the whole story (1-based). */
  chapter: number;
  /** Chapter number within the current act (1-based). */
  chapterInAct: number;
  /** Narrative beats accumulated inside the current chapter. */
  beatsIntoChapter: number;
  beatsPerChapter: number;
  /** 0–100 maturation toward the next chapter. */
  progress: number;
  /** Total narrative beats so far. */
  narrativeBeats: number;
  /** Index (into the full beats array) where each chapter begins. */
  chapterStartIndices: number[];
}

/**
 * Stories mature into Acts and Chapters as beats accumulate. Progression reads
 * as a narrative milestone, never accumulated points or levels.
 */
export function storyDepth(
  beats: StoryBeatView[],
  opts: { beatsPerChapter: number; chaptersPerAct: number },
): StoryDepth {
  const perChapter = Math.max(1, opts.beatsPerChapter);
  const perAct = Math.max(1, opts.chaptersPerAct);

  const chapterStartIndices: number[] = [];
  let narrativeBeats = 0;
  beats.forEach((b, i) => {
    if (!isNarrative(b)) return;
    // A new chapter opens on every Nth narrative beat (the first one included).
    if (narrativeBeats % perChapter === 0) chapterStartIndices.push(i);
    narrativeBeats += 1;
  });

  const chapter = Math.max(1, Math.ceil(narrativeBeats / perChapter) || 1);
  const act = Math.max(1, Math.ceil(chapter / perAct));
  const chapterInAct = ((chapter - 1) % perAct) + 1;
  const beatsIntoChapter =
    narrativeBeats === 0 ? 0 : ((narrativeBeats - 1) % perChapter) + 1;
  const progress = Math.round((beatsIntoChapter / perChapter) * 100);

  return {
    act,
    actLabel: toRoman(act),
    chapter,
    chapterInAct,
    beatsIntoChapter,
    beatsPerChapter: perChapter,
    progress,
    narrativeBeats,
    chapterStartIndices,
  };
}

export interface StoryContinuity {
  /** Whole days since the reader last stepped into the story. */
  daysAway: number;
  /** True when the reader has visited within the last day. */
  warm: boolean;
  /** True when no intervention has ever been made. */
  neverVisited: boolean;
  /** The character most plausibly "waiting" for the reader. */
  waitingCharacter: string | null;
  /** ISO timestamp of the last intervention, when one exists. */
  lastVisitIso: string | null;
}

/**
 * Story Continuity reframes a visit streak as story *health*: how long a
 * character has been waiting. Loss aversion lives in the world, not a counter.
 */
export function storyContinuity(
  beats: StoryBeatView[],
  characters: StoryCharacterView[],
  now: number,
): StoryContinuity {
  const lastIntervention = [...beats]
    .reverse()
    .find((b) => b.kind === "intervention");
  const lastNarrative = [...beats]
    .reverse()
    .find((b) => isNarrative(b) && b.character);

  const waitingCharacter =
    lastNarrative?.character ?? characters[0]?.name ?? null;

  if (!lastIntervention) {
    return {
      daysAway: 0,
      warm: false,
      neverVisited: true,
      waitingCharacter,
      lastVisitIso: null,
    };
  }

  const elapsed = Math.max(
    0,
    now - new Date(lastIntervention.createdAt).getTime(),
  );
  const daysAway = Math.floor(elapsed / DAY_MS);
  return {
    daysAway,
    warm: elapsed < DAY_MS,
    neverVisited: false,
    waitingCharacter,
    lastVisitIso: lastIntervention.createdAt,
  };
}

/** Beats — of any kind — that landed today, framed as "today's chapter". */
export function beatsToday(beats: StoryBeatView[], now: number): number {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const startMs = start.getTime();
  return beats.filter((b) => new Date(b.createdAt).getTime() >= startMs).length;
}

export interface MemorableMoment {
  beatId: string;
  title: string;
  character: string | null;
  snippet: string;
  whileAway: boolean;
}

function snippetOf(text: string, max = 96): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

/**
 * An auto-curated highlight reel of standout beats — the "badges" mechanic
 * reframed as pressed-flower keepsakes. Titled scenes win; beats that unfolded
 * while the reader was away are favored as the most evocative to return to.
 */
export function memorableMoments(
  beats: StoryBeatView[],
  max: number,
): MemorableMoment[] {
  const titled = beats.filter((b) => isNarrative(b) && b.title);
  const ranked = [...titled].sort((a, b) => {
    // Favor "while you were away" beats, then most recent.
    if (a.whileAway !== b.whileAway) return a.whileAway ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return ranked.slice(0, Math.max(0, max)).map((b) => ({
    beatId: b.beatId,
    title: b.title as string,
    character: b.character,
    snippet: snippetOf(b.content),
    whileAway: b.whileAway,
  }));
}
