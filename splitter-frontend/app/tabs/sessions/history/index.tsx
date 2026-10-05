import React, { useMemo, useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Pressable, RefreshControl } from 'react-native';
import { YStack, XStack, ScrollView, View } from 'tamagui';
import { Text } from '@/shared/ui/typography';

import UserAvatar from '@/shared/ui/UserAvatar';
import { useSessionsHistoryStore } from '@/features/sessions/model/history.store';
import type { SessionHistoryEntry, SessionHistoryParticipantLight } from '@/features/sessions/api/history.api';

const BULLET = '\u2022';
const HISTORY_LIMIT = 50;
const DEFAULT_CURRENCY = 'UZS';

const formatSessionDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('uz-UZ', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function AvatarGroup({ participants }: { participants: SessionHistoryParticipantLight[] }) {
  const shown = participants.slice(0, 4);
  const extra = Math.max(0, participants.length - shown.length);
  return (
    <XStack ai="center">
      {shown.map((participant, idx) => (
        <View key={participant.uniqueId ?? idx} ml={idx === 0 ? 0 : -8}>
          <UserAvatar
            uri={participant.avatarUrl ?? undefined}
            label={participant.username || 'U'}
            seed={participant.uniqueId}
            size={28}
            textSize={12}
          />
        </View>
      ))}
      {extra > 0 && (
        <View
          w={28}
          h={28}
          br={14}
          backgroundColor="$surfaceAlt"
          borderWidth={2}
          borderColor="$background"
          ml={shown.length === 0 ? 0 : -8}
          ai="center"
          jc="center"
        >
          <Text fontSize={10} color="$gray11">+{extra}</Text>
        </View>
      )}
    </XStack>
  );
}

function HistoryCard({
  title,
  summary,
  amountLabel,
  participants,
  onPress,
}: {
  title: string;
  summary: string;
  amountLabel: string;
  participants: SessionHistoryParticipantLight[];
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ width: 358, opacity: pressed ? 0.9 : 1 })}
    >
      <YStack
        h={110}
        br={12}
        borderWidth={1}
        borderColor="$borderColor"
        p="$3"
        backgroundColor="$surface"
      >
        <XStack jc="space-between" ai="center">
          <YStack>
            <Text fontSize={16} fontWeight="600" lineHeight={19}>
              {title}
            </Text>
            <Text mt="$1" fontSize={12} lineHeight={12} color="$gray10">
              {summary}
            </Text>
          </YStack>
          <Text fontSize={14} lineHeight={22} fontWeight="700" color="$primaryText">
            {amountLabel}
          </Text>
        </XStack>

        <XStack mt="auto" ai="center">
          <AvatarGroup participants={participants} />
        </XStack>
      </YStack>
    </Pressable>
  );
}

export default function SessionsHistoryScreen() {
  const router = useRouter();
  const sessions = useSessionsHistoryStore(state => state.sessions);
  const loading = useSessionsHistoryStore(state => state.loading);
  const error = useSessionsHistoryStore(state => state.error);
  const fetchHistory = useSessionsHistoryStore(state => state.fetchHistory);
  const refreshIfStale = useSessionsHistoryStore(state => state.refreshIfStale);

  const [refreshing, setRefreshing] = useState(false);

  // Load on screen focus only (not on every state change): refreshIfStale skips fresh data,
  // treats an empty list as fresh and backs off after errors.
  useFocusEffect(
    useCallback(() => {
      refreshIfStale(undefined, HISTORY_LIMIT).catch(() => {});
    }, [refreshIfStale])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchHistory(HISTORY_LIMIT);
    } finally {
      setRefreshing(false);
    }
  }, [fetchHistory]);

  const history = useMemo<SessionHistoryEntry[]>(() => sessions, [sessions]);

  return (
    <YStack f={1} bg="$background" px="$4" pt="$4">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ alignItems: 'center', paddingBottom: 32, gap: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <YStack w={358} gap="$1" mb="$2">
          <Text fontSize={24} fontWeight="700">Oxirgi hisoblar</Text>
          <Text fontSize={12} color="$gray10">Bosh sahifa</Text>
        </YStack>

        {loading && (
          <Text color="$gray10" fontSize={14}>
            Yuklanmoqda...
          </Text>
        )}
        {error && (
          <Text color="$red10" fontSize={14}>
            {error}
          </Text>
        )}
        {!loading && !error && !history.length && (
          <Text color="$gray10" fontSize={14}>
            Hali tarix mavjud emas
          </Text>
        )}

        {history.map((bill) => {
          const participants = bill.participants ?? [];
          const dateForSummary = bill.finalizedAt || bill.createdAt;
          const summary = `${formatSessionDate(dateForSummary)} ${BULLET} ${participants.length} ishtirokchi`;
          const totalAmount = bill.grandTotal ?? 0;
          const currency = bill.currency || bill.totals?.currency || bill.payload?.totals?.currency || DEFAULT_CURRENCY;
          const amountLabel = `${currency} ${totalAmount.toLocaleString()}`;
          return (
            <HistoryCard
              key={bill.sessionId}
              title={bill.sessionName || 'Hisob'}
              summary={summary}
              amountLabel={amountLabel}
              participants={participants}
              onPress={() =>
                router.push({
                  pathname: '/tabs/sessions/history/[historyId]',
                  params: { historyId: String(bill.sessionId) },
                })
              }
            />
          );
        })}
      </ScrollView>
    </YStack>
  );
}
