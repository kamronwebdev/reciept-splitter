import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LARGE_TITLE, useStackOptions } from '@/shared/lib/navigation/stack-options';

export default function GroupsStack() {
  const { t } = useTranslation();
  return (
    <Stack screenOptions={useStackOptions()}>
      <Stack.Screen name="index" options={{ ...LARGE_TITLE, title: t('navigation.groups.title') }} />
      <Stack.Screen name="create" options={{ title: t('navigation.groups.create') }} />
      <Stack.Screen name="[groupId]" options={{ title: t('navigation.groups.details') }} />
      <Stack.Screen name="invite" options={{ title: t('navigation.groupQr') }} />
    </Stack>
  );
}
