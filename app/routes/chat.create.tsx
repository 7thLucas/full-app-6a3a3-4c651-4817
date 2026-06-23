import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, Loader2, Sparkles, Wand2 } from "lucide-react";
import { useConfigurables } from "~/modules/configurables";
import { cn } from "~/lib/utils";
import { Button, Eyebrow, Section } from "~/components/ui";
import { Wordmark } from "~/components/brand";
import { createCharacter } from "~/lib/chat.client";

export function meta() {
  return [{ title: "Driftoria — Create a companion" }];
}

const field =
  "w-full rounded-2xl border border-border bg-card px-4 py-3 text-[0.95rem] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60";

export default function CreateCharacter() {
  const { config } = useConfigurables();
  const appName = config?.appName ?? "Driftoria";
  const tagOptions = config?.discoveryTags ?? [];
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [persona, setPersona] = useState("");
  const [greeting, setGreeting] = useState("");
  const [avatarPrompt, setAvatarPrompt] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTag = (t: string) =>
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !tagline.trim() || !persona.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const created = await createCharacter({
        name,
        tagline,
        persona,
        greeting: greeting.trim() || undefined,
        avatarPrompt: avatarPrompt.trim() || undefined,
        tags,
      });
      navigate(`/chat/${created.characterId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create companion");
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background font-body text-foreground grain">
      <div className="aurora-backdrop animate-drift" />

      <header className="relative z-10 border-b border-border">
        <Section className="flex items-center justify-between py-5">
          <Wordmark appName={appName} logoUrl={config?.logoUrl} />
          <Link to="/chat">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
              Discovery
            </Button>
          </Link>
        </Section>
      </header>

      <Section className="relative z-10 py-12">
        <div className="mx-auto max-w-2xl">
          <Eyebrow>
            <Wand2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            Create a companion
          </Eyebrow>
          <h1 className="mt-5 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            <span className="text-aurora">Bring someone to life.</span>
          </h1>
          <p className="mt-3 text-muted-foreground">
            Describe who they are. We'll generate their portrait and they'll be waiting in
            the feed, ready to talk.
          </p>

          <form onSubmit={submit} className="mt-9 space-y-5">
            <div>
              <label className="mb-2 block font-ui text-sm text-muted-foreground">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Lyra Moonwell"
                className={field}
                maxLength={60}
              />
            </div>
            <div>
              <label className="mb-2 block font-ui text-sm text-muted-foreground">Tagline</label>
              <input
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="A one-line hook that makes someone want to meet them."
                className={field}
                maxLength={140}
              />
            </div>
            <div>
              <label className="mb-2 block font-ui text-sm text-muted-foreground">
                Persona &amp; voice
              </label>
              <textarea
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                placeholder="Personality, how they speak, what they care about, how they treat you…"
                rows={4}
                className={cn(field, "resize-none")}
                maxLength={800}
              />
            </div>
            <div>
              <label className="mb-2 block font-ui text-sm text-muted-foreground">
                Opening greeting <span className="opacity-60">(optional)</span>
              </label>
              <textarea
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                placeholder="The first thing they say when you arrive."
                rows={2}
                className={cn(field, "resize-none")}
                maxLength={400}
              />
            </div>
            <div>
              <label className="mb-2 block font-ui text-sm text-muted-foreground">
                Appearance for portrait art <span className="opacity-60">(optional)</span>
              </label>
              <textarea
                value={avatarPrompt}
                onChange={(e) => setAvatarPrompt(e.target.value)}
                placeholder="Hair, eyes, clothing, setting, mood — visual details for the generated avatar."
                rows={2}
                className={cn(field, "resize-none")}
                maxLength={400}
              />
            </div>

            {tagOptions.length ? (
              <div>
                <label className="mb-2 block font-ui text-sm text-muted-foreground">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {tagOptions.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTag(t)}
                      className={cn(
                        "rounded-full border px-3.5 py-1.5 font-ui text-sm transition-colors",
                        tags.includes(t)
                          ? "border-primary bg-primary/15 text-foreground"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" size="lg" disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                    Bringing them to life…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" strokeWidth={1.75} />
                    Create &amp; start chatting
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </Section>
    </div>
  );
}
