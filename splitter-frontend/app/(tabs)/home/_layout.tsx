import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LARGE_TITLE, useStackOptions } from '@/shared/lib/navigation/stack-options';

export default function HomeStack() {
  const { t } = useTranslation();
  return (
    <Stack screenOptions={useStackOptions()}>
      {/* Home draws its own greeting header (name, avatar, bell) */}
      <Stack.Screen name="index" options={{ headerShown: false, title: t('tabs.home') }} />
      <Stack.Screen name="notifications" options={{ title: t('notifications.title') }} />
      <Stack.Screen name="balances" options={{ title: t('balances.title') }} />
      <Stack.Screen name="history/index" options={{ ...LARGE_TITLE, title: t('navigation.history') }} />
      <Stack.Screen name="history/[historyId]" options={{ title: t('navigation.historyDetails') }} />
    </Stack>
  );
}
