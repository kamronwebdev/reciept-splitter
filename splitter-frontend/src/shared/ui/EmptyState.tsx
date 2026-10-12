import React from 'react';
import { YStack } from 'tamagui';
import { Text } from '@/shared/ui/typography';
import { Button } from '@/shared/ui/Button';
import Appear from '@/shared/ui/motion/Appear';

type Props = {
  icon: React.ReactNode;
  title?: string;
  /** at most one short line, only when it helps (the title alone is often enough) */
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** Icon + a title or one short line + (optionally) one action. Fades in once. */
export default function EmptyState({ icon, title, message, actionLabel, onAction }: Props) {
  return (
    <Appear>
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
      {!!message && (
        <Text variant={title ? 'subheadline' : 'body'} color="$textMuted" ta="center" maxWidth={320}>
          {message}
        </Text>
      )}
      {!!actionLabel && !!onAction && (
        <YStack pt="$2" minWidth={200}>
          <Button title={actionLabel} variant="primary" onPress={onAction} />
        </YStack>
      )}
    </YStack>
    </Appear>
  );
}
