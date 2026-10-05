import React from 'react';
import { XStack, YStack } from 'tamagui';
import { Check } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/ui/typography';
import type { ReceiptStep } from '../model/receipt-session.store';

const STEPS: ReceiptStep[] = ['scan', 'items', 'people', 'split', 'summary'];

/** Scan · Items · People · Split · Done. Simple dots with labels; the current step is highlighted. */
export default function StepIndicator({ current }: { current: ReceiptStep }) {
  const { t } = useTranslation();
  const index = STEPS.indexOf(current);
  return (
    <XStack ai="flex-start" jc="space-between" accessibilityRole="progressbar" accessibilityLabel={t(`receipt.steps.${current}`, current)} accessibilityValue={{ min: 1, max: STEPS.length, now: index + 1 }}>
      {STEPS.map((step, i) => {
        const done = i < index;
        const active = i === index;
        return (
          <YStack key={step} f={1} ai="center" gap="$1">
            <XStack ai="center" w="100%">
              <YStack f={1} h={2} backgroundColor={i === 0 ? 'transparent' : i <= index ? '$primary' : '$borderColor'} />
              <YStack
                w={24}
                h={24}
                br={12}
                ai="center"
                jc="center"
                backgroundColor={done || active ? '$primary' : '$surfaceAlt'}
                borderWidth={active ? 0 : 1}
                borderColor="$borderColor"
              >
                {done ? (
                  <Check size={14} color="$onPrimary" />
                ) : (
                  <Text fontSize={12} fontWeight="700" color={active ? '$onPrimary' : '$textSubtle'}>
                    {i + 1}
                  </Text>
                )}
              </YStack>
              <YStack f={1} h={2} backgroundColor={i === STEPS.length - 1 ? 'transparent' : i < index ? '$primary' : '$borderColor'} />
            </XStack>
            <Text fontSize={11} fontWeight={active ? '700' : '500'} color={active ? '$text' : '$textMuted'} numberOfLines={1}>
              {t(`receipt.steps.${step}`, step)}
            </Text>
          </YStack>
        );
      })}
    </XStack>
  );
}
