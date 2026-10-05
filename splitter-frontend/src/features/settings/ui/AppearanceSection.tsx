import React from 'react';
import { XStack, YStack } from 'tamagui';
import { Moon, Smartphone, Sun } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/ui/typography';
import Section from '@/shared/ui/Section';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { fontFace } from '@/shared/theme/fonts';
import { FONT_FAMILIES, TEXT_SCALES, TEXT_SCALE_VALUE, THEME_MODES, type AppFontFamily, type ThemeMode } from '@/shared/theme/types';
import OptionCard from './OptionCard';

const THEME_ICON = { system: Smartphone, light: Sun, dark: Moon } as const;

function SubTitle({ children }: { children: string }) {
  return (
    <Text fontSize={13} fontWeight="700" color="$textMuted" textTransform="uppercase" letterSpacing={0.6} accessibilityRole="header">
      {children}
    </Text>
  );
}

/** Theme (System/Light/Dark), font (3 preview cards) and text size. All apply instantly and persist. */
export default function AppearanceSection() {
  const { t } = useTranslation();
  const themeMode = useAppStore((s) => s.themeMode);
  const setThemeMode = useAppStore((s) => s.setThemeMode);
  const fontFamily = useAppStore((s) => s.fontFamily);
  const setFontFamily = useAppStore((s) => s.setFontFamily);
  const textScale = useAppStore((s) => s.textScale);
  const setTextScale = useAppStore((s) => s.setTextScale);
  const language = useAppStore((s) => s.language);

  return (
    <Section title={t('settings.appearance.title', 'Appearance')}>
      {/* THEME */}
      <YStack gap="$2">
        <SubTitle>{t('settings.appearance.theme.title', 'Theme')}</SubTitle>
        <XStack gap="$2" accessibilityRole="radiogroup">
          {THEME_MODES.map((mode: ThemeMode) => {
            const Icon = THEME_ICON[mode];
            const label = t(`settings.appearance.theme.${mode}`, mode);
            return (
              <OptionCard key={mode} selected={themeMode === mode} onPress={() => setThemeMode(mode)} label={label}>
                <Icon size={20} color={themeMode === mode ? '$primaryText' : '$textMuted'} />
                <Text fontSize={13} fontWeight="600" color="$text">
                  {label}
                </Text>
              </OptionCard>
            );
          })}
        </XStack>
        <Text fontSize={12} color="$textSubtle">
          {t('settings.appearance.theme.hint', 'System follows your phone and updates automatically.')}
        </Text>
      </YStack>

      {/* FONT */}
      <YStack gap="$2" pt="$2">
        <SubTitle>{t('settings.appearance.font.title', 'Font')}</SubTitle>
        <YStack gap="$2" accessibilityRole="radiogroup">
          {FONT_FAMILIES.map((family: AppFontFamily) => {
            const name = t(`settings.appearance.font.${family}`, family);
            const desc = t(`settings.appearance.font.${family}Desc`, '');
            return (
              <OptionCard key={family} selected={fontFamily === family} onPress={() => setFontFamily(family)} label={`${name}, ${desc}`}>
                <XStack ai="center" gap="$3" w="100%" pr="$4">
                  {/* each preview is rendered in ITS font, whatever the current setting is */}
                  <Text fontFamily={fontFace(family, 700) as any} fontSize={30} color="$text" w={56} ta="center">
                    Aa
                  </Text>
                  <YStack f={1}>
                    <Text fontFamily={fontFace(family, 600) as any} fontSize={16} color="$text" numberOfLines={1}>
                      {t('settings.appearance.font.preview', 'Receipt Splitter')}
                    </Text>
                    <Text fontFamily={fontFace(family, 400) as any} fontSize={12} color="$textMuted" numberOfLines={1}>
                      {name} · {desc} · o' g' sh ch
                    </Text>
                  </YStack>
                </XStack>
              </OptionCard>
            );
          })}
        </YStack>
        {language === 'ja' && (
          <Text fontSize={12} color="$textSubtle">
            {t('settings.appearance.font.japaneseNote', 'Japanese uses the system font.')}
          </Text>
        )}
      </YStack>

      {/* TEXT SIZE */}
      <YStack gap="$2" pt="$2">
        <SubTitle>{t('settings.appearance.textSize.title', 'Text size')}</SubTitle>
        <XStack gap="$2" accessibilityRole="radiogroup">
          {TEXT_SCALES.map((scale) => {
            const label = t(`settings.appearance.textSize.${scale}`, scale);
            return (
              <OptionCard key={scale} selected={textScale === scale} onPress={() => setTextScale(scale)} label={label}>
                <Text fontSize={16 * TEXT_SCALE_VALUE[scale]} fontWeight="700" color="$text">
                  Aa
                </Text>
                <Text fontSize={12} color="$textMuted">
                  {label}
                </Text>
              </OptionCard>
            );
          })}
        </XStack>
        <Text fontSize={13} color="$textMuted" numberOfLines={2}>
          {t('settings.appearance.textSize.sample', 'The quick brown fox')}
        </Text>
      </YStack>
    </Section>
  );
}
