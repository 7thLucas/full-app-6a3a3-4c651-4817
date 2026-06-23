import { useState } from "react";
import { Plus, UserPlus, X } from "lucide-react";
import { Button } from "~/components/ui";
import type { StoryCharacterView } from "~/lib/story.client";

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/25 to-accent/15 font-heading text-base font-semibold text-foreground ring-1 ring-border">
      {name.trim().charAt(0).toUpperCase() || "•"}
    </span>
  );
}

export function CharacterRail({
  characters,
  disabled,
  onAdd,
}: {
  characters: StoryCharacterView[];
  disabled?: boolean;
  onAdd: (c: StoryCharacterView) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<StoryCharacterView>({
    name: "",
    role: "",
    persona: "",
    motivation: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    form.name.trim() && form.role.trim() && form.persona.trim() && form.motivation.trim();

  async function submit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await onAdd(form);
      setForm({ name: "", role: "", persona: "", motivation: "" });
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-input bg-background px-3 py-2 font-ui text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-heading text-base font-semibold tracking-tight">The Cast</h3>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={disabled}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
          aria-label="Add character"
        >
          {open ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </button>
      </div>

      <div className="space-y-4">
        {characters.length === 0 && !open && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            No one walks this world yet. Add a character to give the story someone to follow.
          </p>
        )}

        {characters.map((c) => (
          <div key={c.name} className="flex items-start gap-3">
            <Avatar name={c.name} />
            <div className="min-w-0">
              <p className="font-heading text-sm font-semibold leading-tight text-foreground">
                {c.name}
              </p>
              <p className="font-ui text-[0.7rem] uppercase tracking-[0.15em] text-muted-foreground">
                {c.role}
              </p>
              <p className="mt-1.5 text-[0.85rem] leading-relaxed text-muted-foreground/90">
                {c.persona}
              </p>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <div className="mt-5 space-y-2.5 border-t border-border pt-5">
          <input
            className={inputCls}
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className={inputCls}
            placeholder="Role (e.g. wandering scholar)"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          />
          <textarea
            className={inputCls}
            placeholder="Persona — how they speak and carry themselves"
            rows={2}
            value={form.persona}
            onChange={(e) => setForm({ ...form, persona: e.target.value })}
          />
          <textarea
            className={inputCls}
            placeholder="Motivation — what drives them"
            rows={2}
            value={form.motivation}
            onChange={(e) => setForm({ ...form, motivation: e.target.value })}
          />
          <Button
            size="sm"
            className="w-full"
            disabled={!canSubmit || submitting}
            onClick={submit}
          >
            <UserPlus className="h-4 w-4" strokeWidth={1.75} />
            {submitting ? "Adding…" : "Add to the cast"}
          </Button>
        </div>
      )}
    </div>
  );
}
