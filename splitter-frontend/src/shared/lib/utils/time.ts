import type { TFunction } from 'i18next';

/** "now", "5 min", "3 h", "2 d", then a short date — like iOS lists. */
export function timeAgo(iso: string | undefined | null, t: TFunction, locale: string, now = Date.now()): string {
  if (!iso) return '';
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return '';
  const sec = Math.max(0, Math.round((now - ts) / 1000));
  if (sec < 60) return t('time.now');
  const min = Math.round(sec / 60);
  if (min < 60) return t('time.minutes', { count: min });
  const h = Math.round(min / 60);
  if (h < 24) return t('time.hours', { count: h });
  const d = Math.round(h / 24);
  if (d < 7) return t('time.days', { count: d });
  return shortDate(iso, locale);
}

export function shortDate(iso: string | undefined | null, locale: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  try {
    return date.toLocaleDateString(locale, { month: 'short', day: 'numeric', ...(date.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) });
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/** true when the date is today (local time) */
export function isToday(iso: string, now = new Date()): boolean {
  const d = new Date(iso);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}
