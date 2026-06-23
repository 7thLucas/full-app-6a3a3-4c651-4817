import { useEffect, useRef, useState } from "react";
import { Eyebrow, LiveDot } from "~/components/ui";

interface DemoBeat {
  title: string;
  character: string;
  body: string;
}

const DEMO_BEATS: DemoBeat[] = [
  {
    title: "The Tide Returns Something",
    character: "Mara Vance",
    body: "By the time the lantern guttered, the fog had crept past the breakwater and settled over the harbor like a held breath. Mara found the box at the waterline — sealed, salt-bleached, and warm to the touch, as though carried a long way by something that did not want to let go.",
  },
  {
    title: "A Name in the Ledger",
    character: "Elias Crane",
    body: "Elias turned the archive page and stopped. The town that history forgot had a name after all — and beside it, in a careful hand, his own. He had never set foot here. The ink was forty years dry.",
  },
  {
    title: "The Light Answers Back",
    character: "Mara Vance",
    body: "She climbed to the lamp room at the hour no ship should pass, and the beam swung once on its own. Out on the black water, a single answering flicker — patient, deliberate, and far too close to the rocks.",
  },
];

const TYPE_MS = 16; // per character
const HOLD_MS = 3200; // pause on a completed beat

function prefersReduced(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Self-advancing demo of the autonomous engine for the landing hero: beats type
 * themselves in, hold, then the next one writes — conveying "the world keeps
 * moving" before the visitor ever signs up. Honors reduced-motion by showing a
 * single completed beat with no typewriter.
 */
export function LivePreview() {
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [reduced, setReduced] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const isReduced = prefersReduced();
    setReduced(isReduced);
    if (isReduced) {
      setTyped(DEMO_BEATS[0].body);
      return;
    }

    let cancelled = false;
    const clear = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };

    function play(beatIndex: number) {
      if (cancelled) return;
      const beat = DEMO_BEATS[beatIndex];
      setIndex(beatIndex);
      setTyped("");
      let pos = 0;

      const tick = () => {
        if (cancelled) return;
        pos += 1;
        setTyped(beat.body.slice(0, pos));
        if (pos < beat.body.length) {
          timers.current.push(setTimeout(tick, TYPE_MS));
        } else {
          timers.current.push(
            setTimeout(() => play((beatIndex + 1) % DEMO_BEATS.length), HOLD_MS),
          );
        }
      };
      timers.current.push(setTimeout(tick, 400));
    }

    play(0);
    return () => {
      cancelled = true;
      clear();
    };
  }, []);

  const beat = DEMO_BEATS[index];
  const typing = !reduced && typed.length < beat.body.length;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card/80 p-8 backdrop-blur-sm sm:p-10">
      <div className="flex items-center justify-between">
        <Eyebrow>
          <LiveDot /> The engine is writing
        </Eyebrow>
        <span className="font-ui text-xs uppercase tracking-[0.2em] text-muted-foreground">
          live · no message required
        </span>
      </div>

      <div className="mt-6 min-h-[15rem] sm:min-h-[13rem]">
        <h3 className="font-heading text-2xl font-semibold tracking-tight text-balance">
          {beat.title}
        </h3>
        <p className="mt-1 font-ui text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
          {beat.character}
        </p>
        <p
          className={
            "prose-measure mt-4 text-pretty text-[1.05rem] leading-[1.75] text-foreground/85" +
            (typing ? " caret" : "")
          }
        >
          {typed}
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-breathe" />
          <span className="font-ui italic">Generated autonomously</span>
        </div>
        {/* Beat position dots */}
        <div className="flex items-center gap-1.5" aria-hidden>
          {DEMO_BEATS.map((_, i) => (
            <span
              key={i}
              className={
                "h-1.5 rounded-full transition-all duration-500 " +
                (i === index ? "w-5 bg-accent" : "w-1.5 bg-border")
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
