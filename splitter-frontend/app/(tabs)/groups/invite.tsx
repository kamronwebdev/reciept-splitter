// app/(tabs)/groups/invite.tsx — the group's (time-limited) invite QR. Group QR v2 comes with the group roles work.
import React, { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { YStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import Screen from '@/shared/ui/Screen';
import { Button } from '@/shared/ui/Button';
import Banner from '@/shared/ui/Banner';
import { Skeleton } from '@/shared/ui/Skeleton';
import { InviteQR } from '@/shared/ui/InviteQR';
import { GroupsApi } from '@/features/groups/api/groups.api';

type InviteDTO = { url: string; expiresAt: string };

export default function GroupInviteScreen() {
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();
  const { t } = useTranslation();
  const [data, setData] = useState<InviteDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const refresh = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    setFailed(false);
    try {
      const resp = await GroupsApi.createInvite(groupId, 300);
      setData({ url: resp.url, expiresAt: resp.expiresAt });
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <Screen>
      {!groupId ? (
        <Banner kind="error" message={t('groups.invite.invalid', 'Invalid group')} />
      ) : failed ? (
        <Banner kind="error" message={t('groups.invite.error', 'Failed to get invite')} actionLabel={t('common.retry')} onAction={refresh} />
      ) : !data ? (
        <YStack ai="center" py="$6">
          <Skeleton width={260} height={260} radius={16} />
        </YStack>
      ) : (
        <YStack gap="$4">
          <InviteQR url={data.url} title={t('groups.invite.description', 'Invite to this group')} expiresAt={data.expiresAt} />
          <Button title={t('groups.invite.new', 'New QR')} variant="secondary" onPress={refresh} loading={loading} />
        </YStack>
      )}
    </Screen>
  );
}
