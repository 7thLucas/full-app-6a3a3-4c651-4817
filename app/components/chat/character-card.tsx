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
      className="group relative block aspect-[3/4] overflow-hidden rounded-2xl border border-border bg-secondary transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_16px_36px_-22px_var(--primary)]"
    >
      {character.avatarUrl ? (
        <img
          src={character.avatarUrl}
          alt={character.name}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center font-heading text-4xl text-muted-foreground">
          {initials}
        </div>
      )}

      {/* Readability wash so the resting copy holds against any art. */}
      <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-card via-card/75 to-transparent" />

      {/* Social proof — real conversation count, or "New" for fresh companions. */}
      <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-background/60 px-2 py-1 font-ui text-[0.65rem] font-medium tracking-wide text-foreground backdrop-blur">
        {character.chatCount > 0 ? (
          <>
            <MessagesSquare className="h-3 w-3 text-primary" strokeWidth={2} />
            {formatCount(character.chatCount)}
          </>
        ) : (
          <span className="uppercase tracking-wider text-primary">New</span>
        )}
      </span>

      {/* Copy rests at the base; on hover it lifts to make room for the CTA. */}
      <div className="absolute inset-x-0 bottom-0 p-4">
        <div className="transition-transform duration-300 ease-out group-hover:-translate-y-1">
          <h3 className="font-heading text-lg font-semibold leading-tight tracking-tight text-foreground">
            {character.name}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm leading-snug text-foreground/70">
            {character.tagline}
          </p>
        </div>
        <div className="grid grid-rows-[0fr] opacity-0 transition-all duration-300 ease-out group-hover:grid-rows-[1fr] group-hover:opacity-100">
          <span className="flex items-center gap-1.5 overflow-hidden font-ui text-sm font-medium text-primary">
            <MessageCircleHeart className="mt-2.5 h-4 w-4" strokeWidth={1.75} />
            <span className="mt-2.5">Start chatting</span>
          </span>
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
