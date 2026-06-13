import { Check, Copy, Download, FileJson } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import type { ReplayEvent } from './normaliseEvent';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toaster';

export function RawJsonTab({ events, loading }: { events: ReplayEvent[]; loading: boolean }) {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [copied, setCopied] = useState(false);
  const json = useMemo(() => JSON.stringify(events, null, 2), [events]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success(t('sessionDetail.copiedToClipboard'), {
        description: `${events.length} ${t('sessionDetail.eventsLabel')}`,
      });
    } catch {
      toast.error(t('sessionDetail.failedToCopy'));
    }
  };

  const download = () => {
    try {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session-${id ?? 'events'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Defer revocation by a tick so Safari has the URL when it queues the
      // download request.
      setTimeout(() => URL.revokeObjectURL(url), 0);
      toast.success(t('sessionDetail.downloadStarted'), {
        description: `${events.length} ${t('sessionDetail.eventsLabel')} · ${(json.length / 1024).toFixed(1)} kB`,
      });
    } catch {
      toast.error(t('sessionDetail.failedToDownload'));
    }
  };

  if (loading) {
    return (
      <Card className="p-4">
        <Skeleton className="h-96 w-full" />
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={FileJson}
          title={t('sessionDetail.noData')}
          description={t('sessionDetail.noDataDesc')}
        />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-bg-subtle">
        <span className="text-[11px] uppercase tracking-wider text-fg-faint font-semibold truncate">
          {events.length} {t('sessionDetail.eventsLabel')} · {(json.length / 1024).toFixed(1)} kB
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="sm" onClick={download} data-testid="raw-download">
            <Download />
            <span className="hidden xs:inline sm:inline">{t('sessionDetail.download')}</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void copy()} data-testid="raw-copy">
            {copied ? <Check className="text-success" /> : <Copy />}
            {copied ? t('sessionDetail.copied') : t('common.copy')}
          </Button>
        </div>
      </div>
      <ScrollArea className="h-[min(65vh,520px)]">
        <pre className="p-3 sm:p-4 font-mono text-[11px] leading-relaxed text-fg-subtle whitespace-pre-wrap break-all">
          {json}
        </pre>
      </ScrollArea>
    </Card>
  );
}
