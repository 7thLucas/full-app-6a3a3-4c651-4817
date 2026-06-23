/**
 * Mobile bottom navigation (md:hidden) — the app-shell entry point on phones,
 * replacing the top header. Five destinations: Home, Chats, a raised "New chat"
 * action, Explore, and Profile. Every destination except Home is gated behind
 * authentication: tapping one while signed out opens a bottom-sheet modal that
 * signs the user in and then continues to where they were headed.
 *
 * Mounted globally in app/root.tsx. It renders only on the marketing/discovery
 * surfaces (allowlist below) so it never overlaps the chat composer or the
 * auth pages, and it shows nothing during SSR/hydration to avoid a flash.
 */

import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  Compass,
  Home,
  Loader2,
  LogIn,
  LogOut,
  MessagesSquare,
  Plus,
  User,
  X,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui";
import { useAuth } from "~/hooks/use-auth";

/** Routes that show the bottom nav. Conversation/create/auth pages stay clear. */
const VISIBLE_ON = new Set(["/", "/chat", "/chat/history", "/story"]);

interface NavItem {
  key: string;
  label: string;
  to: string;
  icon: typeof Home;
  gated: boolean;
}

const ITEMS: NavItem[] = [
  { key: "home", label: "Home", to: "/", icon: Home, gated: false },
  { key: "chats", label: "Chats", to: "/chat/history", icon: MessagesSquare, gated: true },
  { key: "new", label: "New", to: "/chat/create", icon: Plus, gated: true },
  { key: "explore", label: "Explore", to: "/chat", icon: Compass, gated: true },
  { key: "profile", label: "Profile", to: "__profile__", icon: User, gated: true },
];

export function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [sheet, setSheet] = useState<null | "auth" | "profile">(null);
  const [pendingTo, setPendingTo] = useState<string | null>(null);

  const visible = VISIBLE_ON.has(location.pathname);
  // Lock body scroll while a sheet is open.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = sheet ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sheet]);

  if (!visible) return null;

  const handle = (item: NavItem) => {
    if (item.key === "profile") {
      setSheet(isAuthenticated ? "profile" : "auth");
      setPendingTo(isAuthenticated ? null : "/chat");
      return;
    }
    if (item.gated && !isAuthenticated) {
      setPendingTo(item.to);
      setSheet("auth");
      return;
    }
    navigate(item.to);
  };

  const isActive = (item: NavItem) =>
    item.to === "/"
      ? location.pathname === "/"
      : item.to.startsWith("/") && location.pathname.startsWith(item.to);

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/85 backdrop-blur-xl md:hidden">
        <div className="flex items-end justify-around px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            if (item.key === "new") {
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handle(item)}
                  aria-label="New chat"
                  className="-mt-6 flex flex-col items-center"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_10px_30px_-8px_var(--primary)] transition-transform active:scale-95">
                    <Plus className="h-6 w-6" strokeWidth={2} />
                  </span>
                  <span className="mt-1 font-ui text-[0.6rem] text-muted-foreground">
                    {item.label}
                  </span>
                </button>
              );
            }
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handle(item)}
                className="flex flex-1 flex-col items-center gap-1 py-1"
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-colors",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                  strokeWidth={active ? 2.25 : 1.75}
                />
                <span
                  className={cn(
                    "font-ui text-[0.6rem] transition-colors",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <BottomSheet open={sheet !== null} onClose={() => setSheet(null)}>
        {sheet === "auth" ? (
          <AuthSheet
            redirectTo={pendingTo ?? "/chat"}
            onClose={() => setSheet(null)}
          />
        ) : sheet === "profile" ? (
          <ProfileSheet onClose={() => setSheet(null)} />
        ) : null}
      </BottomSheet>
    </>
  );
}

/* ── Bottom sheet shell ───────────────────────────────────────────────── */

function BottomSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-background/70 backdrop-blur-sm animate-in fade-in"
      />
      <div className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-border bg-card px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-20px_60px_-20px_var(--primary)]">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border" />
        {children}
      </div>
    </div>
  );
}

/* ── Auth sheet (sign in to continue) ─────────────────────────────────── */

const field =
  "w-full rounded-2xl border border-border bg-background px-4 py-3 text-[0.95rem] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60";

function AuthSheet({
  redirectTo,
  onClose,
}: {
  redirectTo: string;
  onClose: () => void;
}) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      onClose();
      navigate(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setBusy(false);
    }
  };

  return (
    <div className="pb-2">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
            Sign in to continue
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your companions and conversations, wherever you sign in.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary"
        >
          <X className="h-5 w-5" strokeWidth={1.75} />
        </button>
      </div>

      <form onSubmit={submit} className="mt-5 space-y-3">
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={field}
        />
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className={field}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" size="lg" disabled={busy} className="w-full">
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
              Signing in…
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" strokeWidth={1.75} />
              Sign in
            </>
          )}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link
          to={`/register?redirect=${encodeURIComponent(redirectTo)}`}
          onClick={onClose}
          className="text-primary hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}

/* ── Profile sheet (signed-in menu) ───────────────────────────────────── */

function ProfileSheet({ onClose }: { onClose: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const go = (to: string) => {
    onClose();
    navigate(to);
  };

  return (
    <div className="pb-2">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 font-heading text-lg font-semibold text-primary">
          {(user?.name ?? "?").slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate font-heading text-lg font-semibold text-foreground">
            {user?.name ?? "Your profile"}
          </p>
          {user?.email ? (
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <Button variant="outline" size="lg" className="w-full justify-start" onClick={() => go("/chat/history")}>
          <MessagesSquare className="h-4 w-4" strokeWidth={1.75} />
          My chats
        </Button>
        <Button variant="outline" size="lg" className="w-full justify-start" onClick={() => go("/chat")}>
          <Compass className="h-4 w-4" strokeWidth={1.75} />
          Explore companions
        </Button>
        <Button
          variant="ghost"
          size="lg"
          className="w-full justify-start text-muted-foreground"
          onClick={async () => {
            await logout();
            onClose();
          }}
        >
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
          Sign out
        </Button>
      </div>
    </div>
  );
}
