import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { PageHeader } from '@/components/PageHeader';
import { RequireRole } from '@/components/RequireRole';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusDot, type StatusTone } from '@/components/ui/status-dot';
import {
  useInviteMember,
  useMembers,
  useRemoveMember,
  useUpdateMember,
} from '@/domains/team/hooks';
import {
  MEMBER_ROLES,
  type Member,
  type MemberRole,
  type MemberStatus,
} from '@/domains/team/types';
import { useDocumentTitle } from '@/lib/use-document-title';

const STATUS_TONE: Record<MemberStatus, StatusTone> = {
  active: 'success',
  invited: 'warning',
  suspended: 'danger',
  deleted: 'neutral',
};

export default function SettingsTeam() {
  return (
    <RequireRole roles={['owner', 'admin']}>
      <TeamInner />
    </RequireRole>
  );
}

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  role: z.enum(['owner', 'admin', 'member', 'viewer']),
});
type InviteForm = z.infer<typeof inviteSchema>;

function TeamInner() {
  const { t } = useTranslation();
  useDocumentTitle(t('team.title'));
  const { data: members = [], isLoading } = useMembers();
  const invite = useInviteMember();
  const updateMember = useUpdateMember();
  const removeMember = useRemoveMember();
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', name: '', role: 'member' },
  });

  const onSubmit = handleSubmit((values) => {
    invite.mutate(values, {
      onSuccess: () => {
        reset();
        setOpen(false);
      },
    });
  });

  const roleLabel = (r: MemberRole) => t(`roles.${r}`);
  const statusLabel = (s: MemberStatus) =>
    t(`team.status${s.charAt(0).toUpperCase()}${s.slice(1)}` as const, s);

  const columns: Column<Member>[] = [
    {
      key: 'member',
      header: t('team.colMember'),
      cell: (m) => (
        <div className="min-w-0">
          <div className="font-medium text-fg truncate">{m.name || m.email || m.id}</div>
          {m.name && m.email && <div className="text-xs text-fg-faint truncate">{m.email}</div>}
        </div>
      ),
    },
    {
      key: 'role',
      header: t('team.colRole'),
      cell: (m) => (
        <Select
          value={m.role}
          onValueChange={(v) =>
            updateMember.mutate({ id: m.id, payload: { role: v as MemberRole } })
          }
        >
          <SelectTrigger className="h-7 w-[120px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MEMBER_ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {roleLabel(r)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      key: 'status',
      header: t('team.colStatus'),
      cell: (m) => (
        <Badge variant="outline" size="sm" className="gap-1.5">
          <StatusDot tone={STATUS_TONE[m.status]} />
          {statusLabel(m.status)}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (m) => (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('team.remove')}
          onClick={() => {
            if (globalThis.confirm(t('team.removeConfirm'))) removeMember.mutate(m.id);
          }}
        >
          <Trash2 />
        </Button>
      ),
    },
  ];

  const role = watch('role');

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 flex flex-col gap-6">
      <PageHeader
        title={t('team.title')}
        description={t('team.subtitle')}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="accent">
                <UserPlus />
                {t('team.invite')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('team.inviteTitle')}</DialogTitle>
                <DialogDescription>{t('team.subtitle')}</DialogDescription>
              </DialogHeader>
              <form onSubmit={onSubmit} className="flex flex-col gap-4">
                <Field
                  label={t('team.email')}
                  htmlFor="inv-email"
                  error={errors.email?.message}
                  required
                >
                  <Input id="inv-email" type="email" {...register('email')} />
                </Field>
                <Field label={t('team.name')} htmlFor="inv-name">
                  <Input id="inv-name" {...register('name')} />
                </Field>
                <Field label={t('team.role')}>
                  <Select value={role} onValueChange={(v) => setValue('role', v as MemberRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MEMBER_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {roleLabel(r)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" variant="accent" disabled={invite.isPending}>
                    {invite.isPending ? t('team.inviting') : t('team.sendInvite')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <Card className="p-0 overflow-hidden">
        <DataTable
          columns={columns}
          rows={members}
          rowKey={(m) => m.id}
          loading={isLoading}
          empty={t('team.noMembers')}
        />
      </Card>
    </div>
  );
}
