// app/(tabs)/friends/requests.tsx — incoming (accept / decline) and outgoing friend requests.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { XStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { Pressable, ActivityIndicator } from 'react-native';

import { Text } from '@/shared/ui/typography';
import Screen from '@/shared/ui/Screen';
import SegmentedControl from '@/shared/ui/SegmentedControl';
import { ListRow, ListSection } from '@/shared/ui/List';
import { ListSkeleton } from '@/shared/ui/Skeleton';
import EmptyState from '@/shared/ui/EmptyState';
import UserAvatar from '@/shared/ui/UserAvatar';
import { toast } from '@/shared/ui/Toast';
import { useAppTheme } from '@/shared/theme/useAppTheme';
import { errorMessage } from '@/shared/lib/utils/error-message';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { useFriendsStore } from '@/features/friends/model/friends.store';
import { FriendsApi } from '@/features/friends/api/friends.api';
import { handleOf } from '@/features/friends/lib/format';
import AppIcon from '@/shared/ui/AppIcon';

type Person = { id?: number; uniqueId?: string; username?: string; displayName?: string; avatarUrl?: string | null };

function RoundAction({ onPress, label, kind, busy }: { onPress: () => void; label: string; kind: 'accept' | 'decline'; busy: boolean }) {
  const { colors } = useAppTheme();
  return (
    <Pressable onPress={onPress} disabled={busy} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}>
      {({ pressed }) => (
        <XStack width={36} height={36} borderRadius={18} ai="center" jc="center" backgroundColor={kind === 'accept' ? '$primary' : '$surfaceAlt'} opacity={pressed || busy ? 0.6 : 1}>
          {busy ? (
            <ActivityIndicator size="small" color={colors.textMuted} />
          ) : kind === 'accept' ? (
            <AppIcon name="check" size={18} color="$onPrimary" />
          ) : (
            <AppIcon name="close" size={18} color="$textMuted" />
          )}
        </XStack>
      )}
    </Pressable>
  );
}

export default function FriendRequestsScreen() {
  const { t } = useTranslation();
  const { requestsRaw, fetchAll, loading } = useFriendsStore();
  const meUniqueId = useAppStore((s) => s.user?.uniqueId);
  const [tab, setTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const incoming = useMemo(() => (requestsRaw?.incoming ?? []) as { id: number; from: Person }[], [requestsRaw]);
  const outgoing = useMemo(() => (requestsRaw?.outgoing ?? []) as { id: number; to: Person }[], [requestsRaw]);
  const nameOf = (p?: Person) => p?.displayName || p?.username || p?.uniqueId || t('friends.common.unknownUser', 'Unknown user');

  const act = useCallback(
    async (kind: 'accept' | 'decline', from: Person) => {
      if (!from.id) return;
      setBusyId(from.id);
      try {
        if (kind === 'accept') await FriendsApi.accept(meUniqueId ?? '', from.id);
        else await FriendsApi.reject(meUniqueId ?? '', from.id);
        toast.success(t(kind === 'accept' ? 'friends.requests.accepted' : 'friends.requests.rejected', { target: nameOf(from) }));
        await fetchAll();
      } catch (e) {
        toast.error(errorMessage(t, e));
      } finally {
        setBusyId(null);
      }
    },
    [fetchAll, meUniqueId, t]
  );

  const refresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  const list = tab === 'incoming' ? incoming : outgoing;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh} gap={16}>
      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: 'incoming', label: `${t('friends.requests.tabIncoming', 'Incoming')}${incoming.length ? ` (${incoming.length})` : ''}` },
          { value: 'outgoing', label: t('friends.requests.tabOutgoing', 'Outgoing') },
        ]}
      />
      {loading && !requestsRaw ? (
        <ListSkeleton rows={3} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<AppIcon name="inbox" size={28} color="$primaryText" />}
          message={tab === 'incoming' ? t('friends.requests.emptyIncoming', 'No incoming requests') : t('friends.requests.emptyOutgoing', 'No outgoing requests')}
        />
      ) : (
        <ListSection>
          {tab === 'incoming'
            ? incoming.map((r) => (
                <ListRow
                  key={`in-${r.id}`}
                  left={<UserAvatar uri={r.from.avatarUrl} label={nameOf(r.from)} seed={r.from.uniqueId} size={40} textSize={15} />}
                  title={nameOf(r.from)}
                  subtitle={handleOf(r.from.uniqueId)}
                  right={
                    <XStack gap="$2">
                      <RoundAction kind="decline" label={t('friends.requests.decline')} busy={busyId === r.from.id} onPress={() => void act('decline', r.from)} />
                      <RoundAction kind="accept" label={t('friends.requests.accept')} busy={busyId === r.from.id} onPress={() => void act('accept', r.from)} />
                    </XStack>
                  }
                />
              ))
            : outgoing.map((r) => (
                <ListRow
                  key={`out-${r.id}`}
                  left={<UserAvatar uri={r.to.avatarUrl} label={nameOf(r.to)} seed={r.to.uniqueId} size={40} textSize={15} />}
                  title={nameOf(r.to)}
                  subtitle={handleOf(r.to.uniqueId)}
                  right={
                    <Text variant="footnote" color="$textMuted">
                      {t('friends.requests.requestedLabel', 'Requested')}
                    </Text>
                  }
                />
              ))}
        </ListSection>
      )}
    </Screen>
  );
}
