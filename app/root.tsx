import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  isRouteErrorResponse,
  useRouteError,
} from "react-router";
import type { LinksFunction } from "react-router";
import stylesheet from "~/tailwind.css?url";
import { useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { ConfigurablesProvider, ConfigurablesCSSBridge } from "~/modules/configurables";
import { MobileNav } from "~/components/mobile-nav";
import { GlobalError } from "./error";

function ErrorReporter({ error }: { error: any }) {
  useEffect(() => {
    if (typeof window !== "undefined" && window.parent !== window) {
      const errorMsg = error instanceof Error ? error.message : String(error || "Unknown error");
      window.parent.postMessage(
        {
          type: "RUNTIME_ERROR",
          message: errorMsg,
        },
        "*"
      );
    }
  }, [error]);

  return null;
}

export function ErrorBoundary() {
  const error = useRouteError();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = "__qb_error_reloads";
    const count = parseInt(sessionStorage.getItem(key) || "0", 10);
    if (count < 2) {
      sessionStorage.setItem(key, String(count + 1));
      window.location.reload();
    }
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <title>Oops! An Error Occurred</title>
        <Links />
      </head>
      <body suppressHydrationWarning>
        <ErrorReporter error={error} />
        <GlobalError error={error} />
        <Scripts />
      </body>
    </html>
  );
}

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
  { rel: "icon", type: "image/png", href: "/favicon.png" },
  { rel: "apple-touch-icon", href: "/favicon.png" },
];

/**
 * RouteChangeReporter - Reports route changes to parent window via postMessage.
 * This enables the deck-app preview to detect when pages redirect to other routes.
 */
function RouteChangeReporter() {
  const location = useLocation();

  useEffect(() => {
    // Only send if we're in an iframe (embedded in deck-app preview)
    if (typeof window !== "undefined" && window.parent !== window) {
      window.parent.postMessage(
        {
          type: "qb-route-change",
          pathname: location.pathname,
        },
        "*",
      );
    }
  }, [location.pathname]);

  return null;
}

/**
 * Re-plays a small fade+rise each time the path changes, so navigating
 * between pages reads as a deliberate transition rather than a hard cut.
 * Keyed on pathname only (not search) to avoid remounting on in-page param
 * changes like filters.
 */
function RouteFade({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="animate-route">
      {children}
    </div>
  );
}

export default function App() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body suppressHydrationWarning>
        <RouteChangeReporter />
        <ConfigurablesProvider>
          <ConfigurablesCSSBridge />
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <RouteFade>
              <Outlet />
            </RouteFade>
            <MobileNav />
          </ThemeProvider>
        </ConfigurablesProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
