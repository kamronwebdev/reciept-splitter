import { useEffect, useState } from 'react';
import { Appearance, Platform, useColorScheme } from 'react-native';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { palettes, type Palette, type Scheme } from './palette';

export interface AppTheme {
  scheme: Scheme;
  isDark: boolean;
  colors: Palette;
}

function webScheme(): Scheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * The phone's (or browser's) current scheme, updated live. Native uses RN's hook; on web we listen to
 * matchMedia directly (react-native-web's hook does not reliably re-render when the OS setting flips).
 */
export function useSystemScheme(): Scheme {
  const native = useColorScheme();
  const [web, setWeb] = useState<Scheme>(webScheme);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setWeb(query.matches ? 'dark' : 'light');
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return Platform.OS === 'web' ? web : native === 'dark' ? 'dark' : 'light';
}

/** Resolved scheme: the user's choice, or the phone's setting (live) when the choice is "System". */
export function useResolvedScheme(): Scheme {
  const mode = useAppStore((s) => s.themeMode);
  const system = useSystemScheme();
  if (mode === 'light' || mode === 'dark') return mode;
  return system;
}

/** Colors for places that cannot use Tamagui tokens (StyleSheet, native headers, ActivityIndicator...). */
export function useAppTheme(): AppTheme {
  const scheme = useResolvedScheme();
  return { scheme, isDark: scheme === 'dark', colors: palettes[scheme] };
}

/**
 * Keeps native chrome (alerts, keyboards, date pickers) in sync with the in-app choice.
 * "System" hands control back to the phone.
 */
export function useSyncNativeAppearance() {
  const mode = useAppStore((s) => s.themeMode);
  useEffect(() => {
    try {
      Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode);
    } catch {
      // not supported on this platform: in-app colors still follow the chosen mode
    }
  }, [mode]);
}
