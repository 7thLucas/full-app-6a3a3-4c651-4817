import { Link } from "react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { useConfigurables } from "~/modules/configurables";
import { Button, Eyebrow, LiveDot, Section } from "~/components/ui";
import { FeatureIcon, Wordmark } from "~/components/brand";

export function meta() {
  return [
    { title: "Driftoria — Your story lives, even when you don't." },
    {
      name: "description",
      content:
        "Driftoria is an autonomous AI story engine. The narrative continues on its own — characters and plot evolve over time. Step in anytime to shape the tale.",
    },
  ];
}

export default function IndexPage() {
  const { config, loading } = useConfigurables();

  const appName = config?.appName ?? "Driftoria";
  const features = config?.features ?? [];

  return (
    <div className="relative min-h-screen overflow-hidden bg-background font-body text-foreground grain">
      {/* Ambient backdrop */}
      <div className="aurora-backdrop animate-drift" />

      {/* Nav */}
      <header className="relative z-10">
        <Section className="flex items-center justify-between py-6">
          <Wordmark appName={appName} logoUrl={config?.logoUrl} />
          <nav className="flex items-center gap-2">
            <a
              href="#features"
              className="hidden rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline-block"
            >
              {config?.heroSecondaryCta ?? "How it works"}
            </a>
            <Link to="/story">
              <Button size="sm">{config?.heroPrimaryCta ?? "Enter your story"}</Button>
            </Link>
          </nav>
        </Section>
      </header>

      {/* Hero */}
      <Section className="relative z-10 pb-20 pt-16 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow className="justify-center">
            <LiveDot />
            {config?.heroEyebrow ?? "Autonomous AI Story Engine"}
          </Eyebrow>

          <h1 className="mt-7 font-heading text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
            <span className="text-aurora">
              {config?.heroHeadline ?? "A living story world that never stops unfolding."}
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {config?.heroSubheadline ??
              "Driftoria writes itself. Step in anytime to shape the story — you never have to drive it."}
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/story" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto">
                {config?.heroPrimaryCta ?? "Enter your story"}
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
              </Button>
            </Link>
            <a href="#features" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                {config?.heroSecondaryCta ?? "How it works"}
              </Button>
            </a>
          </div>

          <p className="mt-6 font-body text-sm italic text-muted-foreground/80">
            “{config?.tagline ?? "Your story lives, even when you don't."}”
          </p>
        </div>

        {/* Living-world preview card */}
        <div className="mx-auto mt-16 max-w-3xl animate-rise">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card/80 p-8 backdrop-blur-sm sm:p-10">
            <div className="flex items-center justify-between">
              <Eyebrow>
                <LiveDot /> The engine is writing
              </Eyebrow>
              <span className="font-body text-xs uppercase tracking-[0.2em] text-muted-foreground">
                while you were away
              </span>
            </div>
            <h3 className="mt-6 font-heading text-2xl font-semibold tracking-tight">
              The Tide Returns Something
            </h3>
            <p className="prose-measure mt-4 text-[1.05rem] leading-[1.75] text-foreground/85">
              By the time the lantern guttered, the fog had crept past the breakwater and
              settled over the harbor like a held breath. Mara found the box at the
              waterline — sealed, salt-bleached, and warm to the touch, as though it had
              been carried a long way by something that did not want to let go.
            </p>
            <div className="mt-6 flex items-center gap-3 text-sm text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              <span className="font-body italic">
                Generated autonomously — no message required.
              </span>
            </div>
          </div>
        </div>
      </Section>

      {/* Features */}
      <Section id="features" className="relative z-10 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow className="justify-center">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
            What makes it alive
          </Eyebrow>
          <h2 className="mt-5 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            {config?.featuresHeading ?? "Not a chatbot. A world with momentum."}
          </h2>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {(loading && features.length === 0
            ? Array.from({ length: 6 })
            : features
          ).map((feature: any, i: number) => (
            <div
              key={i}
              className="group bg-card p-8 transition-colors duration-300 hover:bg-secondary/60"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <FeatureIcon name={feature?.icon ?? "Sparkles"} className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-heading text-lg font-semibold tracking-tight">
                {feature?.title ?? " "}
              </h3>
              <p className="mt-3 text-[0.95rem] leading-relaxed text-muted-foreground">
                {feature?.description ?? ""}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* Closing CTA */}
      <Section className="relative z-10 pb-28 pt-4">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-secondary/80 to-card p-12 text-center sm:p-16">
          <div className="aurora-backdrop opacity-60" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              Begin a story that keeps going without you.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
              Set the pace, meet your cast, and let the world drift forward. Return whenever
              you like — the story will be waiting, further along than you left it.
            </p>
            <Link to="/story" className="mt-9 inline-block">
              <Button size="lg">
                {config?.heroPrimaryCta ?? "Enter your story"}
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
              </Button>
            </Link>
          </div>
        </div>
      </Section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border">
        <Section className="flex flex-col items-center justify-between gap-4 py-8 sm:flex-row">
          <Wordmark appName={appName} logoUrl={config?.logoUrl} />
          <p className="text-sm text-muted-foreground">
            {config?.footerText ?? "A living story, powered by AI and shaped by you."}
          </p>
        </Section>
      </footer>
    </div>
  );
}
