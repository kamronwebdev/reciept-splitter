import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/ui/typography';
import { Button } from '@/shared/ui/Button';
import { useAppTheme } from '@/shared/theme/useAppTheme';
import AppIcon from '@/shared/ui/AppIcon';
import { Appear, IndeterminateBar, Pop, Pulse } from '@/shared/ui/motion';

type Props = {
  /** 'preparing' (resizing), 'uploading' (sending the photo), 'reading' (server is reading the items) */
  phase: 'preparing' | 'uploading' | 'reading';
  uploadFraction: number;
  onCancel: () => void;
};

const ORDER = ['preparing', 'uploading', 'reading'] as const;

/**
 * Full-screen progress with the current step and a Cancel button (aborts the request).
 * The receipt icon breathes, the bar fills during the upload and glides while the items are read,
 * finished steps pop a check. No spinners.
 */
export default function ProcessingStage({ phase, uploadFraction, onCancel }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const current = ORDER.indexOf(phase);
  const uploading = phase === 'uploading' && uploadFraction > 0 && uploadFraction < 1;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: insets.bottom }}>
      <Pulse style={{ width: 88, height: 88, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft }}>
        <AppIcon name="receipt" size={40} color="$primaryText" />
      </Pulse>
      <YStack mt="$6" w="100%" maxWidth={320}>
        <IndeterminateBar fraction={uploading ? uploadFraction : undefined} accessibilityLabel={t(`receipt.scan.phase.${phase}`, phase)} />
      </YStack>
      <YStack mt="$5" gap="$3" w="100%" maxWidth={320} accessibilityLiveRegion="polite">
        {ORDER.map((step, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <Appear key={step} index={i}>
              <YStack flexDirection="row" ai="center" gap="$3" opacity={active || done ? 1 : 0.4}>
                <Pop trigger={done}>
                  <YStack w={24} h={24} br={12} ai="center" jc="center" backgroundColor={done ? '$primary' : active ? '$primarySoft' : '$surfaceAlt'}>
                    {done ? <AppIcon name="check" size={14} color="$onPrimary" /> : active ? <YStack w={8} h={8} br={4} backgroundColor="$primary" /> : null}
                  </YStack>
                </Pop>
                <Text fontSize={17} fontWeight={active ? '700' : '500'} color="$text">
                  {t(`receipt.scan.phase.${step}`, step)}
                  {step === 'uploading' && active && uploading ? ` ${Math.round(uploadFraction * 100)}%` : ''}
                </Text>
              </YStack>
            </Appear>
          );
        })}
      </YStack>
      <YStack mt="$8" w="100%" maxWidth={320}>
        <Button title={t('common.cancel', 'Cancel')} variant="secondary" size="large" onPress={onCancel} />
      </YStack>
    </View>
  );
}
