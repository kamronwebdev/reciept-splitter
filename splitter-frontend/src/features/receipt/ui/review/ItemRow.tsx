import React from 'react';
import { Pressable } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { XStack, YStack } from 'tamagui';
import { ChevronRight, Trash2 } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/ui/typography';
import { useAppTheme } from '@/shared/theme/useAppTheme';
import { formatMoney } from '../../lib/money';
import type { DraftItem } from '../../lib/draft';

type Props = {
  item: DraftItem;
  currency: string;
  onPress: () => void;
  onDelete: () => void;
};

/** One receipt line: name, "2 × 45 000 so'm" and the line total. Tap to edit, swipe left (or use the editor) to delete. */
export default function ItemRow({ item, currency, onPress, onDelete }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const isAdjustment = item.kind !== 'item';
  const detail =
    item.kind === 'item'
      ? `${item.quantity} × ${formatMoney(item.unitPrice, currency)}`
      : t(`receipt.kinds.${item.kind}`, item.kind);

  const renderRight = () => (
    <Pressable
      onPress={onDelete}
      accessibilityRole="button"
      accessibilityLabel={t('receipt.review.delete', 'Delete')}
      style={{ width: 88, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.danger }}
    >
      <Trash2 size={22} color={colors.background} />
    </Pressable>
  );

  return (
    <Swipeable renderRightActions={renderRight} overshootRight={false}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${detail}, ${formatMoney(item.totalPrice, currency)}`}
        accessibilityHint={t('receipt.review.tapToEdit', 'Tap to edit')}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
      >
        <XStack ai="center" gap="$3" minHeight={64} px="$4" py="$2.5" backgroundColor="$surface">
          <YStack f={1} gap="$1">
            <Text fontSize={16} fontWeight="600" color="$text" numberOfLines={2}>
              {item.name}
            </Text>
            <Text fontSize={13} color={isAdjustment ? '$primaryText' : '$textMuted'}>
              {detail}
            </Text>
          </YStack>
          <Text fontSize={16} fontWeight="700" color={item.totalPrice < 0 ? '$success' : '$text'}>
            {formatMoney(item.totalPrice, currency)}
          </Text>
          <ChevronRight size={18} color="$textSubtle" />
        </XStack>
      </Pressable>
    </Swipeable>
  );
}
