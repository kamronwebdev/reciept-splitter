import axios, { AxiosError } from 'axios';
import { Platform } from 'react-native';
import { getToken, saveToken } from '@/shared/lib/utils/token-storage';
import { emitUnauthorized } from '@/shared/api/auth-events';
import { resolveApiUrl } from '@/shared/api/api-url';
import { DEBUG_API } from '@/shared/api/debug';

/** Current API base URL (re-resolved each time). */
export const getApiUrl = resolveApiUrl;

/** Error thrown by the API client; keeps the HTTP status for callers. */
export class ApiError extends Error {
  status?: number;
  /** machine-readable code from the backend (e.g. EMAIL_IN_USE) */
  code?: string;
  /** extra data from the backend (e.g. attemptsLeft) */
  data?: Record<string, any>;
  constructor(message: string, status?: number, code?: string, data?: Record<string, any>) {
    super(message);
    this.name = 'ApiError';
    if (status !== undefined) this.status = status;
    if (code) this.code = code;
    if (data) this.data = data;
  }
  /** true when no HTTP response was received (offline, timeout, server unreachable) */
  get isNetwork(): boolean {
    return this.status === undefined;
  }
}

export const apiClient = axios.create({
  baseURL: resolveApiUrl(),
  // Free hosting (Render) can take up to ~60s to wake up; do not hang forever.
  timeout: 60000,
  // No default Content-Type on purpose: axios sets application/json for plain objects by itself, and a
  // JSON default would make it serialize FormData bodies to JSON (the file never reaches the server).
});

/** Never print passwords to the dev console. */
function redact(data: unknown): unknown {
  if (data && typeof data === 'object' && !Array.isArray(data) && typeof (data as any).append !== 'function') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      out[k] = /password/i.test(k) ? '***' : v;
    }
    return out;
  }
  return data;
}

apiClient.interceptors.request.use(async (config) => {
  config.baseURL = resolveApiUrl();
  try {
    const existing =
      (config.headers as any)?.Authorization ??
      (typeof (config.headers as any)?.get === 'function' ? (config.headers as any).get('Authorization') : undefined);
    const token = existing ? null : await getToken();
    if (token) {
      // Only the Authorization header is added here; Content-Type is left to axios / the caller.
      if (typeof (config.headers as any)?.set === 'function') (config.headers as any).set('Authorization', `Bearer ${token}`);
      else config.headers = { ...(config.headers as any), Authorization: `Bearer ${token}` } as any;
    }
  } catch {
    // If token retrieval fails we keep going; request will likely return 401.
  }

  if (DEBUG_API) {
    const method = (config.method || 'GET').toUpperCase();
    const url = `${config.baseURL}${config.url}`;
    console.log(`[API] ${method} ${url}`);
    if (config.params) console.log('[API] Params:', config.params);
    if (config.data) console.log('[API] Request data:', redact(config.data));
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    if (DEBUG_API) {
      console.log('[API] Response:', response.data);
      console.log('[API] Status:', response.status);
    }
    return response;
  },
  (error: AxiosError<any>) => {
    if (DEBUG_API) {
      console.error('[API] Error details:', {
        message: error.message,
        code: (error as any).code,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers,
      });
    }

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;
      const serverMsg: string | undefined =
        typeof data === 'string' ? data : data?.message || data?.error;

      const code: string | undefined = typeof data?.code === 'string' ? data.code : undefined;
      const extra = data && typeof data === 'object' ? data : undefined;

      if (status === 401) {
        // Only a rejected *authenticated* request means the session is dead.
        // A wrong password on /auth/login must not log the user out or redirect.
        const url = String(error.config?.url || '');
        const hadToken = !!(error.config?.headers as any)?.Authorization ||
          typeof (error.config?.headers as any)?.get === 'function' &&
            !!(error.config?.headers as any).get('Authorization');
        const isCredentialCall = /\/auth\/(login|register)$/.test(url);
        if (hadToken && !isCredentialCall) emitUnauthorized();
        throw new ApiError(serverMsg || 'Authorization failed', status, code, extra);
      }
      if (status >= 500) {
        throw new ApiError(serverMsg || 'Server error. Please try again later.', status, code ?? 'SERVER_ERROR', extra);
      }
      throw new ApiError(serverMsg || `Request failed (${status})`, status, code, extra);
    } else if (error.code === 'ECONNABORTED') {
      throw new ApiError(`Cannot reach the server (${getApiUrl()}). Make sure the backend is running and your phone is on the same Wi-Fi as the computer.`);
    } else if (error.request) {
      throw new ApiError(`Cannot reach the server (${getApiUrl()}). Check your connection and the server address.`);
    }

    throw new ApiError('Unexpected error while performing the request.');
  }
);
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    email: string;
    username: string;
    uniqueId: string;
    avatarUrl: string | null;
  };
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface VerifyResetCodeRequest {
  email: string;
  code: string;
}

export interface ResetPasswordRequest {
  resetToken: string;
  newPassword: string;
}

export interface User {
  id: number;
  email: string;
  username: string;
  uniqueId: string;
  avatarUrl: string | null;
}

/** ===== Auth API ===== */

/** POST /auth/login */
export async function login(payload: LoginRequest): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', payload);
  return data;
}

/** POST /auth/register */
export async function register(payload: RegisterRequest): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/register', payload);
  return data;
}

/** POST /auth/forgot-password (always succeeds for valid emails; does not reveal if the account exists) */
export async function forgotPassword(payload: ForgotPasswordRequest): Promise<void> {
  await apiClient.post('/auth/forgot-password', payload);
}

/** POST /auth/verify-reset-code -> short-lived single-use reset token */
export async function verifyResetCode(payload: VerifyResetCodeRequest): Promise<{ resetToken: string }> {
  const { data } = await apiClient.post<{ resetToken: string }>('/auth/verify-reset-code', payload);
  return data;
}

/** POST /auth/reset-password -> signs the user in */
export async function resetPassword(payload: ResetPasswordRequest): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/reset-password', payload);
  return data;
}

/**
 * GET /auth/me
 * If `token` is passed it is used explicitly (e.g. right after login, before it is persisted).
 */
export async function getCurrentUser(token?: string): Promise<User> {
  const { data } = await apiClient.get<User>('/auth/me', {
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
  });
  return data;
}

/**
 * POST /uploads/avatar
 * Uploads an already resized JPEG and returns the user with the new (absolute) avatar URL.
 */
export interface UploadAvatarResponse {
  success: boolean;
  avatarUrl: string;
  key: string;
  user: User;
}

export async function uploadAvatar(formData: FormData): Promise<UploadAvatarResponse> {
  const web = Platform.OS === 'web';
  const { data } = await apiClient.post<UploadAvatarResponse>('/uploads/avatar', formData, {
    // Native: React Native's XHR builds the multipart body and adds the boundary for this content type.
    // Web: never set it by hand, the browser must add the boundary itself.
    ...(web ? {} : { headers: { 'Content-Type': 'multipart/form-data' } }),
    // Hand the FormData over untouched (no JSON/urlencoded serialization).
    transformRequest: (body) => body,
  });
  return data;
}

export interface UpdateUsernamePayload {
  username: string;
}

/** PATCH /user/username */
export async function updateUsername(payload: UpdateUsernamePayload): Promise<User> {
  const { data } = await apiClient.patch<User>('/user/username', payload);
  return data;
}

export interface UpdateEmailPayload {
  email: string;
  /** required by the server: changing the e-mail needs the current password */
  currentPassword: string;
}

/** PATCH /user/email */
export async function updateEmail(payload: UpdateEmailPayload): Promise<User> {
  const { data } = await apiClient.patch<User>('/user/email', payload);
  return data;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

/**
 * PATCH /user/password
 * The backend revokes all OTHER sessions (tokenVersion) and returns a fresh token for this device,
 * which is saved here so the user stays signed in.
 */
export async function changePassword(payload: ChangePasswordPayload): Promise<{ token?: string }> {
  const { data } = await apiClient.patch<{ success: boolean; token?: string }>('/user/password', payload);
  if (data?.token) await saveToken(data.token);
  return { ...(data?.token ? { token: data.token } : {}) };
}

/** DELETE /users/me/avatar -> the user without a photo (the app shows initials) */
export async function resetAvatar(): Promise<User> {
  const { data } = await apiClient.delete<{ success: boolean; user: User }>('/users/me/avatar');
  return data.user;
}

export interface UserStats {
  sessions: number;
  friends: number;
  groups: number;
}

/** GET /user/stats */
export async function getUserStats(): Promise<UserStats> {
  const { data } = await apiClient.get<UserStats>('/user/stats');
  return data;
}

/** DELETE /user/delete (password confirmation required). Removes the account and its data. */
export async function deleteAccount(payload: { password: string }): Promise<void> {
  await apiClient.delete('/user/delete', { data: payload });
}
