import type { TFunction } from 'i18next';
import { ApiError } from '@/features/auth/api';

/** Short, translated message for any API failure (never raw server text). */
export function errorMessage(t: TFunction, error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetwork) return t('errors.NETWORK');
    if (error.status === 429) return t('errors.RATE_LIMITED');
    if (error.status === 403) return t('errors.FORBIDDEN');
    if (error.status === 404) return t('errors.NOT_FOUND');
    if (error.status && error.status >= 500) return t('errors.SERVER_ERROR');
  }
  return t('errors.UNKNOWN');
}
