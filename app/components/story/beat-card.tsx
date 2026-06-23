import { Feather, Sparkles, Wand2 } from "lucide-react";
import { cn } from "~/lib/utils";
import type { StoryBeatView } from "~/lib/story.client";

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

function Initial({ name }: { name: string }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 font-heading text-sm font-semibold text-primary ring-1 ring-primary/20">
      {name.trim().charAt(0).toUpperCase() || "•"}
    </span>
  );
}

/**
 * Skeleton beat shown while the engine generates — a shaped placeholder with a
 * shimmer sweep, so generation reads as the world composing prose rather than a
 * bare spinner. `mode` tints the label for autonomous vs. intervention writes.
 */
export function WritingBeat({ mode }: { mode: "advancing" | "intervening" }) {
  return (
    <article className="animate-rise relative">
      <div className="shimmer overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-7">
        <header className="mb-4 flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 ring-1 ring-accent/25">
            <Feather className="h-4 w-4 animate-breathe text-accent" strokeWidth={1.75} />
          </span>
          <div className="space-y-1.5">
            <div className="h-3.5 w-40 animate-pulse-soft rounded-full bg-foreground/10" />
            <div className="h-2.5 w-24 animate-pulse-soft rounded-full bg-foreground/[0.07]" />
          </div>
        </header>
        <div className="space-y-2.5">
          <div className="h-3 w-full animate-pulse-soft rounded-full bg-foreground/[0.07]" />
          <div className="h-3 w-[92%] animate-pulse-soft rounded-full bg-foreground/[0.07]" />
          <div className="h-3 w-[97%] animate-pulse-soft rounded-full bg-foreground/[0.07]" />
          <div className="h-3 w-[60%] animate-pulse-soft rounded-full bg-foreground/[0.07]" />
        </div>
        <p className="mt-5 font-ui text-xs italic text-muted-foreground">
          {mode === "advancing"
            ? "The story drifts forward…"
            : "The world is responding to you…"}
        </p>
      </div>
    </article>
  );
}

export function BeatCard({
  beat,
  staggerIndex = 0,
}: {
  beat: StoryBeatView;
  staggerIndex?: number;
}) {
  if (beat.kind === "intervention") {
    return (
      <div className="animate-rise flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md border border-primary/25 bg-primary/10 px-5 py-4">
          <div className="mb-1.5 flex items-center gap-1.5 font-ui text-[0.7rem] uppercase tracking-[0.2em] text-primary/80">
            <Feather className="h-3 w-3" strokeWidth={1.75} /> You stepped in
          </div>
          <p className="text-[0.97rem] leading-relaxed text-foreground/90">{beat.content}</p>
        </div>
      </div>
    );
  }

  if (beat.kind === "seed") {
    return (
      <div className="animate-rise flex justify-center">
        <div className="flex max-w-[90%] items-start gap-2.5 rounded-2xl border border-accent/30 bg-accent/10 px-5 py-3">
          <Wand2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
          <p className="text-sm italic leading-relaxed text-foreground/85">
            A scenario was seeded — “{beat.content}”
          </p>
        </div>
      </div>
    );
  }

  // autonomous or scene
  return (
    <article
      className="animate-rise group relative"
      style={staggerIndex ? { animationDelay: `${Math.min(staggerIndex, 6) * 110}ms` } : undefined}
    >
      <div
        className={cn(
          "rounded-2xl border border-border bg-card p-6 sm:p-7 transition-colors",
          beat.whileAway && "ring-1 ring-accent/20",
        )}
      >
        <header className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {beat.character ? (
              <Initial name={beat.character} />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground ring-1 ring-border">
                <Sparkles className="h-4 w-4" strokeWidth={1.5} />
              </span>
            )}
            <div>
              {beat.title && (
                <h3 className="font-heading text-lg font-semibold leading-tight tracking-tight">
                  {beat.title}
                </h3>
              )}
              {beat.character && (
                <p className="mt-0.5 font-ui text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
                  {beat.character}
                </p>
              )}
            </div>
          </div>
          <span className="shrink-0 font-ui text-xs tabular-nums text-muted-foreground/70">
            {relativeTime(beat.createdAt)}
          </span>
        </header>

        <p className="prose-measure text-[1.04rem] leading-[1.78] text-foreground/88">
          {beat.content}
        </p>

        {beat.whileAway && (
          <div className="mt-4 flex items-center gap-2 text-xs text-accent/90">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-breathe" />
            <span className="font-ui italic">Unfolded while you were away</span>
          </div>
        )}
      </div>
    </article>
  );
}
