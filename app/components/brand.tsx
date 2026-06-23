import {
  Sparkles,
  Users,
  PenLine,
  ScrollText,
  Gauge,
  Wand2,
  BookOpen,
  Feather,
  Moon,
  Compass,
  type LucideIcon,
} from "lucide-react";
import { cn } from "~/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  Sparkles,
  Users,
  PenLine,
  ScrollText,
  Gauge,
  Wand2,
  BookOpen,
  Feather,
  Moon,
  Compass,
};

export function FeatureIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICONS[name] ?? Sparkles;
  return <Icon className={className} strokeWidth={1.5} />;
}

/** Driftoria mark — a small drifting glyph. Used when no logo URL is set. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex h-9 w-9 items-center justify-center rounded-xl",
        "bg-gradient-to-br from-primary/30 to-accent/20 ring-1 ring-border",
        className,
      )}
      aria-hidden
    >
      <Moon className="h-5 w-5 text-primary" strokeWidth={1.5} />
    </span>
  );
}

export function Wordmark({
  appName,
  logoUrl,
  className,
}: {
  appName: string;
  logoUrl?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {logoUrl ? (
        <img src={logoUrl} alt={appName} className="h-8 w-8 rounded-xl object-cover" />
      ) : (
        <BrandMark />
      )}
      <span className="font-heading text-lg font-semibold tracking-tight text-foreground">
        {appName}
      </span>
    </div>
  );
}
