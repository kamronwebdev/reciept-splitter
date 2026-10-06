import { ApiError } from '@/features/auth/api';
import { friendQrErrorCode } from '../qr-errors';

describe('friendQrErrorCode', () => {
  it('maps API failures to the cases the scanner explains', () => {
    expect(friendQrErrorCode(new ApiError('offline'))).toBe('NETWORK');
    expect(friendQrErrorCode(new ApiError('x', 404, 'INVALID_CODE'))).toBe('INVALID_CODE');
    expect(friendQrErrorCode(new ApiError('x', 400, 'INVALID_INVITE'))).toBe('INVALID_CODE');
    expect(friendQrErrorCode(new ApiError('Invalid or expired token', 400))).toBe('INVALID_CODE'); // group token
    expect(friendQrErrorCode(new ApiError('x', 429, 'RATE_LIMITED'))).toBe('RATE_LIMITED');
    expect(friendQrErrorCode(new ApiError('x', 500, 'SERVER_ERROR'))).toBe('UNKNOWN');
    expect(friendQrErrorCode(new Error('boom'))).toBe('UNKNOWN');
  });
});
