// app/tabs/_layout.tsx

import React, { useCallback, useEffect } from 'react';
import { Tabs, Redirect, useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack, XStack, View } from 'tamagui';
import { Text } from '@/shared/ui/typography';
import { Home, Settings, Bell, ChevronLeft } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { useAppStore } from '@/shared/lib/stores/app-store';
import Banner from '@/shared/ui/Banner';
import { confirmAction } from '@/shared/lib/utils/confirm';
import { takePendingFriendCode } from '@/shared/lib/utils/invite';
import { useReceiptHydrated, useReceiptSessionStore } from '@/features/receipt/model/receipt-session.store';
import { useAppTheme } from '@/shared/theme/useAppTheme';
import UserAvatar from '@/shared/ui/UserAvatar';
import { useFriendsStore } from '@/features/friends/model/friends.store';

// --- Reusable Badge Component ---
function DotBadge({ value }: { value?: number }) {
  if (!value || value <= 0) return null;
  return (
    <View
      position="absolute"
      top={-4} right={-4}
      w={20} h={20}
      br={999}
      ai="center" jc="center"
      backgroundColor="$primary"
    >
      <Text color="$onPrimary" fontSize={10} fontWeight="700">
        {value}
      </Text>
    </View>
  );
}

// --- Global Header for all Tabs ---
function GlobalTabsHeader(props: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAppStore();
  const fetchIfStale = useFriendsStore((s) => s.fetchIfStale);
  const { t } = useTranslation();
  const routeName = props?.route?.name ?? '';
  const showHomeShortcut =
    routeName === 'profile' ||
    routeName === 'settings' ||
    routeName.startsWith('receipt') ||
    routeName.startsWith('friends') ||
    routeName.startsWith('groups') ||
    routeName.startsWith('sessions');
  const receiptActive = useReceiptSessionStore((s) => s.active);
  const inReceiptFlow = routeName.startsWith('receipt');
  const onBackToHome = () => {
    if (inReceiptFlow && receiptActive && useReceiptSessionStore.getState().finalized) {
      // already saved to the history: nothing to discard
      useReceiptSessionStore.getState().reset();
    } else if (inReceiptFlow && receiptActive) {
      // leaving the flow loses the receipt: ask first
      confirmAction({
        title: t('receipt.discard.title', 'Discard this receipt?'),
        message: t('receipt.discard.message', 'The items and the split you entered will be lost.'),
        confirmText: t('receipt.discard.confirm', 'Discard'),
        cancelText: t('receipt.discard.keep', 'Keep editing'),
        destructive: true,
        onConfirm: () => {
          useReceiptSessionStore.getState().reset();
          router.replace({ pathname: '/tabs' });
        },
      });
      return;
    }
    router.replace({ pathname: '/tabs' });
  };

  useEffect(() => {
    fetchIfStale();
  }, [fetchIfStale]);

  useFocusEffect(
    useCallback(() => {
      fetchIfStale();
    }, [fetchIfStale])
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') fetchIfStale();
    });
    return () => sub.remove();
  }, [fetchIfStale]);

  const requestsCount = useFriendsStore((s) => s.requestsRaw?.incoming?.length ?? 0);
  const displayName = user?.username || t('profile.labels.guest', 'Guest');

  const handleOpenProfile = useCallback(() => {
    router.push({ pathname: '/tabs/profile' });
  }, [router]);

  return (
    <YStack bg="$background" pt={insets.top}>
      <XStack h={50} ai="center" jc="space-between" px="$4">
        <XStack ai="center" gap="$2">
          {showHomeShortcut && (
            <Pressable onPress={onBackToHome} hitSlop={10}>
              <XStack ai="center" gap="$1">
                <ChevronLeft size={20} color="$gray11" />
                <Text fontSize={14} color="$gray11">
                  {t('navigation.mainMenu', 'Main menu')}
                </Text>
              </XStack>
            </Pressable>
          )}
          <Text fontSize={18} fontWeight="600" numberOfLines={1} miw={150}>
            {props.options.title}
          </Text>
        </XStack>

        <XStack ai="center" gap="$3">
          <Pressable
            onPress={() => router.push('/tabs/settings')}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('settings.title', 'Settings')}
          >
            <Settings size={22} color="$gray11" />
          </Pressable>

          <Pressable
            onPress={() => router.push('/tabs/friends/requests')}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('friends.requests', 'Requests')}
          >
            <View>
              <Bell size={22} color="$gray11" />
              <DotBadge value={requestsCount} />
            </View>
          </Pressable>

          <Pressable onPress={handleOpenProfile} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('profile.title', 'Profile')}>
            <UserAvatar uri={user?.avatarUrl} label={displayName} seed={user?.uniqueId} size={36} textSize={14} />
          </Pressable>
        </XStack>
      </XStack>
    </YStack>
  );
}

/** One-shot success message (e.g. "Password updated") shown above the tabs for a few seconds. */
function FlashMessage() {
  const message = useAppStore((s) => s.flashMessage);
  const setFlashMessage = useAppStore((s) => s.setFlashMessage);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setFlashMessage(null), 5000);
    return () => clearTimeout(id);
  }, [message, setFlashMessage]);

  if (!message) return null;
  return (
    <View position="absolute" top={insets.top + 58} left={16} right={16} zIndex={1000}>
      <Banner kind="success" message={message} />
    </View>
  );
}

export default function TabLayout() {
  const { user, token, isInitialized } = useAppStore();
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  const greetingName = user?.username || t('home.header.friendFallback', 'friend');
  const homeTitle = t('home.header.greeting', { name: greetingName });
  const homeLabel = t('navigation.tabs.home', 'Home');
  const settingsTitle = t('navigation.tabs.settings', 'Settings');
  const profileTitle = t('profile.title', 'Profile');
  const groupsTitle = t('navigation.groups.title', 'Groups');
  const newGroupTitle = t('navigation.groups.create', 'New group');
  const groupDetailsTitle = t('navigation.groups.details', 'Group');
  const scanInviteTitle = t('navigation.scanInvite', 'Scan Invite');
  const friendQrTitle = t('navigation.friendQr', 'My Friend QR');
  const groupQrTitle = t('navigation.groupQr', 'Group QR');
  const scanReceiptTitle = t('navigation.scanReceipt', 'Scan Receipt');
  const historyTitle = t('navigation.history', 'Recent bills');
  const historyDetailsTitle = t('navigation.historyDetails', 'Bill details');

  // A draft restored from storage may point at a session that was deleted or belongs to another account
  // (older app version, other user signed in before): verify it once per sign-in and reset it if so.
  const draftHydrated = useReceiptHydrated();
  const userId = user?.id;
  useEffect(() => {
    if (draftHydrated && token && userId !== undefined) void useReceiptSessionStore.getState().validateDraft();
  }, [draftHydrated, token, userId]);

  // a friend link opened while signed out: show its card now
  const router = useRouter();
  useEffect(() => {
    if (!token) return;
    const code = takePendingFriendCode();
    if (code) router.push({ pathname: '/tabs/scan-invite', params: { code } });
  }, [token, router]);

  // Signed-out (or expired) sessions can never stay inside the tabs.
  if (isInitialized && !token) return <Redirect href="/" />;

  return (
    <>
    <FlashMessage />
    <Tabs
      backBehavior="history"
      screenOptions={{
        header: (props) => <GlobalTabsHeader {...props} />,
        tabBarStyle: { display: 'none' },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      {/* Home & Settings tabs (hidden from bar) */}
      <Tabs.Screen
        name="index"
        options={{
          href: null,
          title: homeTitle,
          tabBarLabel: homeLabel,
          tabBarIcon: ({ color, size }) => <Home size={size} color={color as any} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
          title: settingsTitle,
          tabBarLabel: settingsTitle,
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color as any} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          href: null,
          title: profileTitle,
        }}
      />

      {/* Friends stack (hidden) */}
      <Tabs.Screen name="friends/index" options={{ href: null, title: t('friends.title', 'Friends') }} />
      <Tabs.Screen name="friends/search" options={{ href: null, title: t('friends.search', 'Search') }} />
      <Tabs.Screen name="friends/requests" options={{ href: null, title: t('friends.requests', 'Requests') }} />

      {/* HIDDEN: Groups */}
      <Tabs.Screen name="groups/index"   options={{ href: null, title: groupsTitle }} />
      <Tabs.Screen name="groups/create"  options={{ href: null, title: newGroupTitle }} />
      <Tabs.Screen name="groups/[groupId]" options={{ href: null, title: groupDetailsTitle }} />

      <Tabs.Screen name="scan-invite" options={{ href: null, title: scanInviteTitle, headerShown: false }} />
      <Tabs.Screen name="friends/invite" options={{ href: null, title: friendQrTitle }} />
      <Tabs.Screen name="groups/invite" options={{ href: null, title: groupQrTitle }} />

      {/* Receipt flow: Scan (full-screen camera, own UI) -> Items -> People -> Split -> Summary */}
      <Tabs.Screen name="scan-receipt" options={{ href: null, title: scanReceiptTitle, headerShown: false }} />
      <Tabs.Screen name="receipt/review" options={{ href: null, title: t('receipt.titles.items', 'Review items') }} />
      <Tabs.Screen name="receipt/people" options={{ href: null, title: t('receipt.titles.people', 'Who is splitting?') }} />
      <Tabs.Screen name="receipt/split" options={{ href: null, title: t('receipt.titles.split', 'Split items') }} />
      <Tabs.Screen name="receipt/summary" options={{ href: null, title: t('receipt.titles.summary', 'Summary') }} />
      <Tabs.Screen name="sessions/history/index" options={{ href: null, title: historyTitle }} />
      <Tabs.Screen name="sessions/history/[historyId]" options={{ href: null, title: historyDetailsTitle }} />

    </Tabs>
    </>
  );
}
