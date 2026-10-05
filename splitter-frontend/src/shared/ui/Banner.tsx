import React from 'react';
import { YStack, XStack } from 'tamagui';
import { Text } from '@/shared/ui/typography';
import { AlertCircle, CheckCircle2, Info } from '@tamagui/lucide-icons';
import { Button } from '@/shared/ui/Button';

type Props = {
  kind: 'error' | 'success' | 'info';
  message: string;
  /** renders a Retry button (network errors) */
  actionLabel?: string;
  onAction?: () => void;
  actionLoading?: boolean;
};

const COLORS = {
  error: { bg: '$dangerSoft', border: '$danger', fg: '$text', icon: '$danger' },
  success: { bg: '$primarySoft', border: '$primary', fg: '$text', icon: '$success' },
  info: { bg: '$surfaceAlt', border: '$borderColor', fg: '$text', icon: '$textMuted' },
} as const;

export default function Banner({ kind, message, actionLabel, onAction, actionLoading }: Props) {
  const c = COLORS[kind];
  const Icon = kind === 'error' ? AlertCircle : kind === 'success' ? CheckCircle2 : Info;
  return (
    <YStack
      backgroundColor={c.bg}
      borderColor={c.border}
      borderWidth={1}
      borderRadius="$4"
      padding="$3"
      space="$3"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <XStack space="$2" ai="flex-start">
        <Icon size={20} color={c.icon} />
        <Text flex={1} fontSize="$3" color={c.fg}>
          {message}
        </Text>
      </XStack>
      {!!actionLabel && !!onAction && (
        <Button title={actionLabel} variant="outline" size="small" onPress={onAction} loading={!!actionLoading} />
      )}
    </YStack>
  );
}
