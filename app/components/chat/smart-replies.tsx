import { Sparkles } from "lucide-react";

/** Suggested user responses — kills blank-page paralysis (Emochi pattern). */
export function SmartReplies({
  replies,
  onPick,
  disabled,
}: {
  replies: string[];
  onPick: (text: string) => void;
  disabled?: boolean;
}) {
  if (!replies.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Sparkles className="h-3.5 w-3.5 text-primary/70" strokeWidth={1.75} />
      {replies.map((r, i) => (
        <button
          key={`${i}-${r}`}
          type="button"
          disabled={disabled}
          onClick={() => onPick(r)}
          className="rounded-full border border-border bg-secondary/60 px-3.5 py-1.5 text-sm text-foreground transition-colors hover:border-primary/60 hover:bg-secondary disabled:pointer-events-none disabled:opacity-50"
        >
          {r}
        </button>
      ))}
    </div>
  );
}
