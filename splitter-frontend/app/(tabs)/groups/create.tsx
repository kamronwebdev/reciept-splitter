// app/(tabs)/groups/create.tsx — name the group, then pick members from friends.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { YStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import { Text } from '@/shared/ui/typography';
import Screen from '@/shared/ui/Screen';
import Section from '@/shared/ui/Section';
import Input from '@/shared/ui/Input';
import SearchField from '@/shared/ui/SearchField';
import { Button } from '@/shared/ui/Button';
import { ListRow, ListSection } from '@/shared/ui/List';
import UserAvatar from '@/shared/ui/UserAvatar';
import { toast } from '@/shared/ui/Toast';
import { errorMessage } from '@/shared/lib/utils/error-message';
import { useGroupsStore } from '@/features/groups/model/groups.store';
import { useFriendsStore } from '@/features/friends/model/friends.store';
import { handleOf } from '@/features/friends/lib/format';
import AppIcon from '@/shared/ui/AppIcon';
import { Pop } from '@/shared/ui/motion';

export default function GroupCreateScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { createGroup, openGroup, addMember, removeMember, current, clearCurrent } = useGroupsStore();
  const friends = useFriendsStore((s) => s.friends);
  const fetchFriendsIfStale = useFriendsStore((s) => s.fetchIfStale);

  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [groupId, setGroupId] = useState<number | undefined>(undefined);
  const [filter, setFilter] = useState('');
  const [busyUid, setBusyUid] = useState<string | null>(null);

  // a fresh form every time the screen is opened
  useFocusEffect(
    useCallback(() => {
      clearCurrent();
      setGroupId(undefined);
      setName('');
      setFilter('');
    }, [clearCurrent])
  );
  useEffect(() => {
    fetchFriendsIfStale();
  }, [fetchFriendsIfStale]);

  const memberIds = useMemo(() => new Set((current?.members ?? []).map((m) => (m.uniqueId || '').toUpperCase())), [current?.members]);
  const rows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return (friends ?? [])
      .map((f: any) => ({ uniqueId: (f?.uniqueId ?? f?.user?.uniqueId) as string, name: (f?.username ?? f?.user?.username ?? f?.uniqueId) as string, avatarUrl: (f?.avatarUrl ?? null) as string | null }))
      .filter((f) => !!f.uniqueId && (!q || f.name.toLowerCase().includes(q) || f.uniqueId.toLowerCase().includes(q)));
  }, [friends, filter]);

  const create = async () => {
    if (!name.trim() || creating) return;
    setCreating(true);
    try {
      const g = await createGroup(name.trim());
      setGroupId(g.id);
      await openGroup(g.id);
      toast.success(t('groups.create.notice.success', 'Group created'));
    } catch (e) {
      toast.error(errorMessage(t, e));
    } finally {
      setCreating(false);
    }
  };

  const toggle = async (uid: string) => {
    if (!groupId) return;
    setBusyUid(uid);
    try {
      if (memberIds.has(uid.toUpperCase())) await removeMember(groupId, uid);
      else await addMember(groupId, uid);
      await openGroup(groupId);
    } catch (e) {
      toast.error(errorMessage(t, e));
    } finally {
      setBusyUid(null);
    }
  };

  return (
    <Screen>
      <Section title={t('groups.detail.nameTitle')}>
        <Input
          value={name}
          onChangeText={setName}
          placeholder={t('groups.create.namePlaceholder', 'Group name')}
          accessibilityLabel={t('groups.detail.nameTitle')}
          textInputProps={{ editable: !groupId, returnKeyType: 'done', onSubmitEditing: create, autoFocus: true }}
        />
        {!groupId && <Button title={t('groups.create.action', 'Create')} size="large" onPress={create} loading={creating} disabled={!name.trim()} />}
      </Section>

      {!!groupId && (
        <YStack gap="$3">
          <Text variant="footnote" color="$textMuted" textTransform="uppercase" px="$4" accessibilityRole="header">
            {t('groups.create.manageMembers', 'Add or remove members')}
          </Text>
          <SearchField value={filter} onChangeText={setFilter} placeholder={t('common.search')} clearLabel={t('common.clear')} />
          {rows.length === 0 ? (
            <Text variant="subheadline" color="$textMuted" ta="center">
              {t('groups.create.noFriends', 'No friends to display')}
            </Text>
          ) : (
            <ListSection>
              {rows.map((f) => {
                const inGroup = memberIds.has(f.uniqueId.toUpperCase());
                return (
                  <ListRow
                    key={f.uniqueId}
                    left={<UserAvatar uri={f.avatarUrl} label={f.name} seed={f.uniqueId} size={36} textSize={14} />}
                    title={f.name}
                    subtitle={handleOf(f.uniqueId)}
                    onPress={() => void toggle(f.uniqueId)}
                    disabled={busyUid === f.uniqueId}
                    accessibilityLabel={`${f.name}, ${inGroup ? t('groups.create.inGroup') : t('groups.create.notInGroup')}`}
                    right={
                      <Pressable onPress={() => void toggle(f.uniqueId)} accessibilityElementsHidden importantForAccessibility="no">
                        <Pop trigger={inGroup}>
                          <YStack width={28} height={28} borderRadius={14} ai="center" jc="center" backgroundColor={inGroup ? '$primary' : '$surfaceAlt'}>
                            {inGroup ? <AppIcon name="check" size={16} color="$onPrimary" /> : <AppIcon name="plus" size={16} color="$textMuted" />}
                          </YStack>
                        </Pop>
                      </Pressable>
                    }
                  />
                );
              })}
            </ListSection>
          )}
          <Button title={t('common.done')} size="large" onPress={() => router.replace({ pathname: '/groups/[groupId]', params: { groupId: String(groupId) } })} />
        </YStack>
      )}
    </Screen>
  );
}
