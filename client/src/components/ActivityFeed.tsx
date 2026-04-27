import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Clapperboard,
  Sparkles,
  Ticket,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { formatTimeAgo, shortHash } from "@/lib/format";
import { cn } from "@/lib/utils";

type ActivityKind = "session" | "ticket" | "error" | "join";

interface ActivityEntry {
  id: string;
  kind: ActivityKind;
  title: string;
  subtitle?: string;
  at: string;
  device?: string;
  sessionId?: number;
}

const KIND_META: Record<
  ActivityKind,
  { icon: LucideIcon; tone: string; label: string }
> = {
  session: {
    icon: Clapperboard,
    tone: "bg-accent-soft text-accent-soft-fg",
    label: "Session",
  },
  ticket: {
    icon: Ticket,
    tone: "bg-warning-soft text-warning",
    label: "Ticket",
  },
  error: {
    icon: AlertCircle,
    tone: "bg-danger-soft text-danger",
    label: "Error",
  },
  join: {
    icon: UserPlus,
    tone: "bg-success-soft text-success",
    label: "Join",
  },
};

interface ActivityFeedProps {
  /** Polling interval in ms. Set to 0 to disable polling. */
  pollMs?: number;
  /** Maximum entries to render. */
  limit?: number;
  className?: string;
}

interface ActivityPage {
  rows: ActivityEntry[];
  nextCursor: string | null;
}

export function ActivityFeed({
  pollMs = 8_000,
  limit = 12,
  className,
}: ActivityFeedProps) {
  // Top-of-feed: polling query (back-compat array shape).
  const { data, isLoading, error } = useQuery({
    queryKey: ["activity-feed", limit],
    queryFn: () =>
      apiFetch<ActivityEntry[]>(`/api/activity/feed?limit=${limit}`),
    refetchInterval: pollMs > 0 ? pollMs : false,
  });

  // Older entries appended on demand. We don't fold them into `useInfiniteQuery`
  // because polling on infinite queries refetches every loaded page, which
  // causes visible flicker on the dashboard.
  const top = (data ?? []).slice(0, limit);
  const [olderPages, setOlderPages] = useState<ActivityPage[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [endReached, setEndReached] = useState(false);

  const oldestTopAt = top[top.length - 1]?.at;
  const lastCursor = olderPages.at(-1)?.nextCursor ?? oldestTopAt ?? null;

  async function loadMore() {
    if (!lastCursor || loadingMore || endReached) return;
    setLoadingMore(true);
    try {
      const page = await apiFetch<ActivityPage>(
        `/api/activity/feed?limit=${limit}&before=${encodeURIComponent(lastCursor)}`,
      );
      setOlderPages((prev) => [...prev, page]);
      if (!page.nextCursor || page.rows.length === 0) {
        setEndReached(true);
      }
    } finally {
      setLoadingMore(false);
    }
  }

  const items = [...top, ...olderPages.flatMap((p) => p.rows)];

  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-fg flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-fg-faint" />
            Recent activity
          </h2>
          <p className="text-xs text-fg-subtle mt-0.5">
            Streaming session and ticket events from across the org.
          </p>
        </div>
        <LiveDot active={pollMs > 0} />
      </div>

      {error ? (
        <EmptyState
          icon={AlertCircle}
          title="Could not load activity"
          description="Try again in a moment, or enable demo mode."
        />
      ) : isLoading ? (
        <FeedSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Quiet on this front"
          description="New activity will appear here in real time."
        />
      ) : (
        <>
          <ol className="relative space-y-0">
            {/* spine */}
            <span
              aria-hidden
              className="absolute left-[15px] top-1 bottom-1 w-px bg-border"
            />
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <FeedRow key={item.id} item={item} />
              ))}
            </AnimatePresence>
          </ol>
          {!endReached && lastCursor && (
            <div className="flex justify-center mt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="text-xs"
              >
                {loadingMore ? "Loading…" : "Load older"}
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function FeedRow({ item }: { item: ActivityEntry }) {
  const meta = KIND_META[item.kind] ?? KIND_META.session;
  const Icon = meta.icon;

  const content = (
    <div className="relative flex items-start gap-3 py-2.5 group">
      <span
        className={cn(
          "relative z-10 size-8 shrink-0 rounded-full flex items-center justify-center border border-border bg-surface",
          meta.tone,
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-fg truncate">{item.title}</span>
        </div>
        {item.subtitle && (
          <p className="text-[11px] text-fg-subtle truncate font-mono mt-0.5">
            {item.subtitle}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1 text-[10px] uppercase tracking-wider text-fg-faint">
          <span className="font-semibold">{meta.label}</span>
          {item.device && (
            <>
              <span aria-hidden>·</span>
              <span className="font-mono normal-case tracking-normal">
                {shortHash(item.device, 10)}
              </span>
            </>
          )}
        </div>
      </div>
      <span className="text-[10px] text-fg-faint whitespace-nowrap pt-1">
        {formatTimeAgo(item.at)}
      </span>
    </div>
  );

  return (
    // Note: no `layout` prop. Layout animations on a long polling list cause
    // visible flicker as items reflow on each refetch. Plain enter/exit is
    // already enough since react-query keeps stable item identity.
    <motion.li
      initial={{ opacity: 0, height: 0, y: -4 }}
      animate={{ opacity: 1, height: "auto", y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="border-b border-border last:border-0 overflow-hidden"
    >
      {item.sessionId ? (
        <Link
          to={`/sessions/${item.sessionId}`}
          className="block hover:bg-bg-muted/40 -mx-2 px-2 rounded-md transition-colors"
        >
          {content}
        </Link>
      ) : (
        content
      )}
    </motion.li>
  );
}

function LiveDot({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold",
        active ? "text-success" : "text-fg-faint",
      )}
    >
      <span className="relative flex size-2">
        {active && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-50 animate-ping" />
        )}
        <span
          className={cn(
            "relative inline-flex size-2 rounded-full",
            active ? "bg-success" : "bg-fg-faint",
          )}
        />
      </span>
      {active ? "Live" : "Paused"}
    </span>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 py-1.5">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-2.5 w-32" />
          </div>
          <Skeleton className="h-2.5 w-12" />
        </div>
      ))}
    </div>
  );
}
