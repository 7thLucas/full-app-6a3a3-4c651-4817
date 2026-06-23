import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, Loader2, Lock, Send } from "lucide-react";
import { useConfigurables } from "~/modules/configurables";
import { Button } from "~/components/ui";
import { Avatar } from "~/components/chat/character-card";
import { MessageBubble, TypingBubble } from "~/components/chat/message-bubble";
import { SmartReplies } from "~/components/chat/smart-replies";
import { MemoryRibbon } from "~/components/chat/memory-ribbon";
import { useAuth } from "~/hooks/use-auth";
import {
  ChatLoginRequiredError,
  openSession,
  pingSession,
  sendChatMessage,
  UpgradeRequiredError,
  type SessionView,
} from "~/lib/chat.client";

export function meta() {
  return [{ title: "Driftoria — Chat" }];
}

export default function ChatThread() {
  const { characterId = "" } = useParams();
  const { config } = useConfigurables();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [session, setSession] = useState<SessionView | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [gated, setGated] = useState(false);

  // Guests may send a few messages per companion before the login gate.
  const guestLimit = config?.guestMessageLimit ?? 5;
  const userTurns = useMemo(
    () => session?.messages.filter((m) => m.role === "user").length ?? 0,
    [session?.messages],
  );
  const guestGated =
    !isAuthenticated && guestLimit >= 0 && (gated || userTurns >= guestLimit);
  const remainingTurns = Math.max(0, guestLimit - userTurns);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    setLoading(true);
    openSession(characterId)
      .then((s) => live && setSession(s))
      .catch((e) => live && setError(e instanceof Error ? e.message : "Failed to open chat"))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [characterId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages.length, sending]);

  // Poll for autonomous narrative advances while the user is idle.
  const pollInterval = (config?.chatPollIntervalSeconds ?? 30) * 1000;
  useEffect(() => {
    if (!session || pollInterval <= 0) return;

    const timer = setInterval(async () => {
      // Don't poll while a user message is in-flight.
      if (sending) return;
      try {
        const result = await pingSession(characterId);
        if (result.advanced) {
          setSession(result.session);
        }
      } catch {
        // Silently skip failed polls — the next interval will retry.
      }
    }, pollInterval);

    return () => clearInterval(timer);
  }, [characterId, session?.characterId, pollInterval, sending]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending || guestGated) return;
      setDraft("");
      setSending(true);
      setError(null);

      // Optimistically show the user's message.
      setSession((prev) =>
        prev
          ? {
              ...prev,
              smartReplies: [],
              messages: [
                ...prev.messages,
                {
                  messageId: `tmp-${Date.now()}`,
                  role: "user",
                  content: trimmed,
                  narration: null,
                  imageUrl: null,
                  vivid: false,
                  whileAway: false,
                  createdAt: new Date().toISOString(),
                },
              ],
            }
          : prev,
      );

      try {
        const updated = await sendChatMessage(characterId, trimmed);
        setSession(updated);
      } catch (e) {
        if (e instanceof ChatLoginRequiredError || e instanceof UpgradeRequiredError) {
          // Roll back the optimistic user bubble — it was never accepted.
          setSession((prev) =>
            prev
              ? { ...prev, messages: prev.messages.filter((m) => !m.messageId.startsWith("tmp-")) }
              : prev,
          );
          if (e instanceof UpgradeRequiredError) {
            navigate("/billing");
          } else {
            setGated(true);
          }
        } else {
          setError(e instanceof Error ? e.message : "Message failed");
        }
      } finally {
        setSending(false);
      }
    },
    [characterId, sending, guestGated],
  );

  const character = session?.character;

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-background font-body text-foreground">
      <div className="aurora-backdrop opacity-40" />

      {/* Header */}
      <header className="relative z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3">
          <Link to={`/chat/${characterId}`}>
            <Button variant="ghost" size="sm" className="px-2">
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          </Link>
          {character ? (
            <>
              <Avatar src={character.avatarUrl} name={character.name} className="h-10 w-10" />
              <div className="min-w-0">
                <p className="truncate font-heading text-base font-semibold tracking-tight">
                  {character.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">{character.tagline}</p>
              </div>
            </>
          ) : (
            <div className="h-10 flex-1" />
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-20 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.75} />
              Opening your conversation…
            </div>
          ) : error && !session ? (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-center text-sm">
              {error}
            </div>
          ) : session ? (
            <>
              {session.memory.length ? <MemoryRibbon memory={session.memory} /> : null}
              {session.messages.map((m) => (
                <MessageBubble
                  key={m.messageId}
                  message={m}
                  characterName={character?.name ?? ""}
                  avatarUrl={character?.avatarUrl}
                />
              ))}
              {sending ? (
                <TypingBubble
                  characterName={character?.name ?? ""}
                  avatarUrl={character?.avatarUrl}
                />
              ) : null}
            </>
          ) : null}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Composer */}
      <div className="relative z-10 border-t border-border bg-background/80 backdrop-blur">
        {guestGated ? (
          <div className="mx-auto w-full max-w-3xl px-4 py-6 text-center">
            <Lock className="mx-auto h-6 w-6 text-primary" strokeWidth={1.75} />
            <p className="mt-3 font-heading text-lg font-semibold tracking-tight">
              {config?.guestGateTitle ?? "Sign in to keep the conversation going"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {config?.guestGateSubtitle ??
                `${character?.name ?? "They"} will remember everything you've said so far.`}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <Link to={`/login?redirect=${encodeURIComponent(`/chat/${characterId}/room`)}`}>
                <Button size="md">Sign in</Button>
              </Link>
              <Link
                to={`/register?redirect=${encodeURIComponent(`/chat/${characterId}/room`)}`}
              >
                <Button variant="outline" size="md">
                  Create account
                </Button>
              </Link>
            </div>
          </div>
        ) : (
        <div className="mx-auto w-full max-w-3xl space-y-3 px-4 py-4">
          {error && session ? (
            <p className="text-xs text-destructive">{error}</p>
          ) : null}
          {!isAuthenticated && guestLimit >= 0 && remainingTurns <= 2 ? (
            <p className="text-xs text-muted-foreground">
              {remainingTurns === 0
                ? "This is your last free message."
                : `${remainingTurns} free message${remainingTurns === 1 ? "" : "s"} left before sign-in.`}
            </p>
          ) : null}
          {session && !sending ? (
            <SmartReplies replies={session.smartReplies} onPick={send} disabled={sending} />
          ) : null}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
            className="flex items-end gap-2"
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(draft);
                }
              }}
              rows={1}
              placeholder={config?.chatComposerPlaceholder ?? "Say something to them…"}
              disabled={loading || sending}
              className="max-h-40 min-h-[2.75rem] flex-1 resize-none rounded-2xl border border-border bg-card px-4 py-3 text-[0.95rem] leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60 disabled:opacity-50"
            />
            <Button
              type="submit"
              size="md"
              disabled={loading || sending || !draft.trim()}
              className="h-11 px-4"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
              ) : (
                <Send className="h-4 w-4" strokeWidth={1.75} />
              )}
            </Button>
          </form>
        </div>
        )}
      </div>
    </div>
  );
}
