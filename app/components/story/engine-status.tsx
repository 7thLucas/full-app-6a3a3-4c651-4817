import { useEffect, useState } from "react";
import type { Pacing } from "~/lib/story.client";

const DAY_MS = 24 * 60 * 60 * 1000;

function beatsPerDay(
  pacing: Pacing,
  rates: { slow: number; moderate: number; active: number },
): number {
  if (pacing === "slow") return Math.max(1, rates.slow);
  if (pacing === "active") return Math.max(1, rates.active);
  return Math.max(1, rates.moderate);
}

function formatGap(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}

/**
 * Live meter for the autonomous engine — the product's defining promise made
 * tangible. Shows a ring that fills toward the next self-generated beat and a
 * countdown ticking every second, so the world visibly never stops moving.
 */
export function EngineStatus({
  lastAdvancedAt,
  pacing,
  rates,
}: {
  lastAdvancedAt: string;
  pacing: Pacing;
  rates: { slow: number; moderate: number; active: number };
}) {
  const [now, setNow] = useState<number>(() => new Date(lastAdvancedAt).getTime());

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const intervalMs = DAY_MS / beatsPerDay(pacing, rates);
  const last = new Date(lastAdvancedAt).getTime();
  const elapsed = Math.max(0, now - last);
  const nextAt = last + intervalMs;
  const remaining = nextAt - now;
  const overdue = remaining <= 0;
  const progress = overdue
    ? 100
    : Math.min(100, Math.round((elapsed / intervalMs) * 100));

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-4">
        {/* Progress ring */}
        <div className="relative h-14 w-14 shrink-0">
          <div
            className="engine-ring h-14 w-14 rounded-full"
            style={{ ["--p" as string]: progress }}
            aria-hidden
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="relative inline-flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-accent animate-breathe" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
            </span>
          </div>
        </div>

        <div className="min-w-0">
          <p className="font-ui text-[0.7rem] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Engine {overdue ? "ready" : "running"}
          </p>
          {overdue ? (
            <p className="mt-1 font-heading text-base font-semibold leading-tight text-accent">
              A beat is due
            </p>
          ) : (
            <p className="mt-1 font-heading text-base font-semibold leading-tight text-foreground">
              Next beat in{" "}
              <span className="tabular-nums text-accent">{formatGap(remaining)}</span>
            </p>
          )}
          <p className="mt-1 font-ui text-xs leading-relaxed text-muted-foreground/80">
            {overdue
              ? "It will catch up the moment you advance."
              : "Writing on its own, whether you're here or not."}
          </p>
        </div>
      </div>
    </div>
  );
}
