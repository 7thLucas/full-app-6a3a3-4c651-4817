import { Link } from "react-router";
import { MessageCircleHeart, MessagesSquare } from "lucide-react";
import { cn } from "~/lib/utils";
import type { CharacterCardView } from "~/lib/chat.client";

/** Compact human count: 1200 → "1.2k", 0 → "" (caller shows "New" instead). */
function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

/** A single collectible companion in the discovery feed — art is the hero. */
export function CharacterCard({
  character,
  hasHistory = false,
}: {
  character: CharacterCardView;
  /** When the visitor already has a conversation, jump straight into the room. */
  hasHistory?: boolean;
}) {
  const initials = character.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Link
      to={hasHistory ? `/chat/${character.characterId}/room` : `/chat/${character.characterId}`}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-[0_20px_50px_-20px_var(--primary)]"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-secondary">
        {character.avatarUrl ? (
          <img
            src={character.avatarUrl}
            alt={character.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-heading text-4xl text-muted-foreground">
            {initials}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-card via-card/70 to-transparent" />
        {/* Social proof — real conversation count, or "New" for fresh companions. */}
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/70 px-2 py-1 font-ui text-[0.65rem] font-medium tracking-wide text-foreground backdrop-blur">
          {character.chatCount > 0 ? (
            <>
              <MessagesSquare className="h-3 w-3 text-primary" strokeWidth={2} />
              {formatCount(character.chatCount)}
            </>
          ) : (
            <span className="uppercase tracking-wider text-primary">New</span>
          )}
        </span>
        {character.tags?.length ? (
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {character.tags.slice(0, 2).map((t) => (
              <span
                key={t}
                className="rounded-full bg-background/70 px-2.5 py-1 font-ui text-[0.65rem] uppercase tracking-wider text-foreground backdrop-blur"
              >
                {t}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="relative -mt-10 flex flex-1 flex-col px-5 pb-5">
        <h3 className="font-heading text-xl font-semibold tracking-tight text-foreground">
          {character.name}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {character.tagline}
        </p>
        <div className="mt-4 flex items-center gap-2 font-ui text-sm font-medium text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <MessageCircleHeart className="h-4 w-4" strokeWidth={1.75} />
          Start chatting
        </div>
      </div>
    </Link>
  );
}

/** Avatar bubble used in chat headers and message rows. */
export function Avatar({
  src,
  name,
  className,
}: {
  src?: string | null;
  name: string;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary font-ui text-xs font-semibold text-muted-foreground ring-1 ring-border",
        className,
      )}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </span>
  );
}
