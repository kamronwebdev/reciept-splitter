import React from 'react';
import { Pressable } from 'react-native';
import { XStack, YStack } from 'tamagui';
import { Check } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';
import BottomSheet from '@/shared/ui/BottomSheet';
import { Text } from '@/shared/ui/typography';
import { CURRENCIES } from '../../lib/money';

type Props = { visible: boolean; current: string; onClose: () => void; onPick: (code: string) => void };

export default function CurrencySheet({ visible, current, onClose, onPick }: Props) {
  const { t } = useTranslation();
  const list = CURRENCIES.some((c) => c.code === current) ? CURRENCIES : [{ code: current, symbol: current, name: current }, ...CURRENCIES];
  return (
    <BottomSheet visible={visible} onClose={onClose} label={t('receipt.review.currency', 'Currency')}>
      <YStack>
        <Text fontSize={18} fontWeight="700" ta="center" pb="$2" accessibilityRole="header">
          {t('receipt.review.currency', 'Currency')}
        </Text>
        {list.map((c) => (
          <Pressable
            key={c.code}
            onPress={() => {
              onPick(c.code);
              onClose();
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: c.code === current }}
            style={({ pressed }) => ({ minHeight: 52, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}
          >
            <XStack ai="center" jc="space-between">
              <YStack>
                <Text fontSize={16} fontWeight="600" color="$text">
                  {c.code} · {c.symbol}
                </Text>
                <Text fontSize={12} color="$textMuted">
                  {c.name}
                </Text>
              </YStack>
              {c.code === current && <Check size={20} color="$primaryText" />}
            </XStack>
          </Pressable>
        ))}
      </YStack>
    </BottomSheet>
  );
}
