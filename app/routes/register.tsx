import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, Loader2, UserPlus } from "lucide-react";
import { useConfigurables } from "~/modules/configurables";
import { Button, Eyebrow, Section } from "~/components/ui";
import { Wordmark } from "~/components/brand";
import { useAuth } from "~/hooks/use-auth";

export function meta() {
  return [{ title: "Driftoria — Create your account" }];
}

const field =
  "w-full rounded-2xl border border-border bg-card px-4 py-3 text-[0.95rem] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60";

export default function RegisterPage() {
  const { config } = useConfigurables();
  const appName = config?.appName ?? "Driftoria";
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "/chat";

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
      await register(email, password, name);
      navigate(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background font-body text-foreground grain">
      <div className="aurora-backdrop animate-drift" />

      <header className="relative z-10 border-b border-border">
        <Section className="flex items-center justify-between py-5">
          <Wordmark appName={appName} logoUrl={config?.logoUrl} />
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
              Home
            </Button>
          </Link>
        </Section>
      </header>

      <Section className="relative z-10 py-16">
        <div className="mx-auto max-w-md">
          <Eyebrow>
            <UserPlus className="h-3.5 w-3.5" strokeWidth={1.75} />
            Join {appName}
          </Eyebrow>
          <h1 className="mt-5 font-heading text-3xl font-semibold tracking-tight">
            <span className="text-aurora">Create your account.</span>
          </h1>
          <p className="mt-3 text-muted-foreground">
            Save your companions and let them remember you across every visit.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <label className="mb-2 block font-ui text-sm text-muted-foreground">Name</label>
              <input
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="What should we call you?"
                className={field}
                maxLength={80}
              />
            </div>
            <div>
              <label className="mb-2 block font-ui text-sm text-muted-foreground">Email</label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={field}
              />
            </div>
            <div>
              <label className="mb-2 block font-ui text-sm text-muted-foreground">Password</label>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className={field}
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button type="submit" size="lg" disabled={busy} className="w-full">
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                  Creating your account…
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" strokeWidth={1.75} />
                  Create account
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to={`/login?redirect=${encodeURIComponent(redirect)}`}
              className="text-primary hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </Section>
    </div>
  );
}
