import Constants from 'expo-constants';
import { Platform } from 'react-native';

const BACKEND_PORT = 3001;
const PRODUCTION_URL = 'https://splitter-backend-qeig.onrender.com';

const PRIVATE_LAN_HOST = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/;
const TUNNEL_HOST = /(exp\.direct|ngrok|\.expo\.)/i;

export interface ApiUrlInputs {
  explicit?: string | undefined;
  /** "host:port" of the machine serving the Expo bundle (dev only) */
  hostUri?: string | undefined;
  isDev: boolean;
  isWeb: boolean;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * Pure URL selection (unit-tested).
 *  - Dev + Expo serves from a LAN machine: use that machine's CURRENT IP. A hard-coded private
 *    IP in EXPO_PUBLIC_API_URL is considered stale and ignored, so a changed IP fixes itself.
 *  - Explicit non-LAN URL (e.g. https://...) is always honored.
 *  - Tunnel mode / release builds: hosted backend.
 */
export function pickApiUrl({ explicit, hostUri, isDev, isWeb }: ApiUrlInputs): string {
  const clean = (explicit || '').trim().replace(/\/+$/, '');
  const explicitIsLan = !!clean && PRIVATE_LAN_HOST.test(hostOf(clean));

  if (isDev) {
    const host = hostUri?.split(':')[0];
    if (host && !TUNNEL_HOST.test(host) && (!clean || explicitIsLan)) {
      return `http://${host}:${BACKEND_PORT}`;
    }
  }
  if (clean) return clean;
  if (isDev && isWeb) return `http://localhost:${BACKEND_PORT}`;
  return PRODUCTION_URL;
}

/** Evaluated on every request, so the address follows the Metro host if it changes. */
export function resolveApiUrl(): string {
  const hostUri: string | undefined =
    (Constants.expoConfig as any)?.hostUri ?? (Constants as any).expoGoConfig?.debuggerHost;
  return pickApiUrl({
    explicit: process.env.EXPO_PUBLIC_API_URL,
    hostUri,
    isDev: __DEV__,
    isWeb: Platform.OS === 'web',
  });
}
