import 'rrweb-player/dist/style.css';

import { AlertTriangle } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { TFunction } from 'i18next';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ReplayPlayerProps {
  events: unknown[];
  className?: string;
  /** Offset in ms from session start to seek to immediately after mount. */
  startTime?: number;
  /** Playback speed multiplier — applied on init and any time it changes. */
  speed?: number;
  /** Whether the player should fast-forward through idle stretches. */
  skipInactive?: boolean;
  /**
   * Restart trigger — when this value changes (any change), the player
   * seeks back to t=0. Parent maintains a monotonic counter; the player
   * doesn't care about the value, only its identity change.
   */
  restartToken?: number;
  /** Fired whenever the player's playhead moves. */
  onTimeUpdate?: (currentTimeMs: number) => void;
}

interface RrwebPlayerInstance {
  $destroy?: () => void;
  goto?: (timeOffset: number, play?: boolean) => void;
  play?: () => void;
  pause?: () => void;
  toggle?: () => void;
  setSpeed?: (speed: number) => void;
  setConfig?: (config: { speed?: number; skipInactive?: boolean }) => void;
  getMetaData?: () => { totalTime: number };
  getCurrentTime?: () => number;
  addEventListener?: (event: string, cb: (payload: { payload: unknown }) => void) => void;
}

interface RrwebPlayerCtor {
  new (opts: { target: HTMLElement; props: Record<string, unknown> }): RrwebPlayerInstance;
}

interface RrwebShapedEvent {
  type?: number;
  data?: unknown;
}

/**
 * Validates that the supplied event list looks like an rrweb session that the
 * player can actually replay. The bare minimum is one Meta (type 4) followed
 * by one FullSnapshot (type 2) with a non-empty node tree.
 *
 * Returns a translation KEY for the reason (resolved at render via `t`) so the
 * diagnostic copy is localised alongside the surrounding message.
 */
function getReplayProblem(events: unknown[]): string | null {
  if (events.length < 2) return 'replay.problemNoEvents';
  const meta = events.find((e) => (e as RrwebShapedEvent)?.type === 4);
  const snapshot = events.find((e) => (e as RrwebShapedEvent)?.type === 2);
  if (!meta) return 'replay.problemMissingMeta';
  if (!snapshot) return 'replay.problemMissingSnapshot';

  const data = (snapshot as RrwebShapedEvent).data as
    | { node?: { childNodes?: unknown[] } }
    | undefined;
  const nodes = data?.node?.childNodes;
  if (!nodes || nodes.length === 0) {
    return 'replay.problemNoDomTree';
  }
  return null;
}

export function ReplayPlayer({
  events,
  className,
  startTime,
  speed,
  skipInactive,
  restartToken,
  onTimeUpdate,
}: ReplayPlayerProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<RrwebPlayerInstance | null>(null);
  // Most recent playhead position. Updated by the rrweb `ui-update-
  // current-time` event so keyboard handlers can seek relative to it
  // without needing a re-render on every tick.
  const currentTimeRef = useRef<number>(0);
  const [error, setError] = useState<string | null>(null);

  const validationError = useMemo(() => getReplayProblem(events), [events]);

  // Keep the latest callback in a ref so the effect doesn't tear down the
  // player every time the parent re-renders with a new arrow function. The
  // render-phase write is the documented "latest value in a ref" pattern.
  const onTimeUpdateRef = useRef(onTimeUpdate);
  // eslint-disable-next-line react-hooks/refs
  onTimeUpdateRef.current = onTimeUpdate;

  // Intentional: clear the prior error before (re)loading the rrweb player.

  useEffect(() => {
    if (validationError) return;
    let disposed = false;

    setError(null);

    void import('rrweb-player')
      .then(({ default: rrwebPlayer }) => {
        if (disposed || !containerRef.current) return;
        // Clear any previous mount before re-rendering
        containerRef.current.innerHTML = '';
        try {
          const instance = new (rrwebPlayer as unknown as RrwebPlayerCtor)({
            target: containerRef.current,
            props: {
              events,
              width: containerRef.current.clientWidth || 800,
              height: 420,
              autoPlay: false,
              showController: true,
              speed: speed ?? 1,
              speedOption: [0.5, 1, 2, 4],
              skipInactive: skipInactive ?? false,
              mouseTail: { strokeStyle: '#3b82f6', duration: 600 },
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
            instance.addEventListener('ui-update-current-time', (e) => {
              const payload = e?.payload;
              if (typeof payload === 'number') {
                currentTimeRef.current = payload;
                onTimeUpdateRef.current?.(payload);
              }
            });
          }
        } catch (err) {
          setError(toErrorMessage(err, t));
        }
      })
      .catch((err) => {
        if (!disposed) setError(toErrorMessage(err, t));
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
  }, [events, validationError, t]);

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

  // Apply playback-speed changes coming from the parent toolbar. rrweb-player
  // exposes setSpeed since 1.0; older builds silently no-op.
  useEffect(() => {
    if (validationError) return;
    if (speed === undefined) return;
    const instance = instanceRef.current;
    if (!instance?.setSpeed) return;
    try {
      instance.setSpeed(speed);
    } catch {
      /* ignore — invalid speeds don't break the player */
    }
  }, [speed, validationError]);

  // Apply skip-inactive toggle. setConfig is the live-update path; the
  // initial value is also set on the props at construction so refreshes
  // honour the user's last choice without flicker.
  useEffect(() => {
    if (validationError) return;
    if (skipInactive === undefined) return;
    const instance = instanceRef.current;
    if (!instance?.setConfig) return;
    try {
      instance.setConfig({ skipInactive });
    } catch {
      /* ignore — older builds without setConfig */
    }
  }, [skipInactive, validationError]);

  // Restart trigger — any change to restartToken seeks back to t=0. The
  // initial undefined / 0 mount is ignored so we don't restart the player
  // before the user has had a chance to do anything.
  const hasRestartedRef = useRef(false);
  useEffect(() => {
    if (validationError) return;
    if (restartToken === undefined) return;
    if (!hasRestartedRef.current) {
      hasRestartedRef.current = true;
      return;
    }
    const instance = instanceRef.current;
    if (!instance?.goto) return;
    try {
      instance.goto(0, false);
      currentTimeRef.current = 0;
    } catch {
      /* ignore */
    }
  }, [restartToken, validationError]);

  if (validationError) {
    return (
      <ReplayMessage
        title={t('replay.unavailableTitle')}
        description={t('replay.unavailableDescription', { reason: t(validationError) })}
      />
    );
  }

  if (error) {
    return <ReplayMessage title={t('replay.failedTitle')} description={error} danger />;
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const instance = instanceRef.current;
    if (!instance) return;

    // Don't fight inputs nested anywhere inside the player UI
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
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
      case ' ':
      case 'k':
      case 'K':
        e.preventDefault();
        try {
          instance.toggle?.();
        } catch {
          /* older builds: fall back to play() */
          instance.play?.();
        }
        return;
      case 'ArrowLeft':
        e.preventDefault();
        seekBy(-5000);
        return;
      case 'ArrowRight':
        e.preventDefault();
        seekBy(5000);
        return;
      case 'j':
      case 'J':
        e.preventDefault();
        seekBy(-10000);
        return;
      case 'l':
      case 'L':
        e.preventDefault();
        seekBy(10000);
        return;
      case 'Home':
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
    <Card className={cn('overflow-hidden p-3 [&_.rr-player]:mx-auto', className)}>
      {/* role="application" + aria-label + keyboard handler make this a
          deliberate interactive widget; jsx-a11y's heuristic still treats the
          div as non-interactive (false positive). */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        ref={containerRef}
        // The wrapper takes the keydown — rrweb-player itself doesn't bind any.
        // Focusable via tab; clicking the player implicitly focuses it because
        // tabIndex={0} on an interactive parent makes mousedown move focus in.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        onKeyDown={handleKeyDown}
        role="application"
        aria-label={t('replay.playerAriaLabel')}
        className="rrweb-mount min-h-[440px] w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        data-testid="rrweb-mount"
      />
    </Card>
  );
}

function toErrorMessage(err: unknown, t: TFunction): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return t('replay.crashed');
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
            'size-10 rounded-full flex items-center justify-center mb-3',
            danger ? 'bg-danger-soft text-danger' : 'bg-bg-muted text-fg-subtle',
          )}
        >
          <AlertTriangle className="size-5" />
        </div>
        <h3 className="text-sm font-semibold text-fg mb-1">{title}</h3>
        {description && <p className="text-xs text-fg-subtle max-w-md">{description}</p>}
      </div>
    </Card>
  );
}
