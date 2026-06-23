import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { CheckCircle2, Loader2, MessagesSquare } from "lucide-react";
import { useConfigurables } from "~/modules/configurables";
import { Button, Section } from "~/components/ui";
import { Wordmark } from "~/components/brand";
import { useAuth } from "~/hooks/use-auth";
import { confirmCheckout } from "~/lib/billing.client";

import type { LoaderFunctionArgs } from "react-router";
import { requireUserId } from "~/lib/auth.server";

export function meta() {
  return [{ title: "Driftoria — Welcome to your upgrade" }];
}

export function loader({ request }: LoaderFunctionArgs) {
  requireUserId(request);
  return null;
}

type Status = "working" | "done" | "error";

export default function BillingSuccess() {
  const { config } = useConfigurables();
  const appName = config?.appName ?? "Driftoria";
  const { refresh } = useAuth();
  const [params] = useSearchParams();

  const sessionId = params.get("session_id");
  const mock = params.get("mock") === "1";

  const [status, setStatus] = useState<Status>("working");
  const [plan, setPlan] = useState<string>(params.get("plan") ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        // Mock checkout already applied the plan server-side; live checkout must
        // be confirmed against Stripe via the returned session id.
        if (!mock && sessionId) {
          const res = await confirmCheckout(sessionId);
          setPlan(res.plan);
        }
        await refresh();
        setStatus("done");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not confirm your upgrade");
        setStatus("error");
      }
    };
    void run();
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background font-body text-foreground grain">
      <div className="aurora-backdrop animate-drift" />
      <header className="relative z-10 border-b border-border">
        <Section className="flex items-center justify-between py-5">
          <Wordmark appName={appName} logoUrl={config?.logoUrl} />
        </Section>
      </header>

      <Section className="relative z-10 flex min-h-[60vh] flex-col items-center justify-center text-center">
        {status === "working" ? (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary" strokeWidth={1.5} />
            <p className="mt-4 text-sm text-muted-foreground">Confirming your upgrade…</p>
          </>
        ) : status === "error" ? (
          <>
            <h1 className="font-heading text-2xl font-semibold text-foreground">
              We couldn&apos;t confirm that
            </h1>
            <p className="mt-3 max-w-md text-sm text-destructive">{error}</p>
            <Link to="/billing" className="mt-6">
              <Button variant="outline">Back to plans</Button>
            </Link>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-14 w-14 text-primary" strokeWidth={1.5} />
            <h1 className="mt-5 font-heading text-3xl font-semibold tracking-tight text-foreground">
              You&apos;re on {plan ? plan[0].toUpperCase() + plan.slice(1) : "your new plan"}
            </h1>
            <p className="mt-3 max-w-md text-sm text-muted-foreground">
              Unlimited messages, scene art, and a story you can shape are unlocked. Your
              companions are waiting.
            </p>
            <Link to="/chat" className="mt-7">
              <Button>
                <MessagesSquare className="h-4 w-4" strokeWidth={1.75} />
                Back to your companions
              </Button>
            </Link>
          </>
        )}
      </Section>
    </div>
  );
}
