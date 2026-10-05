import React, { useEffect, useMemo, useState } from 'react';
import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { XStack, YStack } from 'tamagui';
import { Search, Users } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/ui/typography';
import { Button } from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import UserAvatar from '@/shared/ui/UserAvatar';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { useFriendsStore } from '@/features/friends/model/friends.store';
import { useGroupsStore } from '@/features/groups/model/groups.store';
import { useReceiptSessionStore } from '@/features/receipt/model/receipt-session.store';
import FlowScreen from '@/features/receipt/ui/FlowScreen';
import PersonRow, { type Candidate } from '@/features/receipt/ui/people/PersonRow';
import SelectedChips from '@/features/receipt/ui/people/SelectedChips';

function SectionTitle({ children }: { children: string }) {
  return (
    <Text fontSize={13} fontWeight="700" color="$textMuted" textTransform="uppercase" letterSpacing={0.6} accessibilityRole="header">
      {children}
    </Text>
  );
}

/** Step 3: who shares the bill. You are always in; groups select all their members at once. */
export default function PeopleScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const me = useAppStore((s) => s.user);
  const friendsRaw = useFriendsStore((s) => s.friends);
  const fetchFriendsIfStale = useFriendsStore((s) => s.fetchIfStale);
  const groups = useGroupsStore((s) => s.groups);
  const fetchGroups = useGroupsStore((s) => s.fetchGroups);

  const savedParticipants = useReceiptSessionStore((s) => s.participants);
  const setParticipants = useReceiptSessionStore((s) => s.setParticipants);
  const setStep = useReceiptSessionStore((s) => s.setStep);

  // load once when the screen opens (stable actions, no loading flag in deps)
  useEffect(() => {
    fetchFriendsIfStale();
    fetchGroups();
  }, [fetchFriendsIfStale, fetchGroups]);

  const meCandidate: Candidate | null = useMemo(
    () => (me?.uniqueId ? { uniqueId: me.uniqueId, username: me.username, avatarUrl: me.avatarUrl, isMe: true } : null),
    [me?.uniqueId, me?.username, me?.avatarUrl]
  );

  const friends: Candidate[] = useMemo(() => {
    const list = (friendsRaw ?? [])
      .filter((f: any) => f?.uniqueId)
      .map((f: any) => ({ uniqueId: f.uniqueId as string, username: (f.username || f.uniqueId) as string, avatarUrl: (f.avatarUrl ?? null) as string | null, since: f.since ? Date.parse(f.since) : 0 }));
    list.sort((a: any, b: any) => (b.since || 0) - (a.since || 0));
    return list.map(({ since: _since, ...rest }: any) => rest as Candidate);
  }, [friendsRaw]);

  // every person we know about (for chips of group members who are not friends)
  const everyone = useMemo(() => {
    const map = new Map<string, Candidate>();
    if (meCandidate) map.set(meCandidate.uniqueId, meCandidate);
    friends.forEach((f) => map.set(f.uniqueId, f));
    groups.forEach((g) =>
      (g.members ?? []).forEach((m) => {
        if (m.uniqueId && !map.has(m.uniqueId)) map.set(m.uniqueId, { uniqueId: m.uniqueId, username: m.username || m.uniqueId, avatarUrl: m.avatarUrl ?? null });
      })
    );
    return map;
  }, [meCandidate, friends, groups]);

  const [selected, setSelected] = useState<string[]>(() => savedParticipants.map((p) => p.uniqueId));
  const [query, setQuery] = useState('');

  // "You" is always included and first (re-applied when the profile arrives)
  useEffect(() => {
    if (!meCandidate) return;
    setSelected((prev) => (prev.includes(meCandidate.uniqueId) ? prev : [meCandidate.uniqueId, ...prev]));
  }, [meCandidate]);

  const selectedPeople: Candidate[] = useMemo(() => {
    const list = selected.map((id) => everyone.get(id) ?? savedParticipants.find((p) => p.uniqueId === id)).filter(Boolean) as Candidate[];
    return [...list].sort((a, b) => (a.isMe ? -1 : b.isMe ? 1 : 0));
  }, [selected, everyone, savedParticipants]);

  const q = query.trim().toLowerCase();
  const matches = (c: { username: string; uniqueId: string }) => !q || c.username.toLowerCase().includes(q) || c.uniqueId.toLowerCase().includes(q);
  const visibleFriends = friends.filter(matches);
  const visibleGroups = groups.filter((g) => !q || g.name.toLowerCase().includes(q));

  const toggle = (id: string) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleGroup = (memberIds: string[]) => {
    const others = memberIds.filter((id) => id !== meCandidate?.uniqueId);
    setSelected((prev) => {
      const allIn = others.length > 0 && others.every((id) => prev.includes(id));
      return allIn ? prev.filter((id) => !others.includes(id)) : Array.from(new Set([...prev, ...others]));
    });
  };

  const count = selected.length;
  const canNext = count >= 2;

  const next = () => {
    setParticipants(
      selectedPeople.map((p) => ({ uniqueId: p.uniqueId, username: p.username, avatarUrl: p.avatarUrl ?? null }))
    );
    setStep('split');
    router.push('/tabs/receipt/split');
  };

  return (
    <FlowScreen
      step="people"
      footer={
        <>
          {!canNext && (
            <Text fontSize={13} color="$textMuted" ta="center">
              {t('receipt.people.needTwo', 'Select at least 2 people to split the bill.')}
            </Text>
          )}
          <Button
            title={t('receipt.people.next', { count, defaultValue: 'Next: split items ({{count}} people)' })}
            variant="primary"
            size="large"
            onPress={next}
            disabled={!canNext}
          />
        </>
      }
    >
      <SelectedChips people={selectedPeople} onRemove={toggle} />

      <Input
        value={query}
        onChangeText={setQuery}
        placeholder={t('receipt.people.search', 'Search people and groups')}
        accessibilityLabel={t('receipt.people.search', 'Search people and groups')}
        rightAdornment={<Search size={18} color="$textSubtle" />}
        textInputProps={{ autoCapitalize: 'none', autoCorrect: false, returnKeyType: 'search' }}
      />

      {meCandidate && !q && (
        <YStack borderRadius={16} overflow="hidden" borderWidth={1} borderColor="$borderColor">
          <PersonRow person={meCandidate} selected onToggle={() => undefined} />
        </YStack>
      )}

      {visibleGroups.length > 0 && (
        <YStack gap="$2">
          <SectionTitle>{t('receipt.people.groups', 'Groups')}</SectionTitle>
          <YStack borderRadius={16} overflow="hidden" borderWidth={1} borderColor="$borderColor" backgroundColor="$surface">
            {visibleGroups.map((g, idx) => {
              const memberIds = (g.members ?? []).map((m) => m.uniqueId).filter(Boolean);
              const others = memberIds.filter((id) => id !== meCandidate?.uniqueId);
              const allIn = others.length > 0 && others.every((id) => selected.includes(id));
              return (
                <YStack key={g.id} borderTopWidth={idx === 0 ? 0 : 1} borderColor="$borderColor">
                  <Pressable
                    onPress={() => toggleGroup(memberIds)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: allIn }}
                    accessibilityLabel={`${g.name}, ${memberIds.length}`}
                    style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                  >
                    <XStack ai="center" gap="$3" minHeight={60} px="$4" py="$2" backgroundColor="$surface">
                      <YStack w={44} h={44} br={22} ai="center" jc="center" backgroundColor="$primarySoft">
                        <Users size={20} color="$primaryText" />
                      </YStack>
                      <YStack f={1} ai="flex-start">
                        <Text fontSize={16} fontWeight="600" color="$text" numberOfLines={1}>
                          {g.name}
                        </Text>
                        <XStack ai="center" gap="$2">
                          <XStack>
                            {(g.members ?? []).slice(0, 4).map((m, i) => (
                              <YStack key={m.uniqueId} ml={i === 0 ? 0 : -8}>
                                <UserAvatar uri={m.avatarUrl} label={m.username || m.uniqueId} seed={m.uniqueId} size={20} />
                              </YStack>
                            ))}
                          </XStack>
                          <Text fontSize={13} color="$textMuted">
                            {t('receipt.people.members', { count: memberIds.length, defaultValue: '{{count}} members' })}
                          </Text>
                        </XStack>
                      </YStack>
                      <YStack w={28} h={28} br={8} ai="center" jc="center" backgroundColor={allIn ? '$primary' : 'transparent'} borderWidth={allIn ? 0 : 2} borderColor="$borderColor">
                        {allIn && <Text fontSize={16} fontWeight="800" color="$onPrimary">✓</Text>}
                      </YStack>
                    </XStack>
                  </Pressable>
                </YStack>
              );
            })}
          </YStack>
        </YStack>
      )}

      <YStack gap="$2">
        <SectionTitle>{t('receipt.people.friends', 'Friends')}</SectionTitle>
        {friends.length === 0 ? (
          <YStack borderRadius={16} borderWidth={1} borderColor="$borderColor" backgroundColor="$surface" p="$4" gap="$3" ai="center">
            <Text fontSize={16} fontWeight="700" color="$text" ta="center">
              {t('receipt.people.emptyTitle', 'No friends yet')}
            </Text>
            <Text fontSize={14} color="$textMuted" ta="center">
              {t('receipt.people.emptyBody', 'Add friends to split the bill with them, or let them scan your QR code.')}
            </Text>
            <Button title={t('receipt.people.addFriends', 'Add friends')} variant="primary" size="medium" onPress={() => router.push('/tabs/friends/search')} />
            <Button title={t('receipt.people.inviteQr', 'Invite by QR')} variant="outline" size="medium" onPress={() => router.push('/tabs/friends/invite')} />
          </YStack>
        ) : visibleFriends.length === 0 ? (
          <Text fontSize={14} color="$textMuted" ta="center" py="$3">
            {t('receipt.people.noMatches', 'No one matches your search.')}
          </Text>
        ) : (
          <YStack borderRadius={16} overflow="hidden" borderWidth={1} borderColor="$borderColor">
            {visibleFriends.map((f, idx) => (
              <YStack key={f.uniqueId} borderTopWidth={idx === 0 ? 0 : 1} borderColor="$borderColor">
                <PersonRow person={f} selected={selected.includes(f.uniqueId)} onToggle={() => toggle(f.uniqueId)} />
              </YStack>
            ))}
          </YStack>
        )}
      </YStack>
    </FlowScreen>
  );
}
