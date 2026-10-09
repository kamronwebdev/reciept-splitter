import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, ThemeProvider, DarkTheme, DefaultTheme } from 'expo-router';
import AppProviders from '../src/application/providers/AppProviders';
import { useAppTheme } from '@/shared/theme/useAppTheme';

/** Navigation chrome (headers, screen backgrounds, back buttons) follows the app theme. */
function ThemedStack() {
  const { isDark, colors } = useAppTheme();
  const base = isDark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primaryText,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
      notification: colors.primary,
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false, gestureEnabled: false }} />
        {/* the receipt flow and the QR scanner cover the tab bar (full-screen modals) */}
        <Stack.Screen name="receipt" options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="scan-invite" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="my-qr" options={{ presentation: 'modal', title: '' }} />
        <Stack.Screen name="login" options={{ title: '' }} />
        <Stack.Screen name="register" options={{ title: '' }} />
        <Stack.Screen name="forgot-password" options={{ title: '' }} />
        <Stack.Screen name="reset-code" options={{ title: '' }} />
        <Stack.Screen name="reset-password" options={{ title: '', gestureEnabled: false }} />
        <Stack.Screen name="f/[code]" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProviders>
        <ThemedStack />
      </AppProviders>
    </GestureHandlerRootView>
  );
}
