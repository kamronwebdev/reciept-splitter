import { ApiError } from '@/features/auth/api';

export type FriendQrErrorCode = 'NOT_OUR_QR' | 'INVALID_CODE' | 'NETWORK' | 'RATE_LIMITED' | 'UNKNOWN';

/** Maps scanner / friend-code API failures to the few cases the UI explains. */
export function friendQrErrorCode(error: unknown): FriendQrErrorCode {
  if (error instanceof ApiError) {
    if (error.isNetwork) return 'NETWORK';
    if (error.code === 'INVALID_CODE' || error.code === 'INVALID_INVITE') return 'INVALID_CODE';
    if (error.code === 'RATE_LIMITED' || error.status === 429) return 'RATE_LIMITED';
    // group invites answer with plain 400/404 texts (expired token, group deleted)
    if (error.status === 400 || error.status === 404 || error.status === 410) return 'INVALID_CODE';
  }
  return 'UNKNOWN';
}
