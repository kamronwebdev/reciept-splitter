import type { TFunction } from 'i18next';
import { ApiError } from '@/features/auth/api';

export type ReceiptErrorCode =
  | 'GEMINI_NOT_CONFIGURED'
  | 'PARSE_FAILED'
  | 'NOT_A_RECEIPT'
  | 'IMAGE_UNREADABLE'
  | 'ITEM_NOT_ASSIGNED'
  | 'RATE_LIMITED'
  | 'UNAUTHORIZED'
  | 'SESSION_REVOKED'
  | 'NETWORK'
  | 'CANCELLED'
  | 'SERVER_ERROR'
  | 'UNKNOWN';

const KNOWN = new Set<string>([
  'GEMINI_NOT_CONFIGURED',
  'PARSE_FAILED',
  'NOT_A_RECEIPT',
  'IMAGE_UNREADABLE',
  'ITEM_NOT_ASSIGNED',
  'RATE_LIMITED',
  'UNAUTHORIZED',
  'SESSION_REVOKED',
  'SERVER_ERROR',
]);

export function receiptErrorCode(error: unknown): ReceiptErrorCode {
  if (error instanceof ApiError) {
    if (error.code === 'CANCELLED') return 'CANCELLED';
    if (error.isNetwork) return 'NETWORK';
    if (error.code && KNOWN.has(error.code)) return error.code as ReceiptErrorCode;
    if (error.status === 413) return 'IMAGE_UNREADABLE';
    if (error.status && error.status >= 500) return 'SERVER_ERROR';
  }
  return 'UNKNOWN';
}

/** Friendly, translated message for scan / finalize errors (never raw server text). */
export function receiptErrorMessage(t: TFunction, error: unknown): string {
  return t(`receipt.errors.${receiptErrorCode(error)}`) as string;
}

/** Errors where taking another photo can help (vs. a server/network problem). */
export function isPhotoProblem(code: ReceiptErrorCode): boolean {
  return code === 'NOT_A_RECEIPT' || code === 'IMAGE_UNREADABLE' || code === 'PARSE_FAILED';
}
