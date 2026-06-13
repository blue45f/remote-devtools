import { Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { getEventMeta } from './event-utils';

import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

export function OverviewTab({
  loading,
  counts,
  total,
}: {
  loading: boolean;
  counts: [number, number][];
  total: number;
}) {
  const { t } = useTranslation();
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <Skeleton className="size-7 rounded-md" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-5 w-10" />
            </div>
            <Skeleton className="h-1 w-full rounded-full" />
            <Skeleton className="mt-1.5 h-3 w-16" />
          </Card>
        ))}
      </div>
    );
  }

  if (total === 0) {
    return (
      <Card>
        <EmptyState
          icon={Activity}
          title={t('sessionDetail.noEventsTitle')}
          description={t('sessionDetail.noEventsDesc')}
        />
      </Card>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {counts.map(([type, count]) => {
        const meta = getEventMeta(type);
        const Icon = meta.icon;
        const percentage = (count / total) * 100;
        return (
          <Card key={type} className="p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="size-7 rounded-md bg-bg-muted border border-border flex items-center justify-center">
                <Icon className="size-3.5 text-fg-subtle" />
              </div>
              <span className="text-sm font-medium text-fg flex-1">{meta.name}</span>
              <span className="font-mono text-base font-semibold text-fg tabular-nums">
                {count.toLocaleString()}
              </span>
            </div>
            <div className="h-1 w-full rounded-full bg-bg-muted overflow-hidden">
              <div
                className="h-full bg-fg rounded-full transition-[width] duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="mt-1.5 text-[11px] text-fg-faint tabular-nums">
              {t('sessionDetail.percentOfTotal', { value: percentage.toFixed(1) })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
