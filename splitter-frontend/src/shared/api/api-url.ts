import Constants from 'expo-constants';
import { Platform } from 'react-native';

const BACKEND_PORT = 3001;
const PRODUCTION_URL = 'https://splitter-backend-qeig.onrender.com';

/**
 * API base URL resolution order:
 *  1. EXPO_PUBLIC_API_URL (explicit, trailing slashes removed)
 *  2. In development: the machine that serves the Expo bundle (works on a real phone in Expo Go)
 *  3. Production backend
 * `localhost` is never used on devices: it points to the phone itself.
 */
export function resolveApiUrl(): string {
  const explicit = (process.env.EXPO_PUBLIC_API_URL || '').trim().replace(/\/+$/, '');
  if (explicit) return explicit;

  if (__DEV__) {
    const hostUri: string | undefined =
      (Constants.expoConfig as any)?.hostUri ?? (Constants as any).expoGoConfig?.debuggerHost;
    const host = hostUri?.split(':')[0];
    if (host) return `http://${host}:${BACKEND_PORT}`;
    if (Platform.OS === 'web') return `http://localhost:${BACKEND_PORT}`;
  }
  return PRODUCTION_URL;
}
