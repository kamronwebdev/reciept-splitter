// app/(tabs)/groups/index.tsx — my groups (grouped list), New group (+), join by scanning an invite.
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { YStack } from 'tamagui';
import { Plus, ScanLine, UsersRound } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';
import Screen from '@/shared/ui/Screen';
import { IconTile, ListRow, ListSection } from '@/shared/ui/List';
import { ListSkeleton } from '@/shared/ui/Skeleton';
import EmptyState from '@/shared/ui/EmptyState';
import Banner from '@/shared/ui/Banner';
import UserAvatar from '@/shared/ui/UserAvatar';
import AppIcon from '@/shared/ui/AppIcon';
import { useAppTheme } from '@/shared/theme/useAppTheme';
import { useGroupsStore } from '@/features/groups/model/groups.store';

export default function GroupsListScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useAppTheme();
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
          headerRight: () => (
            <Pressable onPress={() => router.push('/groups/create')} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('navigation.groups.create')} style={{ padding: 4 }}>
              <AppIcon sf="plus" fallback={Plus} color={colors.primaryText} size={24} />
            </Pressable>
          ),
        }}
      />
      <Screen refreshing={refreshing} onRefresh={refresh}>
        {!!error && !groups.length && <Banner kind="error" message={t('errors.NETWORK')} actionLabel={t('common.retry')} onAction={refresh} />}

        {loading && !loadedOnce ? (
          <ListSkeleton rows={3} />
        ) : groups.length === 0 ? (
          <YStack backgroundColor="$surface" borderRadius={16}>
            <EmptyState
              icon={<UsersRound size={28} color="$primaryText" />}
              title={t('groups.emptyTitle')}
              message={t('groups.emptyMessage')}
              actionLabel={t('navigation.groups.create')}
              onAction={() => router.push('/groups/create')}
            />
          </YStack>
        ) : (
          <ListSection>
            {groups.map((g) => (
              <ListRow
                key={g.id}
                left={<UserAvatar label={g.name} seed={`group-${g.id}`} size={44} textSize={17} />}
                inset={72}
                title={g.name ?? t('groups.common.untitled', 'Group')}
                subtitle={countOf(g) ? t('groups.list.members', { count: countOf(g) }) : t('groups.list.members_zero', 'No members yet')}
                chevron
                onPress={() => router.push({ pathname: '/groups/[groupId]', params: { groupId: String(g.id) } })}
              />
            ))}
          </ListSection>
        )}

        <ListSection footer={t('groups.scanFooter')}>
          <ListRow
            key="scan"
            left={
              <IconTile>
                <ScanLine size={17} color="$onPrimary" />
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
