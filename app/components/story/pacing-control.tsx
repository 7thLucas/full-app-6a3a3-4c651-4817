import { cn } from "~/lib/utils";
import type { Pacing } from "~/lib/story.client";

interface PacingOption {
  value: Pacing;
  label: string;
  hint: string;
}

export function PacingControl({
  value,
  rates,
  disabled,
  onChange,
}: {
  value: Pacing;
  rates: { slow: number; moderate: number; active: number };
  disabled?: boolean;
  onChange: (p: Pacing) => void;
}) {
  const options: PacingOption[] = [
    { value: "slow", label: "Slow burn", hint: `${rates.slow}/day` },
    { value: "moderate", label: "Moderate", hint: `${rates.moderate}/day` },
    { value: "active", label: "Active", hint: `${rates.active}+/day` },
  ];

  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-1.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex items-center justify-between rounded-xl px-4 py-2.5 text-left transition-all duration-300",
              "disabled:cursor-not-allowed disabled:opacity-50",
              active
                ? "bg-primary/15 ring-1 ring-primary/30"
                : "hover:bg-secondary/70",
            )}
          >
            <span
              className={cn(
                "font-body text-sm font-medium",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {opt.label}
            </span>
            <span
              className={cn(
                "font-body text-xs tabular-nums",
                active ? "text-primary" : "text-muted-foreground/60",
              )}
            >
              {opt.hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}
