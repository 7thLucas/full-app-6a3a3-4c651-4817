import { BrainCircuit } from "lucide-react";

/** "She remembers…" — surfaces the companion's memory as a relationship artifact. */
export function MemoryRibbon({ memory }: { memory: string[] }) {
  if (!memory.length) return null;
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4">
      <div className="flex items-center gap-2 font-ui text-xs uppercase tracking-[0.2em] text-muted-foreground">
        <BrainCircuit className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
        Remembers about you
      </div>
      <ul className="mt-3 space-y-1.5">
        {memory.slice(-6).map((m, i) => (
          <li key={i} className="flex gap-2 text-sm text-foreground/90">
            <span className="text-primary">•</span>
            <span>{m}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
