import React from 'react';
import { XStack, YStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/ui/typography';
import { Skeleton } from '@/shared/ui/Skeleton';
import AppIcon from '@/shared/ui/AppIcon';
import Money from '@/shared/ui/Money';
import PressableScale from '@/shared/ui/motion/PressableScale';
import type { Balances, Money as MoneyT } from '../api/balances.api';

/** "You are owed  9 465 020 so'm" — label shrinks, amounts never wrap (one line per currency). */
function BalanceLine({ label, list, color }: { label: string; list: MoneyT[]; color: string }) {
  const { t } = useTranslation();
  return (
    <XStack ai="center" gap="$3" minHeight={28}>
      <Text variant="subheadline" color="$textMuted" f={1} minWidth={0} numberOfLines={1} ta="left">
        {label}
      </Text>
      <YStack ai="flex-end" flexShrink={0}>
        {list.length ? (
          // counts up from 0 the first time, then to each new total
          list.map((m) => <Money key={m.currency} amount={m.amount} currency={m.currency} variant="headline" color={color as any} animated fromZero />)
        ) : (
          <Text variant="headline" color="$textMuted">
            {t('balances.none')}
          </Text>
        )}
      </YStack>
    </XStack>
  );
}

/** "You are owed" / "You owe" totals per currency; tap for the per-person list. */
export default function BalanceCard({ data, loading, onPress }: { data: Balances | undefined; loading: boolean; onPress: () => void }) {
  const { t } = useTranslation();
  const settled = !!data && !data.owedToMe.length && !data.iOwe.length;
  return (
    <PressableScale onPress={onPress} haptic="select" accessibilityRole="button" accessibilityLabel={t('balances.title')}>
      {({ pressed }) => (
        <YStack backgroundColor="$surface" borderRadius={12} px="$4" py="$3" gap="$2" opacity={pressed ? 0.85 : 1}>
          <XStack ai="center" jc="space-between" minHeight={28}>
            <Text variant="headline">{t('balances.title')}</Text>
            <AppIcon name="chevronRight" size={16} color="$inactive" />
          </XStack>
          {loading && !data ? (
            <YStack gap="$2">
              <Skeleton width="100%" height={20} />
              <Skeleton width="100%" height={20} />
            </YStack>
          ) : settled ? (
            <XStack ai="center" gap="$2">
              <AppIcon name="checkCircle" size={18} color="$success" />
              <Text variant="subheadline" color="$textMuted">
                {t('balances.allSettled')}
              </Text>
            </XStack>
          ) : (
            <YStack gap="$1">
              <BalanceLine label={t('balances.owedToMe')} list={data?.owedToMe ?? []} color="$success" />
              <BalanceLine label={t('balances.iOwe')} list={data?.iOwe ?? []} color="$danger" />
            </YStack>
          )}
        </YStack>
      )}
    </PressableScale>
  );
}
