import React from 'react';
import { ScrollView } from 'react-native';
import { XStack, YStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import UserAvatar from '@/shared/ui/UserAvatar';
import { Text } from '@/shared/ui/typography';
import { formatMoney } from '../../lib/money';
import type { ReceiptParticipant } from '../../api/receipt.api';
import Money from '@/shared/ui/Money';
import AppIcon from '@/shared/ui/AppIcon';
import StatusChip from '@/shared/ui/StatusChip';

type Props = {
  participants: ReceiptParticipant[];
  /** uniqueId -> running total (major units) */
  totals: Record<string, number>;
  unassigned: number;
  currency: string;
  meId?: string | undefined;
  /** items that still need people */
  left?: number;
};

/**
 * Sticky running totals per person (with real avatars; amounts count to their new value), and the
 * unassigned amount with a warning icon + an "N left" chip, or a check when everything is assigned.
 */
export default function TotalsBar({ participants, totals, unassigned, currency, meId, left = 0 }: Props) {
  const { t } = useTranslation();
  return (
    <YStack gap="$2">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {participants.map((p) => (
          <XStack key={p.uniqueId} ai="center" gap="$2" backgroundColor="$surfaceAlt" borderRadius={22} pl="$1.5" pr="$3" minHeight={44} accessible accessibilityLabel={`${p.username}: ${formatMoney(totals[p.uniqueId] ?? 0, currency)}`}>
            <UserAvatar uri={p.avatarUrl} label={p.username} seed={p.uniqueId} size={32} />
            <YStack>
              <Text fontSize={11} color="$textMuted" numberOfLines={1} maxWidth={90}>
                {p.uniqueId === meId ? t('receipt.people.you', 'You') : p.username.split(/\s+/)[0]}
              </Text>
              <Money amount={totals[p.uniqueId] ?? 0} currency={currency} fontSize={14} fontWeight="800" color="$text" ta="left" animated />
            </YStack>
          </XStack>
        ))}
      </ScrollView>
      <XStack jc="space-between" ai="center" gap="$2" accessibilityLiveRegion="polite">
        <XStack ai="center" gap="$1.5" f={1} minWidth={0}>
          <AppIcon name={unassigned > 0 ? 'warning' : 'checkCircle'} size={16} color={unassigned > 0 ? '$warning' : '$success'} />
          <Text fontSize={13} fontWeight="700" color={unassigned > 0 ? '$warning' : '$success'} numberOfLines={1} flexShrink={1}>
            {unassigned > 0
              ? t('receipt.split.unassigned', { amount: formatMoney(unassigned, currency), defaultValue: 'Unassigned: {{amount}}' })
              : t('receipt.split.allAssigned', 'All assigned')}
          </Text>
        </XStack>
        {left > 0 && <StatusChip icon="pending" tone="warning" label={t('receipt.split.left', { count: left })} />}
      </XStack>
    </YStack>
  );
}
