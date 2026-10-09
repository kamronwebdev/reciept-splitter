import React from 'react';
import { Text, type AppTextProps } from '@/shared/ui/typography';
import { formatMoney } from '@/features/receipt/lib/money';

type Props = Omit<AppTextProps, 'children'> & { amount: number; currency: string };

/**
 * A money amount: never wraps or truncates, tabular digits, right-aligned. Put it next to a text that can
 * shrink (the name truncates, not the amount).
 */
export default function Money({ amount, currency, variant = 'body', ...rest }: Props) {
  return (
    <Text variant={variant} numberOfLines={1} flexShrink={0} ta="right" style={{ fontVariant: ['tabular-nums'] }} {...rest}>
      {formatMoney(amount, currency)}
    </Text>
  );
}
