import React from 'react';
import { Text, type AppTextProps } from '@/shared/ui/typography';
import { formatMoney } from '@/features/receipt/lib/money';
import { useAnimatedNumber } from '@/shared/ui/motion/AnimatedNumber';

type Props = Omit<AppTextProps, 'children'> & {
  amount: number;
  currency: string;
  /** count to the new amount when it changes (totals, balances) */
  animated?: boolean;
  /** with `animated`: also count up from 0 the first time */
  fromZero?: boolean;
};

const DECIMALS_FREE = new Set(['UZS', 'JPY', 'KRW']);

/**
 * A money amount: never wraps or truncates, tabular digits (so counting doesn't jitter), right-aligned.
 * Put it next to a text that can shrink (the name truncates, not the amount).
 */
export default function Money({ amount, currency, variant = 'body', animated, fromZero, ...rest }: Props) {
  if (animated) return <CountingMoney amount={amount} currency={currency} variant={variant} fromZero={!!fromZero} {...rest} />;
  return (
    <Text variant={variant} numberOfLines={1} flexShrink={0} ta="right" style={{ fontVariant: ['tabular-nums'] }} {...rest}>
      {formatMoney(amount, currency)}
    </Text>
  );
}

function CountingMoney({ amount, currency, fromZero, accessibilityLabel, ...rest }: Omit<Props, 'animated'> & { fromZero: boolean }) {
  const shown = useAnimatedNumber(amount, { fromZero, decimals: DECIMALS_FREE.has((currency || 'UZS').toUpperCase()) ? 0 : 2 });
  return (
    // screen readers hear the final amount, not the counting
    <Text numberOfLines={1} flexShrink={0} ta="right" style={{ fontVariant: ['tabular-nums'] }} accessibilityLabel={accessibilityLabel ?? formatMoney(amount, currency)} {...rest}>
      {formatMoney(shown, currency)}
    </Text>
  );
}
