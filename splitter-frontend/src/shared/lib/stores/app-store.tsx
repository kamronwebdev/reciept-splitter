import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUser, ApiError } from '@/features/auth/api';
import { queryClient } from '@/shared/config/query-client';
import { useFriendsStore } from '@/features/friends/model/friends.store';
import { useGroupsStore } from '@/features/groups/model/groups.store';
import { useReceiptSessionStore } from '@/features/receipt/model/receipt-session.store';
import { useSessionsHistoryStore } from '@/features/sessions/model/history.store';
import { getToken, removeToken } from '../utils/token-storage';
import type { ThemeMode, AppFontFamily, TextScaleKey } from '@/shared/theme/types';
import type { LanguageCode } from '@/shared/config/languages';
import { DEFAULT_LANGUAGE } from '@/shared/config/languages';

export interface User {
  id: number;
  email: string;
  username: string;
  uniqueId: string;
  avatarUrl: string | null;
}

interface AppStore {
  // Auth state
  token: string | null;
  user: User | null;
  isLoading: boolean;
  /** true once the stored token has been checked on app start */
  isInitialized: boolean;
  /** set when the server rejected our session; the login screen shows a friendly message */
  sessionExpired: boolean;
  /** one-shot success message shown at the top of the app (e.g. after a password reset) */
  flashMessage: string | null;
  
  // App settings
  themeMode: ThemeMode;
  fontFamily: AppFontFamily;
  textScale: TextScaleKey;
  language: LanguageCode;
  
  // Actions
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  setAuth: (token: string, user: User) => void;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  setSessionExpired: (value: boolean) => void;
  setFlashMessage: (message: string | null) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setFontFamily: (family: AppFontFamily) => void;
  setTextScale: (scale: TextScaleKey) => void;
  setLanguage: (language: LanguageCode) => void;
}

/** Clear cached data of the previous account so the next user never sees it. */
function resetUserScopedState() {
  try {
    queryClient.clear();
    useFriendsStore.setState({ friends: [], requestsRaw: null, loading: false, error: undefined });
    useGroupsStore.setState({ groups: [], current: undefined, counts: {}, loading: false, error: undefined });
    useReceiptSessionStore.getState().reset();
    useSessionsHistoryStore.getState().reset();
  } catch (error) {
    console.error('Reset user state error:', error);
  }
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Initial state
      token: null,
      user: null,
      isLoading: false,
      isInitialized: false,
      sessionExpired: false,
      flashMessage: null,
      themeMode: 'system',
      fontFamily: 'inter',
      textScale: 'default',
      language: DEFAULT_LANGUAGE,

      // Auth actions
      setToken: (token: string) => {
        set({ token });
      },

      setUser: (user: User) => {
        set({ user });
      },

      setAuth: (token: string, user: User) => {
        set({ token, user });
      },

      logout: async () => {
        // Always end up logged out locally, even if secure storage fails.
        try {
          await removeToken();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({ token: null, user: null });
          resetUserScopedState();
        }
      },

      initializeAuth: async () => {
        set({ isLoading: true });
        try {
          const token = await getToken();
          if (!token) {
            set({ token: null, user: null });
            return;
          }

          try {
            const currentUser = await getCurrentUser(token);
            set({ token, user: currentUser });
          } catch (error) {
            console.error('Current user fetch error:', error);
            if (error instanceof ApiError && error.status === 401) {
              // Token expired / invalid: drop it.
              await removeToken().catch(() => undefined);
              set({ token: null, user: null, sessionExpired: true });
            } else {
              // Offline or server down: keep the session, profile will load later.
              set({ token, user: get().user });
            }
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          set({ token: null, user: null });
        } finally {
          set({ isLoading: false, isInitialized: true });
        }
      },

      setSessionExpired: (sessionExpired) => set({ sessionExpired }),
      setFlashMessage: (flashMessage) => set({ flashMessage }),

      // App settings actions
      setThemeMode: (themeMode) => set({ themeMode }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setTextScale: (textScale) => set({ textScale }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'app-store',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      // v1 stored a never-changeable `theme: 'light'`; the new default follows the phone setting.
      migrate: (persisted: any) => {
        const { theme: _legacy, ...rest } = persisted ?? {};
        return { ...rest, themeMode: rest.themeMode ?? 'system' };
      },
      partialize: (state) => ({
        themeMode: state.themeMode,
        fontFamily: state.fontFamily,
        textScale: state.textScale,
        language: state.language,
        // Не сохраняем токен и пользователя в AsyncStorage, 
        // так как токен сохраняется отдельно в SecureStore
      }),
    }
  )
);

/** true once persisted settings (theme, font, language...) were read from storage. */
export function useAppStoreHydrated(): boolean {
  const [hydrated, setHydrated] = useState(useAppStore.persist.hasHydrated());
  useEffect(() => {
    if (useAppStore.persist.hasHydrated()) setHydrated(true);
    return useAppStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);
  return hydrated;
}

// Provider component for initialization
import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { onUnauthorized } from '@/shared/api/auth-events';

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const initializeAuth = useAppStore((s) => s.initializeAuth);
  const logout = useAppStore((s) => s.logout);
  const router = useRouter();
  const markSessionExpired = () => useAppStore.getState().setSessionExpired(true);
  
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    const unsubscribe = onUnauthorized(async () => {
      // Several parallel requests can fail with 401 at once; handle the first only.
      if (!useAppStore.getState().token) return;
      await logout();
      markSessionExpired();
      router.replace('/login');
    });
    return unsubscribe;
  }, [logout, router]);
  
  return <>{children}</>;
}
