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
import { useLocation, useNavigate } from "react-router";
import {
  Compass,
  Home,
  Loader2,
  LogIn,
  MessagesSquare,
  Plus,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui";
import { useAuth } from "~/hooks/use-auth";

/** Routes that show the bottom nav. Conversation/create/auth pages stay clear. */
const VISIBLE_ON = new Set(["/", "/chat", "/chat/history", "/story", "/profile"]);

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
  { key: "profile", label: "Profile", to: "/profile", icon: User, gated: true },
];

export function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [sheet, setSheet] = useState<null | "auth">(null);
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
    if (item.gated && !isAuthenticated) {
      setPendingTo(item.to);
      setSheet("auth");
      return;
    }
    navigate(item.to);
  };

  const isActive = (item: NavItem) => {
    if (item.to === "/") return location.pathname === "/";
    return item.to.startsWith("/") && location.pathname.startsWith(item.to);
  };

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
                className="flex flex-1 flex-col items-center gap-1 py-1 transition-transform duration-150 active:scale-90"
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-all duration-200",
                    active ? "scale-110 text-primary" : "text-muted-foreground",
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
  // Keep the sheet mounted through its exit animation: `mounted` controls the
  // DOM presence, `shown` drives the enter/exit transition.
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      // Wait a frame after mount so the transition runs from the off-screen
      // starting state instead of snapping straight to the open state.
      const raf = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(raf);
    }
    setShown(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-background/70 backdrop-blur-sm transition-opacity duration-300 ease-out",
          shown ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        // When the exit transition (translate) finishes, drop the node.
        onTransitionEnd={(e) => {
          if (e.propertyName === "transform" && !open) setMounted(false);
        }}
        className={cn(
          "absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-border bg-card px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-20px_60px_-20px_var(--primary)]",
          "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform",
          shown ? "translate-y-0" : "translate-y-full",
        )}
      >
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
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
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
      if (mode === "register") {
        await register(email, password, name);
      } else {
        await login(email, password);
      }
      onClose();
      navigate(redirectTo);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : mode === "register"
            ? "Sign up failed"
            : "Login failed",
      );
      setBusy(false);
    }
  };

  const isRegister = mode === "register";

  return (
    <div className="pb-2">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">
            {isRegister ? "Create your account" : "Sign in to continue"}
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
        {isRegister ? (
          <input
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className={field}
          />
        ) : null}
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
          autoComplete={isRegister ? "new-password" : "current-password"}
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
              {isRegister ? "Creating account…" : "Signing in…"}
            </>
          ) : isRegister ? (
            <>
              <UserPlus className="h-4 w-4" strokeWidth={1.75} />
              Create account
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
        {isRegister ? "Already have an account?" : "New here?"}{" "}
        <button
          type="button"
          onClick={() => {
            setError(null);
            setMode(isRegister ? "login" : "register");
          }}
          className="text-primary hover:underline"
        >
          {isRegister ? "Sign in" : "Create an account"}
        </button>
      </p>
    </div>
  );
}
