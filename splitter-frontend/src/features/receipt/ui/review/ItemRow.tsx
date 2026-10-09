import React from 'react';
import { Pressable } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { XStack, YStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/ui/typography';
import { useAppTheme } from '@/shared/theme/useAppTheme';
import { formatMoney } from '../../lib/money';
import type { DraftItem } from '../../lib/draft';
import AppIcon from '@/shared/ui/AppIcon';
import Money from '@/shared/ui/Money';

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
      <AppIcon name="trash" size={22} color={colors.background} />
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
        <XStack ai="center" gap="$3" minHeight={60} px="$4" py="$2.5" backgroundColor="$surface">
          {/* name may wrap to 2 lines; the amount never wraps or shrinks */}
          <YStack f={1} minWidth={0} gap={2} ai="flex-start" jc="center">
            <Text variant="body" fontWeight="600" numberOfLines={2} ta="left">
              {item.name}
            </Text>
            <Text variant="footnote" color={isAdjustment ? '$primaryText' : '$textMuted'} numberOfLines={1} ta="left" style={{ fontVariant: ['tabular-nums'] }}>
              {detail}
            </Text>
          </YStack>
          <Money amount={item.totalPrice} currency={currency} variant="body" fontWeight="600" color={item.totalPrice < 0 ? '$success' : '$text'} />
          <AppIcon name="chevronRight" size={16} color="$inactive" />
        </XStack>
      </Pressable>
    </Swipeable>
  );
}
