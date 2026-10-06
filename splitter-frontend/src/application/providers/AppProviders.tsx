// src/application/providers/AppProviders.tsx
import { ReactNode, useEffect } from 'react';
import { View } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import QueryProvider from './QueryProvider';
import I18nProvider from './I18nProvider';
import { TamaguiProvider } from './TamaguiProvider';
import { AppStoreProvider, useAppStoreHydrated } from '@/shared/lib/stores/app-store';
import { FONT_ASSETS } from '@/shared/theme/fonts';
import { palettes } from '@/shared/theme/palette';
import { useSystemScheme } from '@/shared/theme/useAppTheme';
import { ToastHost } from '@/shared/ui/Toast';
import { ActionSheetHost } from '@/shared/ui/ActionSheet';

// Keep the native splash screen up until fonts and saved settings are ready: no flash of the wrong theme/font.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function AppProviders({ children }: { children: ReactNode }) {
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);
  const hydrated = useAppStoreHydrated();
  const system = useSystemScheme();
  const ready = (fontsLoaded || !!fontError) && hydrated;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) {
    // matches the phone's scheme while the saved choice is still loading
    return <View style={{ flex: 1, backgroundColor: palettes[system].background }} />;
  }

  return (
    <TamaguiProvider>
      <AppStoreProvider>
        <QueryProvider>
          <I18nProvider>
            {children}
            <ToastHost />
            <ActionSheetHost />
          </I18nProvider>
        </QueryProvider>
      </AppStoreProvider>
    </TamaguiProvider>
  );
}
