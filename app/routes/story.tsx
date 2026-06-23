import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import {
  ArrowLeft,
  Loader2,
  Play,
  Send,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useConfigurables } from "~/modules/configurables";
import { Button, Eyebrow, LiveDot } from "~/components/ui";
import { Wordmark } from "~/components/brand";
import { BeatCard } from "~/components/story/beat-card";
import { PacingControl } from "~/components/story/pacing-control";
import { CharacterRail } from "~/components/story/character-rail";
import {
  addCharacter as apiAddCharacter,
  advanceStory,
  catchUpStory,
  fetchStory,
  interveneStory,
  seedStory,
  setPacing as apiSetPacing,
  type Pacing,
  type StoryCharacterView,
  type StoryView,
} from "~/lib/story.client";

export function meta() {
  return [{ title: "Driftoria — Your living story" }];
}

type Busy = null | "advancing" | "intervening" | "seeding";

export default function StoryStudio() {
  const { config } = useConfigurables();
  const [story, setStory] = useState<StoryView | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [busy, setBusy] = useState<Busy>(null);
  const [pacingBusy, setPacingBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [awayBanner, setAwayBanner] = useState<number>(0);
  const didCatchUp = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const rates = {
    slow: config?.slowBeatsPerDay ?? 1,
    moderate: config?.moderateBeatsPerDay ?? 3,
    active: config?.activeBeatsPerDay ?? 6,
  };
  const scenarioSeeds = config?.scenarioSeeds ?? [];
  const showCast = config?.showCharactersRail !== false;

  // Initial load + catch-up (the "while you were away" experience).
  useEffect(() => {
    if (didCatchUp.current) return;
    didCatchUp.current = true;

    (async () => {
      try {
        const initial = await fetchStory();
        setStory(initial);
        setInitialLoading(false);
        // Generate any owed autonomous beats since last visit.
        const { story: caught, added } = await catchUpStory();
        setStory(caught);
        if (added > 0) setAwayBanner(added);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load your story");
        setInitialLoading(false);
      }
    })();
  }, []);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  }, []);

  useEffect(() => {
    if (story) scrollToBottom();
  }, [story?.beats.length, scrollToBottom]);

  async function handleAdvance() {
    if (busy) return;
    setBusy("advancing");
    setError(null);
    try {
      setStory(await advanceStory());
    } catch (e) {
      setError(e instanceof Error ? e.message : "The engine could not advance the story");
    } finally {
      setBusy(null);
    }
  }

  async function handleIntervene() {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy("intervening");
    setError(null);
    setDraft("");
    try {
      setStory(await interveneStory(text));
    } catch (e) {
      setError(e instanceof Error ? e.message : "The story could not respond");
      setDraft(text);
    } finally {
      setBusy(null);
    }
  }

  async function handleSeed(text: string) {
    if (!text.trim() || busy) return;
    setBusy("seeding");
    setError(null);
    try {
      setStory(await seedStory(text));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not plant that seed");
    } finally {
      setBusy(null);
    }
  }

  async function handlePacing(p: Pacing) {
    if (pacingBusy || !story || p === story.pacing) return;
    setPacingBusy(true);
    try {
      setStory(await apiSetPacing(p));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change pacing");
    } finally {
      setPacingBusy(false);
    }
  }

  async function handleAddCharacter(c: StoryCharacterView) {
    setStory(await apiAddCharacter(c));
  }

  const beats = story?.beats ?? [];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background font-body text-foreground grain">
      <div className="aurora-backdrop animate-drift opacity-70" />

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Wordmark appName={config?.appName ?? "Driftoria"} logoUrl={config?.logoUrl} />
          </div>
          <Eyebrow>
            <LiveDot /> Engine live
          </Eyebrow>
        </div>
      </header>

      <div className="relative z-10 mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[1fr_320px]">
        {/* Narrative column */}
        <main className="min-w-0">
          {/* Story header */}
          <div className="mb-8 border-b border-border pb-8">
            <Eyebrow>
              <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} /> Your living story
            </Eyebrow>
            <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              {story?.title ?? config?.starterStoryTitle ?? "Loading…"}
            </h1>
            {story?.premise && (
              <p className="prose-measure mt-3 text-[1.02rem] leading-relaxed text-muted-foreground">
                {story.premise}
              </p>
            )}
          </div>

          {/* Away banner */}
          {awayBanner > 0 && (
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-accent/30 bg-accent/10 px-5 py-3.5 animate-rise">
              <LiveDot />
              <p className="text-sm text-foreground/90">
                The story moved on without you —{" "}
                <span className="font-medium text-accent">
                  {awayBanner} new {awayBanner === 1 ? "beat" : "beats"}
                </span>{" "}
                unfolded while you were away.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-6 rounded-2xl border border-destructive/40 bg-destructive/10 px-5 py-3.5 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Timeline */}
          {initialLoading ? (
            <div className="flex items-center gap-3 py-20 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="font-body">Waking the world…</span>
            </div>
          ) : beats.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 px-8 py-16 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/50" strokeWidth={1.25} />
              <p className="prose-measure mx-auto mt-5 leading-relaxed text-muted-foreground">
                {config?.emptyStoryMessage ??
                  "Your world is quiet for now. Advance the story to let it begin to breathe."}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {beats.map((beat) => (
                <BeatCard key={beat.beatId} beat={beat} />
              ))}
            </div>
          )}

          {/* Busy indicator for autonomous generation */}
          {(busy === "advancing" || busy === "intervening") && (
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-border bg-card/60 px-5 py-4 text-muted-foreground animate-rise">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="font-body italic">
                {busy === "advancing" ? "The story drifts forward…" : "The world responds…"}
              </span>
            </div>
          )}

          <div ref={bottomRef} />

          {/* Composer */}
          <div className="sticky bottom-4 mt-8">
            <div className="rounded-2xl border border-border bg-card/90 p-4 backdrop-blur-md">
              <div className="flex items-end gap-3">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleIntervene();
                    }
                  }}
                  rows={1}
                  placeholder={config?.interventionPlaceholder ?? "Step into the story…"}
                  className="max-h-40 min-h-[2.75rem] flex-1 resize-none bg-transparent px-2 py-2.5 text-[1rem] leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                  disabled={busy === "intervening"}
                />
                <Button
                  size="sm"
                  onClick={handleIntervene}
                  disabled={!draft.trim() || busy !== null}
                  aria-label="Send intervention"
                >
                  {busy === "intervening" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" strokeWidth={1.75} />
                  )}
                </Button>
              </div>
              <div className="mt-2 flex items-center justify-between px-2">
                <span className="font-body text-xs text-muted-foreground/60">
                  Shape the story — you never have to drive it.
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAdvance}
                  disabled={busy !== null}
                  className="h-8 px-3"
                >
                  {busy === "advancing" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" strokeWidth={1.75} />
                  )}
                  Advance
                </Button>
              </div>
            </div>
          </div>
        </main>

        {/* Right rail */}
        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          {/* Pacing */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-1 font-heading text-base font-semibold tracking-tight">Pacing</h3>
            <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
              How fast the world moves on its own.
            </p>
            <PacingControl
              value={story?.pacing ?? (config?.defaultPacing as Pacing) ?? "moderate"}
              rates={rates}
              disabled={pacingBusy || !story}
              onChange={handlePacing}
            />
          </div>

          {/* Scenario seeding */}
          {scenarioSeeds.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-1 flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-accent" strokeWidth={1.75} />
                <h3 className="font-heading text-base font-semibold tracking-tight">
                  Seed a scenario
                </h3>
              </div>
              <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
                Plant a “what if.” It ripples into upcoming beats without forcing an outcome.
              </p>
              <div className="space-y-2">
                {scenarioSeeds.map((seed: string, i: number) => (
                  <button
                    key={i}
                    type="button"
                    disabled={busy !== null}
                    onClick={() => handleSeed(seed)}
                    className="w-full rounded-xl border border-border bg-background/60 px-3.5 py-2.5 text-left text-[0.85rem] leading-relaxed text-muted-foreground transition-all duration-300 hover:border-accent/40 hover:text-foreground disabled:opacity-50"
                  >
                    {seed}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cast */}
          {showCast && (
            <CharacterRail
              characters={story?.characters ?? []}
              disabled={!story}
              onAdd={handleAddCharacter}
            />
          )}
        </aside>
      </div>
    </div>
  );
}
