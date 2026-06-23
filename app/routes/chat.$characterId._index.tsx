import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  Heart,
  Loader2,
  MessageCircle,
  MessageCircleHeart,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useConfigurables } from "~/modules/configurables";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui";
import {
  fetchCharacterProfile,
  fetchCharacters,
  likeCharacter,
  type CharacterCardView,
  type CharacterProfileView,
} from "~/lib/chat.client";

export function meta() {
  return [{ title: "Driftoria — Character" }];
}

/** Compact social-proof formatting: 83400 → "83.4k", 1200000 → "1.2M". */
function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Heart;
  value: number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="flex items-center gap-1.5 font-heading text-lg font-semibold text-foreground">
        <Icon className="h-4 w-4 text-primary" strokeWidth={1.75} />
        {formatCount(value)}
      </span>
      <span className="font-ui text-[0.7rem] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export default function CharacterProfile() {
  const { characterId = "" } = useParams();
  const navigate = useNavigate();
  const { config } = useConfigurables();

  const [profile, setProfile] = useState<CharacterProfileView | null>(null);
  const [similar, setSimilar] = useState<CharacterCardView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeBump, setLikeBump] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setLiked(false);
    setLikeBump(0);
    fetchCharacterProfile(characterId)
      .then((p) => live && setProfile(p))
      .catch((e) => live && setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => live && setLoading(false));
    fetchCharacters()
      .then((all) => live && setSimilar(all))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [characterId]);

  const related = useMemo(() => {
    if (!profile) return [];
    return similar
      .filter((c) => c.characterId !== profile.characterId)
      .filter((c) =>
        profile.category
          ? c.category === profile.category
          : c.tags?.some((t) => profile.tags.includes(t)),
      )
      .slice(0, 6);
  }, [similar, profile]);

  // Reveal floating navbar once the hero scrolls mostly out of view.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 220);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lightbox: lock body scroll + close on Escape.
  useEffect(() => {
    if (lightbox === null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [lightbox]);

  const like = async () => {
    if (liked || !profile) return;
    setLiked(true);
    setLikeBump((b) => b + 1);
    try {
      await likeCharacter(profile.characterId);
    } catch {
      setLiked(false);
      setLikeBump((b) => b - 1);
    }
  };

  const startCta = config?.chatProfileStartCta ?? "Start chatting";
  const aboutLabel = config?.chatAboutLabel ?? "About";
  const scenarioLabel = config?.chatScenarioLabel ?? "The setup";
  const greetingLabel = config?.chatGreetingLabel ?? "First words";
  const similarLabel = config?.chatSimilarLabel ?? "More like this";

  const initials = (profile?.name ?? "")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative min-h-screen overflow-hidden bg-background font-body text-foreground">
      <div className="aurora-backdrop opacity-40" />

      {/* Floating navbar — appears on scroll */}
      {!loading && profile ? (
        <div
          className={cn(
            "fixed inset-x-0 top-0 z-30 transition-all duration-300",
            scrolled
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none -translate-y-2 opacity-0",
          )}
        >
          <div className="mx-auto flex w-full max-w-xl md:max-w-none items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur">
            <Link to="/chat">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-secondary/70">
                <ArrowLeft className="h-5 w-5" strokeWidth={1.75} />
              </span>
            </Link>
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-heading text-base font-semibold text-foreground">
                {profile.name}
              </h2>
              {profile.category ? (
                <span className="font-ui text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                  {profile.category}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={like}
              aria-label="Like"
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary transition-colors hover:bg-secondary/70",
                liked ? "text-primary" : "text-foreground",
              )}
            >
              <Heart
                className="h-5 w-5"
                strokeWidth={1.75}
                fill={liked ? "currentColor" : "none"}
              />
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="flex h-screen items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.75} />
          Loading…
        </div>
      ) : error || !profile ? (
        <div className="flex h-screen flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-sm text-muted-foreground">{error ?? "Character not found"}</p>
          <Link to="/chat">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
              Back to discovery
            </Button>
          </Link>
        </div>
      ) : (
        <div className="relative z-10 mx-auto w-full max-w-xl md:max-w-none pb-28">
          {/* Hero portrait */}
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-secondary">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-heading text-6xl text-muted-foreground">
                {initials}
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-background via-background/70 to-transparent" />

            {/* Top controls */}
            <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
              <Link to="/chat">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-background/60 text-foreground backdrop-blur transition-colors hover:bg-background/80">
                  <ArrowLeft className="h-5 w-5" strokeWidth={1.75} />
                </span>
              </Link>
              <button
                type="button"
                onClick={like}
                aria-label="Like"
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full bg-background/60 backdrop-blur transition-colors hover:bg-background/80",
                  liked ? "text-primary" : "text-foreground",
                )}
              >
                <Heart
                  className="h-5 w-5"
                  strokeWidth={1.75}
                  fill={liked ? "currentColor" : "none"}
                />
              </button>
            </div>

            {/* Name block over the gradient */}
            <div className="absolute inset-x-0 bottom-0 px-5 pb-5">
              <div className="flex flex-wrap items-center gap-2">
                {profile.category ? (
                  <span className="rounded-full bg-primary/20 px-3 py-1 font-ui text-[0.7rem] uppercase tracking-wider text-foreground backdrop-blur">
                    {profile.category}
                  </span>
                ) : null}
                {profile.gender ? (
                  <span className="rounded-full bg-background/60 px-3 py-1 font-ui text-[0.7rem] uppercase tracking-wider text-muted-foreground backdrop-blur">
                    {profile.gender}
                  </span>
                ) : null}
              </div>
              <h1 className="mt-3 font-heading text-4xl font-semibold tracking-tight text-foreground">
                {profile.name}
              </h1>
              <p className="mt-1 font-ui text-sm text-muted-foreground">
                by @{profile.creatorName}
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="space-y-7 px-5 pt-6">
            {/* Stats */}
            <div className="flex items-center justify-around rounded-2xl border border-border bg-card py-4">
              <Stat icon={MessageCircle} value={profile.chatCount} label="Chats" />
              <Stat icon={Heart} value={profile.likeCount + likeBump} label="Likes" />
              <Stat icon={Users} value={profile.followerCount} label="Followers" />
            </div>

            {/* Tags */}
            {profile.tags?.length ? (
              <div className="flex flex-wrap gap-2">
                {profile.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-border px-3.5 py-1.5 font-ui text-sm text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            ) : null}

            {/* Tagline */}
            <p className="text-lg leading-relaxed text-foreground">{profile.tagline}</p>

            {/* About */}
            {profile.description && profile.description !== profile.tagline ? (
              <section>
                <h2 className="font-ui text-sm uppercase tracking-wider text-muted-foreground">
                  {aboutLabel}
                </h2>
                <p className="mt-2 whitespace-pre-line leading-relaxed text-muted-foreground">
                  {profile.description}
                </p>
              </section>
            ) : null}

            {/* Scenario */}
            {profile.scenario ? (
              <section className="rounded-2xl border border-border bg-card p-5">
                <h2 className="flex items-center gap-2 font-ui text-sm uppercase tracking-wider text-primary">
                  <Sparkles className="h-4 w-4" strokeWidth={1.75} />
                  {scenarioLabel}
                </h2>
                <p className="mt-2 whitespace-pre-line italic leading-relaxed text-foreground">
                  {profile.scenario}
                </p>
              </section>
            ) : null}

            {/* Greeting preview */}
            {profile.greeting ? (
              <section>
                <h2 className="font-ui text-sm uppercase tracking-wider text-muted-foreground">
                  {greetingLabel}
                </h2>
                <div className="mt-2 rounded-2xl rounded-tl-sm border border-border bg-secondary/50 p-4 leading-relaxed text-foreground">
                  {profile.greeting}
                </div>
              </section>
            ) : null}

            {/* Gallery */}
            {profile.galleryUrls?.length ? (
              <section>
                <div className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-2">
                  {profile.galleryUrls.map((url, i) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setLightbox(i)}
                      className="shrink-0 snap-start overflow-hidden rounded-2xl transition-transform duration-200 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <img
                        src={url}
                        alt={`${profile.name} ${i + 1}`}
                        loading="lazy"
                        className="aspect-[3/4] w-40 object-cover"
                      />
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Similar */}
            {related.length ? (
              <section>
                <h2 className="font-ui text-sm uppercase tracking-wider text-muted-foreground">
                  {similarLabel}
                </h2>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {related.map((c, i) => (
                    <Link
                      key={c.characterId}
                      to={`/chat/${c.characterId}`}
                      style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}
                      className="group animate-rise overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
                    >
                      <div className="aspect-[3/4] w-full overflow-hidden bg-secondary">
                        {c.avatarUrl ? (
                          <img
                            src={c.avatarUrl}
                            alt={c.name}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : null}
                      </div>
                      <p className="truncate px-2 py-2 font-ui text-xs text-foreground">
                        {c.name}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </div>
      )}

      {/* Sticky CTA */}
      {!loading && profile ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/80 backdrop-blur">
          <div className="mx-auto w-full max-w-xl md:max-w-none px-5 py-4">
            <Button
              size="lg"
              className="w-full"
              onClick={() => navigate(`/chat/${profile.characterId}/room`)}
            >
              <MessageCircleHeart className="h-5 w-5" strokeWidth={1.75} />
              {startCta}
            </Button>
          </div>
        </div>
      ) : null}

      {/* Fullscreen gallery carousel */}
      {lightbox !== null && profile?.galleryUrls?.length ? (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-secondary/80 text-foreground backdrop-blur transition-colors hover:bg-secondary"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <div
            ref={(el) => {
              if (el) el.scrollLeft = lightbox * el.clientWidth;
            }}
            className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
          >
            {profile.galleryUrls.map((url, i) => (
              <div
                key={url}
                className="flex h-full w-full shrink-0 snap-center items-center justify-center p-4"
              >
                <img
                  src={url}
                  alt={`${profile.name} ${i + 1}`}
                  className="max-h-full max-w-full rounded-2xl object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
