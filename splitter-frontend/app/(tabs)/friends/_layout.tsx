import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LARGE_TITLE, useStackOptions } from '@/shared/lib/navigation/stack-options';

export default function FriendsStack() {
  const { t } = useTranslation();
  return (
    <Stack screenOptions={useStackOptions()}>
      <Stack.Screen name="index" options={{ ...LARGE_TITLE, title: t('friends.title') }} />
      <Stack.Screen name="search" options={{ title: t('friends.addTitle') }} />
      <Stack.Screen name="requests" options={{ title: t('friends.qr.requestsLink') }} />
    </Stack>
  );
}
