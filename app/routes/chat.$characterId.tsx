import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { useConfigurables } from "~/modules/configurables";
import { Button } from "~/components/ui";
import { Avatar } from "~/components/chat/character-card";
import { MessageBubble, TypingBubble } from "~/components/chat/message-bubble";
import { SmartReplies } from "~/components/chat/smart-replies";
import { MemoryRibbon } from "~/components/chat/memory-ribbon";
import {
  openSession,
  sendChatMessage,
  type SessionView,
} from "~/lib/chat.client";

export function meta() {
  return [{ title: "Driftoria — Chat" }];
}

export default function ChatThread() {
  const { characterId = "" } = useParams();
  const { config } = useConfigurables();

  const [session, setSession] = useState<SessionView | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

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

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;
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
        setError(e instanceof Error ? e.message : "Message failed");
      } finally {
        setSending(false);
      }
    },
    [characterId, sending],
  );

  const character = session?.character;

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-background font-body text-foreground">
      <div className="aurora-backdrop opacity-40" />

      {/* Header */}
      <header className="relative z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3">
          <Link to="/chat">
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
        <div className="mx-auto w-full max-w-3xl space-y-3 px-4 py-4">
          {error && session ? (
            <p className="text-xs text-destructive">{error}</p>
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
      </div>
    </div>
  );
}
