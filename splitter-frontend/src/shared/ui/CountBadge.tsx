import React from 'react';
import { YStack } from 'tamagui';
import { Text } from '@/shared/ui/typography';

/** Small red count pill (unread notifications, requests). Renders nothing for 0. */
export default function CountBadge({ count, max = 99 }: { count: number; max?: number }) {
  if (!count || count <= 0) return null;
  const label = count > max ? `${max}+` : String(count);
  return (
    <YStack minWidth={20} height={20} px={6} borderRadius={10} ai="center" jc="center" backgroundColor="$badge" accessibilityLabel={label}>
      <Text fontSize={12} fontWeight="700" color="$onBadge" lineHeight={16}>
        {label}
      </Text>
    </YStack>
  );
}
