import { Stack } from 'expo-router';
import AppProviders from '../src/application/providers/AppProviders';

export default function RootLayout() {
  return (
    <AppProviders>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="tabs" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="login" options={{ title: 'Login' }} />
        <Stack.Screen name="register" options={{ title: 'Register' }} />
        <Stack.Screen name="forgot-password" options={{ title: '' }} />
        <Stack.Screen name="reset-code" options={{ title: '' }} />
        <Stack.Screen name="reset-password" options={{ title: '', gestureEnabled: false }} />
      </Stack>
    </AppProviders>
  );
}