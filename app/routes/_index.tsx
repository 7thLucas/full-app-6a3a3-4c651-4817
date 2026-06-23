import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight,
  BookOpenText,
  ChevronRight,
  Coffee,
  Heart,
  Loader2,
  MessageSquare,
  MessagesSquare,
  Plus,
  Search,
  Sparkles,
  Star,
  Swords,
  X,
  type LucideIcon,
} from "lucide-react";
import { useConfigurables } from "~/modules/configurables";
import { cn } from "~/lib/utils";
import { Button, LiveDot, Section } from "~/components/ui";
import { Wordmark } from "~/components/brand";
import { Avatar, CharacterCard } from "~/components/chat/character-card";
import { fetchCharacters, type CharacterCardView } from "~/lib/chat.client";
import { useAuth } from "~/hooks/use-auth";

export function meta() {
  return [
    { title: "Driftoria — Meet your companions" },
    {
      name: "description",
      content:
        "Meet AI companions who talk to you, show you their world, and remember you between visits. Pick one and start.",
    },
  ];
}

/** Icon per discovery tag so the trending rail reads at a glance. */
const TAG_ICONS: Record<string, LucideIcon> = {
  romance: Heart,
  rivalry: Swords,
  drama: Swords,
  mystery: Search,
  cozy: Coffee,
  comfort: Coffee,
  fantasy: Sparkles,
  "sci-fi": Sparkles,
  adventure: Sparkles,
  "slice of life": Coffee,
};

/** Flavor timestamps for the "while you're away" activity feed. */
const AWAY_TIMES = ["Just now", "12m ago", "35m ago", "1h ago"];

export default function IndexPage() {
  const { config } = useConfigurables();
  const appName = config?.appName ?? "Driftoria";
  const tags = config?.discoveryTags ?? [];
  const { user, isAuthenticated, logout } = useAuth();

  const chatEnabled = config?.enableChatMode !== false;

  const [characters, setCharacters] = useState<CharacterCardView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (!chatEnabled) {
      setLoading(false);
      return;
    }
    let live = true;
    fetchCharacters()
      .then((data) => live && setCharacters(data))
      .catch((e) => live && setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [chatEnabled]);

  const filtered = useMemo(() => {
    if (!activeTag) return characters;
    return characters.filter((c) => c.tags?.includes(activeTag));
  }, [characters, activeTag]);

  const featured = characters[0] ?? null;
  const awayFeed = characters.slice(0, 3);
  const liveCount = characters.length;

  const searchPlaceholder =
    config?.landingSearchPlaceholder ?? "Search stories or characters";

  return (
    <div className="relative min-h-screen overflow-hidden bg-background font-body text-foreground grain pb-28 md:pb-0">
      <div className="aurora-backdrop animate-drift" />

      {/* Top bar — wordmark, then search sits between it and the auth CTAs. */}
      <header className="relative z-10 border-b border-border">
        <Section className="flex items-center gap-3 py-4 sm:gap-4 sm:py-5">
          <Wordmark appName={appName} logoUrl={config?.logoUrl} />

          {/* Search — full pill on desktop, icon-only trigger on mobile. */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search stories or characters"
            className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card/60 text-muted-foreground backdrop-blur transition-colors hover:border-primary/40 hover:text-foreground sm:h-auto sm:w-full sm:max-w-sm sm:flex-1 sm:justify-start sm:gap-3 sm:px-5 sm:py-2.5"
          >
            <Search className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            <span className="hidden truncate font-ui text-sm sm:inline">{searchPlaceholder}</span>
          </button>

          <div className="flex shrink-0 items-center gap-2">
            {isAuthenticated ? (
              <>
                <span className="hidden text-sm text-muted-foreground lg:inline">
                  {user?.name}
                </span>
                <Button variant="ghost" size="sm" onClick={() => void logout()}>
                  Sign out
                </Button>
              </>
            ) : (
              <Link to="/login?redirect=/chat">
                <Button variant="ghost" size="sm">
                  {config?.landingSignInLabel ?? "Log in"}
                </Button>
              </Link>
            )}
            <Link to={isAuthenticated ? "/chat" : "/register?redirect=/chat"}>
              <Button size="sm">{config?.landingGetStartedLabel ?? "Get Started"}</Button>
            </Link>
          </div>
        </Section>
      </header>

      {searchOpen ? (
        <SearchOverlay
          characters={characters}
          placeholder={searchPlaceholder}
          onClose={() => setSearchOpen(false)}
        />
      ) : null}

      {/* Reassurance line — ember "live" dot ties it to the engine that keeps
          running while you're gone. Quiet ring, no boxed-pill chrome. */}
      <Section className="relative z-10 flex justify-center pt-6">
        <span className="inline-flex items-center gap-2.5 rounded-full bg-card/40 px-4 py-1.5 font-ui text-sm text-foreground/80 ring-1 ring-inset ring-border/70">
          <LiveDot className="h-2 w-2" />
          {config?.landingAwayPill ?? "Stories continue while you're away."}
        </span>
      </Section>

      {/* Featured "Live Drift" hero */}
      {chatEnabled && featured ? (
        <Section className="relative z-10 pt-6">
          <FeaturedHero
            character={featured}
            badge={config?.landingFeaturedBadge ?? "Live Drift"}
            cta={config?.landingFeaturedCta ?? "Start Chat"}
          />
        </Section>
      ) : null}

      {/* Trending rail + companion gallery */}
      {chatEnabled ? (
        <Section className="relative z-10 pt-8">
          <div className="-mx-6 mb-6 flex gap-2.5 overflow-x-auto px-6 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TagChip
              label={config?.landingTrendingLabel ?? "Trending"}
              icon={Star}
              active={activeTag === null}
              onClick={() => setActiveTag(null)}
            />
            {tags.map((t) => (
              <TagChip
                key={t}
                label={t}
                icon={TAG_ICONS[t.toLowerCase()]}
                active={activeTag === t}
                onClick={() => setActiveTag(t)}
              />
            ))}
          </div>

          {loading ? (
            <div className="mt-10 flex items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.75} />
              Gathering companions…
            </div>
          ) : error ? (
            <div className="mt-6 rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-center text-sm text-foreground">
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-border bg-card p-10 text-center">
              <Sparkles className="mx-auto h-6 w-6 text-primary" strokeWidth={1.75} />
              <p className="mt-4 text-muted-foreground">
                No companions here yet. Be the first to create one.
              </p>
              <Link to="/chat/create" className="mt-6 inline-block">
                <Button>
                  <Plus className="h-4 w-4" strokeWidth={1.75} />
                  Create a companion
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {filtered.map((c) => (
                <CharacterCard key={c.characterId} character={c} />
              ))}
            </div>
          )}
        </Section>
      ) : null}

      {/* While you're away — activity feed */}
      {chatEnabled && awayFeed.length ? (
        <Section className="relative z-10 pt-10">
          <div className="overflow-hidden rounded-2xl border border-border bg-card/60 p-5 backdrop-blur sm:p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="flex items-center gap-2 font-heading text-xl font-semibold tracking-tight">
                <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.75} />
                {config?.landingAwayTitle ?? "While you're away"}
              </h2>
              <span className="text-sm text-muted-foreground">
                {config?.landingAwaySubtitle ?? "Stories keep moving."}
              </span>
            </div>

            <ul className="mt-4 divide-y divide-border/70">
              {awayFeed.map((c, i) => (
                <AwayRow key={c.characterId} character={c} time={AWAY_TIMES[i] ?? ""} first={i === 0} />
              ))}
            </ul>

            <Link to="/chat" className="mt-5 block">
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-full border border-primary/40 bg-primary/5 py-3.5 font-ui text-sm font-medium text-primary transition-colors hover:bg-primary/10"
              >
                {config?.landingAwayCta ?? "See live stories"}
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </Link>
          </div>
        </Section>
      ) : null}

      {/* Footer */}
      <footer className="relative z-10 mt-12 border-t border-border">
        <Section className="flex flex-col items-center justify-between gap-4 py-8 sm:flex-row">
          <Wordmark appName={appName} logoUrl={config?.logoUrl} />
          <p className="text-sm text-muted-foreground">
            {config?.footerText ?? "A living story, powered by AI and shaped by you."}
          </p>
        </Section>
      </footer>
    </div>
  );
}

/* ── Featured "Live Drift" hero ──────────────────────────────────────── */

function FeaturedHero({
  character,
  badge,
  cta,
}: {
  character: CharacterCardView;
  badge: string;
  cta: string;
}) {
  const chips = (character.tags ?? []).slice(0, 3);
  const initials = character.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Link
      to={`/chat/${character.characterId}`}
      className="group block overflow-hidden rounded-2xl border border-primary/25 bg-card shadow-[0_20px_50px_-32px_var(--primary)] transition-colors hover:border-primary/45"
    >
      <div className="relative min-h-[300px] sm:min-h-[360px]">
        {character.avatarUrl ? (
          <img
            src={character.avatarUrl}
            alt={character.name}
            className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-secondary font-heading text-6xl text-muted-foreground">
            {initials}
          </div>
        )}
        {/* Readability washes — left for copy, bottom for grounding. */}
        <div className="absolute inset-0 bg-gradient-to-r from-card via-card/85 to-card/5" />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/10 to-transparent" />

        <div className="relative flex h-full max-w-[64%] flex-col gap-3.5 p-6 sm:max-w-[55%] sm:p-8">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 font-ui text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-primary backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
            {badge}
          </span>

          <h2 className="font-heading text-3xl font-semibold leading-[1.05] tracking-tight sm:text-4xl">
            {character.name}
          </h2>

          <p className="text-[0.95rem] leading-relaxed text-muted-foreground sm:text-base">
            {character.tagline}
          </p>

          {chips.length ? (
            <div className="mt-1 flex flex-wrap gap-2">
              {chips.map((t, i) => {
                const Icon = i === 0 ? BookOpenText : i === 1 ? MessageSquare : Heart;
                return (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/50 px-3 py-1.5 font-ui text-xs font-medium text-foreground/90 backdrop-blur"
                  >
                    <Icon className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
                    {t}
                  </span>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      <div className="p-4 pt-0 sm:p-5 sm:pt-0">
        <span className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary font-ui text-base font-medium tracking-wide text-primary-foreground shadow-[0_10px_28px_-16px_var(--primary)] transition-transform group-hover:scale-[1.01]">
          <Sparkles className="h-4 w-4" strokeWidth={2} />
          {cta}
          <ChevronRight className="h-4 w-4" strokeWidth={2} />
        </span>
      </div>
    </Link>
  );
}

/* ── Trending tag chip ───────────────────────────────────────────────── */

function TagChip({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon?: LucideIcon;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 font-ui text-sm transition-colors",
        active
          ? "border-primary bg-primary/15 text-foreground"
          : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {Icon ? (
        <Icon
          className={cn("h-4 w-4", active ? "text-primary" : "")}
          strokeWidth={1.75}
        />
      ) : null}
      {label}
    </button>
  );
}

/* ── Activity feed row ───────────────────────────────────────────────── */

function AwayRow({
  character,
  time,
  first,
}: {
  character: CharacterCardView;
  time: string;
  first: boolean;
}) {
  const initials = character.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <li>
      <Link
        to={`/chat/${character.characterId}`}
        className="flex items-center gap-3 py-3 transition-colors hover:bg-secondary/40 sm:gap-4"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary font-ui text-xs font-semibold text-muted-foreground ring-1 ring-border">
          {character.avatarUrl ? (
            <img src={character.avatarUrl} alt={character.name} className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 truncate font-ui text-sm font-medium text-primary">
            <MessagesSquare className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            {character.name}
          </span>
          <span className="mt-0.5 block truncate text-sm text-muted-foreground">
            {character.tagline}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          {time}
          {first ? (
            <LiveDot className="h-2 w-2" />
          ) : (
            <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
          )}
        </span>
      </Link>
    </li>
  );
}

/* ── Search overlay ──────────────────────────────────────────────────── */

function SearchOverlay({
  characters,
  placeholder,
  onClose,
}: {
  characters: CharacterCardView[];
  placeholder: string;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return characters.slice(0, 6);
    return characters
      .filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.tagline?.toLowerCase().includes(term) ||
          c.tags?.some((t) => t.toLowerCase().includes(term)),
      )
      .slice(0, 8);
  }, [characters, query]);

  return (
    <div
      className="animate-route fixed inset-0 z-50 flex justify-center bg-background/80 px-4 pt-20 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="h-fit w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_60px_-34px_var(--primary)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border px-5">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-transparent py-4 font-ui text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <ul className="max-h-[50vh] overflow-y-auto p-2">
          {results.length ? (
            results.map((c) => (
              <li key={c.characterId}>
                <Link
                  to={`/chat/${c.characterId}`}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-secondary"
                >
                  <Avatar src={c.avatarUrl} name={c.name} className="h-10 w-10" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-ui text-sm font-medium text-foreground">
                      {c.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {c.tagline}
                    </span>
                  </span>
                </Link>
              </li>
            ))
          ) : (
            <li className="px-3 py-8 text-center text-sm text-muted-foreground">
              No companions match “{query}”.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
