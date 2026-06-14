import { ShieldAlert } from 'lucide-react';
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/ui/empty-state';
import { hasRole, useRole, type Role } from '@/lib/roles';

/**
 * Gates its children behind one or more roles. Unlike <RequireAuth> (which
 * decides whether the app shell renders at all), this guards a single route's
 * content and shows a friendly "insufficient permission" state instead of
 * redirecting — the user is authenticated, just not authorized.
 */
export function RequireRole({ roles, children }: { roles: readonly Role[]; children: ReactNode }) {
  const { t } = useTranslation();
  const role = useRole();

  if (!hasRole(role, roles)) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] px-4">
        <EmptyState
          icon={ShieldAlert}
          title={t('roles.deniedTitle')}
          description={t('roles.deniedDescription')}
        />
      </div>
    );
  }
  return <>{children}</>;
}
