import React from 'react';
import { XStack, YStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { ListRow } from '@/shared/ui/List';
import { Text } from '@/shared/ui/typography';
import { shortDate } from '@/shared/lib/utils/time';
import { formatMoney } from '@/features/receipt/lib/money';
import Money from '@/shared/ui/Money';
import AppIcon from '@/shared/ui/AppIcon';
import { IconCount } from '@/shared/ui/StatusChip';
import type { SessionHistoryEntry } from '../api/history.api';

/**
 * A finalized receipt in a list. Data instead of words: date · 👤count · ✓ (settled), the total on the right
 * and, under it, your share next to a person icon. The full sentence is the accessibility label.
 */
export default function ReceiptRow({ entry, meId, onPress }: { entry: SessionHistoryEntry; meId?: string | undefined; onPress: () => void }) {
  const { t, i18n } = useTranslation();
  const currency = entry.currency || 'UZS';
  const mine = entry.totals?.byParticipant?.find((p) => p.uniqueId === meId)?.amountOwed;
  const people = entry.participantUniqueIds?.length || entry.participants?.length || 0;
  const date = shortDate(entry.finalizedAt, i18n.language);
  const title = entry.sessionName || t('receipt.summary.untitled', 'Bill');
  const a11y = [
    title,
    date,
    t('home.people', { count: people }),
    mine != null ? t('home.yourShare', { amount: formatMoney(mine, currency) }) : null,
    entry.settled ? t('settle.settled') : null,
    formatMoney(entry.grandTotal, currency),
  ]
    .filter(Boolean)
    .join(', ');
  return (
    <ListRow
      title={title}
      subtitle={
        <XStack ai="center" gap="$2" minWidth={0}>
          <Text variant="subheadline" color="$textMuted" numberOfLines={1} flexShrink={1}>
            {date}
          </Text>
          <IconCount icon="friends" count={people} label={t('home.people', { count: people })} />
          {entry.settled && <AppIcon name="checkCircle" size={14} color="$success" weight="semibold" />}
        </XStack>
      }
      right={
        <YStack ai="flex-end" gap={2}>
          <Money amount={entry.grandTotal} currency={currency} variant="subheadline" fontWeight="600" />
          {mine != null && (
            <XStack ai="center" gap={3}>
              <AppIcon name="profile" size={12} color="$textMuted" />
              <Money amount={mine} currency={currency} variant="caption" color="$textMuted" />
            </XStack>
          )}
        </YStack>
      }
      accessibilityLabel={a11y}
      chevron
      onPress={onPress}
    />
  );
}
