import { Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Settings } from '@tamagui/lucide-icons';
import { LARGE_TITLE, useStackOptions } from '@/shared/lib/navigation/stack-options';
import { useAppTheme } from '@/shared/theme/useAppTheme';
import AppIcon from '@/shared/ui/AppIcon';

function SettingsButton() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  return (
    <Pressable onPress={() => router.push('/profile/settings')} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('settings.title')} style={{ padding: 4 }}>
      <AppIcon sf="gearshape" fallback={Settings} color={colors.primaryText} size={22} />
    </Pressable>
  );
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
