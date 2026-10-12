// app/(tabs)/friends/index.tsx — Friends: Scan QR / My QR, requests, search, the list (swipe to remove).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { XStack, YStack } from 'tamagui';
import { useTranslation } from 'react-i18next';

import { Text } from '@/shared/ui/typography';
import Screen from '@/shared/ui/Screen';
import SearchField from '@/shared/ui/SearchField';
import { IconTile, ListRow, ListSection } from '@/shared/ui/List';
import { ListSkeleton } from '@/shared/ui/Skeleton';
import EmptyState from '@/shared/ui/EmptyState';
import UserAvatar from '@/shared/ui/UserAvatar';
import CountBadge from '@/shared/ui/CountBadge';
import SwipeRow from '@/shared/ui/SwipeRow';
import Banner from '@/shared/ui/Banner';
import { showActionSheet } from '@/shared/ui/ActionSheet';
import { toast } from '@/shared/ui/Toast';
import { confirmAction } from '@/shared/lib/utils/confirm';
import { errorMessage } from '@/shared/lib/utils/error-message';
import { useFriendsStore } from '@/features/friends/model/friends.store';
import { handleOf } from '@/features/friends/lib/format';
import AppIcon from '@/shared/ui/AppIcon';
import { Appear, PressableScale } from '@/shared/ui/motion';

type FriendView = { uniqueId: string; name: string; avatarUrl: string | null };

export default function FriendsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { friends, loading, error, fetchAll, requestsRaw, remove, lastFetchedAt } = useFriendsStore();
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const incoming = requestsRaw?.incoming?.length ?? 0;

  useEffect(() => {
    useFriendsStore.getState().fetchIfStale();
  }, []);

  const list: FriendView[] = useMemo(
    () =>
      (friends ?? [])
        .map((f: any) => ({
          uniqueId: (f?.uniqueId ?? f?.user?.uniqueId) as string,
          name: (f?.user?.displayName || f?.username || f?.user?.username || f?.uniqueId) as string,
          avatarUrl: (f?.avatarUrl ?? f?.user?.avatarUrl ?? null) as string | null,
        }))
        .filter((f: FriendView) => !!f.uniqueId),
    [friends]
  );
  const q = query.trim().toLowerCase();
  const visible = q ? list.filter((f) => f.name.toLowerCase().includes(q) || f.uniqueId.toLowerCase().includes(q)) : list;

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  const askRemove = (f: FriendView) =>
    confirmAction({
      title: t('friends.removeTitle', { name: f.name }),
      message: t('friends.removeMessage'),
      confirmText: t('friends.remove', 'Remove'),
      cancelText: t('common.cancel'),
      destructive: true,
      onConfirm: async () => {
        try {
          await remove(f.uniqueId);
          toast.success(t('friends.removed', { name: f.name }));
        } catch (e) {
          toast.error(errorMessage(t, e));
        }
      },
    });

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {/* the two ways to add someone in person */}
      <XStack gap="$3">
        <BigAction index={0} icon={<AppIcon name="scan" size={26} color="$onPrimary" />} label={t('friends.qr.scanQr')} primary onPress={() => router.push('/scan-invite')} />
        <BigAction index={1} icon={<AppIcon name="qr" size={26} color="$text" />} label={t('friends.qr.myQr')} onPress={() => router.push('/my-qr')} />
      </XStack>

      <ListSection>
        <ListRow
          key="requests"
          left={
            <IconTile>
              <AppIcon name="userAdd" size={20} color="$primaryText" />
            </IconTile>
          }
          title={t('friends.qr.requestsLink')}
          right={<CountBadge count={incoming} />}
          chevron
          onPress={() => router.push('/friends/requests')}
        />
        <ListRow
          key="add"
          left={
            <IconTile>
              <AppIcon name="friends" size={20} color="$primaryText" />
            </IconTile>
          }
          title={t('friends.addById')}
          chevron
          onPress={() => router.push('/friends/search')}
        />
      </ListSection>

      {!!error && !list.length && <Banner kind="error" message={t('errors.NETWORK')} actionLabel={t('common.retry')} onAction={refresh} />}

      {loading && !lastFetchedAt ? (
        <ListSkeleton rows={4} />
      ) : list.length === 0 ? (
        <YStack backgroundColor="$surface" borderRadius={16}>
          <EmptyState icon={<AppIcon name="friends" size={28} color="$textMuted" />} title={t('friends.empty')} actionLabel={t('friends.qr.myQr')} onAction={() => router.push('/my-qr')} />
        </YStack>
      ) : (
        <YStack gap="$3">
          <SearchField value={query} onChangeText={setQuery} placeholder={t('common.search')} clearLabel={t('common.clear')} />
          {visible.length === 0 ? (
            <Text variant="subheadline" color="$textMuted" ta="center">
              {t('common.noResults')}
            </Text>
          ) : (
            <ListSection header={t('friends.listHeader', { count: list.length })} animateChanges>
              {visible.map((f) => (
                <SwipeRow key={f.uniqueId} actions={[{ label: t('friends.remove', 'Remove'), destructive: true, onPress: () => askRemove(f) }]}>
                  <YStack backgroundColor="$surface">
                    <ListRow
                      left={<UserAvatar uri={f.avatarUrl} label={f.name} seed={f.uniqueId} size={40} textSize={15} />}
                      title={f.name}
                      subtitle={handleOf(f.uniqueId)}
                      accessibilityHint={t('friends.swipeHint')}
                      onLongPress={() =>
                        showActionSheet({
                          title: f.name,
                          actions: [{ label: t('friends.remove', 'Remove'), destructive: true, onPress: () => askRemove(f) }],
                          cancelLabel: t('common.cancel'),
                        })
                      }
                    />
                  </YStack>
                </SwipeRow>
              ))}
            </ListSection>
          )}
        </YStack>
      )}
    </Screen>
  );
}

function BigAction({ icon, label, onPress, primary, index }: { icon: React.ReactNode; label: string; onPress: () => void; primary?: boolean; index: number }) {
  return (
    <PressableScale onPress={onPress} haptic={primary ? 'tap' : 'select'} accessibilityRole="button" accessibilityLabel={label} style={{ flex: 1 }}>
      {({ pressed }) => (
        <Appear index={index}>
        <YStack minHeight={88} borderRadius={16} ai="center" jc="center" gap="$2" p="$3" backgroundColor={primary ? '$primary' : '$surface'} opacity={pressed ? 0.8 : 1}>
          {icon}
          <Text variant="headline" color={primary ? '$onPrimary' : '$text'} ta="center" numberOfLines={2}>
            {label}
          </Text>
        </YStack>
        </Appear>
      )}
    </PressableScale>
  );
}
