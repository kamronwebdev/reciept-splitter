import type { TFunction } from 'i18next';
import { ApiError } from '../api';

/** Backend error codes that have a translated message under `auth.errors.<CODE>`. */
const KNOWN = new Set([
  'VALIDATION_ERROR',
  'INVALID_EMAIL',
  'INVALID_USERNAME',
  'EMAIL_IN_USE',
  'INVALID_CREDENTIALS',
  'WEAK_PASSWORD',
  'INVALID_CODE',
  'CODE_EXPIRED',
  'TOO_MANY_ATTEMPTS',
  'INVALID_RESET_TOKEN',
  'RATE_LIMITED',
  'UNAUTHORIZED',
  'TOKEN_EXPIRED',
  'TOKEN_INVALID',
  'SESSION_REVOKED',
  'USER_NOT_FOUND',
  'WRONG_CURRENT_PASSWORD',
  'SERVER_ERROR',
]);

export function errorCodeOf(error: unknown): string | undefined {
  if (error instanceof ApiError) {
    if (error.isNetwork) return 'NETWORK';
    if (error.code && KNOWN.has(error.code)) return error.code;
    if (error.status === 429) return 'RATE_LIMITED';
    if (error.status && error.status >= 500) return 'SERVER_ERROR';
  }
  return undefined;
}

export function isNetworkError(error: unknown): boolean {
  return error instanceof ApiError && error.isNetwork;
}

/** Friendly, translated message for any error thrown by the auth API. */
export function authErrorMessage(t: TFunction, error: unknown, vars: Record<string, unknown> = {}): string {
  const code = errorCodeOf(error);
  if (code) return t(`auth.errors.${code}`, vars) as string;
  return t('auth.errors.UNKNOWN') as string;
}
