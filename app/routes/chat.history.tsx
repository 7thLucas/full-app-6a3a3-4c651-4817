import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Compass, Loader2, MessagesSquare } from "lucide-react";
import { useConfigurables } from "~/modules/configurables";
import { Button, Eyebrow, Section } from "~/components/ui";
import { Wordmark } from "~/components/brand";
import { Avatar } from "~/components/chat/character-card";
import { fetchSessions, type ChatSummaryView } from "~/lib/chat.client";

export function meta() {
  return [{ title: "Driftoria — Your chats" }];
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

export default function ChatHistory() {
  const { config } = useConfigurables();
  const appName = config?.appName ?? "Driftoria";
  const [sessions, setSessions] = useState<ChatSummaryView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetchSessions()
      .then((data) => live && setSessions(data))
      .catch((e) => live && setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background font-body text-foreground grain pb-24 md:pb-0">
      <div className="aurora-backdrop animate-drift" />

      <header className="relative z-10 hidden border-b border-border md:block">
        <Section className="flex items-center justify-between py-5">
          <Wordmark appName={appName} logoUrl={config?.logoUrl} />
          <Link to="/chat">
            <Button variant="ghost" size="sm">
              <Compass className="h-4 w-4" strokeWidth={1.75} />
              Explore
            </Button>
          </Link>
        </Section>
      </header>

      <Section className="relative z-10 py-8 sm:py-12">
        <Eyebrow>
          <MessagesSquare className="h-3.5 w-3.5" strokeWidth={1.75} />
          Your chats
        </Eyebrow>
        <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-5xl">
          <span className="text-aurora">Pick up where you left off.</span>
        </h1>

        {loading ? (
          <div className="mt-16 flex items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.75} />
            Loading your conversations…
          </div>
        ) : error ? (
          <div className="mt-12 rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-center text-sm text-foreground">
            {error}
          </div>
        ) : sessions.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-border bg-card p-10 text-center">
            <MessagesSquare className="mx-auto h-6 w-6 text-primary" strokeWidth={1.75} />
            <p className="mt-4 text-muted-foreground">
              No conversations yet. Meet a companion to start one.
            </p>
            <Link to="/chat" className="mt-6 inline-block">
              <Button>
                <Compass className="h-4 w-4" strokeWidth={1.75} />
                Explore companions
              </Button>
            </Link>
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {sessions.map((s) => (
              <li key={s.characterId}>
                <Link
                  to={`/chat/${s.characterId}`}
                  className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
                >
                  <Avatar src={s.avatarUrl} name={s.name} className="h-12 w-12 text-sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="truncate font-heading text-base font-semibold tracking-tight text-foreground">
                        {s.name}
                      </h3>
                      <span className="shrink-0 font-ui text-xs text-muted-foreground">
                        {relativeTime(s.lastMessageAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {s.lastSnippet || s.tagline}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
