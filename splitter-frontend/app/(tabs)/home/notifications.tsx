// app/(tabs)/home/notifications.tsx — the bell: Today / Earlier, unread dots, tap to open, swipe to delete.
import React, { useMemo } from 'react';
import { RefreshControl, SectionList } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { XStack, YStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/ui/typography';
import UserAvatar from '@/shared/ui/UserAvatar';
import HeaderButton from '@/shared/ui/HeaderButton';
import SwipeRow from '@/shared/ui/SwipeRow';
import EmptyState from '@/shared/ui/EmptyState';
import { ListSkeleton } from '@/shared/ui/Skeleton';
import { showActionSheet } from '@/shared/ui/ActionSheet';
import { useAppTheme } from '@/shared/theme/useAppTheme';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { isToday, timeAgo } from '@/shared/lib/utils/time';
import { useNotificationMutations, useNotifications } from '@/features/notifications/model/queries';
import type { AppNotification } from '@/features/notifications/api/notifications.api';
import { notificationTarget, notificationText } from '@/features/notifications/lib/present';
import AppIcon from '@/shared/ui/AppIcon';
import Animated from 'react-native-reanimated';
import { Appear, PressableScale, listExiting } from '@/shared/ui/motion';

export default function NotificationsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors } = useAppTheme();
  const meId = useAppStore((s) => s.user?.uniqueId);
  const query = useNotifications();
  const { markRead, remove } = useNotificationMutations();

  const items = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);
  const hasUnread = items.some((n) => !n.read);
  // position in the whole list: only the first screenful staggers in
  const order = useMemo(() => new Map(items.map((n, i) => [n.id, i])), [items]);
  const sections = useMemo(() => {
    const today = items.filter((n) => isToday(n.createdAt));
    const earlier = items.filter((n) => !isToday(n.createdAt));
    return [
      ...(today.length ? [{ title: t('notifications.today'), data: today }] : []),
      ...(earlier.length ? [{ title: t('notifications.earlier'), data: earlier }] : []),
    ];
  }, [items, t]);

  const open = (n: AppNotification) => {
    if (!n.read) markRead.mutate([n.id]);
    const target = notificationTarget(n);
    if (target) router.navigate(target);
  };
  const actionsFor = (n: AppNotification) => [
    ...(!n.read ? [{ label: t('notifications.markRead'), onPress: () => markRead.mutate([n.id]) }] : []),
    { label: t('notifications.delete'), destructive: true, onPress: () => remove.mutate(n.id) },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: hasUnread
            ? () => <HeaderButton title={t('notifications.markAllRead')} onPress={() => markRead.mutate('all')} />
            : () => null,
        }}
      />
      {query.isLoading ? (
        <YStack p="$4" backgroundColor="$groupedBackground" f={1}>
          <ListSkeleton rows={6} />
        </YStack>
      ) : (
        <SectionList
          style={{ flex: 1, backgroundColor: colors.groupedBackground }}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
          sections={sections}
          keyExtractor={(n) => String(n.id)}
          stickySectionHeadersEnabled={false}
          refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={colors.textMuted} />}
          onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && void query.fetchNextPage()}
          onEndReachedThreshold={0.4}
          renderSectionHeader={({ section }) => (
            <Text variant="footnote" color="$textMuted" textTransform="uppercase" px="$4" pt="$4" pb="$1.5" accessibilityRole="header">
              {section.title}
            </Text>
          )}
          renderItem={({ item, index, section }) => {
            const first = index === 0;
            const last = index === section.data.length - 1;
            return (
              // deleted notifications fade out
              <Animated.View exiting={listExiting}>
              <Appear index={order.get(item.id) ?? 99}>
              <YStack
                backgroundColor="$surface"
                overflow="hidden"
                borderTopLeftRadius={first ? 12 : 0}
                borderTopRightRadius={first ? 12 : 0}
                borderBottomLeftRadius={last ? 12 : 0}
                borderBottomRightRadius={last ? 12 : 0}
              >
                {!first && <YStack height={0.5} backgroundColor="$separator" ml={64} />}
                <SwipeRow actions={[{ label: t('notifications.delete'), destructive: true, onPress: () => remove.mutate(item.id) }]}>
                  <PressableScale
                    scaleTo={0.98}
                    onPress={() => open(item)}
                    onLongPress={() => showActionSheet({ actions: actionsFor(item), cancelLabel: t('common.cancel') })}
                    accessibilityRole="button"
                    accessibilityLabel={[item.read ? null : t('notifications.unread'), notificationText(item, t, meId), timeAgo(item.createdAt, t, i18n.language)].filter(Boolean).join(', ')}
                  >
                    {({ pressed }) => (
                      <XStack px="$4" py="$3" gap="$3" ai="center" backgroundColor={pressed ? '$surfaceAlt' : '$surface'}>
                        {item.data.actor ? (
                          <UserAvatar uri={item.data.actor.avatarUrl} label={item.data.actor.username} seed={item.data.actor.uniqueId} size={36} textSize={14} />
                        ) : (
                          <YStack width={36} height={36} borderRadius={18} ai="center" jc="center" backgroundColor="$primarySoft">
                            <AppIcon name="bell" size={18} color="$primaryText" />
                          </YStack>
                        )}
                        <YStack f={1} gap={2} ai="flex-start">
                          <Text variant="subheadline" color="$text" ta="left" fontWeight={item.read ? '400' : '600'}>
                            {notificationText(item, t, meId)}
                          </Text>
                          <Text variant="caption" color="$textMuted">
                            {timeAgo(item.createdAt, t, i18n.language)}
                          </Text>
                        </YStack>
                        {!item.read && <YStack width={9} height={9} borderRadius={5} backgroundColor="$primary" accessibilityLabel={t('notifications.unread')} />}
                      </XStack>
                    )}
                  </PressableScale>
                </SwipeRow>
              </YStack>
              </Appear>
              </Animated.View>
            );
          }}
          ListEmptyComponent={
            <YStack backgroundColor="$surface" borderRadius={16} mt="$2">
              <EmptyState icon={<AppIcon name="bell" size={28} color="$textMuted" />} message={t('notifications.empty')} />
            </YStack>
          }
        />
      )}
    </>
  );
}
