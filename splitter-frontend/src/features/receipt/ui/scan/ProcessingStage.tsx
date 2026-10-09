import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/ui/typography';
import { Button } from '@/shared/ui/Button';
import { useAppTheme } from '@/shared/theme/useAppTheme';
import AppIcon from '@/shared/ui/AppIcon';

type Props = {
  /** 'preparing' (resizing), 'uploading' (sending the photo), 'reading' (server is reading the items) */
  phase: 'preparing' | 'uploading' | 'reading';
  uploadFraction: number;
  onCancel: () => void;
};

const ORDER = ['preparing', 'uploading', 'reading'] as const;

/** Full-screen loader with the current step and a Cancel button (aborts the request). */
export default function ProcessingStage({ phase, uploadFraction, onCancel }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const current = ORDER.indexOf(phase);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: insets.bottom }}>
      <ActivityIndicator size="large" color={colors.primary} />
      <YStack mt="$6" gap="$3" w="100%" maxWidth={320} accessibilityLiveRegion="polite">
        {ORDER.map((step, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <YStack key={step} flexDirection="row" ai="center" gap="$3" opacity={active || done ? 1 : 0.4}>
              <YStack w={24} h={24} br={12} ai="center" jc="center" backgroundColor={done ? '$primary' : '$surfaceAlt'}>
                {done ? <AppIcon name="check" size={14} color="$onPrimary" /> : active ? <ActivityIndicator size="small" color={colors.primary} /> : null}
              </YStack>
              <Text fontSize={17} fontWeight={active ? '700' : '500'} color="$text">
                {t(`receipt.scan.phase.${step}`, step)}
                {step === 'uploading' && active && uploadFraction > 0 && uploadFraction < 1 ? ` ${Math.round(uploadFraction * 100)}%` : ''}
              </Text>
            </YStack>
          );
        })}
      </YStack>
      <YStack mt="$8" w="100%" maxWidth={320}>
        <Button title={t('common.cancel', 'Cancel')} variant="secondary" size="large" onPress={onCancel} />
      </YStack>
    </View>
  );
}
