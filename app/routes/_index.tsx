import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, BookOpenText, Loader2, Plus, Sparkles } from "lucide-react";
import { useConfigurables } from "~/modules/configurables";
import { cn } from "~/lib/utils";
import { Button, Eyebrow, LiveDot, Section } from "~/components/ui";
import { Wordmark } from "~/components/brand";
import { CharacterCard } from "~/components/chat/character-card";
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

export default function IndexPage() {
  const { config } = useConfigurables();
  const appName = config?.appName ?? "Driftoria";
  const tags = config?.discoveryTags ?? [];
  const { user, isAuthenticated, logout } = useAuth();

  const chatEnabled = config?.enableChatMode !== false;
  const storyEnabled = config?.enableStoryMode !== false;

  const [characters, setCharacters] = useState<CharacterCardView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);

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

  const liveCount = characters.length;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background font-body text-foreground grain pb-24 md:pb-0">
      <div className="aurora-backdrop animate-drift" />

      {/* Nav — hidden on mobile (replaced by the bottom nav) */}
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

      {/* Hero — compact on mobile so the gallery sits above the fold */}
      <Section className="relative z-10 pb-5 pt-7 sm:pb-6 sm:pt-20">
        <div className="max-w-2xl">
          <Eyebrow>
            <LiveDot />
            {liveCount > 0
              ? `${liveCount} companion${liveCount === 1 ? "" : "s"} live now`
              : (config?.chatModeLabel ?? "Chat Mode")}
          </Eyebrow>
          <h1 className="mt-3 font-heading text-3xl font-semibold leading-[1.08] tracking-tight sm:mt-5 sm:text-6xl">
            <span className="text-aurora">
              {config?.landingHeadline ?? "Someone's always awake in here."}
            </span>
          </h1>
          <p className="mt-3 max-w-xl text-[0.95rem] leading-relaxed text-muted-foreground sm:mt-5 sm:text-lg">
            {config?.landingSubheadline ??
              "Meet AI companions who talk to you, show you their world, and remember you between visits. Pick one and start."}
          </p>
        </div>
      </Section>

      {/* The hook — companion gallery, above the fold */}
      {chatEnabled ? (
        <Section className="relative z-10 pb-16">
          {tags.length ? (
            <div className="-mx-6 mb-6 flex gap-2 overflow-x-auto px-6 pb-1 sm:mx-0 sm:mb-8 sm:flex-wrap sm:px-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
            <div className="mt-16 flex items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.75} />
              Gathering companions…
            </div>
          ) : error ? (
            <div className="mt-12 rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-center text-sm text-foreground">
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="mt-12 rounded-2xl border border-border bg-card p-10 text-center">
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
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((c) => (
                <CharacterCard key={c.characterId} character={c} />
              ))}
            </div>
          )}
        </Section>
      ) : null}

      {/* Story Mode — demoted to a slim fork, not the headline */}
      {storyEnabled ? (
        <Section className="relative z-10 pb-20">
          <Link
            to="/story"
            className="group flex flex-col items-start gap-4 overflow-hidden rounded-3xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/50 sm:flex-row sm:items-center sm:justify-between sm:p-7"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/15">
                <BookOpenText className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div>
                <h3 className="font-heading text-lg font-semibold tracking-tight">
                  Prefer to direct a whole world?
                </h3>
                <p className="mt-1 text-[0.95rem] leading-relaxed text-muted-foreground">
                  {config?.storyModeTagline ??
                    "Direct a living world. Third-person, cinematic, unfolding on its own — even while you're away."}
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 font-ui text-sm font-medium text-accent">
              {config?.storyModeLabel ?? "Story Mode"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.75} />
            </span>
          </Link>
        </Section>
      ) : null}

      {/* Footer */}
      <footer className="relative z-10 border-t border-border">
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
