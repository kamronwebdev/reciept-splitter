// app/(tabs)/_layout.tsx — the app's bottom tab bar: Home, Groups, Scan (center), Friends, Profile.
// iOS renders the real system tab bar (NativeTabs + SF Symbols); Android/web use JS tabs styled like iOS.
import React, { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { Redirect, Tabs, usePathname, useRouter } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { House, ScanLine, UserRound, Users, UsersRound } from '@tamagui/lucide-icons';

import { useAppStore } from '@/shared/lib/stores/app-store';
import { useAppTheme } from '@/shared/theme/useAppTheme';
import { useTextStyle } from '@/shared/ui/typography';
import { toast } from '@/shared/ui/Toast';
import AppIcon from '@/shared/ui/AppIcon';
import { takePendingFriendCode } from '@/shared/lib/utils/invite';
import { useFriendsStore } from '@/features/friends/model/friends.store';
import { useUnreadCount } from '@/features/notifications/model/queries';
import { useReceiptHydrated, useReceiptSessionStore } from '@/features/receipt/model/receipt-session.store';
import { useReceiptLauncher } from '@/features/receipt/model/launcher';
import { rememberTab } from '@/shared/lib/navigation/last-tab';

const TAB_ICONS = {
  home: { sf: 'house', sfSelected: 'house.fill', fallback: House },
  groups: { sf: 'person.3', sfSelected: 'person.3.fill', fallback: UsersRound },
  scan: { sf: 'viewfinder', sfSelected: 'viewfinder', fallback: ScanLine },
  friends: { sf: 'person.2', sfSelected: 'person.2.fill', fallback: Users },
  profile: { sf: 'person.crop.circle', sfSelected: 'person.crop.circle.fill', fallback: UserRound },
} as const;
type TabName = keyof typeof TAB_ICONS;
const TAB_ORDER: TabName[] = ['home', 'groups', 'scan', 'friends', 'profile'];

/** Everything that runs once while signed in (badges data, saved receipt check, deep links, flash). */
function useSignedInEffects() {
  const router = useRouter();
  const token = useAppStore((s) => s.token);
  const userId = useAppStore((s) => s.user?.id);
  const flash = useAppStore((s) => s.flashMessage);
  const setFlash = useAppStore((s) => s.setFlashMessage);
  const fetchFriendsIfStale = useFriendsStore((s) => s.fetchIfStale);
  const draftHydrated = useReceiptHydrated();

  // friend requests badge: on start and whenever the app returns to the foreground
  useEffect(() => {
    if (!token) return;
    fetchFriendsIfStale();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && fetchFriendsIfStale());
    return () => sub.remove();
  }, [token, fetchFriendsIfStale]);

  // a receipt draft from an older version / another account
  useEffect(() => {
    if (draftHydrated && token && userId !== undefined) void useReceiptSessionStore.getState().validateDraft();
  }, [draftHydrated, token, userId]);

  // a friend link opened while signed out
  useEffect(() => {
    if (!token) return;
    const code = takePendingFriendCode();
    if (code) router.push({ pathname: '/scan-invite', params: { code } });
  }, [token, router]);

  // one-shot messages set elsewhere (e.g. "Password updated")
  useEffect(() => {
    if (!flash) return;
    toast.success(flash);
    setFlash(null);
  }, [flash, setFlash]);
}

function useBadges() {
  const unread = useUnreadCount().data ?? 0;
  const requests = useFriendsStore((s) => s.requestsRaw?.incoming?.length ?? 0);
  return { home: unread, friends: requests } as Partial<Record<TabName, number>>;
}

const badgeText = (n?: number) => (n && n > 0 ? (n > 99 ? '99+' : String(n)) : undefined);

export default function TabLayout() {
  const { token, isInitialized } = useAppStore();
  const { t } = useTranslation();
  const pathname = usePathname();
  useSignedInEffects();
  const badges = useBadges();

  // remember the last real tab so closing the scanner returns there
  useEffect(() => {
    const first = pathname.split('/')[1] as TabName | undefined;
    if (first && first !== 'scan' && TAB_ORDER.includes(first)) rememberTab(`/${first}`);
  }, [pathname]);

  if (isInitialized && !token) return <Redirect href="/" />;

  const labels: Record<TabName, string> = {
    home: t('tabs.home'),
    groups: t('tabs.groups'),
    scan: t('tabs.scan'),
    friends: t('tabs.friends'),
    profile: t('tabs.profile'),
  };

  return Platform.OS === 'ios' ? <IosTabs labels={labels} badges={badges} /> : <JsTabs labels={labels} badges={badges} />;
}

type TabsProps = { labels: Record<TabName, string>; badges: Partial<Record<TabName, number>> };

/** iOS: the real UITabBar (blur, haptics, pop-to-root and scroll-to-top come for free). */
function IosTabs({ labels, badges }: TabsProps) {
  const { colors } = useAppTheme();
  return (
    <NativeTabs tintColor={colors.primary} iconColor={{ default: colors.inactive, selected: colors.primary }} badgeBackgroundColor={colors.badge}>
      {TAB_ORDER.map((name) => (
        <NativeTabs.Trigger key={name} name={name}>
          <NativeTabs.Trigger.Icon sf={{ default: TAB_ICONS[name].sf, selected: TAB_ICONS[name].sfSelected }} />
          <NativeTabs.Trigger.Label>{labels[name]}</NativeTabs.Trigger.Label>
          {!!badgeText(badges[name]) && <NativeTabs.Trigger.Badge>{badgeText(badges[name])}</NativeTabs.Trigger.Badge>}
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}

/** Android / web: JS tabs with the iOS look (49pt bar + safe area, hairline, icon + short label). */
function JsTabs({ labels, badges }: TabsProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const label = useTextStyle(500, 10);
  const { openScanner } = useReceiptLauncher();
  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inactive,
        tabBarLabelStyle: { ...label, marginTop: 0 },
        tabBarLabelPosition: 'below-icon',
        tabBarItemStyle: { paddingTop: 4 },
        tabBarStyle: {
          backgroundColor: colors.bar,
          borderTopColor: colors.separator,
          borderTopWidth: Platform.OS === 'web' ? 1 : 0.5,
          // 49pt bar + home indicator area; the label sits under the icon like iOS
          height: 49 + Math.max(insets.bottom, Platform.OS === 'web' ? 4 : 0),
          paddingBottom: Math.max(insets.bottom, Platform.OS === 'web' ? 4 : 0),
          elevation: 0,
        },
        tabBarBadgeStyle: { backgroundColor: colors.badge, color: colors.onBadge, fontSize: 11 },
        sceneStyle: { backgroundColor: colors.groupedBackground },
      }}
    >
      {TAB_ORDER.map((name) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: labels[name],
            tabBarAccessibilityLabel: labels[name],
            tabBarIcon: ({ color, size, focused }) => (
              <AppIcon sf={focused ? TAB_ICONS[name].sfSelected : TAB_ICONS[name].sf} fallback={TAB_ICONS[name].fallback} color={color as string} size={Math.min(size, 25)} />
            ),
            ...(badgeText(badges[name]) ? { tabBarBadge: badgeText(badges[name]) } : {}),
          }}
          {...(name === 'scan'
            ? {
                // the Scan tab is an action: it opens the full-screen scanner instead of switching tabs
                listeners: {
                  tabPress: (e: { preventDefault: () => void }) => {
                    e.preventDefault();
                    openScanner();
                  },
                },
              }
            : {})}
        />
      ))}
    </Tabs>
  );
}

