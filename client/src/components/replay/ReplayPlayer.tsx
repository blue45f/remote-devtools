import "rrweb-player/dist/style.css";

import { AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ReplayPlayerProps {
  events: unknown[];
  className?: string;
}

interface RrwebPlayerCtor {
  new (opts: { target: HTMLElement; props: Record<string, unknown> }): {
    $destroy?: () => void;
  };
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

export function ReplayPlayer({ events, className }: ReplayPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validationError = useMemo(() => getReplayProblem(events), [events]);

  useEffect(() => {
    if (validationError) return;
    let disposed = false;
    let instance: { $destroy?: () => void } | null = null;

    setError(null);

    void import("rrweb-player")
      .then(({ default: rrwebPlayer }) => {
        if (disposed || !containerRef.current) return;
        // Clear any previous mount before re-rendering
        containerRef.current.innerHTML = "";
        try {
          instance = new (rrwebPlayer as unknown as RrwebPlayerCtor)({
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
        instance?.$destroy?.();
      } catch {
        /* the player throws on double-destroy in some versions */
      }
    };
  }, [events, validationError]);

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

  return (
    <Card
      className={cn("overflow-hidden p-3 [&_.rr-player]:mx-auto", className)}
    >
      <div
        ref={containerRef}
        className="rrweb-mount min-h-[440px] w-full"
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
