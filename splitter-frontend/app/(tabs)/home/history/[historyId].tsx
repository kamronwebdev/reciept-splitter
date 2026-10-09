// app/(tabs)/home/history/[historyId].tsx — one finalized receipt: total, everyone's share, "Paid" toggles.
import React, { useCallback, useMemo } from 'react';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { XStack, YStack } from 'tamagui';
import { useTranslation } from 'react-i18next';

import { Text } from '@/shared/ui/typography';
import Screen from '@/shared/ui/Screen';
import { ListRow, ListSection } from '@/shared/ui/List';
import { ListSkeleton } from '@/shared/ui/Skeleton';
import EmptyState from '@/shared/ui/EmptyState';
import UserAvatar from '@/shared/ui/UserAvatar';
import { toast } from '@/shared/ui/Toast';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { haptic } from '@/shared/lib/haptics';
import { useSessionsHistoryStore } from '@/features/sessions/model/history.store';
import type { SessionHistoryEntry } from '@/features/sessions/api/history.api';
import { useSetPaid } from '@/features/balances/model/queries';
import { formatMoney } from '@/features/receipt/lib/money';
import Money from '@/shared/ui/Money';
import CheckToggle from '@/shared/ui/CheckToggle';
import { dateTime } from '@/shared/lib/utils/time';
import { errorMessage } from '@/shared/lib/utils/error-message';
import AppIcon from '@/shared/ui/AppIcon';
import StatusChip, { IconCount } from '@/shared/ui/StatusChip';

const DETAIL_LIMIT = 50;

type Person = { uniqueId: string; username: string; avatarUrl: string | null; amount: number; items: string[] };

function peopleOf(bill: SessionHistoryEntry): Person[] {
  const itemName = new Map((bill.totals?.byItem ?? []).map((i) => [i.itemId, i.name]));
  const byPerson = new Map<string, string[]>();
  for (const a of bill.allocations ?? []) {
    const list = byPerson.get(a.participantId) ?? [];
    const name = itemName.get(a.itemId);
    if (name && !list.includes(name)) list.push(name);
    byPerson.set(a.participantId, list);
  }
  return (bill.totals?.byParticipant ?? []).map((p) => ({
    uniqueId: p.uniqueId,
    username: p.username,
    avatarUrl: p.avatarUrl ?? bill.participants?.find((x) => x.uniqueId === p.uniqueId)?.avatarUrl ?? null,
    amount: p.amountOwed,
    items: byPerson.get(p.uniqueId) ?? [],
  }));
}

export default function ReceiptDetailScreen() {
  const { historyId } = useLocalSearchParams<{ historyId: string }>();
  const { t, i18n } = useTranslation();
  const meId = useAppStore((s) => s.user?.uniqueId);
  const sessions = useSessionsHistoryStore((s) => s.sessions);
  const loading = useSessionsHistoryStore((s) => s.loading);
  const refreshIfStale = useSessionsHistoryStore((s) => s.refreshIfStale);
  const forceRefresh = useSessionsHistoryStore((s) => s.forceRefresh);
  const setPaid = useSetPaid();

  const bill = useMemo(() => sessions.find((s) => s.sessionId === Number(historyId)), [historyId, sessions]);

  // once per visit; a bigger page only if the cached one was full (no request loops)
  useFocusEffect(
    useCallback(() => {
      refreshIfStale(undefined, DETAIL_LIMIT).catch(() => undefined);
    }, [refreshIfStale])
  );

  if (!bill) {
    return (
      <Screen refreshing={false} onRefresh={() => void forceRefresh(DETAIL_LIMIT)}>
        {loading ? <ListSkeleton rows={4} /> : <EmptyState icon={<AppIcon name="receipt" size={28} color="$textMuted" />} message={t('settle.notFound')} />}
      </Screen>
    );
  }

  const currency = bill.currency || bill.totals?.currency || 'UZS';
  const people = peopleOf(bill);
  const creatorId = bill.creatorUniqueId;
  const payments = bill.payments ?? {};
  const date = dateTime(bill.finalizedAt || bill.createdAt, i18n.language);

  const toggle = (uniqueId: string, paid: boolean) => {
    haptic.select();
    setPaid.mutate(
      { sessionId: bill.sessionId, uniqueId, paid },
      {
        onSuccess: (res) => {
          if (res.settled) toast.success(t('settle.allPaid'));
        },
        onError: (e) => toast.error(errorMessage(t, e)),
      }
    );
  };

  return (
    <Screen refreshing={false} onRefresh={() => void forceRefresh(DETAIL_LIMIT)}>
      <YStack gap="$1" px="$1">
        <Text variant="title1" accessibilityRole="header">
          {bill.sessionName || t('receipt.summary.untitled', 'Bill')}
        </Text>
        <XStack ai="center" gap="$2">
          <Text variant="subheadline" color="$textMuted">
            {date}
          </Text>
          <IconCount icon="friends" count={people.length} label={t('home.people', { count: people.length })} />
        </XStack>
        <XStack ai="center" gap="$2" pt="$2">
          <Money amount={bill.grandTotal ?? 0} currency={currency} variant="title2" color="$primaryText" ta="left" />
          {bill.settled && <StatusChip icon="checkCircle" tone="success" label={t('settle.settled')} />}
        </XStack>
      </YStack>

      <ListSection header={t('settle.people')}>
        {people.map((p) => {
          const isCreatorRow = p.uniqueId === creatorId;
          const paid = !!payments[p.uniqueId];
          const canToggle = !isCreatorRow && (bill.isCreator || p.uniqueId === meId);
          const name = p.uniqueId === meId ? t('receipt.people.you', 'You') : p.username;
          return (
            <ListRow
              key={p.uniqueId}
              left={<UserAvatar uri={p.avatarUrl} label={p.username} seed={p.uniqueId} size={36} textSize={14} />}
              title={name}
              // status chip first (icon + color + word, always visible), then what they had
              subtitle={
                <XStack ai="center" gap="$2" minWidth={0}>
                  {isCreatorRow ? (
                    <StatusChip icon="wallet" tone="primary" label={t('settle.paidTheBill')} />
                  ) : paid ? (
                    <StatusChip icon="checkCircle" tone="success" label={t('settle.paid')} />
                  ) : (
                    <StatusChip icon="pending" tone="warning" label={t('settle.notPaid')} />
                  )}
                  {p.items.length > 0 && (
                    <Text variant="subheadline" color="$textMuted" numberOfLines={1} flexShrink={1}>
                      {p.items.join(', ')}
                    </Text>
                  )}
                </XStack>
              }
              accessibilityLabel={[name, isCreatorRow ? t('settle.paidTheBill') : paid ? t('settle.paid') : t('settle.notPaid'), formatMoney(p.amount, currency), p.items.join(', ')].filter(Boolean).join(', ')}
              right={
                <>
                  <Money amount={p.amount} currency={currency} variant="body" fontWeight="600" />
                  {canToggle && (
                    <CheckToggle
                      value={paid}
                      onChange={(v) => toggle(p.uniqueId, v)}
                      disabled={setPaid.isPending}
                      accessibilityLabel={t('settle.paidA11y', { name })}
                      accessibilityHint={bill.isCreator ? t('settle.footerCreator') : t('settle.footerParticipant')}
                    />
                  )}
                </>
              }
            />
          );
        })}
      </ListSection>
    </Screen>
  );
}
