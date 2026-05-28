import "rrweb-player/dist/style.css";

import { AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ReplayPlayerProps {
  events: unknown[];
  className?: string;
  /** Offset in ms from session start to seek to immediately after mount. */
  startTime?: number;
  /** Fired whenever the player's playhead moves. */
  onTimeUpdate?: (currentTimeMs: number) => void;
}

interface RrwebPlayerInstance {
  $destroy?: () => void;
  goto?: (timeOffset: number, play?: boolean) => void;
  play?: () => void;
  pause?: () => void;
  toggle?: () => void;
  getMetaData?: () => { totalTime: number };
  getCurrentTime?: () => number;
  addEventListener?: (
    event: string,
    cb: (payload: { payload: unknown }) => void,
  ) => void;
}

interface RrwebPlayerCtor {
  new (opts: {
    target: HTMLElement;
    props: Record<string, unknown>;
  }): RrwebPlayerInstance;
}

interface RrwebShapedEvent {
  type?: number;
  data?: unknown;
}

/**
 * Validates that the supplied event list looks like an rrweb session that the
 * player can actually replay. The bare minimum is one Meta (type 4) followed
 * by one FullSnapshot (type 2) with a non-empty node tree.
 */
function getReplayProblem(events: unknown[]): string | null {
  if (events.length < 2) return "no events to replay";
  const meta = events.find((e) => (e as RrwebShapedEvent)?.type === 4);
  const snapshot = events.find((e) => (e as RrwebShapedEvent)?.type === 2);
  if (!meta) return "missing Meta event";
  if (!snapshot) return "missing FullSnapshot event";

  const data = (snapshot as RrwebShapedEvent).data as
    | { node?: { childNodes?: unknown[] } }
    | undefined;
  const nodes = data?.node?.childNodes;
  if (!nodes || nodes.length === 0) {
    return "FullSnapshot has no DOM tree";
  }
  return null;
}

export function ReplayPlayer({
  events,
  className,
  startTime,
  onTimeUpdate,
}: ReplayPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<RrwebPlayerInstance | null>(null);
  // Most recent playhead position. Updated by the rrweb `ui-update-
  // current-time` event so keyboard handlers can seek relative to it
  // without needing a re-render on every tick.
  const currentTimeRef = useRef<number>(0);
  const [error, setError] = useState<string | null>(null);

  const validationError = useMemo(() => getReplayProblem(events), [events]);

  // Keep the latest callback in a ref so the effect doesn't tear down the
  // player every time the parent re-renders with a new arrow function.
  const onTimeUpdateRef = useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;

  useEffect(() => {
    if (validationError) return;
    let disposed = false;

    setError(null);

    void import("rrweb-player")
      .then(({ default: rrwebPlayer }) => {
        if (disposed || !containerRef.current) return;
        // Clear any previous mount before re-rendering
        containerRef.current.innerHTML = "";
        try {
          const instance = new (rrwebPlayer as unknown as RrwebPlayerCtor)({
            target: containerRef.current,
            props: {
              events,
              width: containerRef.current.clientWidth || 800,
              height: 420,
              autoPlay: false,
              showController: true,
              mouseTail: { strokeStyle: "#3b82f6", duration: 600 },
            },
          });
          instanceRef.current = instance;

          // Seek to a starting offset (e.g. shared deep link `?t=12345`).
          // `goto` is a noop before the player is initialized, so defer with
          // a microtask to give rrweb-player time to wire up its internals.
          if (startTime && startTime > 0 && instance?.goto) {
            queueMicrotask(() => {
              try {
                instance?.goto?.(startTime, false);
              } catch {
                /* ignore — invalid offsets just stay at the start */
              }
            });
          }

          // Track playhead so callers can build "share link to current time"
          // and so keyboard controls can seek relative to the current moment.
          if (instance?.addEventListener) {
            instance.addEventListener("ui-update-current-time", (e) => {
              const payload = e?.payload;
              if (typeof payload === "number") {
                currentTimeRef.current = payload;
                onTimeUpdateRef.current?.(payload);
              }
            });
          }
        } catch (err) {
          setError(toErrorMessage(err));
        }
      })
      .catch((err) => {
        if (!disposed) setError(toErrorMessage(err));
      });

    return () => {
      disposed = true;
      try {
        instanceRef.current?.$destroy?.();
      } catch {
        /* the player throws on double-destroy in some versions */
      }
      instanceRef.current = null;
    };
    // `startTime` intentionally NOT in deps — initial seek only here.
    // A second effect (below) handles live re-seeking when the parent
    // changes `startTime` (e.g. Timeline → Jump to replay).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, validationError]);

  // Re-seek when `startTime` changes after mount. This drives the
  // Timeline → Replay jump flow: clicking an event updates `?t=` which
  // updates the prop which lands the playhead at the right offset.
  useEffect(() => {
    if (validationError) return;
    if (startTime === undefined || startTime < 0) return;
    const instance = instanceRef.current;
    if (!instance?.goto) return;
    try {
      instance.goto(startTime, false);
    } catch {
      /* ignore — out-of-range offsets are a noop */
    }
  }, [startTime, validationError]);

  if (validationError) {
    return (
      <ReplayMessage
        title="Replay unavailable"
        description={`This session can't be replayed (${validationError}).`}
      />
    );
  }

  if (error) {
    return <ReplayMessage title="Replay failed" description={error} danger />;
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const instance = instanceRef.current;
    if (!instance) return;

    // Don't fight inputs nested anywhere inside the player UI
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable)
    ) {
      return;
    }

    const seekBy = (deltaMs: number) => {
      const next = Math.max(0, currentTimeRef.current + deltaMs);
      try {
        instance.goto?.(next, false);
      } catch {
        /* ignore */
      }
    };

    switch (e.key) {
      case " ":
      case "k":
      case "K":
        e.preventDefault();
        try {
          instance.toggle?.();
        } catch {
          /* older builds: fall back to play() */
          instance.play?.();
        }
        return;
      case "ArrowLeft":
        e.preventDefault();
        seekBy(-5000);
        return;
      case "ArrowRight":
        e.preventDefault();
        seekBy(5000);
        return;
      case "j":
      case "J":
        e.preventDefault();
        seekBy(-10000);
        return;
      case "l":
      case "L":
        e.preventDefault();
        seekBy(10000);
        return;
      case "Home":
        e.preventDefault();
        try {
          instance.goto?.(0, false);
        } catch {
          /* ignore */
        }
        return;
      default:
        return;
    }
  };

  return (
    <Card
      className={cn("overflow-hidden p-3 [&_.rr-player]:mx-auto", className)}
    >
      <div
        ref={containerRef}
        // The wrapper takes the keydown — rrweb-player itself doesn't
        // bind any. Focusable via tab; clicking the player implicitly
        // focuses it because tabIndex={0} on an interactive parent makes
        // mousedown move focus in.
        tabIndex={0}
        onKeyDown={handleKeyDown}
        role="application"
        aria-label="Session replay player. Use space to play/pause, arrows to seek, J/L for 10s, Home to restart."
        className="rrweb-mount min-h-[440px] w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        data-testid="rrweb-mount"
      />
    </Card>
  );
}

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "The replay player crashed unexpectedly.";
}

function ReplayMessage({
  title,
  description,
  danger,
}: {
  title: string;
  description?: string;
  danger?: boolean;
}) {
  return (
    <Card>
      <div className="flex flex-col items-center text-center py-12 px-6">
        <div
          className={cn(
            "size-10 rounded-full flex items-center justify-center mb-3",
            danger
              ? "bg-danger-soft text-danger"
              : "bg-bg-muted text-fg-subtle",
          )}
        >
          <AlertTriangle className="size-5" />
        </div>
        <h3 className="text-sm font-semibold text-fg mb-1">{title}</h3>
        {description && (
          <p className="text-xs text-fg-subtle max-w-md">{description}</p>
        )}
      </div>
    </Card>
  );
}
