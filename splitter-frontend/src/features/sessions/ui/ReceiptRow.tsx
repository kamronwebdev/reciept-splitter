import React from 'react';
import { useTranslation } from 'react-i18next';
import { ListRow } from '@/shared/ui/List';
import { shortDate } from '@/shared/lib/utils/time';
import { formatMoney } from '@/features/receipt/lib/money';
import Money from '@/shared/ui/Money';
import type { SessionHistoryEntry } from '../api/history.api';

/** A finalized receipt in a list: name, date · people · your share · Settled, total on the right. */
export default function ReceiptRow({ entry, meId, onPress }: { entry: SessionHistoryEntry; meId?: string | undefined; onPress: () => void }) {
  const { t, i18n } = useTranslation();
  const currency = entry.currency || 'UZS';
  const mine = entry.totals?.byParticipant?.find((p) => p.uniqueId === meId)?.amountOwed;
  const people = entry.participantUniqueIds?.length || entry.participants?.length || 0;
  const subtitle = [
    shortDate(entry.finalizedAt, i18n.language),
    t('home.people', { count: people }),
    mine != null ? t('home.yourShare', { amount: formatMoney(mine, currency) }) : null,
    entry.settled ? t('settle.settled') : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <ListRow
      title={entry.sessionName || t('receipt.summary.untitled', 'Bill')}
      subtitle={subtitle}
      right={<Money amount={entry.grandTotal} currency={currency} variant="subheadline" fontWeight="600" />}
      chevron
      onPress={onPress}
    />
  );
}
