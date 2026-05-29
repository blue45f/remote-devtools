import i18n from '@/lib/i18n';

export function formatDurationFromNanos(nanos?: number | string): string {
  if (nanos === undefined || nanos === null) return '—';
  const n = typeof nanos === 'string' ? Number(nanos) : nanos;
  if (!Number.isFinite(n) || n <= 0) return '—';

  const ms = n / 1_000_000;
  if (ms < 1000) return i18n.t('common.durationMs', { value: Math.round(ms) });
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return i18n.t('common.durationSec', { value: seconds });
  const minutes = Math.floor(seconds / 60);
  const remSec = seconds % 60;
  if (minutes < 60)
    return remSec > 0
      ? `${i18n.t('common.durationMin', { value: minutes })} ${i18n.t('common.durationSec', { value: remSec })}`
      : i18n.t('common.durationMin', { value: minutes });
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  return remMin > 0
    ? `${i18n.t('common.durationHour', { value: hours })} ${i18n.t('common.durationMin', { value: remMin })}`
    : i18n.t('common.durationHour', { value: hours });
}

export function formatTimeAgo(timestamp?: string | Date): string {
  if (!timestamp) return '—';
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const diff = Date.now() - date.getTime();
  if (Number.isNaN(diff)) return '—';
  if (diff < 0) return i18n.t('common.justNow');

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return i18n.t('common.justNow');
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return i18n.t('common.minutesAgo', { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return i18n.t('common.hoursAgo', { n: hours });
  const days = Math.floor(hours / 24);
  if (days < 30) return i18n.t('common.daysAgo', { n: days });
  const months = Math.floor(days / 30);
  if (months < 12) return i18n.t('common.monthsAgo', { n: months });
  const years = Math.floor(days / 365);
  return i18n.t('common.yearsAgo', { n: years });
}

export function formatNumber(n?: number): string {
  if (n === undefined || n === null || !Number.isFinite(n)) return '0';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function truncate(text?: string, max = 32): string {
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function shortHash(value?: string, len = 8): string {
  if (!value) return '—';
  if (value.length <= len) return value;
  return `${value.slice(0, len)}…`;
}
