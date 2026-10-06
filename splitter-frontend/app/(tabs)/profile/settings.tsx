import React, { useState } from 'react';
import { Linking, Pressable, ScrollView } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { XStack, YStack } from 'tamagui';
import { ChevronRight, Mail } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/ui/typography';
import Section from '@/shared/ui/Section';
import UserAvatar from '@/shared/ui/UserAvatar';
import Banner from '@/shared/ui/Banner';
import { LanguageSegmentedControl } from '@/shared/ui/LanguageSegmentedControl';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { useAppTheme } from '@/shared/theme/useAppTheme';
import AppearanceSection from '@/features/settings/ui/AppearanceSection';

const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL || 'support@example.com';

function Row({ label, value, onPress, icon }: { label: string; value?: string; onPress?: () => void; icon?: React.ReactNode }) {
  const content = (
    <XStack ai="center" jc="space-between" minHeight={48} gap="$3">
      <XStack ai="center" gap="$2" f={1}>
        {icon}
        <Text fontSize={15} color="$text" numberOfLines={1}>
          {label}
        </Text>
      </XStack>
      {!!value && (
        <Text fontSize={14} color="$textMuted">
          {value}
        </Text>
      )}
      {onPress && <ChevronRight size={18} color="$textSubtle" />}
    </XStack>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      {content}
    </Pressable>
  );
}

/** Settings: Appearance, Language, Account, About. (Profile data lives on the Profile screen only.) */
export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useAppTheme();
  const user = useAppStore((s) => s.user);
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const [mailError, setMailError] = useState(false);

  const version = Constants.expoConfig?.version ?? '1.0.0';
  const build = Constants.nativeBuildVersion ? ` (${Constants.nativeBuildVersion})` : '';

  const openSupport = async () => {
    setMailError(false);
    const subject = encodeURIComponent(t('settings.about.supportSubject', 'Receipt Splitter feedback'));
    try {
      await Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}`);
    } catch {
      setMailError(true);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}
      keyboardShouldPersistTaps="handled"
    >
      <AppearanceSection />

      <Section title={t('settings.language.title', 'Language')} description={t('settings.language.description', 'Choose the language used across the app.')}>
        <LanguageSegmentedControl
          value={language}
          onChange={setLanguage}
          getLabel={(code, fallback) => t(`settings.language.options.${code}`, fallback)}
        />
      </Section>

      <Section title={t('settings.account.title', 'Account')}>
        <Pressable
          onPress={() => router.push('/profile')}
          accessibilityRole="button"
          accessibilityLabel={t('settings.account.profile', 'Profile & security')}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <XStack ai="center" gap="$3" minHeight={56}>
            <UserAvatar uri={user?.avatarUrl} label={user?.username ?? '?'} seed={user?.uniqueId} size={44} />
            <YStack f={1} ai="flex-start">
              <Text fontSize={15} fontWeight="700" color="$text" numberOfLines={1}>
                {user?.username ?? t('profile.labels.guest', 'Guest')}
              </Text>
              <Text fontSize={12} color="$textMuted" numberOfLines={1}>
                {t('settings.account.profileHint', 'Photo, username, email, password')}
              </Text>
            </YStack>
            <ChevronRight size={18} color="$textSubtle" />
          </XStack>
        </Pressable>
      </Section>

      <Section title={t('settings.about.title', 'About')}>
        <Row label={t('settings.about.version', 'Version')} value={`${version}${build}`} />
        <Row
          label={t('settings.about.support', 'Support & feedback')}
          icon={<Mail size={18} color="$textMuted" />}
          onPress={openSupport}
        />
        {mailError && (
          <Banner kind="info" message={t('settings.about.mailFailed', { email: SUPPORT_EMAIL, defaultValue: 'Could not open your mail app. Write to {{email}}.' })} />
        )}
      </Section>
    </ScrollView>
  );
}
