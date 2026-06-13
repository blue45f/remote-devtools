import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { getProfile, updateProfile } from './api';

import type { UpdateProfilePayload } from './types';

import { useAuth } from '@/lib/auth';

/**
 * The employee number used to key the profile. In JWT mode it comes from the
 * token (`member` then `sub`); self-host / demo falls back to a stable handle
 * so the seed router can answer.
 */
export function useCurrentEmpNo(): string {
  const { claims } = useAuth();
  return claims?.member ?? claims?.sub ?? 'me';
}

export function profileKey(empNo: string) {
  return ['profile', empNo] as const;
}

export function useProfile(empNo: string) {
  return useQuery({
    queryKey: profileKey(empNo),
    queryFn: () => getProfile(empNo),
  });
}

export function useUpdateProfile(empNo: string) {
  const qc = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateProfile(empNo, payload),
    onSuccess: (data) => {
      qc.setQueryData(profileKey(empNo), data);
      void qc.invalidateQueries({ queryKey: profileKey(empNo) });
      toast.success(t('profile.saved'));
    },
    onError: (err) => {
      toast.error((err as Error).message || t('common.loadFailed'));
    },
  });
}
