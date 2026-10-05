import React, { useMemo, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { useReceiptSessionStore } from '@/features/receipt/model/receipt-session.store';
import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { YStack, XStack, View, Circle } from 'tamagui';
import { Text } from '@/shared/ui/typography';
import { ScanLine, Users, UserPlus, RefreshCw } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';

import { ScreenContainer } from '@/shared/ui/ScreenContainer';
import UserAvatar from '@/shared/ui/UserAvatar';
import type { SessionHistoryEntry } from '@/features/sessions/api/history.api';
import { useSessionsHistoryStore } from '@/features/sessions/model/history.store';

const HOME_HISTORY_LIMIT = 10;
const DEFAULT_CURRENCY = 'UZS';

const formatSessionDate = (value?: string, locale: string = 'en') => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  };
  try {
    return date.toLocaleString(locale, options);
  } catch {
    return date.toLocaleString(undefined, options);
  }
};

function ActionButton({
  title,
  icon,
  onPress,
}: {
  title: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <XStack
      onPress={onPress}
      width={171}
      height={48}
      borderRadius={12}
      alignItems="center"
      justifyContent="center"
      gap={6}
      borderWidth={1}
      borderColor="$gray6"
      backgroundColor="transparent"
      pressStyle={{ backgroundColor: '$gray2' }}
      hoverStyle={{ backgroundColor: '$gray2' }}
      focusStyle={{ borderColor: '$gray7' }}
    >
      {icon}
      <Text fontSize={14}>{title}</Text>
    </XStack>
  );
}

function AvatarStack({ participantIds }: { participantIds: string[] }) {
  const shown = participantIds.slice(0, 3);
  const extra = Math.max(0, participantIds.length - shown.length);

  return (
    <XStack w={92} h={28} ai="center">
      {shown.map((uniqueId, i) => (
        <View key={uniqueId ?? i} ml={i === 0 ? 0 : -8}>
          <UserAvatar
            uri={undefined}
            label={(uniqueId || 'U').slice(0, 2).toUpperCase()}
            seed={uniqueId}
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
          backgroundColor="$gray3"
          borderWidth={2}
          borderColor="$background"
          ml={shown.length === 0 ? 0 : -8}
          ai="center"
          jc="center"
        >
          <Text fontSize={10} color="$gray11">
            +{extra}
          </Text>
        </View>
      )}
    </XStack>
  );
}

function BillCard({
  title,
  sub,
  amountLabel,
  participantIds,
  onPress,
}: {
  title: string;
  sub: string;
  amountLabel: string;
  participantIds: string[];
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        width: 358,
        opacity: onPress && pressed ? 0.9 : 1,
      })}
    >
      <YStack
        h={110}
        br={12}
        borderWidth={1}
        borderColor="$gray6"
        p="$3"
        backgroundColor="$surface"
      >
        <XStack jc="space-between" ai="center">
          <YStack>
            <Text fontSize={16} fontWeight="600" lineHeight={19}>
              {title}
            </Text>
            <Text mt="$1" fontSize={12} lineHeight={12} color="$gray10">
              {sub}
            </Text>
          </YStack>
          <Text fontSize={14} lineHeight={22} fontWeight="700" color="$primaryText">
            {amountLabel}
          </Text>
        </XStack>

        <XStack mt="auto" ai="center">
          <AvatarStack participantIds={participantIds} />
        </XStack>
      </YStack>
    </Pressable>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const sessions = useSessionsHistoryStore(state => state.sessions);
  const loading = useSessionsHistoryStore(state => state.loading);
  const error = useSessionsHistoryStore(state => state.error);
  const refreshIfStale = useSessionsHistoryStore(state => state.refreshIfStale);
  const forceRefresh = useSessionsHistoryStore(state => state.forceRefresh);

  useFocusEffect(
    useCallback(() => {
      refreshIfStale(undefined, HOME_HISTORY_LIMIT).catch(() => {});
    }, [refreshIfStale])
  );

  const onManualRefresh = useCallback(() => {
    forceRefresh(HOME_HISTORY_LIMIT).catch(() => {});
  }, [forceRefresh]);

  const openFriends = () => router.push('/tabs/friends');
  const openGroups = () => router.push('/tabs/groups');
  const onScan = () => {
    const draft = useReceiptSessionStore.getState();
    const resume = () => {
      const route = { items: '/tabs/receipt/review', people: '/tabs/receipt/people', split: '/tabs/receipt/split', summary: '/tabs/receipt/summary', scan: '/tabs/receipt/review' } as const;
      router.push(route[draft.step] as never);
    };
    const startNew = () => {
      draft.reset();
      router.push('/tabs/scan-receipt');
    };
    if (!draft.active || draft.finalized) {
      if (draft.active) draft.reset();
      router.push('/tabs/scan-receipt');
      return;
    }
    // an unfinished receipt survived (the draft is saved on the phone): continue it or start over
    const title = t('receipt.resume.title', 'Continue your receipt?');
    const message = t('receipt.resume.message', 'You have an unfinished receipt.');
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) resume();
      else startNew();
      return;
    }
    Alert.alert(title, message, [
      { text: t('receipt.resume.continue', 'Continue'), onPress: resume },
      { text: t('receipt.resume.startNew', 'Start new'), style: 'destructive', onPress: startNew },
      { text: t('common.cancel', 'Cancel'), style: 'cancel' },
    ]);
  };
  const openAllSessions = () => router.push('/tabs/sessions/history');

  const recent = useMemo<SessionHistoryEntry[]>(() => sessions.slice(0, 3), [sessions]);

  return (
    <ScreenContainer>
      <YStack f={1} ai="center" bg="$background">
        <YStack ai="center" mt="$6" mb="$4">
          <Pressable onPress={onScan}>
            <Circle size={64} bg="$primary" ai="center" jc="center" elevationAndroid={4}>
              <ScanLine size={26} color="$onPrimary" />
            </Circle>
          </Pressable>
          <Text mt="$2" color="$gray10" fontSize={13}>
            {t('home.scan.cta', 'Scan invite')}
          </Text>
        </YStack>

        <XStack w={358} jc="space-between" mb="$5">
          <ActionButton
            title={t('home.actions.friends', 'Friends')}
            icon={<Users size={18} />}
            onPress={openFriends}
          />
          <ActionButton
            title={t('home.actions.groups', 'Groups')}
            icon={<UserPlus size={18} />}
            onPress={openGroups}
          />
        </XStack>

        <XStack w={358} jc="space-between" ai="center" mb="$3">
          <Text fontSize={18} fontWeight="600">
            {t('home.recent.title', 'Recent bills')}
          </Text>

          {/* Справа: только иконка Refresh + кнопка Show more */}
          <XStack ai="center" gap="$3">
            <Pressable
              onPress={onManualRefresh}
              disabled={loading}
              accessibilityLabel="Refresh recent bills"
            >
              <XStack ai="center" opacity={loading ? 0.6 : 1}>
                <RefreshCw size={18} />
              </XStack>
            </Pressable>

            <Pressable onPress={openAllSessions}>
              <Text color="$primaryText">
                {t('home.recent.showMore', 'Show more')}
              </Text>
            </Pressable>
          </XStack>
        </XStack>

        <YStack gap="$3" pb="$6">
          {loading && (
            <Text color="$gray10" fontSize={14}>
              {t('home.recent.loading', 'Loading recent bills...')}
            </Text>
          )}
          {error && (
            <Text color="$red10" fontSize={14}>
              {error}
            </Text>
          )}
          {!loading && !error && !recent.length && (
            <Text color="$gray10" fontSize={14}>
              {t('home.recent.empty', 'No bills yet')}
            </Text>
          )}
          {recent.map((bill) => {
            const participantIds = bill.participantUniqueIds ?? [];
            const participantsLabel = t('home.recent.participants', {
              count: participantIds.length,
              defaultValue: `${participantIds.length} participants`,
            });
            const dateForSummary = bill.finalizedAt || bill.createdAt;
            const summary = `${formatSessionDate(dateForSummary, i18n.language)} • ${participantsLabel}`;
            const totalAmount = bill.grandTotal ?? 0;
            const currency = bill.currency || bill.payload?.totals?.currency || DEFAULT_CURRENCY;
            const amountLabel = `${totalAmount.toLocaleString(i18n.language ?? 'en', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })} ${currency}`;

            return (
              <BillCard
                key={bill.sessionId}
                title={bill.sessionName || t('home.recent.fallbackName', 'Bill')}
                sub={summary}
                amountLabel={amountLabel}
                participantIds={participantIds}
                onPress={() =>
                  router.push({
                    pathname: '/tabs/sessions/history/[historyId]',
                    params: { historyId: String(bill.sessionId) },
                  })
                }
              />
            );
          })}
        </YStack>
      </YStack>
    </ScreenContainer>
  );
}
