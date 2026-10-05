import axios, { AxiosError } from 'axios';
import { getToken } from '@/shared/lib/utils/token-storage';
import { emitUnauthorized } from '@/shared/api/auth-events';
import { resolveApiUrl } from '@/shared/api/api-url';

export const API_URL = resolveApiUrl();

/** Error thrown by the API client; keeps the HTTP status for callers. */
export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    if (status !== undefined) this.status = status;
  }
}

export const apiClient = axios.create({
  baseURL: API_URL,
  // Free hosting (Render) can take up to ~60s to wake up; do not hang forever.
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
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
  try {
    const existing =
      (config.headers as any)?.Authorization ??
      (typeof (config.headers as any)?.get === 'function' ? (config.headers as any).get('Authorization') : undefined);
    const token = existing ? null : await getToken();
    if (token) {
      const headers: any = config.headers ?? {};
      if (typeof headers.set === 'function') {
        headers.set('Authorization', `Bearer ${token}`);
        // Robust FormData detection: some RN environments don't satisfy `instanceof FormData`.
        const isFormData = !!(
          config.data &&
          (typeof (config.data as any).append === 'function' || (typeof FormData !== 'undefined' && config.data instanceof FormData))
        );
        if (!isFormData) {
          headers.set('Content-Type', headers.get?.('Content-Type') ?? 'application/json');
        }
      } else {
        const isFormData = !!(
          config.data &&
          (typeof (config.data as any).append === 'function' || (typeof FormData !== 'undefined' && config.data instanceof FormData))
        );
        config.headers = {
          ...headers,
          Authorization: `Bearer ${token}`,
          ...(isFormData ? {} : { 'Content-Type': headers['Content-Type'] ?? 'application/json' }),
        };
      }
    }
  } catch {
    // If token retrieval fails we keep going; request will likely return 401.
  }

  if (__DEV__) {
    const method = (config.method || 'GET').toUpperCase();
    const url = `${config.baseURL}${config.url}`;
    console.log(`[API] ${method} ${url}`);
    if (config.params) console.log('[API] Params:', config.params);
    if (config.data) console.log('[API] Request data:', redact(config.data));
    const hasAppend = !!(config.data && typeof (config.data as any).append === 'function');
    console.log('[API] Request isFormData by append:', hasAppend);
    try {
      const ct = (config.headers && (config.headers as any)['Content-Type']) || (config.headers && typeof (config.headers as any).get === 'function' && (config.headers as any).get('Content-Type'));
      console.log('[API] Request Content-Type header (interceptor):', ct);
    } catch (e) {
      console.warn('[API] cannot read Content-Type header in interceptor', e);
    }
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log('[API] Response:', response.data);
      console.log('[API] Status:', response.status);
    }
    return response;
  },
  (error: AxiosError<any>) => {
    if (__DEV__) {
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

      if (status === 401) {
        // Only a rejected *authenticated* request means the session is dead.
        // A wrong password on /auth/login must not log the user out or redirect.
        const url = String(error.config?.url || '');
        const hadToken = !!(error.config?.headers as any)?.Authorization ||
          typeof (error.config?.headers as any)?.get === 'function' &&
            !!(error.config?.headers as any).get('Authorization');
        const isCredentialCall = /\/auth\/(login|register)$/.test(url);
        if (hadToken && !isCredentialCall) emitUnauthorized();
        throw new ApiError(serverMsg || 'Authorization failed', status);
      }
      if (status >= 500) {
        throw new ApiError(serverMsg || 'Server error. Please try again later.', status);
      }
      throw new ApiError(serverMsg || `Request failed (${status})`, status);
    } else if (error.code === 'ECONNABORTED') {
      throw new ApiError('The request timed out. Please try again.');
    } else if (error.request) {
      throw new ApiError('Network error. Please check your connection and server address.');
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
 * Uploads a new avatar file and returns the CDN URL.
 */
export interface UploadAvatarResponse {
  success: boolean;
  avatarUrl: string;
  key: string;
}

export async function uploadAvatar(formData: FormData): Promise<UploadAvatarResponse> {
  const { data } = await apiClient.post<UploadAvatarResponse>('/uploads/avatar', formData);
  return data;
}

export interface UpdateAvatarPayload {
  avatarUrl: string;
}

/**
 * PATCH /users/me/avatar
 * Updates the current user's avatar URL.
 */
export async function updateAvatar(payload: UpdateAvatarPayload): Promise<User> {
  const response = await apiClient.patch<User | null>('/users/me/avatar', payload);
  if (response.data) {
    return response.data;
  }
  return getCurrentUser();
}

export interface UpdateUsernamePayload {
  username: string;
}

/**
 * PATCH /user/username
 * Updates the current user's username.
 */
export async function updateUsername(payload: UpdateUsernamePayload): Promise<User> {
  const response = await apiClient.patch<User | null>('/user/username', payload);
  if (response.data) {
    return response.data;
  }
  return getCurrentUser();
}

export interface UpdateEmailPayload {
  email: string;
}

/**
 * PATCH /user/email
 * Updates the current user's email address.
 */
export async function updateEmail(payload: UpdateEmailPayload): Promise<User> {
  const response = await apiClient.patch<User | null>('/user/email', payload);
  if (response.data) {
    return response.data;
  }
  return getCurrentUser();
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

/**
 * PATCH /user/password
 * Changes the current user's password.
 */
export async function changePassword(payload: ChangePasswordPayload): Promise<void> {
  await apiClient.patch('/user/password', payload);
}

/**
 * DELETE /users/me/avatar
 * Resets the current user's avatar to default (null in DB).
 */
export async function resetAvatar(): Promise<User> {
  const response = await apiClient.delete<User | null>('/users/me/avatar');
  if (response.data) {
    return response.data;
  }
  return getCurrentUser();
}
