import React from 'react';
import { YStack, XStack } from 'tamagui';
import { Text } from '@/shared/ui/typography';

type Props = {
  title?: string;
  description?: string;
  children: React.ReactNode;
  /** red accent (danger zone) */
  danger?: boolean;
  /** right side of the title row */
  right?: React.ReactNode;
};

/** Titled card used by Profile and Settings. */
export default function Section({ title, description, children, danger, right }: Props) {
  return (
    <YStack
      backgroundColor="$surface"
      borderWidth={1}
      borderColor={danger ? '$danger' : '$borderColor'}
      borderRadius={16}
      padding="$4"
      gap="$3"
    >
      {!!title && (
        <XStack ai="center" jc="space-between" minHeight={28}>
          <Text fontSize={16} fontWeight="700" color={danger ? '$danger' : '$text'} accessibilityRole="header">
            {title}
          </Text>
          {right}
        </XStack>
      )}
      {!!description && (
        <Text fontSize={13} color="$textMuted">
          {description}
        </Text>
      )}
      {children}
    </YStack>
  );
}
