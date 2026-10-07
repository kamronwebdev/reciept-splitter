import React from 'react';
import { YStack, XStack } from 'tamagui';
import { Text } from '@/shared/ui/typography';

type Props = {
  title?: string;
  description?: string;
  children: React.ReactNode;
  /** red header (danger zone) */
  danger?: boolean;
  /** right side of the header row */
  right?: React.ReactNode;
};

/**
 * iOS inset-grouped section with free content (forms, controls): small header above a rounded card,
 * the description as a footnote under it. For plain rows use ListSection / ListRow.
 */
export default function Section({ title, description, children, danger, right }: Props) {
  // a section that is only a header (e.g. a collapsed danger zone) must not show an empty card
  const hasContent = React.Children.toArray(children).length > 0;
  return (
    <YStack gap="$1.5">
      {(!!title || right) && (
        <XStack ai={right ? 'center' : 'flex-end'} jc="space-between" px="$4" minHeight={20}>
          {!!title && (
            <Text variant="footnote" color={danger ? '$danger' : '$textMuted'} textTransform="uppercase" letterSpacing={0.4} accessibilityRole="header">
              {title}
            </Text>
          )}
          {right}
        </XStack>
      )}
      {hasContent && (
        <YStack backgroundColor="$surface" borderRadius={12} p="$4" gap="$3">
          {children}
        </YStack>
      )}
      {!!description && (
        <Text variant="footnote" color="$textMuted" px="$4">
          {description}
        </Text>
      )}
    </YStack>
  );
}
