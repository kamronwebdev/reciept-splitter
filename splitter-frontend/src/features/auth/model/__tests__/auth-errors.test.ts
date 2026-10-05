jest.mock('@react-native-async-storage/async-storage', () => ({}));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: {} } }));
jest.mock('expo-secure-store', () => ({}));
import { ApiError } from '../../api';
import { errorCodeOf, isNetworkError, authErrorMessage } from '../auth-errors';

const t: any = (key: string) => key;

describe('auth error mapping', () => {
  it('maps known backend codes', () => {
    expect(errorCodeOf(new ApiError('x', 409, 'EMAIL_IN_USE'))).toBe('EMAIL_IN_USE');
    expect(authErrorMessage(t, new ApiError('x', 400, 'INVALID_CREDENTIALS'))).toBe('auth.errors.INVALID_CREDENTIALS');
  });
  it('detects network errors', () => {
    const e = new ApiError('offline');
    expect(isNetworkError(e)).toBe(true);
    expect(errorCodeOf(e)).toBe('NETWORK');
  });
  it('falls back for rate limits, server errors and unknown errors', () => {
    expect(errorCodeOf(new ApiError('x', 429))).toBe('RATE_LIMITED');
    expect(errorCodeOf(new ApiError('x', 503))).toBe('SERVER_ERROR');
    expect(authErrorMessage(t, new Error('boom'))).toBe('auth.errors.UNKNOWN');
  });
});
