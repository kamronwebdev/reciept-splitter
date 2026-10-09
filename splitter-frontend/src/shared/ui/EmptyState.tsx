import React from 'react';
import { YStack } from 'tamagui';
import { Text } from '@/shared/ui/typography';
import { Button } from '@/shared/ui/Button';

type Props = {
  icon: React.ReactNode;
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** Icon + one sentence + (optionally) one action. */
export default function EmptyState({ icon, title, message, actionLabel, onAction }: Props) {
  return (
    <YStack ai="center" gap="$2.5" py="$6" px="$4">
      {/* plain outline icon (28pt, secondary gray): no decorative filled circle */}
      <YStack height={36} ai="center" jc="center">
        {icon}
      </YStack>
      {!!title && (
        <Text variant="headline" ta="center">
          {title}
        </Text>
      )}
      <Text variant="subheadline" color="$textMuted" ta="center" maxWidth={320}>
        {message}
      </Text>
      {!!actionLabel && !!onAction && (
        <YStack pt="$2" minWidth={200}>
          <Button title={actionLabel} variant="primary" onPress={onAction} />
        </YStack>
      )}
    </YStack>
  );
}
