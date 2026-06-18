import { Download, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type {
  RemoteActivity,
  RemoteEvent,
  RemoteEventLevel,
  RemoteSession,
  RemoteSessionStatus,
} from '@/domains/remote-devtools/types';

import { PageHeader } from '@/components/PageHeader';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CodeBlock } from '@/components/ui/code-block';
import { Collapsible } from '@/components/ui/collapsible';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusDot, type StatusTone } from '@/components/ui/status-dot';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  commandLabelKey,
  commandRequiresValue,
  commandsForStatus,
} from '@/domains/remote-devtools/command-policies';
import {
  useCreateRemoteSession,
  useRemoteEvents,
  useRemoteSessions,
  useSendCommand,
} from '@/domains/remote-devtools/hooks';
import { FEATURES } from '@/lib/config';
import { useDocumentTitle } from '@/lib/use-document-title';

const STATUS_TONE: Record<RemoteSessionStatus, StatusTone> = {
  idle: 'neutral',
  waiting: 'warning',
  connected: 'info',
  running: 'live',
  stopped: 'neutral',
  error: 'danger',
};

const LEVEL_TONE: Record<RemoteEventLevel, StatusTone> = {
  info: 'info',
  warn: 'warning',
  error: 'danger',
  debug: 'neutral',
};

function safeJson(value: unknown): string {
  const seen = new WeakSet();
  return JSON.stringify(
    value,
    (_k, v) => {
      if (typeof v === 'bigint') return v.toString();
      if (typeof v === 'object' && v !== null) {
        if (seen.has(v)) return '[Circular]';
        seen.add(v);
      }
      return v;
    },
    2,
  );
}

function download(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toCsv(events: RemoteEvent[]): string {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const header = ['timestamp', 'level', 'type', 'source', 'message'].map(esc).join(',');
  const rows = events.map((e) =>
    [e.timestamp, e.level, e.type, e.source, e.message].map((v) => esc(String(v ?? ''))).join(','),
  );
  return [header, ...rows].join('\n');
}

function localTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleTimeString();
}

export default function RemoteDevTools() {
  const { t } = useTranslation();
  useDocumentTitle(t('remotedevtools.title'));

  if (!FEATURES.remoteDevtools) {
    return (
      <div className="mx-auto max-w-3xl p-4 sm:p-6">
        <PageHeader title={t('remotedevtools.title')} description={t('remotedevtools.subtitle')} />
        <Alert tone="warning" title={t('remotedevtools.disabledTitle')} className="mt-6">
          {t('remotedevtools.disabledDesc')}
        </Alert>
      </div>
    );
  }
  return <Console />;
}

function Console() {
  const { t } = useTranslation();
  const [live, setLive] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sessionSearch, setSessionSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | RemoteSessionStatus>('all');
  const [eventSearch, setEventSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | RemoteEventLevel>('all');
  const [commandValue, setCommandValue] = useState('');
  const [activity, setActivity] = useState<RemoteActivity[]>([]);

  const sessionsQuery = useRemoteSessions(live);
  const eventsQuery = useRemoteEvents(selectedId, live);
  const createSession = useCreateRemoteSession();
  const sendCommand = useSendCommand(selectedId);

  const sessions = sessionsQuery.data ?? [];
  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);

  const addActivity = (a: Omit<RemoteActivity, 'id' | 'timestamp'>) =>
    setActivity((log) =>
      [{ ...a, id: crypto.randomUUID(), timestamp: new Date().toISOString() }, ...log].slice(
        0,
        150,
      ),
    );

  const filteredSessions = useMemo(() => {
    const q = sessionSearch.trim().toLowerCase();
    return sessions.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.environment?.toLowerCase().includes(q) ||
        s.deviceId?.toLowerCase().includes(q)
      );
    });
  }, [sessions, sessionSearch, statusFilter]);

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === selectedId) ?? null,
    [sessions, selectedId],
  );

  const filteredEvents = useMemo(() => {
    const q = eventSearch.trim().toLowerCase();
    return events.filter((e) => {
      if (levelFilter !== 'all' && e.level !== levelFilter) return false;
      if (!q) return true;
      return e.message.toLowerCase().includes(q) || e.type.toLowerCase().includes(q);
    });
  }, [events, eventSearch, levelFilter]);

  const levelSummary = useMemo(() => {
    const acc = { total: events.length, info: 0, warn: 0, debug: 0, error: 0 };
    for (const e of events) acc[e.level] = (acc[e.level] ?? 0) + 1;
    return acc;
  }, [events]);

  const runCommand = (command: ReturnType<typeof commandsForStatus>[number]) => {
    if (!selectedId) return;
    if (commandRequiresValue(command) && !commandValue.trim()) {
      addActivity({
        level: 'warning',
        message: t('remotedevtools.valueRequired'),
        sessionId: selectedId,
      });
      return;
    }
    sendCommand.mutate(
      { command, value: commandValue.trim() || undefined },
      {
        onSuccess: () =>
          addActivity({ level: 'success', message: `${command}`, sessionId: selectedId }),
        onError: (e) =>
          addActivity({ level: 'error', message: (e as Error).message, sessionId: selectedId }),
      },
    );
  };

  const sessionColumns: Column<RemoteSession>[] = [
    {
      key: 'name',
      header: t('remotedevtools.colName'),
      cell: (s) => (
        <div className="min-w-0">
          <div className="font-medium text-fg truncate">{s.name}</div>
          {s.environment && <div className="text-xs text-fg-faint truncate">{s.environment}</div>}
        </div>
      ),
    },
    {
      key: 'device',
      header: t('remotedevtools.colDevice'),
      cell: (s) => (
        <span className="text-xs text-fg-subtle truncate">
          {s.device?.name || s.deviceId || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('remotedevtools.colStatus'),
      cell: (s) => (
        <StatusDot
          tone={STATUS_TONE[s.status]}
          pulse={s.status === 'running'}
          label={t(`remotedevtools.status${s.status.charAt(0).toUpperCase()}${s.status.slice(1)}`)}
        />
      ),
    },
    {
      key: 'participants',
      header: t('remotedevtools.colParticipants'),
      align: 'right',
      cell: (s) => <span className="tabular-nums text-fg-muted">{s.participantCount ?? 0}</span>,
    },
  ];

  const connectionTone: StatusTone = sessionsQuery.isError ? 'danger' : live ? 'live' : 'neutral';

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-5">
      <PageHeader
        title={t('remotedevtools.title')}
        description={t('remotedevtools.subtitle')}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                void sessionsQuery.refetch();
                if (selectedId) void eventsQuery.refetch();
              }}
            >
              <RefreshCw className={sessionsQuery.isFetching ? 'animate-spin' : ''} />
              {t('remotedevtools.refresh')}
            </Button>
            <Button
              variant="accent"
              disabled={createSession.isPending}
              onClick={() =>
                createSession.mutate(undefined, {
                  onSuccess: (s) => {
                    if (s?.id) setSelectedId(s.id);
                    addActivity({ level: 'success', message: t('remotedevtools.sessionCreated') });
                  },
                })
              }
            >
              <Plus />
              {createSession.isPending
                ? t('remotedevtools.creating')
                : t('remotedevtools.createSession')}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-5">
        {/* Session list */}
        <Card className="xl:col-span-2 p-0 overflow-hidden flex flex-col">
          <CardHeader className="gap-2">
            <div className="flex items-center justify-between">
              <CardTitle>{t('remotedevtools.sessions')}</CardTitle>
              <span className="text-xs text-fg-faint tabular-nums">
                {t('remotedevtools.sessionCount', { count: filteredSessions.length })}
              </span>
            </div>
            <div className="flex gap-2">
              <Input
                value={sessionSearch}
                onChange={(e) => setSessionSearch(e.target.value)}
                placeholder={t('remotedevtools.searchSessions')}
                className="h-8"
              />
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
              >
                <SelectTrigger className="h-8 w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('remotedevtools.all')}</SelectItem>
                  {(['idle', 'waiting', 'connected', 'running', 'stopped', 'error'] as const).map(
                    (s) => (
                      <SelectItem key={s} value={s}>
                        {t(`remotedevtools.status${s.charAt(0).toUpperCase()}${s.slice(1)}`)}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <DataTable
            columns={sessionColumns}
            rows={filteredSessions}
            rowKey={(s) => s.id}
            loading={sessionsQuery.isLoading}
            onRowClick={(s) => setSelectedId(s.id)}
            isRowActive={(s) => s.id === selectedId}
            empty={t('remotedevtools.noSessions')}
          />
        </Card>

        {/* Events & controls */}
        <Card className="xl:col-span-3 flex flex-col">
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <StatusDot
                  tone={connectionTone}
                  pulse={live && !sessionsQuery.isError}
                  label={
                    sessionsQuery.isError
                      ? t('remotedevtools.disconnected')
                      : live
                        ? t('remotedevtools.connected')
                        : t('remotedevtools.disconnected')
                  }
                />
                {selectedSession && (
                  <span className="text-sm font-medium text-fg truncate">
                    · {selectedSession.name}
                  </span>
                )}
              </div>
              <label className="flex items-center gap-2 text-xs text-fg-muted">
                {t('remotedevtools.liveConnection')}
                <Switch checked={live} onCheckedChange={setLive} />
              </label>
            </div>

            {selectedSession ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <Input
                    value={eventSearch}
                    onChange={(e) => setEventSearch(e.target.value)}
                    placeholder={t('remotedevtools.searchEvents')}
                    className="h-8 flex-1 min-w-[140px]"
                  />
                  <Select
                    value={levelFilter}
                    onValueChange={(v) => setLevelFilter(v as typeof levelFilter)}
                  >
                    <SelectTrigger className="h-8 w-[110px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('remotedevtools.levelAll')}</SelectItem>
                      {(['info', 'warn', 'debug', 'error'] as const).map((l) => (
                        <SelectItem key={l} value={l}>
                          {l.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={commandValue}
                    onChange={(e) => setCommandValue(e.target.value)}
                    placeholder={t('remotedevtools.commandValue')}
                    className="h-8 w-[140px]"
                  />
                </div>

                {/* Level summary */}
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="neutral" size="sm">
                    Σ {levelSummary.total}
                  </Badge>
                  <Badge variant="accent" size="sm">
                    INFO {levelSummary.info}
                  </Badge>
                  <Badge variant="warning" size="sm">
                    WARN {levelSummary.warn}
                  </Badge>
                  <Badge variant="neutral" size="sm">
                    DEBUG {levelSummary.debug}
                  </Badge>
                  <Badge variant="danger" size="sm">
                    ERROR {levelSummary.error}
                  </Badge>
                </div>

                {/* Commands */}
                <div className="flex flex-wrap gap-2">
                  {commandsForStatus(selectedSession.status).map((cmd) => (
                    <Button
                      key={cmd}
                      size="sm"
                      variant={cmd === 'disconnect' ? 'danger' : 'secondary'}
                      disabled={sendCommand.isPending}
                      onClick={() => runCommand(cmd)}
                    >
                      {t(commandLabelKey(cmd))}
                    </Button>
                  ))}
                </div>
              </>
            ) : null}
          </CardHeader>

          <CardContent className="flex-1">
            {!selectedSession ? (
              <p className="py-12 text-center text-sm text-fg-faint">
                {t('remotedevtools.selectSessionPrompt')}
              </p>
            ) : (
              <Tabs defaultValue="timeline">
                <div className="flex items-center justify-between">
                  <TabsList>
                    <TabsTrigger value="timeline">{t('remotedevtools.tabTimeline')}</TabsTrigger>
                    <TabsTrigger value="json">{t('remotedevtools.tabJson')}</TabsTrigger>
                    <TabsTrigger value="activity">{t('remotedevtools.tabActivity')}</TabsTrigger>
                  </TabsList>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        download(safeJson(filteredEvents), 'events.json', 'application/json')
                      }
                    >
                      <Download />
                      {t('remotedevtools.exportJson')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => download(toCsv(filteredEvents), 'events.csv', 'text/csv')}
                    >
                      <Download />
                      {t('remotedevtools.exportCsv')}
                    </Button>
                  </div>
                </div>

                <TabsContent value="timeline" className="mt-3">
                  {filteredEvents.length === 0 ? (
                    <p className="py-10 text-center text-sm text-fg-faint">
                      {t('remotedevtools.noEvents')}
                    </p>
                  ) : (
                    <ul className="flex flex-col divide-y divide-border">
                      {filteredEvents.map((e) => (
                        <li key={e.id} className="py-2.5">
                          <div className="flex items-center gap-2">
                            <StatusDot tone={LEVEL_TONE[e.level]} />
                            <Badge variant="outline" size="sm">
                              {e.type}
                            </Badge>
                            <span className="ml-auto text-[11px] tabular-nums text-fg-faint">
                              {localTime(e.timestamp)}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-fg-muted break-words">{e.message}</p>
                          {e.payload !== null && e.payload !== undefined && (
                            <Collapsible
                              trigger={<span className="text-xs text-fg-faint">payload</span>}
                              className="mt-1"
                            >
                              <CodeBlock code={safeJson(e.payload)} wrap noCopy />
                            </Collapsible>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </TabsContent>

                <TabsContent value="json" className="mt-3">
                  <CodeBlock
                    code={safeJson({
                      session: selectedSession,
                      totalEvents: events.length,
                      events: filteredEvents,
                    })}
                    language="json"
                    wrap
                  />
                </TabsContent>

                <TabsContent value="activity" className="mt-3">
                  <div className="flex items-center justify-end gap-1 mb-2">
                    <Button variant="ghost" size="sm" onClick={() => setActivity([])}>
                      <Trash2 />
                      {t('remotedevtools.clearActivity')}
                    </Button>
                  </div>
                  {activity.length === 0 ? (
                    <p className="py-10 text-center text-sm text-fg-faint">
                      {t('remotedevtools.noActivity')}
                    </p>
                  ) : (
                    <ul className="flex flex-col divide-y divide-border">
                      {activity.map((a) => (
                        <li key={a.id} className="py-2 flex items-start gap-2">
                          <StatusDot
                            tone={
                              a.level === 'success'
                                ? 'success'
                                : a.level === 'error'
                                  ? 'danger'
                                  : a.level === 'warning'
                                    ? 'warning'
                                    : 'info'
                            }
                          />
                          <span className="flex-1 text-sm text-fg-muted break-words">
                            {a.message}
                          </span>
                          <span className="text-[11px] tabular-nums text-fg-faint">
                            {localTime(a.timestamp)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
