import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Clock, Gauge, Loader2, MessageCircle, Save, Sparkles, User } from "lucide-react";
import { useConfigurables } from "~/modules/configurables";
import { Button } from "~/components/ui";
import { useAuth } from "~/hooks/use-auth";
import {
  fetchAutonomousSettings,
  saveAutonomousSettings,
  type AutonomousSettings,
} from "~/lib/chat.client";

export function meta() {
  return [{ title: "Driftoria — Autonomous Settings" }];
}

const CADENCE_LABELS: Record<string, { label: string; desc: string }> = {
  slow: { label: "Slow burn", desc: "One beat every 8 hours — breathing room between moments." },
  normal: { label: "Normal", desc: "One beat every 4 hours — steady narrative rhythm." },
  active: { label: "Active", desc: "One beat every 2 hours — the story keeps pace with your day." },
};

const NOTIFY_LABELS: Record<string, string> = {
  off: "Off",
  daily: "Daily digest",
  weekly: "Weekly roundup",
};

export default function AutonomousSettingsPage() {
  const { isAuthenticated } = useAuth();
  const { config } = useConfigurables();

  const [settings, setSettings] = useState<AutonomousSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [cadence, setCadence] = useState("normal");
  const [tickMinutes, setTickMinutes] = useState(240);
  const [simulateUser, setSimulateUser] = useState(true);
  const [storyTone, setStoryTone] = useState("");
  const [personality, setPersonality] = useState("");
  const [relationship, setRelationship] = useState("");
  const [memoryDepth, setMemoryDepth] = useState(600);
  const [notifyFrequency, setNotifyFrequency] = useState("off");

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    fetchAutonomousSettings()
      .then((s) => {
        setSettings(s);
        setCadence(s.cadence);
        setTickMinutes(s.tickIntervalMinutes);
        setSimulateUser(s.simulateUser);
        setStoryTone(s.storyTone);
        setPersonality(s.personality);
        setRelationship(s.relationship);
        setMemoryDepth(s.memoryDepth);
        setNotifyFrequency(s.notifyFrequency);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const updated = await saveAutonomousSettings({
        cadence: cadence as AutonomousSettings["cadence"],
        tickIntervalMinutes: tickMinutes,
        simulateUser,
        storyTone,
        personality,
        relationship,
        memoryDepth,
        notifyFrequency: notifyFrequency as AutonomousSettings["notifyFrequency"],
      });
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen bg-background font-body text-foreground">
        <div className="aurora-backdrop opacity-40" />
        <div className="relative z-10 mx-auto flex max-w-xl md:max-w-none flex-col items-center justify-center px-4 py-20 text-center">
          <Clock className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
          <h1 className="mt-4 font-heading text-2xl font-semibold tracking-tight">Autonomous Settings</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to personalize your story engine — cadence, tone, sim behavior, and more.
          </p>
          <div className="mt-6 flex gap-3">
            <Link to={`/login?redirect=/chat/settings`}>
              <Button size="md">Sign in</Button>
            </Link>
            <Link to="/chat">
              <Button variant="outline" size="md">Back to chat</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background font-body text-foreground">
      <div className="aurora-backdrop opacity-40" />

      <div className="relative z-10 mx-auto max-w-xl md:max-w-none px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link to="/chat">
            <Button variant="ghost" size="sm" className="px-2">
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          </Link>
          <h1 className="font-heading text-xl font-semibold tracking-tight">Autonomous Engine</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.75} />
            Loading settings…
          </div>
        ) : (
          <div className="space-y-8">
            {/* Cadence */}
            <section>
              <h2 className="flex items-center gap-2 font-ui text-sm uppercase tracking-wider text-muted-foreground">
                <Gauge className="h-4 w-4" strokeWidth={1.75} />
                Pacing
              </h2>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {(["slow", "normal", "active"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCadence(c)}
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      cadence === c
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    <div className="font-heading text-sm font-semibold">{CADENCE_LABELS[c].label}</div>
                    <div className="mt-0.5 text-[0.7rem] leading-snug">{CADENCE_LABELS[c].desc}</div>
                  </button>
                ))}
              </div>
            </section>

            {/* Tick interval */}
            <section>
              <h2 className="flex items-center gap-2 font-ui text-sm uppercase tracking-wider text-muted-foreground">
                <Clock className="h-4 w-4" strokeWidth={1.75} />
                Advance every
              </h2>
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="range"
                  min={15}
                  max={1440}
                  step={15}
                  value={tickMinutes}
                  onChange={(e) => setTickMinutes(Number(e.target.value))}
                  className="flex-1 accent-primary"
                />
                <span className="min-w-[4.5rem] text-right font-heading text-sm font-semibold tabular-nums">
                  {tickMinutes < 60
                    ? `${tickMinutes}m`
                    : `${Math.round(tickMinutes / 60)}h`}
                </span>
              </div>
              <p className="mt-1 text-[0.7rem] text-muted-foreground">
                How often the engine checks for sessions to advance (currently {tickMinutes < 60 ? `${tickMinutes} minutes` : `${Math.round(tickMinutes / 60)} hours`})
              </p>
            </section>

            {/* Simulate user */}
            <section>
              <h2 className="flex items-center gap-2 font-ui text-sm uppercase tracking-wider text-muted-foreground">
                <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
                Simulate user presence
              </h2>
              <p className="mt-1 text-[0.8rem] text-muted-foreground">
                When on, the AI imagines your felt presence in each scene — avoiding the
                monologue-into-void feel. No fake dialogue is generated.
              </p>
              <button
                type="button"
                onClick={() => setSimulateUser(!simulateUser)}
                className={`mt-3 inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  simulateUser ? "bg-primary" : "bg-border"
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
                    simulateUser ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </section>

            {/* Tone + Personality + Relationship */}
            <section className="space-y-4">
              <h2 className="flex items-center gap-2 font-ui text-sm uppercase tracking-wider text-muted-foreground">
                <Sparkles className="h-4 w-4" strokeWidth={1.75} />
                Story flavor
              </h2>

              <div>
                <label className="text-xs text-muted-foreground">Story tone / mood</label>
                <input
                  type="text"
                  value={storyTone}
                  onChange={(e) => setStoryTone(e.target.value)}
                  placeholder="e.g. cozy slow-burn romance, dark mystery, playful adventure"
                  className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary/60"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Personality nuance</label>
                <input
                  type="text"
                  value={personality}
                  onChange={(e) => setPersonality(e.target.value)}
                  placeholder="e.g. more teasing, softer, emotionally cautious"
                  className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary/60"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Relationship context</label>
                <input
                  type="text"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  placeholder="e.g. just getting to know each other, old friends, slowly falling"
                  className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary/60"
                />
              </div>
            </section>

            {/* Memory */}
            <section>
              <h2 className="flex items-center gap-2 font-ui text-sm uppercase tracking-wider text-muted-foreground">
                <User className="h-4 w-4" strokeWidth={1.75} />
                Memory depth
              </h2>
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="range"
                  min={200}
                  max={4000}
                  step={200}
                  value={memoryDepth}
                  onChange={(e) => setMemoryDepth(Number(e.target.value))}
                  className="flex-1 accent-primary"
                />
                <span className="min-w-[3.5rem] text-right font-heading text-sm font-semibold tabular-nums">
                  {memoryDepth}
                </span>
              </div>
              <p className="mt-1 text-[0.7rem] text-muted-foreground">
                Characters of text the companion remembers about you
              </p>
            </section>

            {/* Notifications (placeholder — needs push infra) */}
            <section>
              <h2 className="font-ui text-sm uppercase tracking-wider text-muted-foreground">
                Notifications
              </h2>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {(["off", "daily", "weekly"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setNotifyFrequency(f)}
                    className={`rounded-xl border px-3 py-2.5 text-center text-sm transition-colors ${
                      notifyFrequency === f
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {NOTIFY_LABELS[f]}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[0.7rem] text-muted-foreground">
                Coming soon — push notifications when the story advances
              </p>
            </section>

            {/* Error */}
            {error ? (
              <p className="text-xs text-destructive">{error}</p>
            ) : null}

            {/* Save */}
            <Button
              size="lg"
              className="w-full"
              onClick={save}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
              ) : saved ? (
                <>
                  <span className="text-emerald-400">✓</span> Saved
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" strokeWidth={1.75} />
                  Save settings
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
