import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import HeaderButton from '@/shared/ui/HeaderButton';
import { LARGE_TITLE, useStackOptions } from '@/shared/lib/navigation/stack-options';

function SettingsButton() {
  const router = useRouter();
  const { t } = useTranslation();
  return <HeaderButton icon="settings" accessibilityLabel={t('settings.title')} onPress={() => router.push('/profile/settings')} />;
}

export default function ProfileStack() {
  const { t } = useTranslation();
  return (
    <Stack screenOptions={useStackOptions()}>
      <Stack.Screen name="index" options={{ ...LARGE_TITLE, title: t('profile.title'), headerRight: () => <SettingsButton /> }} />
      <Stack.Screen name="settings" options={{ title: t('settings.title') }} />
    </Stack>
  );
}
