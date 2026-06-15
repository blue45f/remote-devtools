import { useQuery } from '@tanstack/react-query';
import {
  FastForward,
  History,
  Keyboard,
  MessageSquare,
  Monitor,
  Moon,
  RotateCcw,
  Search,
  Sparkles,
  Sun,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { toast } from '@/components/ui/toaster';
import { apiFetch, queryClient } from '@/lib/api';
import { shortHash } from '@/lib/format';
import { allNavItems } from '@/lib/nav';
import { clearRecentSessions, useRecentSessions } from '@/lib/recent-sessions';
import { useReplayPrefs } from '@/lib/replay-prefs';
import { useAppStore } from '@/lib/store';

interface ActivityEntry {
  id: string;
  kind: 'session' | 'ticket' | 'error' | 'join' | 'comment';
  title: string;
  subtitle?: string;
  at: string;
  sessionId?: number;
  timestampMs?: number;
}

interface SessionMatch {
  id: number;
  name?: string;
  url?: string;
  tags?: string[];
}

export function CommandPalette() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const commandOpen = useAppStore((s) => s.commandOpen);
  const setCommandOpen = useAppStore((s) => s.setCommandOpen);
  const setTheme = useAppStore((s) => s.setTheme);
  const demoMode = useAppStore((s) => s.demoMode);
  const toggleDemoMode = useAppStore((s) => s.toggleDemoMode);
  const setShortcutsOpen = useAppStore((s) => s.setShortcutsOpen);
  const recentSessions = useRecentSessions();
  const [{ skipInactive }, setReplayPrefs] = useReplayPrefs();

  // Pull recent activity feed only while the palette is open so closed
  // palettes don't poll. Filter for comment entries client-side.
  const { data: activity } = useQuery<ActivityEntry[]>({
    queryKey: ['palette-activity'],
    queryFn: () => apiFetch<ActivityEntry[]>('/api/activity/feed?limit=20'),
    enabled: commandOpen,
    staleTime: 30_000,
  });
  const recentComments = (activity ?? [])
    .filter(
      (e): e is ActivityEntry & { sessionId: number } =>
        e.kind === 'comment' && typeof e.sessionId === 'number',
    )
    .slice(0, 5);

  // Controlled input so we can run a server-side session search as the user
  // types (beyond the local "recent" list). Reset when the palette closes.
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 200);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: sessionMatches } = useQuery<SessionMatch[]>({
    queryKey: ['palette-session-search', debouncedSearch],
    queryFn: async () => {
      const res = await apiFetch<SessionMatch[] | { rows: SessionMatch[] }>(
        `/sessions/record?q=${encodeURIComponent(debouncedSearch)}&limit=6`,
      );
      return Array.isArray(res) ? res : (res.rows ?? []);
    },
    enabled: commandOpen && debouncedSearch.length >= 2,
    staleTime: 30_000,
  });
  const recentIds = new Set(recentSessions.map((s) => String(s.id)));
  const sessionResults = (sessionMatches ?? [])
    .filter((s) => !recentIds.has(String(s.id)))
    .slice(0, 6);

  const run = (fn: () => void) => {
    fn();
    setCommandOpen(false);
  };

  return (
    <CommandDialog
      open={commandOpen}
      onOpenChange={(open) => {
        setCommandOpen(open);
        if (!open) setSearch('');
      }}
    >
      <CommandInput
        placeholder={t('command.placeholder')}
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>{t('command.noResults')}</CommandEmpty>

        {sessionResults.length > 0 && (
          <>
            <CommandGroup heading={t('command.sessions')}>
              {sessionResults.map((s) => (
                <CommandItem
                  key={s.id}
                  // value carries name/url/tags so cmdk's local filter keeps
                  // these server matches in view as the user keeps typing.
                  value={`session ${s.id} ${s.name ?? ''} ${s.url ?? ''} ${(s.tags ?? []).join(' ')}`}
                  onSelect={() => run(() => navigate(`/sessions/${s.id}`))}
                  data-testid="cmd-session-match"
                >
                  <Search />
                  <span className="truncate">
                    {s.name ?? t('command.sessionFallback', { id: shortHash(String(s.id), 10) })}
                  </span>
                  {s.url && (
                    <span className="ml-auto text-[10px] text-fg-faint truncate max-w-[40%]">
                      {prettyHost(s.url)}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {recentSessions.length > 0 && (
          <>
            <CommandGroup heading={t('command.recentSessions')}>
              {recentSessions.map((s) => (
                <CommandItem
                  key={s.id}
                  value={`recent session ${s.id} ${s.name ?? ''} ${s.url ?? ''}`}
                  onSelect={() => run(() => navigate(`/sessions/${s.id}`))}
                >
                  <History />
                  <span className="truncate">
                    {s.name ?? t('command.sessionFallback', { id: shortHash(s.id, 10) })}
                  </span>
                  {s.url && (
                    <span className="ml-auto text-[10px] text-fg-faint truncate max-w-[40%]">
                      {prettyHost(s.url)}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {recentComments.length > 0 && (
          <>
            <CommandGroup heading={t('command.recentComments')}>
              {recentComments.map((c) => {
                const url =
                  typeof c.timestampMs === 'number'
                    ? `/sessions/${c.sessionId}?t=${c.timestampMs}`
                    : `/sessions/${c.sessionId}`;
                return (
                  <CommandItem
                    key={c.id}
                    value={`recent comment ${c.id} ${c.title} ${c.subtitle ?? ''}`}
                    onSelect={() => run(() => navigate(url))}
                    data-testid="cmd-recent-comment"
                  >
                    <MessageSquare />
                    <span className="truncate">{c.subtitle ?? c.title}</span>
                    <span className="ml-auto text-[10px] text-fg-faint truncate max-w-[40%]">
                      {c.title.replace(/^Comment by /, '')}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading={t('command.navigation')}>
          {allNavItems.map((item) => {
            const Icon = item.icon;
            const itemLabel = t(item.labelKey);
            return (
              <CommandItem
                key={item.to}
                // Include Korean fallback, active localized label, and English
                // tokens so search works in both supported languages.
                value={`nav ${[item.label, itemLabel, ...(item.searchTokens ?? [])].join(' ')}`}
                onSelect={() => run(() => navigate(item.to))}
              >
                <Icon />
                <span>{itemLabel}</span>
                {item.shortcut && <CommandShortcut>{item.shortcut}</CommandShortcut>}
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t('command.appearance')}>
          <CommandItem value="theme light" onSelect={() => run(() => setTheme('light'))}>
            <Sun />
            <span>{t('command.lightTheme')}</span>
          </CommandItem>
          <CommandItem value="theme dark" onSelect={() => run(() => setTheme('dark'))}>
            <Moon />
            <span>{t('command.darkTheme')}</span>
          </CommandItem>
          <CommandItem value="theme system" onSelect={() => run(() => setTheme('system'))}>
            <Monitor />
            <span>{t('command.systemTheme')}</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t('command.demo')}>
          <CommandItem
            value="toggle demo"
            onSelect={() =>
              run(() => {
                toggleDemoMode();
                queryClient.invalidateQueries();
                toast.success(demoMode ? t('command.demoDisabled') : t('command.demoEnabled'), {
                  description: demoMode
                    ? t('command.demoDisabledDesc')
                    : t('command.demoEnabledDesc'),
                });
              })
            }
          >
            <Sparkles />
            <span>{demoMode ? t('command.disableDemo') : t('command.enableDemo')}</span>
            <CommandShortcut>{demoMode ? t('common.on') : t('common.off')}</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t('command.replay')}>
          <CommandItem
            value="toggle replay skip idle"
            onSelect={() =>
              run(() => {
                setReplayPrefs({ skipInactive: !skipInactive });
                toast.success(
                  skipInactive ? t('command.skipIdleDisabled') : t('command.skipIdleEnabled'),
                  {
                    description: skipInactive
                      ? t('command.skipIdleDisabledDesc')
                      : t('command.skipIdleEnabledDesc'),
                  },
                );
              })
            }
            data-testid="cmd-toggle-skip-idle"
          >
            <FastForward />
            <span>{skipInactive ? t('command.disableSkipIdle') : t('command.enableSkipIdle')}</span>
            <CommandShortcut>{skipInactive ? t('common.on') : t('common.off')}</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t('command.help')}>
          <CommandItem
            value="show keyboard shortcuts"
            onSelect={() => run(() => setShortcutsOpen(true))}
          >
            <Keyboard />
            <span>{t('command.keyboardShortcuts')}</span>
            <CommandShortcut>?</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="reset sessions preferences"
            onSelect={() =>
              run(() => {
                try {
                  globalThis.localStorage.removeItem('sessions-prefs:v1');
                  globalThis.localStorage.removeItem('sessions-pins:v1');
                  clearRecentSessions();
                  toast.success(t('command.sessionsCleared'), {
                    description: t('command.sessionsClearedDesc'),
                  });
                } catch {
                  toast.error(t('command.clearFailed'));
                }
              })
            }
          >
            <RotateCcw />
            <span>{t('command.resetSessionsPrefs')}</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

function prettyHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
