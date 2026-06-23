import { useEffect, useState } from "react";
import { Link } from "react-router";
import { BarChart3, Crown, Loader2, TrendingUp, Users } from "lucide-react";
import { useConfigurables } from "~/modules/configurables";
import { Button, Eyebrow, Section } from "~/components/ui";
import { Wordmark } from "~/components/brand";
import { useAuth } from "~/hooks/use-auth";
import { fetchAdminBillingStats, type AdminBillingStats } from "~/lib/billing.client";

import type { LoaderFunctionArgs } from "react-router";
import { requireUserId } from "~/lib/auth.server";

export function meta() {
  return [{ title: "Driftoria — Billing analytics" }];
}

export function loader({ request }: LoaderFunctionArgs) {
  requireUserId(request);
  return null;
}

function Stat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="font-ui text-xs uppercase tracking-[0.2em]">{label}</span>
      </div>
      <p className="mt-3 font-heading text-3xl font-semibold text-foreground">{value}</p>
      {sub ? <p className="mt-1 text-sm text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export default function AdminBilling() {
  const { config } = useConfigurables();
  const appName = config?.appName ?? "Driftoria";
  const { user, loaded } = useAuth();
  const isAdmin = Boolean(user?.roles?.includes("admin"));

  const [stats, setStats] = useState<AdminBillingStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    fetchAdminBillingStats()
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load stats"));
  }, [isAdmin]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background font-body text-foreground grain pb-24 md:pb-0">
      <div className="aurora-backdrop animate-drift" />

      <header className="relative z-10 border-b border-border">
        <Section className="flex items-center justify-between py-5">
          <Wordmark appName={appName} logoUrl={config?.logoUrl} />
          <Link to="/chat">
            <Button variant="ghost" size="sm">
              Back to app
            </Button>
          </Link>
        </Section>
      </header>

      <Section className="relative z-10 py-10">
        <Eyebrow>
          <BarChart3 className="h-3.5 w-3.5" strokeWidth={1.75} />
          Billing analytics
        </Eyebrow>

        {loaded && !isAdmin ? (
          <p className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Admins only. You don&apos;t have access to this page.
          </p>
        ) : error ? (
          <p className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : !stats ? (
          <div className="mt-16 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" strokeWidth={1.5} />
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                icon={<TrendingUp className="h-4 w-4" strokeWidth={1.75} />}
                label="MRR"
                value={`$${stats.mrr.toLocaleString()}`}
                sub={`${stats.currency} / month`}
              />
              <Stat
                icon={<Crown className="h-4 w-4" strokeWidth={1.75} />}
                label="Paid subscribers"
                value={String(stats.paidUsers)}
                sub={`${(stats.conversionRate * 100).toFixed(1)}% of ${stats.totalUsers} users`}
              />
              <Stat
                icon={<Users className="h-4 w-4" strokeWidth={1.75} />}
                label="Total users"
                value={String(stats.totalUsers)}
                sub={`${stats.planCounts.free} on free`}
              />
              <Stat
                icon={<BarChart3 className="h-4 w-4" strokeWidth={1.75} />}
                label="Messages today"
                value={stats.usageToday.messages.toLocaleString()}
                sub={`${stats.usageToday.images} images · ${stats.usageToday.beats} beats`}
              />
            </div>

            {/* Plan distribution */}
            <div className="mt-8 rounded-2xl border border-border bg-card p-6">
              <h2 className="font-heading text-lg font-semibold text-foreground">Plan distribution</h2>
              <div className="mt-4 space-y-3">
                {(["free", "plus", "pro"] as const).map((tier) => {
                  const count = stats.planCounts[tier];
                  const pct = stats.totalUsers ? (count / stats.totalUsers) * 100 : 0;
                  return (
                    <div key={tier}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="capitalize text-foreground">
                          {stats.plans[tier]?.label ?? tier}
                          <span className="ml-2 text-muted-foreground">
                            ${stats.plans[tier]?.priceMonthly}/mo
                          </span>
                        </span>
                        <span className="text-muted-foreground">
                          {count} · {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
                        <div
                          className={tier === "free" ? "h-full bg-muted-foreground/40" : "h-full bg-primary"}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent upgrades */}
            <div className="mt-6 rounded-2xl border border-border bg-card p-6">
              <h2 className="font-heading text-lg font-semibold text-foreground">Recent subscribers</h2>
              {stats.recentUpgrades.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">No paid subscribers yet.</p>
              ) : (
                <ul className="mt-4 divide-y divide-border">
                  {stats.recentUpgrades.map((u) => (
                    <li key={u.email} className="flex items-center justify-between py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{u.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      </div>
                      <span className="ml-3 shrink-0 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium capitalize text-primary">
                        {u.plan}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </Section>
    </div>
  );
}
