import React, { useState } from 'react';
import { Linking } from 'react-native';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import Section from '@/shared/ui/Section';
import Screen from '@/shared/ui/Screen';
import Banner from '@/shared/ui/Banner';
import { IconTile, ListRow, ListSection } from '@/shared/ui/List';
import { LanguageSegmentedControl } from '@/shared/ui/LanguageSegmentedControl';
import { useAppStore } from '@/shared/lib/stores/app-store';
import AppearanceSection from '@/features/settings/ui/AppearanceSection';
import AppIcon from '@/shared/ui/AppIcon';

const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL || 'support@example.com';

/** Settings: Appearance, Language, About. (Profile data lives on the Profile screen.) */
export default function SettingsScreen() {
  const { t } = useTranslation();
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
    <Screen>
      <AppearanceSection />

      <Section title={t('settings.language.title', 'Language')} description={t('settings.language.description', 'Choose the language used across the app.')}>
        <LanguageSegmentedControl value={language} onChange={setLanguage} getLabel={(code, fallback) => t(`settings.language.options.${code}`, fallback)} />
      </Section>

      <ListSection header={t('settings.about.title', 'About')}>
        <ListRow key="version" title={t('settings.about.version', 'Version')} value={`${version}${build}`} />
        <ListRow
          key="support"
          left={
            <IconTile color="$primaryText">
              <AppIcon name="mail" size={17} color="#FFFFFF" />
            </IconTile>
          }
          title={t('settings.about.support', 'Support & feedback')}
          chevron
          onPress={openSupport}
        />
      </ListSection>
      {mailError && <Banner kind="info" message={t('settings.about.mailFailed', { email: SUPPORT_EMAIL, defaultValue: 'Could not open your mail app. Write to {{email}}.' })} />}
    </Screen>
  );
}
