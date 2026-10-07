import React from 'react';
import { Pressable } from 'react-native';
import { XStack, YStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/ui/typography';
import { Skeleton } from '@/shared/ui/Skeleton';
import { formatMoney } from '@/features/receipt/lib/money';
import type { Balances, Money } from '../api/balances.api';
import AppIcon from '@/shared/ui/AppIcon';

export function MoneyLines({ list, color, big }: { list: Money[]; color: string; big?: boolean }) {
  const { t } = useTranslation();
  if (!list.length)
    return (
      <Text variant={big ? 'title3' : 'subheadline'} color="$textMuted">
        {t('balances.none')}
      </Text>
    );
  return (
    <YStack gap={2}>
      {list.map((m) => (
        <Text key={m.currency} variant={big ? (list.length > 1 ? 'headline' : 'title3') : 'subheadline'} fontWeight="600" color={color as any} numberOfLines={1}>
          {formatMoney(m.amount, m.currency)}
        </Text>
      ))}
    </YStack>
  );
}

/** "You are owed" / "You owe" totals per currency; tap for the per-person list. */
export default function BalanceCard({ data, loading, onPress }: { data: Balances | undefined; loading: boolean; onPress: () => void }) {
  const { t } = useTranslation();
  const settled = !!data && !data.owedToMe.length && !data.iOwe.length;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={t('balances.title')}>
      {({ pressed }) => (
        <YStack backgroundColor="$surface" borderRadius={16} p="$4" gap="$3" opacity={pressed ? 0.85 : 1}>
          <XStack ai="center" jc="space-between">
            <Text variant="headline">{t('balances.title')}</Text>
            <AppIcon name="chevronRight" size={18} color="$inactive" />
          </XStack>
          {loading && !data ? (
            <XStack gap="$4">
              <YStack f={1} gap="$2">
                <Skeleton width="60%" height={12} />
                <Skeleton width="80%" height={22} />
              </YStack>
              <YStack f={1} gap="$2">
                <Skeleton width="60%" height={12} />
                <Skeleton width="80%" height={22} />
              </YStack>
            </XStack>
          ) : settled ? (
            <Text variant="subheadline" color="$textMuted">
              {t('balances.allSettled')}
            </Text>
          ) : (
            <XStack gap="$4">
              <YStack f={1} gap="$1" ai="flex-start">
                <Text variant="footnote" color="$textMuted">
                  {t('balances.owedToMe')}
                </Text>
                <MoneyLines list={data?.owedToMe ?? []} color="$success" big />
              </YStack>
              <YStack width={0.5} backgroundColor="$separator" />
              <YStack f={1} gap="$1" ai="flex-start">
                <Text variant="footnote" color="$textMuted">
                  {t('balances.iOwe')}
                </Text>
                <MoneyLines list={data?.iOwe ?? []} color="$danger" big />
              </YStack>
            </XStack>
          )}
        </YStack>
      )}
    </Pressable>
  );
}
