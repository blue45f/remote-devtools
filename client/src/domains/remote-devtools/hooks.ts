import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { createSession, getEvents, getSessions, sendCommand } from './api';

import type { RemoteCommandPayload } from './types';

const SESSIONS_KEY = ['remote-devtools', 'sessions'] as const;
const eventsKey = (id: string) => ['remote-devtools', 'events', id] as const;

/** Poll the session list. When `live` is on, refetch every 10s. */
export function useRemoteSessions(live: boolean) {
  return useQuery({
    queryKey: SESSIONS_KEY,
    queryFn: getSessions,
    refetchInterval: live ? 10_000 : false,
    // The console is best-effort: a missing backend shouldn't spam toasts.
    meta: { suppressToast: true },
  });
}

export function useRemoteEvents(sessionId: string | null, live: boolean) {
  return useQuery({
    queryKey: eventsKey(sessionId ?? '∅'),
    queryFn: () => getEvents(sessionId as string),
    enabled: Boolean(sessionId),
    refetchInterval: live && sessionId ? 5_000 : false,
    meta: { suppressToast: true },
  });
}

export function useSendCommand(sessionId: string | null) {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (payload: RemoteCommandPayload) => sendCommand(sessionId as string, payload),
    onSuccess: () => {
      if (sessionId) void qc.invalidateQueries({ queryKey: eventsKey(sessionId) });
      toast.success(t('remotedevtools.commandSent'));
    },
    onError: (e) => toast.error((e as Error).message || t('common.loadFailed')),
  });
}

export function useCreateRemoteSession() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: () => createSession(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SESSIONS_KEY });
      toast.success(t('remotedevtools.sessionCreated'));
    },
    onError: (e) => toast.error((e as Error).message || t('common.loadFailed')),
  });
}
