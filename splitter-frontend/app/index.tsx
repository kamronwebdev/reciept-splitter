// app/index.tsx - улучшенная Welcome страница
import React from 'react';
import { Redirect, Link } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SCREEN_MARGIN, SPACE } from '@/shared/theme/spacing';
import { YStack, XStack } from 'tamagui';
import { Text } from '@/shared/ui/typography';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { LANGUAGE_OPTIONS, type LanguageCode } from '@/shared/config/languages';
import { Button } from '@/shared/ui/Button';
import { useAppTheme } from '@/shared/theme/useAppTheme';
import { ScreenContainer } from '@/shared/ui/ScreenContainer';
import AppIcon from '@/shared/ui/AppIcon';

const languages = LANGUAGE_OPTIONS.map((option) => ({
  code: option.code,
  name: option.shortLabel,
}));

export default function Welcome() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const token = useAppStore((state) => state.token);
  const isInitialized = useAppStore((state) => state.isInitialized);
  const sessionExpired = useAppStore((state) => state.sessionExpired);
  const { t } = useTranslation();
  const currentLanguage = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);

  // Wait until the stored token is checked, otherwise the welcome screen flashes for logged-in users
  if (!isInitialized) {
    return (
      <ScreenContainer>
        <YStack flex={1} justifyContent="center" alignItems="center">
          <ActivityIndicator size="large" color={colors.primary} />
        </YStack>
      </ScreenContainer>
    );
  }

  // Если уже залогинен — сразу в табы
  if (token) return <Redirect href="/home" />;

  // The stored session was rejected by the server: explain it on the login screen
  if (sessionExpired) return <Redirect href="/login" />;

  const changeLanguage = (langCode: LanguageCode) => {
    if (langCode === currentLanguage) return;
    setLanguage(langCode);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: SCREEN_MARGIN, paddingTop: insets.top + SPACE.m, paddingBottom: insets.bottom + SPACE.xl, gap: SPACE.xl }}
    >
      {/* language: compact segmented pill, top right */}
      <XStack jc="flex-end">
        <XStack backgroundColor="$surfaceAlt" borderRadius={999} p={2} accessibilityRole="radiogroup">
          {languages.map((lang) => {
            const selected = currentLanguage === lang.code;
            return (
              <Pressable key={lang.code} onPress={() => changeLanguage(lang.code)} accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={lang.name} hitSlop={4}>
                <YStack minWidth={44} height={32} px="$3" borderRadius={999} ai="center" jc="center" backgroundColor={selected ? '$surface' : 'transparent'}>
                  <Text variant="footnote" fontWeight="600" color={selected ? '$text' : '$textMuted'}>
                    {lang.name}
                  </Text>
                </YStack>
              </Pressable>
            );
          })}
        </XStack>
      </XStack>

      {/* hero */}
      <YStack f={1} jc="center" ai="center" gap="$6">
        <YStack ai="center" gap="$4">
          <YStack width={88} height={88} borderRadius={22} backgroundColor="$primary" ai="center" jc="center">
            <AppIcon name="scan" size={44} color="$onPrimary" />
          </YStack>
          <YStack ai="center" gap="$2">
            <Text variant="title1" ta="center">
              {t('app.name', 'Receipt Splitter')}
            </Text>
            <Text variant="body" color="$textMuted" ta="center" maxWidth={300}>
              {t('app.subtitle', 'Split bills easily with friends')}
            </Text>
          </YStack>
        </YStack>

        {/* what it does: three outline icons with short labels (no tiles) */}
        <XStack gap="$4" jc="center" w="100%">
          {[
            { icon: 'scan' as const, text: t('features.scan', 'Scan') },
            { icon: 'friends' as const, text: t('features.split', 'Split') },
            { icon: 'wallet' as const, text: t('features.calculate', 'Calculate') },
          ].map((feature) => (
            <YStack key={feature.icon} f={1} maxWidth={110} ai="center" gap="$2">
              <AppIcon name={feature.icon} size={24} color="$primaryText" />
              <Text variant="footnote" color="$textMuted" ta="center" numberOfLines={2}>
                {feature.text}
              </Text>
            </YStack>
          ))}
        </XStack>
      </YStack>

      {/* actions: one primary, one secondary, both full width */}
      <YStack gap="$3">
        <Text variant="headline" ta="center">
          {t('welcome.message', "Welcome! Let's get started")}
        </Text>
        <Link href="/register" asChild>
          <Button title={t('auth.createAccount', 'Create Account')} variant="primary" size="large" />
        </Link>
        <Text variant="footnote" color="$textMuted" ta="center" pt="$2">
          {t('welcome.existingUser', 'Already have an account?')}
        </Text>
        <Link href="/login" asChild>
          <Button title={t('auth.signIn', 'Sign In')} variant="outline" size="large" />
        </Link>
      </YStack>
    </ScrollView>
  );
}
