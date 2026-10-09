// app/(tabs)/home/balances.tsx — who owes whom, grouped by person; each receipt opens its detail (Paid toggles).
import React from 'react';
import { useRouter } from 'expo-router';
import { XStack, YStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import Screen from '@/shared/ui/Screen';
import { ListRow, ListSection } from '@/shared/ui/List';
import { ListSkeleton } from '@/shared/ui/Skeleton';
import EmptyState from '@/shared/ui/EmptyState';
import Banner from '@/shared/ui/Banner';
import UserAvatar from '@/shared/ui/UserAvatar';
import { shortDate } from '@/shared/lib/utils/time';
import { useBalances } from '@/features/balances/model/queries';
import BalanceCard from '@/features/balances/ui/BalanceCard';
import { formatMoney } from '@/features/receipt/lib/money';
import Money from '@/shared/ui/Money';
import AppIcon from '@/shared/ui/AppIcon';
import StatusChip from '@/shared/ui/StatusChip';

export default function BalancesScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const q = useBalances();
  const people = q.data?.people ?? [];

  return (
    <Screen refreshing={q.isRefetching} onRefresh={() => void q.refetch()}>
      <BalanceCard data={q.data} loading={q.isLoading} onPress={() => void q.refetch()} />
      {q.isError && !q.data && <Banner kind="error" message={t('balances.loadError')} actionLabel={t('common.retry')} onAction={() => void q.refetch()} />}
      {q.isLoading ? (
        <ListSkeleton rows={4} />
      ) : people.length === 0 && q.data ? (
        <YStack backgroundColor="$surface" borderRadius={16}>
          <EmptyState icon={<AppIcon name="checkCircle" size={28} color="$textMuted" />} message={t('balances.emptyPeople')} />
        </YStack>
      ) : (
        people.map((p) => {
          const owesMe = p.owedToMe.map((m) => formatMoney(m.amount, m.currency)).join(' + ');
          const iOwe = p.iOwe.map((m) => formatMoney(m.amount, m.currency)).join(' + ');
          return (
            <ListSection key={p.uniqueId}>
              <ListRow
                key="person"
                left={<UserAvatar uri={p.avatarUrl} label={p.username} seed={p.uniqueId} size={40} textSize={15} />}
                inset={68}
                title={p.username}
                // who owes whom as chips (arrow + color + word), the amounts on the right; the sentence is for screen readers
                subtitle={
                  <XStack gap="$1.5" flexWrap="wrap">
                    {!!owesMe && <StatusChip icon="arrowDownLeft" tone="success" label={t('balances.owesYouChip')} />}
                    {!!iOwe && <StatusChip icon="arrowUpRight" tone="danger" label={t('balances.iOwe')} />}
                  </XStack>
                }
                right={
                  <YStack ai="flex-end">
                    {p.owedToMe.map((m) => (
                      <Money key={`in-${m.currency}`} amount={m.amount} currency={m.currency} variant="headline" color="$success" animated />
                    ))}
                    {p.iOwe.map((m) => (
                      <Money key={`out-${m.currency}`} amount={m.amount} currency={m.currency} variant="headline" color="$danger" animated />
                    ))}
                  </YStack>
                }
                accessibilityLabel={[p.username, owesMe && t('balances.owesYou', { amount: owesMe }), iOwe && t('balances.youOweThem', { amount: iOwe })].filter(Boolean).join(', ')}
              />
              {p.receipts.map((r) => (
                <ListRow
                  key={`${r.sessionId}-${r.direction}`}
                  title={r.sessionName || t('receipt.summary.untitled', 'Bill')}
                  subtitle={shortDate(r.finalizedAt, i18n.language)}
                  right={<Money amount={r.amount} currency={r.currency} color={r.direction === 'owedToMe' ? '$success' : '$danger'} />}
                  chevron
                  accessibilityHint={t('balances.receiptHint')}
                  onPress={() => router.push({ pathname: '/home/history/[historyId]', params: { historyId: String(r.sessionId) } })}
                />
              ))}
            </ListSection>
          );
        })
      )}
    </Screen>
  );
}
