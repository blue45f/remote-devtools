import { Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { TagInput } from '@/components/ui/tag-input';
import { useCurrentEmpNo, useProfile, useUpdateProfile } from '@/domains/profile/hooks';
import {
  JOB_TYPES,
  type DeviceInfo,
  type JobType,
  type TicketTemplate,
  type UserProfile,
} from '@/domains/profile/types';
import { useDocumentTitle } from '@/lib/use-document-title';

const JOB_LABEL_KEY: Record<JobType, string> = {
  QA: 'profile.jobQA',
  PM: 'profile.jobPM',
  PD: 'profile.jobPD',
  DEV: 'profile.jobDEV',
  OTHER: 'profile.jobOTHER',
};

export default function SettingsProfile() {
  const { t } = useTranslation();
  useDocumentTitle(t('profile.title'));
  const empNo = useCurrentEmpNo();
  const { data, isLoading } = useProfile(empNo);

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 flex flex-col gap-6">
      {isLoading || !data ? (
        <>
          <PageHeader title={t('profile.title')} description={t('profile.subtitle')} />
          <Card>
            <CardContent className="grid gap-4 py-6 sm:grid-cols-2">
              <Skeleton className="h-9" />
              <Skeleton className="h-9" />
              <Skeleton className="h-9" />
              <Skeleton className="h-9" />
            </CardContent>
          </Card>
        </>
      ) : (
        // Re-mount the editor whenever the fetched profile identity changes so
        // local form state seeds from props without a setState-in-effect.
        <ProfileEditor
          key={`${empNo}:${data.updatedAt ?? data.id ?? ''}`}
          empNo={empNo}
          profile={data}
        />
      )}
    </div>
  );
}

function ProfileEditor({ empNo, profile }: { empNo: string; profile: UserProfile }) {
  const { t } = useTranslation();
  const update = useUpdateProfile(empNo);

  const [name, setName] = useState(profile.name ?? '');
  const [jobType, setJobType] = useState<JobType>(profile.jobType ?? 'DEV');
  const [slackId, setSlackId] = useState(profile.slackId ?? '');
  const [devices, setDevices] = useState<DeviceInfo[]>(profile.deviceInfoList ?? []);
  const [templates, setTemplates] = useState<TicketTemplate[]>(profile.ticketTemplateList ?? []);

  const baseline = useMemo(
    () =>
      JSON.stringify({
        name: profile.name ?? '',
        jobType: profile.jobType ?? 'DEV',
        slackId: profile.slackId ?? '',
        devices: profile.deviceInfoList ?? [],
        templates: profile.ticketTemplateList ?? [],
      }),
    [profile],
  );
  const current = JSON.stringify({ name, jobType, slackId, devices, templates });
  const dirty = baseline !== current;

  const save = () => {
    update.mutate({
      name,
      jobType,
      slackId,
      deviceInfoList: devices.filter((d) => d.deviceId.trim()),
      ticketTemplateList: templates.filter((tpl) => tpl.name.trim()),
    });
  };

  return (
    <>
      <PageHeader
        title={t('profile.title')}
        description={t('profile.subtitle')}
        actions={
          <Button variant="accent" disabled={!dirty || update.isPending} onClick={save}>
            {update.isPending
              ? t('profile.saving')
              : dirty
                ? t('profile.save')
                : t('profile.noChanges')}
          </Button>
        }
      />

      {/* Basic info */}
      <Card>
        <CardHeader>
          <CardTitle>{t('profile.basicInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label={t('profile.name')} htmlFor="pf-name">
            <Input id="pf-name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label={t('profile.jobType')}>
            <Select value={jobType} onValueChange={(v) => setJobType(v as JobType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JOB_TYPES.map((j) => (
                  <SelectItem key={j} value={j}>
                    {t(JOB_LABEL_KEY[j])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t('profile.slackId')} htmlFor="pf-slack">
            <Input id="pf-slack" value={slackId} onChange={(e) => setSlackId(e.target.value)} />
          </Field>
          <Field label={t('profile.empNo')} htmlFor="pf-emp">
            <Input id="pf-emp" value={empNo} disabled readOnly />
          </Field>
        </CardContent>
      </Card>

      {/* Devices */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{t('profile.devices')}</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDevices((d) => [...d, { deviceId: '', name: '' }])}
          >
            <Plus />
            {t('profile.addDevice')}
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {devices.length === 0 ? (
            <p className="py-2 text-sm text-fg-faint">{t('profile.noDevices')}</p>
          ) : (
            devices.map((device, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={device.deviceId}
                  placeholder={t('profile.deviceId')}
                  onChange={(e) =>
                    setDevices((d) =>
                      d.map((x, j) => (j === i ? { ...x, deviceId: e.target.value } : x)),
                    )
                  }
                />
                <Input
                  value={device.name ?? ''}
                  placeholder={t('profile.deviceName')}
                  onChange={(e) =>
                    setDevices((d) =>
                      d.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)),
                    )
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('profile.remove')}
                  onClick={() => setDevices((d) => d.filter((_, j) => j !== i))}
                >
                  <Trash2 />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Ticket templates */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{t('profile.ticketTemplates')}</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setTemplates((tpl) => [...tpl, { name: '', componentList: [], labelList: [] }])
            }
          >
            <Plus />
            {t('profile.addTemplate')}
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {templates.length === 0 ? (
            <EmptyState title={t('profile.noTemplates')} />
          ) : (
            templates.map((tpl, i) => {
              const patch = (p: Partial<TicketTemplate>) =>
                setTemplates((all) => all.map((x, j) => (j === i ? { ...x, ...p } : x)));
              return (
                <div key={i} className="flex flex-col gap-3 rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-fg-faint">
                      #{i + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('profile.remove')}
                      onClick={() => setTemplates((all) => all.filter((_, j) => j !== i))}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label={t('profile.templateName')}>
                      <Input value={tpl.name} onChange={(e) => patch({ name: e.target.value })} />
                    </Field>
                    <Field label={t('profile.jiraProjectKey')}>
                      <Input
                        value={tpl.jiraProjectKey ?? ''}
                        onChange={(e) => patch({ jiraProjectKey: e.target.value })}
                      />
                    </Field>
                    <Field label={t('profile.epicTicket')}>
                      <Input
                        value={tpl.epicTicket ?? ''}
                        onChange={(e) => patch({ epicTicket: e.target.value })}
                      />
                    </Field>
                    <Field label={t('profile.titlePrefix')}>
                      <Input
                        value={tpl.titlePrefix ?? ''}
                        onChange={(e) => patch({ titlePrefix: e.target.value })}
                      />
                    </Field>
                    <Field label={t('profile.tcSheetLink')} className="sm:col-span-2">
                      <Input
                        value={tpl.tcSheetLink ?? ''}
                        onChange={(e) => patch({ tcSheetLink: e.target.value })}
                      />
                    </Field>
                    <Field label={t('profile.components')}>
                      <TagInput
                        value={tpl.componentList ?? []}
                        onChange={(v) => patch({ componentList: v })}
                      />
                    </Field>
                    <Field label={t('profile.labels')}>
                      <TagInput
                        value={tpl.labelList ?? []}
                        onChange={(v) => patch({ labelList: v })}
                      />
                    </Field>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </>
  );
}
