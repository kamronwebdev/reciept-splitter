// app/(tabs)/home/notifications.tsx — the bell: Today / Earlier, unread dots, tap to open, swipe to delete.
import React, { useMemo } from 'react';
import { Pressable, RefreshControl, SectionList } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { XStack, YStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/ui/typography';
import UserAvatar from '@/shared/ui/UserAvatar';
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

export default function NotificationsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors } = useAppTheme();
  const meId = useAppStore((s) => s.user?.uniqueId);
  const query = useNotifications();
  const { markRead, remove } = useNotificationMutations();

  const items = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);
  const hasUnread = items.some((n) => !n.read);
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
            ? () => (
                <Pressable onPress={() => markRead.mutate('all')} hitSlop={10} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
                  <Text variant="body" color="$primaryText" numberOfLines={1}>
                    {t('notifications.markAllRead')}
                  </Text>
                </Pressable>
              )
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
                  <Pressable
                    onPress={() => open(item)}
                    onLongPress={() => showActionSheet({ actions: actionsFor(item), cancelLabel: t('common.cancel') })}
                    accessibilityRole="button"
                    accessibilityHint={item.read ? undefined : t('notifications.unread')}
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
                  </Pressable>
                </SwipeRow>
              </YStack>
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
