import { Loader2, Pencil, RefreshCw } from "lucide-react";
import { cn } from "~/lib/utils";
import type { ChatMessageView } from "~/lib/chat.client";
import { Avatar } from "./character-card";

/** Render *italic action* spans inside companion dialogue. */
function renderContent(text: string) {
  const parts = text.split(/(\*[^*]+\*)/g);
  return parts.map((p, i) =>
    p.startsWith("*") && p.endsWith("*") ? (
      <em key={i} className="text-muted-foreground">
        {p.slice(1, -1)}
      </em>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

export function MessageBubble({
  message,
  characterName,
  avatarUrl,
  onEdit,
  onRegenerate,
  showRegenerate,
}: {
  message: ChatMessageView;
  characterName: string;
  avatarUrl?: string | null;
  onEdit?: (messageId: string, content: string) => void;
  onRegenerate?: () => void;
  showRegenerate?: boolean;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="group flex animate-rise justify-end gap-2">
        {onEdit ? (
          <button
            type="button"
            onClick={() => onEdit(message.messageId, message.content)}
            className="mt-1 opacity-0 transition-opacity group-hover:opacity-100"
            aria-label="Edit message"
          >
            <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" strokeWidth={1.75} />
          </button>
        ) : null}
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-[0.95rem] leading-relaxed text-primary-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-rise space-y-2.5">
      {message.narration ? (
        <p className="px-2 text-center font-serif text-[0.9rem] italic leading-relaxed text-muted-foreground">
          <span className="mr-1.5 text-accent/70">—</span>
          {message.narration}
          <span className="ml-1.5 text-accent/70">—</span>
        </p>
      ) : null}
      <div className="flex items-start gap-3">
        <Avatar src={avatarUrl} name={characterName} className="mt-0.5 h-9 w-9" />
        <div className="max-w-[80%] space-y-2">
          {message.whileAway ? (
            <span className="inline-flex items-center gap-1.5 font-ui text-[0.65rem] uppercase tracking-wider text-accent">
              While you were away
            </span>
          ) : null}
          <div className="rounded-2xl rounded-tl-md bg-card px-4 py-2.5 text-[0.95rem] leading-relaxed text-card-foreground ring-1 ring-border">
            {renderContent(message.content)}
          </div>
          {showRegenerate && onRegenerate ? (
            <button
              type="button"
              onClick={onRegenerate}
              className="flex items-center gap-1 text-[0.7rem] text-muted-foreground transition-colors hover:text-foreground"
            >
              <RefreshCw className="h-3 w-3" strokeWidth={1.75} />
              Regenerate
            </button>
          ) : null}
          {message.imageUrl ? (
            <div className="overflow-hidden rounded-2xl border border-border bg-secondary">
              <img
                src={message.imageUrl}
                alt="A scene from your conversation"
                loading="lazy"
                className="w-full animate-rise object-cover"
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Typing indicator shown while the companion is composing a reply. */
export function TypingBubble({
  characterName,
  avatarUrl,
}: {
  characterName: string;
  avatarUrl?: string | null;
}) {
  return (
    <div className="flex items-start gap-3">
      <Avatar src={avatarUrl} name={characterName} className="mt-0.5 h-9 w-9" />
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-2xl rounded-tl-md bg-card px-4 py-3 text-sm text-muted-foreground ring-1 ring-border",
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
        {characterName} is typing…
      </div>
    </div>
  );
}
