// app/(tabs)/home/index.tsx — Home: greeting + bell, balances, scan, things that need you, recent receipts, groups.
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { XStack, YStack } from 'tamagui';
import { useTranslation } from 'react-i18next';

import { Text } from '@/shared/ui/typography';
import { Button } from '@/shared/ui/Button';
import Screen from '@/shared/ui/Screen';
import { HeaderLink, ListRow, ListSection, IconTile } from '@/shared/ui/List';
import { ListSkeleton } from '@/shared/ui/Skeleton';
import EmptyState from '@/shared/ui/EmptyState';
import UserAvatar from '@/shared/ui/UserAvatar';
import CountBadge from '@/shared/ui/CountBadge';
import AppIcon from '@/shared/ui/AppIcon';
import { useAppTheme } from '@/shared/theme/useAppTheme';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { useSessionsHistoryStore } from '@/features/sessions/model/history.store';
import { useFriendsStore } from '@/features/friends/model/friends.store';
import { useGroupsStore } from '@/features/groups/model/groups.store';
import { useBalances } from '@/features/balances/model/queries';
import BalanceCard from '@/features/balances/ui/BalanceCard';
import { useUnreadCount, notificationKeys } from '@/features/notifications/model/queries';
import { useReceiptLauncher } from '@/features/receipt/model/launcher';
import { formatMoney } from '@/features/receipt/lib/money';
import ReceiptRow from '@/features/sessions/ui/ReceiptRow';

const RECENT = 5;

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const qc = useQueryClient();
  const me = useAppStore((s) => s.user);

  const sessions = useSessionsHistoryStore((s) => s.sessions);
  const historyLoading = useSessionsHistoryStore((s) => s.loading);
  const historyReady = useSessionsHistoryStore((s) => s.initialized);
  const refreshHistoryIfStale = useSessionsHistoryStore((s) => s.refreshIfStale);
  const forceHistory = useSessionsHistoryStore((s) => s.forceRefresh);
  const incoming = useFriendsStore((s) => s.requestsRaw?.incoming?.length ?? 0);
  const fetchFriends = useFriendsStore((s) => s.fetchAll);
  const groups = useGroupsStore((s) => s.groups);
  const fetchGroups = useGroupsStore((s) => s.fetchGroups);
  const balances = useBalances();
  const unread = useUnreadCount().data ?? 0;
  const { openScanner, enterManually, manualBusy } = useReceiptLauncher();
  const [refreshing, setRefreshing] = useState(false);

  // once per visit, only when stale (no loops)
  useFocusEffect(
    useCallback(() => {
      refreshHistoryIfStale(undefined, RECENT).catch(() => undefined);
      if (!useGroupsStore.getState().groups.length) fetchGroups().catch(() => undefined);
    }, [refreshHistoryIfStale, fetchGroups])
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([
      forceHistory(RECENT),
      fetchFriends(),
      fetchGroups(),
      qc.invalidateQueries({ queryKey: ['balances'] }),
      qc.invalidateQueries({ queryKey: notificationKeys.unread }),
    ]);
    setRefreshing(false);
  }, [forceHistory, fetchFriends, fetchGroups, qc]);

  const recent = sessions.slice(0, RECENT);
  const owe = useMemo(() => (balances.data?.people ?? []).filter((p) => p.iOwe.length > 0), [balances.data]);
  const name = me?.username || t('home.header.friendFallback', 'friend');
  const showAttention = incoming > 0 || owe.length > 0;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh} contentContainerStyle={{ paddingTop: insets.top + 8 }}>
      {/* header: greeting, avatar, bell */}
      <XStack ai="center" gap="$3">
        <Pressable onPress={() => router.navigate('/profile')} accessibilityRole="button" accessibilityLabel={t('profile.title')}>
          <UserAvatar uri={me?.avatarUrl} label={name} seed={me?.uniqueId} size={44} textSize={17} />
        </Pressable>
        <YStack f={1}>
          <Text variant="footnote" color="$textMuted">
            {t('home.greetingSmall')}
          </Text>
          <Text variant="title2" numberOfLines={1} accessibilityRole="header">
            {name}
          </Text>
        </YStack>
        <Pressable
          onPress={() => router.push('/home/notifications')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={unread ? `${t('notifications.title')}, ${t('notifications.unreadA11y', { count: unread })}` : t('notifications.title')}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <AppIcon name="bell" color={colors.text} size={24} />
          {unread > 0 && (
            <YStack position="absolute" top={2} right={0}>
              <CountBadge count={unread} />
            </YStack>
          )}
        </Pressable>
      </XStack>

      <BalanceCard data={balances.data} loading={balances.isLoading} onPress={() => router.push('/home/balances')} />

      <YStack gap="$2">
        <Button title={t('home.scanReceipt')} size="large" icon={<AppIcon name="scan" size={22} color="$onPrimary" />} onPress={openScanner} />
        <Button title={t('home.enterManually')} variant="plain" onPress={() => void enterManually()} loading={manualBusy} />
      </YStack>

      {showAttention && (
        <ListSection header={t('home.attention')}>
          {incoming > 0 && (
            <ListRow
              key="requests"
              left={
                <IconTile>
                  <AppIcon name="userAdd" size={17} color="$onPrimary" />
                </IconTile>
              }
              title={t('home.friendRequests', { count: incoming })}
              right={<CountBadge count={incoming} />}
              chevron
              onPress={() => router.navigate('/friends/requests')}
            />
          )}
          {owe.slice(0, 3).map((p) => (
            <ListRow
              key={`owe-${p.uniqueId}`}
              left={<UserAvatar uri={p.avatarUrl} label={p.username} seed={p.uniqueId} size={30} textSize={12} />}
              title={t('home.youOwe', { name: p.username })}
              value={p.iOwe.map((m) => formatMoney(m.amount, m.currency)).join(' + ')}
              chevron
              onPress={() => router.push('/home/balances')}
            />
          ))}
        </ListSection>
      )}

      {/* recent receipts */}
      {!historyReady && historyLoading ? (
        <YStack gap="$1.5">
          <Text variant="footnote" color="$textMuted" px="$4" textTransform="uppercase">
            {t('home.recent')}
          </Text>
          <ListSkeleton rows={3} avatar={false} />
        </YStack>
      ) : recent.length === 0 ? (
        <YStack backgroundColor="$surface" borderRadius={16}>
          <EmptyState
            icon={<AppIcon name="receipt" size={28} color="$primaryText" />}
            title={t('home.empty.title')}
            message={t('home.empty.message')}
            actionLabel={t('home.scanReceipt')}
            onAction={openScanner}
          />
        </YStack>
      ) : (
        <ListSection header={t('home.recent')} headerRight={<HeaderLink title={t('home.seeAll')} onPress={() => router.push('/home/history')} />}>
          {recent.map((s) => (
            <ReceiptRow key={s.sessionId} entry={s} meId={me?.uniqueId} onPress={() => router.push({ pathname: '/home/history/[historyId]', params: { historyId: String(s.sessionId) } })} />
          ))}
        </ListSection>
      )}

      {/* my groups */}
      <YStack gap="$1.5">
        <Text variant="footnote" color="$textMuted" px="$4" textTransform="uppercase" accessibilityRole="header">
          {t('home.myGroups')}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingHorizontal: 4, paddingVertical: 4 }}>
          <Pressable onPress={() => router.navigate('/groups/create')} accessibilityRole="button" accessibilityLabel={t('home.newGroup')}>
            <YStack ai="center" gap="$1.5" width={72}>
              <YStack width={56} height={56} borderRadius={28} ai="center" jc="center" backgroundColor="$primarySoft">
                <AppIcon name="plus" size={24} color="$primaryText" />
              </YStack>
              <Text variant="caption" color="$textMuted" numberOfLines={1} ta="center">
                {t('home.newGroup')}
              </Text>
            </YStack>
          </Pressable>
          {groups.map((g) => (
            <Pressable key={g.id} onPress={() => router.navigate({ pathname: '/groups/[groupId]', params: { groupId: String(g.id) } })} accessibilityRole="button" accessibilityLabel={g.name}>
              <YStack ai="center" gap="$1.5" width={72}>
                <UserAvatar label={g.name} seed={`group-${g.id}`} size={56} textSize={20} />
                <Text variant="caption" numberOfLines={1} ta="center">
                  {g.name}
                </Text>
              </YStack>
            </Pressable>
          ))}
        </ScrollView>
      </YStack>

      {balances.isError && !balances.data && (
        <XStack gap="$2" ai="center" jc="center">
          <AppIcon name="wallet" size={16} color="$textMuted" />
          <Text variant="footnote" color="$textMuted">
            {t('balances.loadError')}
          </Text>
        </XStack>
      )}
    </Screen>
  );
}
