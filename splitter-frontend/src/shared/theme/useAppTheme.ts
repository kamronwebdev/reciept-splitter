import { useEffect } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { palettes, type Palette, type Scheme } from './palette';

export interface AppTheme {
  scheme: Scheme;
  isDark: boolean;
  colors: Palette;
}

/** Resolved scheme: the user's choice, or the phone's setting (live) when the choice is "System". */
export function useResolvedScheme(): Scheme {
  const mode = useAppStore((s) => s.themeMode);
  const system = useColorScheme();
  if (mode === 'light' || mode === 'dark') return mode;
  return system === 'dark' ? 'dark' : 'light';
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
