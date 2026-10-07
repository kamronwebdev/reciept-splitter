// app/(tabs)/friends/search.tsx — add a friend by their ID (or go to the QR options).
import React, { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/ui/typography';
import Screen from '@/shared/ui/Screen';
import SearchField from '@/shared/ui/SearchField';
import { Button } from '@/shared/ui/Button';
import { IconTile, ListRow, ListSection } from '@/shared/ui/List';
import { ListSkeleton } from '@/shared/ui/Skeleton';
import EmptyState from '@/shared/ui/EmptyState';
import UserAvatar from '@/shared/ui/UserAvatar';
import { toast } from '@/shared/ui/Toast';
import { errorMessage } from '@/shared/lib/utils/error-message';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { useFriendsStore } from '@/features/friends/model/friends.store';
import { handleOf } from '@/features/friends/lib/format';
import AppIcon from '@/shared/ui/AppIcon';

type UserLite = { uniqueId?: string; username?: string; displayName?: string; avatarUrl?: string | null };

export default function FriendsSearchScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { search, send, requestsRaw, friends } = useFriendsStore();
  const meUniqueId = useAppStore((s) => s.user?.uniqueId);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserLite[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());

  const known = useMemo(() => {
    const friendsSet = new Set((friends ?? []).map((f: any) => f?.uniqueId ?? f?.user?.uniqueId).filter(Boolean));
    const out = new Set((requestsRaw?.outgoing ?? []).map((r: any) => r?.to?.uniqueId).filter(Boolean));
    const inc = new Set((requestsRaw?.incoming ?? []).map((r: any) => r?.from?.uniqueId).filter(Boolean));
    return { friendsSet, out, inc };
  }, [friends, requestsRaw]);

  const doSearch = async () => {
    const q = query.trim();
    if (!q || loading) return;
    setLoading(true);
    try {
      setResults((await search(q)) as UserLite[]);
    } catch (e) {
      toast.error(errorMessage(t, e));
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const add = async (u: UserLite) => {
    if (!u.uniqueId) return;
    setSendingId(u.uniqueId);
    try {
      await send(u.uniqueId);
      setSent((prev) => new Set(prev).add(u.uniqueId!));
      toast.success(t('friends.search.inviteSent', { target: u.username || u.uniqueId }));
    } catch (e) {
      toast.error(errorMessage(t, e));
    } finally {
      setSendingId(null);
    }
  };

  const statusOf = (uid?: string) => {
    if (!uid) return null;
    if (uid === meUniqueId) return t('friends.status.you', 'You');
    if (known.friendsSet.has(uid)) return t('friends.status.friend', 'Friend');
    if (known.out.has(uid) || sent.has(uid)) return t('friends.status.requested', 'Requested');
    if (known.inc.has(uid)) return t('friends.status.incoming', 'Incoming');
    return null;
  };

  return (
    <Screen>
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder={t('friends.search.placeholder', 'Enter uniqueId, e.g. USER#1234')}
        autoCapitalize="none"
        onSubmitEditing={doSearch}
        clearLabel={t('common.clear')}
      />
      <Button title={t('friends.search.button')} variant="secondary" onPress={doSearch} loading={loading} disabled={!query.trim()} />

      {loading ? (
        <ListSkeleton rows={1} />
      ) : results === null ? (
        <ListSection header={t('friends.search.orInPerson')}>
          <ListRow
            key="scan"
            left={
              <IconTile>
                <AppIcon name="scan" size={20} color="$primaryText" />
              </IconTile>
            }
            title={t('friends.qr.scanQr')}
            chevron
            onPress={() => router.push('/scan-invite')}
          />
          <ListRow
            key="myqr"
            left={
              <IconTile>
                <AppIcon name="qr" size={20} color="$primaryText" />
              </IconTile>
            }
            title={t('friends.qr.myQr')}
            chevron
            onPress={() => router.push('/my-qr')}
          />
        </ListSection>
      ) : results.length === 0 ? (
        <EmptyState icon={<AppIcon name="userSearch" size={28} color="$textMuted" />} message={t('friends.search.noResults', 'No results found')} />
      ) : (
        <ListSection>
          {results.map((u, i) => {
            const status = statusOf(u.uniqueId);
            const name = u.displayName || u.username || u.uniqueId || t('friends.common.unknownUser', 'Unknown user');
            return (
              <ListRow
                key={`${u.uniqueId ?? i}`}
                left={<UserAvatar uri={u.avatarUrl} label={name} seed={u.uniqueId} size={40} textSize={15} />}
                title={name}
                subtitle={handleOf(u.uniqueId)}
                right={
                  status ? (
                    <Text variant="footnote" color="$textMuted">
                      {status}
                    </Text>
                  ) : (
                    <Button title={t('friends.status.add', 'Add')} size="small" variant="secondary" loading={sendingId === u.uniqueId} onPress={() => void add(u)} />
                  )
                }
              />
            );
          })}
        </ListSection>
      )}
    </Screen>
  );
}
