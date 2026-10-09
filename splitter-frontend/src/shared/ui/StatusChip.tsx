import React from 'react';
import { XStack } from 'tamagui';
import { Text } from '@/shared/ui/typography';
import AppIcon, { type IconName } from '@/shared/ui/AppIcon';

export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral' | 'primary';

const TONE: Record<StatusTone, { bg: string; fg: string }> = {
  success: { bg: '$successSoft', fg: '$success' },
  warning: { bg: '$warningSoft', fg: '$warning' },
  danger: { bg: '$dangerSoft', fg: '$danger' },
  neutral: { bg: '$surfaceAlt', fg: '$textMuted' },
  primary: { bg: '$primarySoft', fg: '$primaryText' },
};

/**
 * Status as icon + color + one short word (never color alone): Paid, Not paid, Pending, Owner, Owes you…
 * Shown instead of a sentence. The word is also what screen readers hear.
 */
export default function StatusChip({ icon, label, tone = 'neutral' }: { icon: IconName; label: string; tone?: StatusTone }) {
  const t = TONE[tone];
  return (
    <XStack ai="center" gap={4} px="$2" py={2} borderRadius={999} backgroundColor={t.bg as any} alignSelf="flex-start" flexShrink={1} minWidth={0} maxWidth="100%" accessible accessibilityLabel={label}>
      <AppIcon name={icon} size={12} color={t.fg} weight="semibold" />
      {/* the word truncates before it can push into the amount next to it (Large text) */}
      <Text variant="caption" fontWeight="600" color={t.fg as any} numberOfLines={1} flexShrink={1}>
        {label}
      </Text>
    </XStack>
  );
}

/** A small icon + number ("👥 3" without the emoji): counts instead of "3 people". */
export function IconCount({ icon, count, label }: { icon: IconName; count: number; label: string }) {
  return (
    <XStack ai="center" gap={3} flexShrink={0} accessible accessibilityLabel={label}>
      <AppIcon name={icon} size={13} color="$textMuted" />
      <Text variant="subheadline" color="$textMuted" style={{ fontVariant: ['tabular-nums'] }}>
        {count}
      </Text>
    </XStack>
  );
}
