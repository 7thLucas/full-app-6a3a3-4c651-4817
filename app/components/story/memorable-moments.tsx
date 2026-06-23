import { Bookmark } from "lucide-react";
import { Eyebrow } from "~/components/ui";
import type { StoryBeatView } from "~/lib/story.client";
import { memorableMoments } from "~/lib/story-progress";

/**
 * Memorable Moments — the "badges" mechanic reframed as pressed keepsakes.
 *
 * An auto-curated reel of standout beats the reader can return to. Collectible
 * in feel, literary in framing — never an achievement popup. Selecting a moment
 * scrolls the timeline to that beat.
 */
export function MemorableMoments({
  title,
  beats,
  max,
  onSelect,
}: {
  title: string;
  beats: StoryBeatView[];
  max: number;
  onSelect: (beatId: string) => void;
}) {
  const moments = memorableMoments(beats, max);
  if (moments.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <Eyebrow className="mb-4">
        <Bookmark className="h-3.5 w-3.5" strokeWidth={1.75} /> {title}
      </Eyebrow>

      <ul className="space-y-1">
        {moments.map((m, i) => (
          <li key={m.beatId}>
            <button
              type="button"
              onClick={() => onSelect(m.beatId)}
              className="group w-full rounded-xl px-2.5 py-2 text-left transition-colors duration-300 hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            >
              <div className="flex items-baseline gap-2.5">
                <span className="font-heading text-xs tabular-nums text-muted-foreground/70">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-heading text-[0.95rem] font-semibold leading-snug tracking-tight text-foreground/90 group-hover:text-foreground">
                    {m.title}
                    {m.whileAway && (
                      <span className="ml-2 align-middle font-ui text-[0.6rem] uppercase tracking-[0.18em] text-accent/90">
                        while away
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate font-body text-xs italic leading-relaxed text-muted-foreground">
                    {m.snippet}
                  </p>
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
