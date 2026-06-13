import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { inviteMember, listMembers, removeMember, updateMember } from './api';

import type { InviteMemberPayload, UpdateMemberPayload } from './types';

export const teamKey = ['team', 'members'] as const;

export function useMembers() {
  return useQuery({ queryKey: teamKey, queryFn: listMembers });
}

export function useInviteMember() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (payload: InviteMemberPayload) => inviteMember(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: teamKey });
      toast.success(t('team.invited'));
    },
    onError: (e) => toast.error((e as Error).message || t('common.loadFailed')),
  });
}

export function useUpdateMember() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateMemberPayload }) =>
      updateMember(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: teamKey });
      toast.success(t('team.updated'));
    },
    onError: (e) => toast.error((e as Error).message || t('common.loadFailed')),
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: string) => removeMember(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: teamKey });
      toast.success(t('team.removed'));
    },
    onError: (e) => toast.error((e as Error).message || t('common.loadFailed')),
  });
}
