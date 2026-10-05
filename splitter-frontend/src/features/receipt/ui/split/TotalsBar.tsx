import React from 'react';
import { ScrollView } from 'react-native';
import { XStack, YStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import UserAvatar from '@/shared/ui/UserAvatar';
import { Text } from '@/shared/ui/typography';
import { formatMoney } from '../../lib/money';
import type { ReceiptParticipant } from '../../api/receipt.api';

type Props = {
  participants: ReceiptParticipant[];
  /** uniqueId -> running total (major units) */
  totals: Record<string, number>;
  unassigned: number;
  currency: string;
  meId?: string | undefined;
};

/** Sticky running totals per person (with real avatars) and the unassigned amount in warning color. */
export default function TotalsBar({ participants, totals, unassigned, currency, meId }: Props) {
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
              <Text fontSize={14} fontWeight="800" color="$text">
                {formatMoney(totals[p.uniqueId] ?? 0, currency)}
              </Text>
            </YStack>
          </XStack>
        ))}
      </ScrollView>
      <XStack jc="space-between" ai="center">
        <Text fontSize={13} fontWeight="700" color={unassigned > 0 ? '$warning' : '$success'} accessibilityLiveRegion="polite">
          {unassigned > 0
            ? t('receipt.split.unassigned', { amount: formatMoney(unassigned, currency), defaultValue: 'Unassigned: {{amount}}' })
            : t('receipt.split.allAssigned', 'Everything is assigned')}
        </Text>
      </XStack>
    </YStack>
  );
}
