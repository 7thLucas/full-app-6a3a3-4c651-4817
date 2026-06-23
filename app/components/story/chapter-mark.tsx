import { toRoman } from "~/lib/story-progress";

/**
 * A chapter divider in the timeline — Story Depth made tangible inside the
 * reading flow. Stories mature into Acts and Chapters as beats accumulate; this
 * marks each new chapter as an editorial milestone, the way a novel announces
 * one, rather than as a level-up.
 */
export function ChapterMark({
  chapter,
  act,
}: {
  chapter: number;
  act: number;
}) {
  return (
    <div className="animate-rise flex items-center gap-4 py-2" role="separator">
      <span className="h-px flex-1 bg-border" aria-hidden />
      <span className="text-center">
        <span className="block font-ui text-[0.62rem] uppercase tracking-[0.34em] text-muted-foreground">
          Act {toRoman(act)}
        </span>
        <span className="mt-0.5 block font-heading text-sm font-semibold tracking-tight text-foreground/80">
          Chapter {chapter}
        </span>
      </span>
      <span className="h-px flex-1 bg-border" aria-hidden />
    </div>
  );
}
