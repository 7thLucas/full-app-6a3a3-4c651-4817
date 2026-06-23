import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Loader2, Plus, Search, Sparkles, X } from "lucide-react";
import { useConfigurables } from "~/modules/configurables";
import { cn } from "~/lib/utils";
import { Button, Eyebrow, LiveDot, Section } from "~/components/ui";
import { Wordmark } from "~/components/brand";
import { CharacterCard } from "~/components/chat/character-card";
import { fetchCharacters, type CharacterCardView } from "~/lib/chat.client";
import { useAuth } from "~/hooks/use-auth";

import type { LoaderFunctionArgs } from "react-router";
import { requireUserId } from "~/lib/auth.server";

export function meta() {
  return [{ title: "Driftoria — Meet your companions" }];
}

export function loader({ request }: LoaderFunctionArgs) {
  requireUserId(request);
  return null;
}

export default function ChatDiscovery() {
  const { config } = useConfigurables();
  const appName = config?.appName ?? "Driftoria";
  const tags = config?.discoveryTags ?? [];
  const { user, isAuthenticated, logout } = useAuth();

  const [characters, setCharacters] = useState<CharacterCardView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let live = true;
    fetchCharacters()
      .then((data) => live && setCharacters(data))
      .catch((e) => live && setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return characters.filter((c) => {
      if (activeTag && !c.tags?.includes(activeTag)) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.tagline.toLowerCase().includes(q) ||
        c.tags?.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [characters, activeTag, query]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background font-body text-foreground grain pb-24 md:pb-0">
      <div className="aurora-backdrop animate-drift" />

      <header className="relative z-10 hidden border-b border-border md:block">
        <Section className="flex items-center justify-between py-5">
          <Wordmark appName={appName} logoUrl={config?.logoUrl} />
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <span className="hidden text-sm text-muted-foreground sm:inline">
                  {user?.name}
                </span>
                <Button variant="ghost" size="sm" onClick={() => void logout()}>
                  Sign out
                </Button>
              </>
            ) : (
              <Link to="/login?redirect=/chat">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
            )}
            <Link to="/chat/create">
              <Button size="sm">
                <Plus className="h-4 w-4" strokeWidth={1.75} />
                Create
              </Button>
            </Link>
          </div>
        </Section>
      </header>

      <Section className="relative z-10 py-12">
        <div className="max-w-2xl">
          <Eyebrow>
            <LiveDot />
            {config?.chatModeLabel ?? "Chat Mode"}
          </Eyebrow>
          <h1 className="mt-5 font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
            <span className="text-aurora">Find someone to talk to.</span>
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            {config?.chatModeTagline ??
              "Meet a companion who talks to you, shows you their world, and remembers you between visits."}
          </p>
        </div>

        <div className="relative mt-8 max-w-xl">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.75}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search companions by name, vibe, or tag…"
            className="w-full rounded-full border border-border bg-card py-3 pl-11 pr-10 text-[0.95rem] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-secondary"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          ) : null}
        </div>

        {tags.length ? (
          <div className="-mx-6 mt-5 flex gap-2 overflow-x-auto px-6 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setActiveTag(null)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-1.5 font-ui text-sm transition-colors",
                activeTag === null
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              All
            </button>
            {tags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setActiveTag(t)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-1.5 font-ui text-sm transition-colors",
                  activeTag === t
                    ? "border-primary bg-primary/15 text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-20 flex items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.75} />
            Gathering companions…
          </div>
        ) : error ? (
          <div className="mt-16 rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-center text-sm text-foreground">
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-16 rounded-2xl border border-border bg-card p-10 text-center">
            <Sparkles className="mx-auto h-6 w-6 text-primary" strokeWidth={1.75} />
            <p className="mt-4 text-muted-foreground">
              {query || activeTag
                ? "No companions match your search."
                : "No companions here yet. Be the first to create one."}
            </p>
            {query || activeTag ? (
              <Button
                variant="outline"
                className="mt-6"
                onClick={() => {
                  setQuery("");
                  setActiveTag(null);
                }}
              >
                Clear filters
              </Button>
            ) : (
              <Link to="/chat/create" className="mt-6 inline-block">
                <Button>
                  <Plus className="h-4 w-4" strokeWidth={1.75} />
                  Create a companion
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((c) => (
              <CharacterCard key={c.characterId} character={c} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
