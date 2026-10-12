// app/(tabs)/groups/index.tsx — my groups (grouped list), New group (+), join by scanning an invite.
import React, { useCallback, useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { YStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import Screen from '@/shared/ui/Screen';
import HeaderButton from '@/shared/ui/HeaderButton';
import { IconTile, ListRow, ListSection } from '@/shared/ui/List';
import { ListSkeleton } from '@/shared/ui/Skeleton';
import EmptyState from '@/shared/ui/EmptyState';
import Banner from '@/shared/ui/Banner';
import UserAvatar from '@/shared/ui/UserAvatar';
import AppIcon from '@/shared/ui/AppIcon';
import { useGroupsStore } from '@/features/groups/model/groups.store';
import { IconCount } from '@/shared/ui/StatusChip';

export default function GroupsListScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { groups, counts, loading, error, fetchGroups } = useGroupsStore();
  const [refreshing, setRefreshing] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);

  useEffect(() => {
    fetchGroups().finally(() => setLoadedOnce(true));
  }, [fetchGroups]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchGroups();
    setRefreshing(false);
  }, [fetchGroups]);

  const countOf = (g: (typeof groups)[number]) => counts?.[g.id] ?? g.counts?.members ?? g.members?.length ?? 0;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => <HeaderButton icon="plus" accessibilityLabel={t('navigation.groups.create')} onPress={() => router.push('/groups/create')} />,
        }}
      />
      <Screen refreshing={refreshing} onRefresh={refresh}>
        {!!error && !groups.length && <Banner kind="error" message={t('errors.NETWORK')} actionLabel={t('common.retry')} onAction={refresh} />}

        {loading && !loadedOnce ? (
          <ListSkeleton rows={3} />
        ) : groups.length === 0 ? (
          <YStack backgroundColor="$surface" borderRadius={16}>
            <EmptyState
              icon={<AppIcon name="groups" size={28} color="$textMuted" />}
              title={t('groups.emptyTitle')}
              actionLabel={t('navigation.groups.create')}
              onAction={() => router.push('/groups/create')}
            />
          </YStack>
        ) : (
          <ListSection animateChanges>
            {groups.map((g) => (
              <ListRow
                key={g.id}
                left={<UserAvatar label={g.name} seed={`group-${g.id}`} size={44} textSize={17} />}
                inset={72}
                title={g.name ?? t('groups.common.untitled', 'Group')}
                subtitle={<IconCount icon="friends" count={countOf(g)} label={t('groups.list.members', { count: countOf(g) })} />}
                accessibilityLabel={`${g.name ?? t('groups.common.untitled', 'Group')}, ${t('groups.list.members', { count: countOf(g) })}`}
                chevron
                onPress={() => router.push({ pathname: '/groups/[groupId]', params: { groupId: String(g.id) } })}
              />
            ))}
          </ListSection>
        )}

        <ListSection>
          <ListRow
            key="scan"
            left={
              <IconTile>
                <AppIcon name="scan" size={20} color="$primaryText" />
              </IconTile>
            }
            title={t('groups.actions.scanInvite', 'Scan invite')}
            chevron
            onPress={() => router.push('/scan-invite')}
          />
        </ListSection>
      </Screen>
    </>
  );
}
