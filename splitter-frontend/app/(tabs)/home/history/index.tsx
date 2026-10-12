// app/(tabs)/home/history/index.tsx — all my receipts, newest first, with search.
import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { YStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/ui/typography';
import Screen from '@/shared/ui/Screen';
import SearchField from '@/shared/ui/SearchField';
import { ListSection } from '@/shared/ui/List';
import { ListSkeleton } from '@/shared/ui/Skeleton';
import EmptyState from '@/shared/ui/EmptyState';
import Banner from '@/shared/ui/Banner';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { useSessionsHistoryStore } from '@/features/sessions/model/history.store';
import ReceiptRow from '@/features/sessions/ui/ReceiptRow';
import { useReceiptLauncher } from '@/features/receipt/model/launcher';
import AppIcon from '@/shared/ui/AppIcon';

const HISTORY_LIMIT = 50;

export default function HistoryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const meId = useAppStore((s) => s.user?.uniqueId);
  const sessions = useSessionsHistoryStore((s) => s.sessions);
  const loading = useSessionsHistoryStore((s) => s.loading);
  const initialized = useSessionsHistoryStore((s) => s.initialized);
  const error = useSessionsHistoryStore((s) => s.error);
  const refreshIfStale = useSessionsHistoryStore((s) => s.refreshIfStale);
  const forceRefresh = useSessionsHistoryStore((s) => s.forceRefresh);
  const { openScanner } = useReceiptLauncher();
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshIfStale(undefined, HISTORY_LIMIT).catch(() => undefined);
    }, [refreshIfStale])
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await forceRefresh(HISTORY_LIMIT).catch(() => undefined);
    setRefreshing(false);
  }, [forceRefresh]);

  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () => (q ? sessions.filter((s) => (s.sessionName || '').toLowerCase().includes(q) || (s.participants ?? []).some((p) => (p.username || '').toLowerCase().includes(q))) : sessions),
    [sessions, q]
  );

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {!!error && !sessions.length && <Banner kind="error" message={t('errors.NETWORK')} actionLabel={t('common.retry')} onAction={refresh} />}
      {!initialized && loading ? (
        <ListSkeleton rows={5} avatar={false} />
      ) : sessions.length === 0 ? (
        <YStack backgroundColor="$surface" borderRadius={16}>
          <EmptyState icon={<AppIcon name="receipt" size={28} color="$textMuted" />} title={t('home.empty.title')} actionLabel={t('home.scanReceipt')} onAction={openScanner} />
        </YStack>
      ) : (
        <>
          <SearchField value={query} onChangeText={setQuery} placeholder={t('common.search')} clearLabel={t('common.clear')} />
          {visible.length === 0 ? (
            <Text variant="subheadline" color="$textMuted" ta="center">
              {t('common.noResults')}
            </Text>
          ) : (
            <ListSection>
              {visible.map((s) => (
                <ReceiptRow key={s.sessionId} entry={s} meId={meId} onPress={() => router.push({ pathname: '/home/history/[historyId]', params: { historyId: String(s.sessionId) } })} />
              ))}
            </ListSection>
          )}
        </>
      )}
    </Screen>
  );
}
