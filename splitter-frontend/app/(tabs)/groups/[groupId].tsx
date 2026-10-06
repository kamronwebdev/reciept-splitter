// app/(tabs)/groups/[groupId].tsx — one group: header, members, add from friends (owner), QR, delete / leave.
import React, { useEffect, useMemo, useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { XStack, YStack } from 'tamagui';
import { QrCode, UsersRound } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';

import { Text } from '@/shared/ui/typography';
import Screen from '@/shared/ui/Screen';
import Section from '@/shared/ui/Section';
import Input from '@/shared/ui/Input';
import SearchField from '@/shared/ui/SearchField';
import { Button } from '@/shared/ui/Button';
import { IconTile, ListRow, ListSection } from '@/shared/ui/List';
import { ListSkeleton } from '@/shared/ui/Skeleton';
import EmptyState from '@/shared/ui/EmptyState';
import UserAvatar from '@/shared/ui/UserAvatar';
import SwipeRow from '@/shared/ui/SwipeRow';
import { showActionSheet } from '@/shared/ui/ActionSheet';
import { toast } from '@/shared/ui/Toast';
import { confirmAction } from '@/shared/lib/utils/confirm';
import { errorMessage } from '@/shared/lib/utils/error-message';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { useGroupsStore } from '@/features/groups/model/groups.store';
import { useFriendsStore } from '@/features/friends/model/friends.store';
import { handleOf } from '@/features/friends/lib/format';

export default function GroupDetailsScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const gid = Number(groupId);
  const router = useRouter();
  const { t } = useTranslation();
  const me = useAppStore((s) => s.user);
  const { current, loading, openGroup, renameGroup, deleteGroup, addMember, removeMember } = useGroupsStore();
  const friends = useFriendsStore((s) => s.friends);
  const fetchFriendsIfStale = useFriendsStore((s) => s.fetchIfStale);

  const [name, setName] = useState('');
  const [filter, setFilter] = useState('');
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (gid) openGroup(gid);
  }, [gid, openGroup]);
  useEffect(() => {
    fetchFriendsIfStale();
  }, [fetchFriendsIfStale]);

  const group = current?.group?.id === gid ? current : undefined;
  useEffect(() => {
    if (group?.group?.name) setName(group.group.name);
  }, [group?.group?.name]);

  const isOwner = !!group && (group.role === 'owner' || (typeof group.group?.ownerId === 'number' && group.group.ownerId === me?.id));
  const members = useMemo(() => group?.members ?? [], [group]);
  const memberIds = useMemo(() => new Set(members.map((m) => (m.uniqueId || '').toUpperCase())), [members]);
  const candidates = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return (friends ?? [])
      .map((f: any) => ({ uniqueId: (f?.uniqueId ?? f?.user?.uniqueId) as string, name: (f?.username ?? f?.user?.username ?? f?.uniqueId) as string, avatarUrl: (f?.avatarUrl ?? null) as string | null }))
      .filter((f) => f.uniqueId && !memberIds.has(f.uniqueId.toUpperCase()))
      .filter((f) => !q || f.name.toLowerCase().includes(q) || f.uniqueId.toLowerCase().includes(q));
  }, [friends, memberIds, filter]);

  const run = async (uid: string | null, fn: () => Promise<unknown>, success?: string) => {
    setBusyUid(uid);
    try {
      await fn();
      await openGroup(gid);
      if (success) toast.success(success);
    } catch (e) {
      toast.error(errorMessage(t, e));
    } finally {
      setBusyUid(null);
    }
  };

  const saveName = async () => {
    if (!name.trim() || name.trim() === group?.group?.name) return;
    setSaving(true);
    await run(null, () => renameGroup(gid, name.trim()), t('groups.detail.renamed'));
    setSaving(false);
  };

  const askRemove = (uid: string, label: string) =>
    confirmAction({
      title: t('groups.detail.removeTitle', { name: label }),
      message: t('groups.detail.removeMessage'),
      confirmText: t('groups.detail.remove'),
      cancelText: t('common.cancel'),
      destructive: true,
      onConfirm: () => run(uid, () => removeMember(gid, uid), t('groups.detail.removed', { name: label })),
    });

  const askDelete = () =>
    confirmAction({
      title: t('groups.detail.deleteTitle'),
      message: t('groups.detail.deleteMessage'),
      confirmText: t('groups.detail.delete'),
      cancelText: t('common.cancel'),
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteGroup(gid);
          router.back();
        } catch (e) {
          toast.error(errorMessage(t, e));
        }
      },
    });

  const askLeave = () =>
    confirmAction({
      title: t('groups.detail.leaveTitle'),
      message: t('groups.detail.leaveMessage'),
      confirmText: t('groups.detail.leave'),
      cancelText: t('common.cancel'),
      destructive: true,
      onConfirm: async () => {
        try {
          await removeMember(gid, me?.uniqueId ?? '');
          await useGroupsStore.getState().fetchGroups();
          router.back();
        } catch (e) {
          toast.error(errorMessage(t, e));
        }
      },
    });

  if (!group) {
    return (
      <Screen>
        {loading ? <ListSkeleton rows={4} /> : <EmptyState icon={<UsersRound size={28} color="$primaryText" />} message={t('errors.NOT_FOUND')} />}
      </Screen>
    );
  }

  const title = group.group?.name ?? t('groups.common.untitled', 'Group');

  return (
    <>
      <Stack.Screen options={{ title }} />
      <Screen>
        {/* header */}
        <YStack ai="center" gap="$2" pt="$2">
          <UserAvatar label={title} seed={`group-${gid}`} size={80} textSize={30} />
          <Text variant="title2" ta="center" accessibilityRole="header">
            {title}
          </Text>
          <Text variant="subheadline" color="$textMuted">
            {t('groups.list.members', { count: members.length })}
          </Text>
        </YStack>

        {isOwner && (
          <ListSection>
            <ListRow
              key="qr"
              left={
                <IconTile>
                  <QrCode size={17} color="$onPrimary" />
                </IconTile>
              }
              title={t('groups.detail.showQr')}
              chevron
              onPress={() => router.push({ pathname: '/groups/invite', params: { groupId: String(gid) } })}
            />
          </ListSection>
        )}

        <ListSection header={t('groups.detail.members')} footer={isOwner ? t('groups.detail.swipeHint') : undefined}>
          {members.map((m) => {
            const uid = m.uniqueId;
            const label = m.displayName || m.username || uid;
            const owner = m.role === 'owner' || (typeof m.id === 'number' && m.id === group.group?.ownerId);
            const canRemove = isOwner && !owner;
            const row = (
              <YStack backgroundColor="$surface">
                <ListRow
                  left={<UserAvatar uri={m.avatarUrl ?? m.user?.avatarUrl} label={label} seed={uid} size={40} textSize={15} />}
                  title={uid === me?.uniqueId ? `${label} (${t('receipt.people.you', 'You')})` : label}
                  subtitle={handleOf(uid)}
                  right={
                    owner ? (
                      <XStack px="$2" py={2} borderRadius={6} backgroundColor="$primarySoft">
                        <Text variant="caption" fontWeight="700" color="$primaryText">
                          {t('groups.roles.owner')}
                        </Text>
                      </XStack>
                    ) : null
                  }
                  {...(canRemove
                    ? {
                        onLongPress: () =>
                          showActionSheet({
                            title: label,
                            actions: [{ label: t('groups.detail.remove'), destructive: true, onPress: () => askRemove(uid, label) }],
                            cancelLabel: t('common.cancel'),
                          }),
                      }
                    : {})}
                />
              </YStack>
            );
            return canRemove ? (
              <SwipeRow key={uid} actions={[{ label: t('groups.detail.remove'), destructive: true, onPress: () => askRemove(uid, label) }]}>
                {row}
              </SwipeRow>
            ) : (
              <React.Fragment key={uid}>{row}</React.Fragment>
            );
          })}
        </ListSection>

        {isOwner && (
          <YStack gap="$3">
            <Text variant="footnote" color="$textMuted" textTransform="uppercase" px="$4" accessibilityRole="header">
              {t('groups.detail.addFromFriends')}
            </Text>
            <SearchField value={filter} onChangeText={setFilter} placeholder={t('friends.filter')} clearLabel={t('common.clear')} />
            {candidates.length === 0 ? (
              <Text variant="subheadline" color="$textMuted" ta="center">
                {t('groups.detail.noFriendsToAdd')}
              </Text>
            ) : (
              <ListSection>
                {candidates.map((f) => (
                  <ListRow
                    key={f.uniqueId}
                    left={<UserAvatar uri={f.avatarUrl} label={f.name} seed={f.uniqueId} size={36} textSize={14} />}
                    title={f.name}
                    subtitle={handleOf(f.uniqueId)}
                    right={<Button title={t('groups.detail.add')} size="small" variant="secondary" loading={busyUid === f.uniqueId} onPress={() => void run(f.uniqueId, () => addMember(gid, f.uniqueId), t('groups.detail.added', { name: f.name }))} />}
                  />
                ))}
              </ListSection>
            )}
          </YStack>
        )}

        {isOwner && (
          <Section title={t('groups.detail.nameTitle')}>
            <Input value={name} onChangeText={setName} placeholder={t('groups.create.namePlaceholder', 'Group name')} accessibilityLabel={t('groups.detail.nameTitle')} />
            <Button title={t('groups.detail.saveName')} variant="secondary" onPress={saveName} loading={saving} disabled={!name.trim() || name.trim() === group.group?.name} />
          </Section>
        )}

        <ListSection>
          {isOwner ? (
            <ListRow key="delete" title={t('groups.detail.delete')} destructive onPress={askDelete} />
          ) : (
            <ListRow key="leave" title={t('groups.detail.leave')} destructive onPress={askLeave} />
          )}
        </ListSection>
      </Screen>
    </>
  );
}
