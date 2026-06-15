import { useVirtualizer } from '@tanstack/react-virtual';
import { Activity, ListTree, PlayCircle, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatTimestampWithMillis, getEventMeta } from './event-utils';

import type { ReplayEvent } from './normaliseEvent';

import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function TimelineTab({
  events,
  loading,
  sessionStartMs,
  onJumpToReplay,
}: {
  events: ReplayEvent[];
  loading: boolean;
  sessionStartMs: number;
  onJumpToReplay: (offsetMs: number) => void;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  // Multi-select event-type filter. Empty set = show everything. Matches
  // the ActivityFeed kind filter mental model so the user only needs to
  // learn one toggle pattern across the app.
  const [activeTypes, setActiveTypes] = useState<Set<number>>(new Set());
  // Cursor for keyboard navigation. -1 = no row focused yet; revealed
  // on first j / k press.
  const [cursorIdx, setCursorIdx] = useState<number>(-1);

  const types = useMemo(() => {
    const set = new Set<number>();
    events.forEach((e) => set.add(e.type));
    return Array.from(set).sort((a, b) => a - b);
  }, [events]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (activeTypes.size > 0 && !activeTypes.has(e.type)) return false;
      if (search) {
        const meta = getEventMeta(e.type);
        const match =
          meta.name.toLowerCase().includes(search.toLowerCase()) ||
          String(e.timestamp).includes(search);
        if (!match) return false;
      }
      return true;
    });
  }, [events, activeTypes, search]);

  const toggleType = (item: number) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  };
  const clearTypes = () => setActiveTypes(new Set());

  // Reset cursor whenever the visible result set changes — the row at
  // `cursorIdx` might no longer exist.

  useEffect(() => {
    setCursorIdx(-1);
  }, [activeTypes, search]);

  // j / k navigation, Enter jumps the replay to that moment. Consistent
  // with the Sessions list — same keys, same Linear/Gmail mental model.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (filtered.length === 0) return;

      const move = (delta: number) => {
        e.preventDefault();
        setCursorIdx((idx) => {
          const next = idx < 0 ? (delta > 0 ? 0 : filtered.length - 1) : idx + delta;
          const clamped = Math.max(0, Math.min(filtered.length - 1, next));
          requestAnimationFrame(() => {
            const el = document.querySelector<HTMLElement>(`[data-timeline-row="${clamped}"]`);
            el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            // Move real DOM focus with the cursor (roving tabindex) so screen
            // readers announce the row; preventScroll avoids fighting the
            // smooth scroll above.
            el?.focus({ preventScroll: true });
          });
          return clamped;
        });
      };

      switch (e.key) {
        case 'j':
        case 'ArrowDown':
          move(1);
          return;
        case 'k':
        case 'ArrowUp':
          move(-1);
          return;
        case 'Enter': {
          if (cursorIdx < 0) return;
          const ev = filtered[cursorIdx];
          if (!ev) return;
          e.preventDefault();
          onJumpToReplay(Math.max(0, ev.timestamp - sessionStartMs));
          return;
        }
        default:
          return;
      }
    };
    globalThis.addEventListener('keydown', handler);
    return () => globalThis.removeEventListener('keydown', handler);
  }, [filtered, cursorIdx, onJumpToReplay, sessionStartMs]);

  if (loading) {
    return (
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-3 min-w-0">
          <Skeleton className="h-9 w-full" />
          <div className="space-y-0.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-full rounded-md" />
            ))}
          </div>
        </aside>
        <Card className="p-0 overflow-hidden min-w-0">
          <div className="px-3 py-2 border-b border-border bg-bg-subtle">
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="p-3 space-y-1.5">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={ListTree}
          title={t('sessionDetail.emptyTimelineTitle')}
          description={t('sessionDetail.emptyTimelineDesc')}
        />
      </Card>
    );
  }

  return (
    <div className="grid gap-3 sm:gap-4 lg:grid-cols-[220px_1fr]">
      {/* Filter region.
          On desktop: full sidebar with type list.
          On mobile/tablet: search bar + horizontal chip rail. */}
      <aside className="space-y-3 min-w-0">
        <Input
          placeholder={t('sessionDetail.filterEventsPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leadingIcon={<Activity />}
          trailingIcon={
            search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label={t('sessionDetail.clearFilter')}
              >
                <X className="size-3.5" />
              </button>
            ) : undefined
          }
        />
        {/* Desktop list */}
        <div className="hidden lg:block">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-[10px] uppercase tracking-wider text-fg-faint font-semibold">
              {t('sessionDetail.type')}
            </span>
            {activeTypes.size > 0 && (
              <button
                type="button"
                onClick={clearTypes}
                className="text-[10px] uppercase tracking-wider text-fg-faint hover:text-fg font-semibold"
              >
                {t('sessionDetail.clear')}
              </button>
            )}
          </div>
          <ul className="space-y-0.5">
            <li>
              <FilterRow
                active={activeTypes.size === 0}
                onClick={clearTypes}
                label={t('sessionDetail.allTypes')}
                count={events.length}
              />
            </li>
            {types.map((item) => {
              const meta = getEventMeta(item);
              const count = events.filter((e) => e.type === item).length;
              const Icon = meta.icon;
              return (
                <li key={item}>
                  <FilterRow
                    active={activeTypes.has(item)}
                    onClick={() => toggleType(item)}
                    label={meta.name}
                    count={count}
                    icon={<Icon className="size-3.5" />}
                  />
                </li>
              );
            })}
          </ul>
        </div>

        {/* Mobile chip rail */}
        <div className="lg:hidden -mx-1 px-1 scroll-rail scroll-rail-fade">
          <div className="flex items-center gap-1.5 pb-0.5">
            <FilterChip
              active={activeTypes.size === 0}
              onClick={clearTypes}
              label={t('sessionDetail.all')}
              count={events.length}
            />
            {types.map((item) => {
              const meta = getEventMeta(item);
              const count = events.filter((e) => e.type === item).length;
              const Icon = meta.icon;
              return (
                <FilterChip
                  key={item}
                  active={activeTypes.has(item)}
                  onClick={() => toggleType(item)}
                  label={meta.name}
                  count={count}
                  icon={<Icon className="size-3" />}
                />
              );
            })}
          </div>
        </div>
      </aside>

      {/* Timeline */}
      <Card className="p-0 overflow-hidden min-w-0">
        <div className="px-3 py-2 border-b border-border bg-bg-subtle text-[11px] uppercase tracking-wider text-fg-faint flex items-center justify-between">
          <span>
            <span className="font-medium text-fg-subtle">{filtered.length}</span>{' '}
            {t('sessionDetail.eventsLabel')}
            {filtered.length !== events.length && (
              <span className="text-fg-faint ml-1">
                {t('sessionDetail.ofTotal', { n: events.length })}
              </span>
            )}
          </span>
        </div>
        <VirtualEventList
          events={filtered}
          sessionStartMs={sessionStartMs}
          onJumpToReplay={onJumpToReplay}
          highlight={search}
          cursorIdx={cursorIdx}
        />
      </Card>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-7 px-2.5 rounded-full border text-[12px] font-medium shrink-0',
        'inline-flex items-center gap-1.5 transition-colors',
        active
          ? 'bg-fg text-bg border-fg'
          : 'bg-surface border-border text-fg-subtle hover:border-border-strong hover:text-fg',
      )}
      aria-pressed={active}
    >
      {icon}
      <span>{label}</span>
      <span
        className={cn(
          'font-mono tabular-nums text-[10px]',
          active ? 'text-bg/80' : 'text-fg-faint',
        )}
      >
        {count}
      </span>
    </button>
  );
}

/**
 * Virtual scroller for the event list. Renders only the rows currently in view
 * so a session with thousands of events stays smooth and bounded in memory.
 */
function VirtualEventList({
  events,
  sessionStartMs,
  onJumpToReplay,
  highlight,
  cursorIdx,
}: {
  events: ReplayEvent[];
  sessionStartMs: number;
  onJumpToReplay: (offsetMs: number) => void;
  highlight?: string;
  cursorIdx?: number;
}) {
  const { t } = useTranslation();
  const parentRef = useRef<HTMLDivElement | null>(null);

  const virtualizer = useVirtualizer({
    count: events.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36, // px per row, matches py-2 + 24px content
    overscan: 12,
  });

  // When the keyboard cursor moves to a row that's been virtualised out
  // of view, scroll the virtualizer to bring it into the globalThis.
  useEffect(() => {
    if (cursorIdx === undefined || cursorIdx < 0) return;
    if (cursorIdx >= events.length) return;
    virtualizer.scrollToIndex(cursorIdx, { align: 'auto' });
  }, [cursorIdx, events.length, virtualizer]);

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-[280px] sm:h-[360px] text-xs text-fg-subtle">
        {t('sessionDetail.noEventsMatchFilters')}
      </div>
    );
  }

  // Roving tabindex: only the cursor row is in the Tab order so keyboard focus
  // and the visual cursor stay aligned. Before any j/k move (cursor < 0 or
  // unset) the first row is the tab stop.
  const rovingIdx = cursorIdx !== undefined && cursorIdx >= 0 ? cursorIdx : 0;

  return (
    <div
      ref={parentRef}
      className="h-[min(60vh,480px)] sm:h-[min(65vh,520px)] overflow-auto"
      data-testid="timeline-virtual-scroll"
    >
      <ol className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const event = events[virtualRow.index];
          const meta = getEventMeta(event.type);
          const Icon = meta.icon;
          const offsetMs = Math.max(0, event.timestamp - sessionStartMs);
          return (
            <li
              key={virtualRow.key}
              className="absolute left-0 right-0 border-b border-border"
              style={{
                top: 0,
                height: virtualRow.size,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <button
                type="button"
                onClick={() => onJumpToReplay(offsetMs)}
                data-timeline-row={virtualRow.index}
                tabIndex={virtualRow.index === rovingIdx ? 0 : -1}
                className={cn(
                  'group flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-bg-muted/50 focus-visible:bg-bg-muted/50 focus-visible:outline-none transition-colors',
                  cursorIdx === virtualRow.index && 'bg-accent-soft/40',
                )}
                title={t('sessionDetail.jumpToPointTitle')}
              >
                <span className="w-10 shrink-0 text-right text-[10px] text-fg-faint font-mono tabular-nums">
                  {virtualRow.index + 1}
                </span>
                <span
                  className={cn(
                    'size-6 shrink-0 rounded-md border flex items-center justify-center',
                    'border-border bg-bg-muted text-fg-subtle',
                  )}
                >
                  <Icon className="size-3" />
                </span>
                <span className="text-xs font-medium text-fg min-w-[110px]">
                  {highlightText(meta.name, highlight)}
                </span>
                <span className="font-mono text-[11px] text-fg-faint flex-1 truncate">
                  {formatTimestampWithMillis(event.timestamp)}
                </span>
                <PlayCircle className="size-3.5 text-fg-faint opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity" />
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * Wraps each case-insensitive match of `query` inside `text` with a `<mark>`
 * tinted via design tokens. Returns plain text when query is empty/missing
 * and falls back to plain text if the regex compilation fails.
 *
 * Uses `split` with a capturing group, then identifies match segments by
 * `toLowerCase()` equality against the trimmed query rather than re-running
 * the regex (which is stateful with the `g` flag and unsafe after split).
 */
function highlightText(text: string, query?: string) {
  if (!query) return text;
  const trimmed = query.trim();
  if (!trimmed) return text;

  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let re: RegExp;
  try {
    re = new RegExp(`(${escaped})`, 'ig');
  } catch {
    return text;
  }

  const needle = trimmed.toLowerCase();
  const parts = text.split(re);
  return parts.map((part, i) =>
    part.toLowerCase() === needle ? (
      <mark
        key={i}
        className="bg-warning-soft text-fg rounded px-0.5"
        data-testid="event-highlight"
      >
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function FilterRow({
  active,
  onClick,
  label,
  count,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors',
        active ? 'bg-bg-muted text-fg' : 'text-fg-subtle hover:bg-bg-muted/60 hover:text-fg',
      )}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      <span className="font-mono tabular-nums text-fg-faint">{count}</span>
    </button>
  );
}
