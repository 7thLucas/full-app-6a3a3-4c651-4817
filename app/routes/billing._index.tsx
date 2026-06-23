import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Check, Compass, Crown, Loader2, Sparkles } from "lucide-react";
import { useConfigurables } from "~/modules/configurables";
import { Button, Eyebrow, Section } from "~/components/ui";
import { Wordmark } from "~/components/brand";
import { useAuth } from "~/hooks/use-auth";
import {
  cancelPlan,
  fetchBilling,
  startCheckout,
  type BillingState,
  type PlanLimits,
  type PlanTier,
} from "~/lib/billing.client";

import type { LoaderFunctionArgs } from "react-router";
import { requireUserId } from "~/lib/auth.server";

export function meta() {
  return [{ title: "Driftoria — Plans & pricing" }];
}

export function loader({ request }: LoaderFunctionArgs) {
  requireUserId(request);
  return null;
}

const ORDER: PlanTier[] = ["free", "plus", "pro"];

function cap(n: number, unit: string): string {
  return n < 0 ? `Unlimited ${unit}` : `${n} ${unit}`;
}

/** Human-readable feature lines for a tier. */
function featureLines(p: PlanLimits): string[] {
  return [
    p.dailyMessages < 0 ? "Unlimited messages" : `${p.dailyMessages} messages / day`,
    p.dailyImages < 0 ? "Unlimited scene art" : `${p.dailyImages} inline images / day`,
    cap(p.maxCompanions, "companions"),
    p.characterAvatars ? "Custom companion avatars" : "No avatar art",
    p.offlinePings ? "Offline companion pings" : "No offline pings",
    p.storyMode === "full" ? `Shape the story (up to ${p.maxPacing} pacing)` : "Story Mode: read-only",
    p.premiumModel ? "Premium AI model" : "Standard AI model",
  ];
}

export default function BillingPage() {
  const { config } = useConfigurables();
  const appName = config?.appName ?? "Driftoria";
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [state, setState] = useState<BillingState | null>(null);
  const [busy, setBusy] = useState<PlanTier | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(
    params.get("canceled") ? "Checkout canceled — no changes made." : null,
  );

  useEffect(() => {
    fetchBilling().then(setState).catch((e) => setError(e.message));
  }, []);

  const current = state?.plan ?? user?.plan ?? "free";

  const upgrade = async (plan: "plus" | "pro") => {
    setBusy(plan);
    setError(null);
    try {
      const res = await startCheckout(plan);
      // Mock returns an in-app path; live returns a Stripe-hosted URL. Both work
      // with a full-page redirect.
      window.location.href = res.redirectUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
      setBusy(null);
    }
  };

  const downgrade = async () => {
    setBusy("cancel");
    setError(null);
    try {
      await cancelPlan();
      navigate(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancel failed");
      setBusy(null);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background font-body text-foreground grain pb-24 md:pb-0">
      <div className="aurora-backdrop animate-drift" />

      <header className="relative z-10 border-b border-border">
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

      <Section className="relative z-10 py-10 sm:py-14">
        <div className="text-center">
          <Eyebrow className="justify-center">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
            Plans &amp; pricing
          </Eyebrow>
          <h1 className="mt-4 font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Go deeper with your companions
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            Free keeps the conversation going. Upgrade for unlimited messages, scene art,
            offline pings, and a living story you can shape.
          </p>
          {state?.billingMode === "mock" ? (
            <p className="mx-auto mt-3 inline-block rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
              Demo mode — checkout is simulated (no Stripe key configured)
            </p>
          ) : null}
        </div>

        {error ? (
          <p className="mx-auto mt-6 max-w-xl rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {ORDER.map((tier) => {
            const limits = state?.plans?.[tier];
            if (!limits) return null;
            const isCurrent = current === tier;
            const isPaid = tier !== "free";
            const featured = tier === "plus";
            return (
              <div
                key={tier}
                className={`relative flex flex-col rounded-2xl border bg-card p-6 ${
                  featured ? "border-primary/60 shadow-[0_8px_40px_-12px_var(--primary)]" : "border-border"
                }`}
              >
                {featured ? (
                  <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                    Most popular
                  </span>
                ) : null}
                <div className="flex items-center gap-2">
                  {tier === "pro" ? <Crown className="h-4 w-4 text-accent" strokeWidth={1.75} /> : null}
                  <h2 className="font-heading text-xl font-semibold text-foreground">{limits.label}</h2>
                </div>
                <p className="mt-2">
                  <span className="font-heading text-3xl font-semibold text-foreground">
                    ${limits.priceMonthly}
                  </span>
                  <span className="text-sm text-muted-foreground"> / month</span>
                </p>

                <ul className="mt-5 flex-1 space-y-2.5">
                  {featureLines(limits).map((line) => (
                    <li key={line} className="flex items-start gap-2 text-sm text-foreground/90">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
                      {line}
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  {isCurrent ? (
                    isPaid ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled={busy === "cancel"}
                        onClick={downgrade}
                      >
                        {busy === "cancel" ? (
                          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                        ) : null}
                        Cancel plan
                      </Button>
                    ) : (
                      <Button variant="subtle" className="w-full" disabled>
                        Current plan
                      </Button>
                    )
                  ) : isPaid ? (
                    <Button
                      variant={featured ? "primary" : "outline"}
                      className="w-full"
                      disabled={busy === tier}
                      onClick={() => upgrade(tier as "plus" | "pro")}
                    >
                      {busy === tier ? (
                        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                      ) : null}
                      {current === "pro" ? "Switch to " + limits.label : "Upgrade to " + limits.label}
                    </Button>
                  ) : (
                    <Button variant="subtle" className="w-full" disabled>
                      Free forever
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
