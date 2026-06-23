import { Link, useNavigate } from "react-router";
import { Compass, Crown, LogOut, MessagesSquare, User } from "lucide-react";
import { useConfigurables } from "~/modules/configurables";
import { Button, Eyebrow, Section } from "~/components/ui";
import { Wordmark } from "~/components/brand";
import { useAuth } from "~/hooks/use-auth";

import type { LoaderFunctionArgs } from "react-router";
import { requireUserId } from "~/lib/auth.server";

export function meta() {
  return [{ title: "Driftoria — Your profile" }];
}

export function loader({ request }: LoaderFunctionArgs) {
  requireUserId(request);
  return null;
}

export default function Profile() {
  const { config } = useConfigurables();
  const appName = config?.appName ?? "Driftoria";
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
          <User className="h-3.5 w-3.5" strokeWidth={1.75} />
          Your profile
        </Eyebrow>

        <div className="mt-6 flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 font-heading text-2xl font-semibold text-primary">
            {(user?.name ?? "?").slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="truncate font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {user?.name ?? "Your profile"}
            </h1>
            {user?.email ? (
              <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-8 max-w-md space-y-2">
          <Button
            variant="outline"
            size="lg"
            className="w-full justify-start"
            onClick={() => navigate("/chat/history")}
          >
            <MessagesSquare className="h-4 w-4" strokeWidth={1.75} />
            My chats
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full justify-start"
            onClick={() => navigate("/chat")}
          >
            <Compass className="h-4 w-4" strokeWidth={1.75} />
            Explore companions
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full justify-between"
            onClick={() => navigate("/billing")}
          >
            <span className="flex items-center gap-2">
              <Crown className="h-4 w-4" strokeWidth={1.75} />
              Plans &amp; billing
            </span>
            <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium capitalize text-primary">
              {user?.plan ?? "free"}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="w-full justify-start text-muted-foreground"
            onClick={async () => {
              await logout();
              navigate("/");
            }}
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
            Sign out
          </Button>
        </div>
      </Section>
    </div>
  );
}
