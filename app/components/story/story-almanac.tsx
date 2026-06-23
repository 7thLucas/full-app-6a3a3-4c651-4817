import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { Eyebrow } from "~/components/ui";
import type { StoryBeatView, StoryCharacterView } from "~/lib/story.client";
import {
  beatsToday,
  storyContinuity,
  storyDepth,
  type StoryDepth,
} from "~/lib/story-progress";

/**
 * The Almanac — the home for Driftoria's narrative-native retention surfaces.
 *
 * It exposes the story engine's existing momentum through literary language
 * instead of arcade mechanics (see DESIGN.md / product-overview "Retention
 * Mechanics"): the story's maturation into Acts & Chapters (progression), how
 * long a character has been waiting (continuity / loss aversion), and the day's
 * unfolding (the daily check-in). No XP, levels, streak counters, or badges.
 */
export function StoryAlmanac({
  title,
  beats,
  characters,
  beatsPerChapter,
  chaptersPerAct,
}: {
  title: string;
  beats: StoryBeatView[];
  characters: StoryCharacterView[];
  beatsPerChapter: number;
  chaptersPerAct: number;
}) {
  // Time-derived copy is client-only; settle after mount to avoid hydration drift.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const depth = storyDepth(beats, { beatsPerChapter, chaptersPerAct });
  const continuity = storyContinuity(beats, characters, now ?? 0);
  const today = now === null ? 0 : beatsToday(beats, now);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <Eyebrow className="mb-4">
        <BookOpen className="h-3.5 w-3.5" strokeWidth={1.75} /> {title}
      </Eyebrow>

      <Depth depth={depth} />

      <div className="mt-5 space-y-3 border-t border-border pt-4">
        <Continuity
          ready={now !== null}
          warm={continuity.warm}
          neverVisited={continuity.neverVisited}
          daysAway={continuity.daysAway}
          waitingCharacter={continuity.waitingCharacter}
        />
        <TodaysChapter ready={now !== null} count={today} />
      </div>
    </div>
  );
}

function Depth({ depth }: { depth: StoryDepth }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-heading text-2xl font-semibold leading-none tracking-tight">
          Act {depth.actLabel}
        </h3>
        <span className="font-ui text-[0.7rem] uppercase tracking-[0.22em] text-muted-foreground">
          Chapter {depth.chapter}
        </span>
      </div>

      {/* Maturation hairline — reads as reading-progress, not an XP bar. */}
      <div className="mt-3 h-px w-full bg-border" aria-hidden>
        <div
          className="h-px transition-[width] duration-700 ease-out"
          style={{
            width: `${Math.max(4, depth.progress)}%`,
            backgroundImage:
              "linear-gradient(90deg, var(--primary), var(--accent))",
          }}
        />
      </div>

      <p className="mt-2.5 font-ui text-xs leading-relaxed text-muted-foreground">
        {depth.narrativeBeats === 0
          ? "The first chapter is yet to open."
          : `Chapter ${depth.chapterInAct} of this act is taking shape.`}
      </p>
    </div>
  );
}

function Continuity({
  ready,
  warm,
  neverVisited,
  daysAway,
  waitingCharacter,
}: {
  ready: boolean;
  warm: boolean;
  neverVisited: boolean;
  daysAway: number;
  waitingCharacter: string | null;
}) {
  const who = waitingCharacter ?? "The world";
  let line: string;
  let toneAccent = false;

  if (!ready) {
    line = "Listening for the world…";
  } else if (warm) {
    line = "The world is warm — you stepped in today.";
  } else if (neverVisited) {
    line = `${who} is waiting for your first word.`;
    toneAccent = true;
  } else {
    const span =
      daysAway <= 0
        ? "a while"
        : `${daysAway} ${daysAway === 1 ? "day" : "days"}`;
    line = `${who} has been waiting ${span}.`;
    toneAccent = true;
  }

  return (
    <div className="flex items-start gap-2.5">
      <span
        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
          toneAccent ? "bg-accent animate-breathe" : "bg-primary/60"
        }`}
        aria-hidden
      />
      <p className="font-body text-sm italic leading-relaxed text-foreground/85">
        {line}
      </p>
    </div>
  );
}

function TodaysChapter({ ready, count }: { ready: boolean; count: number }) {
  const line = !ready
    ? "Today's page is loading…"
    : count === 0
      ? "Today's chapter hasn't opened yet."
      : `Today's chapter — ${count} ${count === 1 ? "beat has" : "beats have"} unfolded.`;

  return (
    <div className="flex items-start gap-2.5">
      <span
        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60"
        aria-hidden
      />
      <p className="font-body text-sm leading-relaxed text-muted-foreground">
        {line}
      </p>
    </div>
  );
}
