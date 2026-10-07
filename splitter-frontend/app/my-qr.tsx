// app/my-qr.tsx — "My QR": the user's ONE permanent personal friend QR (also opened from Profile
// and from the receipt "Who is splitting?" step).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Share, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Spinner, XStack, YStack } from 'tamagui';
import { useTranslation } from 'react-i18next';

import { Text } from '@/shared/ui/typography';
import { Button } from '@/shared/ui/Button';
import Banner from '@/shared/ui/Banner';
import { confirmAction } from '@/shared/lib/utils/confirm';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { FriendsApi, type MyFriendCode } from '@/features/friends/api/friends.api';
import { useFriendsStore } from '@/features/friends/model/friends.store';
import { friendQrErrorCode } from '@/features/friends/model/qr-errors';
import PersonalQrCard from '@/features/friends/ui/PersonalQrCard';
import AppIcon from '@/shared/ui/AppIcon';

const isNative = Platform.OS !== 'web';

/**
 * Loaded on first use only: expo-media-library throws at import time where its native module is missing
 * (web), and neither module is needed until "Save image" is tapped (native only).
 */
function loadSaveModules() {
  const MediaLibrary = require('expo-media-library') as typeof import('expo-media-library');
  const { captureRef } = require('react-native-view-shot') as typeof import('react-native-view-shot');
  return { MediaLibrary, captureRef };
}
const KEEP_AWAKE_TAG = 'my-friend-qr';
const NEW_FRIEND_POLL_MS = 5000;

type Notice = { kind: 'success' | 'error' | 'info'; message: string } | null;

export default function MyQrScreen() {
  const { t } = useTranslation();
  const me = useAppStore((s) => s.user);
  const refreshFriends = useFriendsStore((s) => s.fetchAll);

  const [data, setData] = useState<MyFriendCode | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const cardRef = useRef<View>(null);
  const knownFriends = useRef<Set<string> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setData(await FriendsApi.myCode());
    } catch (e) {
      const code = friendQrErrorCode(e);
      setLoadError(code === 'NETWORK' ? t('friends.qr.errors.NETWORK_body') : t('friends.qr.my.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  // success notices disappear by themselves; errors stay until the next action
  useEffect(() => {
    if (!notice || notice.kind === 'error') return;
    const id = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(id);
  }, [notice]);

  // While the QR is on screen: keep the display on, and notice friends who just scanned it.
  const hasData = useRef(false);
  hasData.current = !!data;
  useFocusEffect(
    useCallback(() => {
      if (!hasData.current) void load();
      activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => undefined);

      let cancelled = false;
      knownFriends.current = null;
      const poll = async () => {
        try {
          const list = await FriendsApi.list();
          if (cancelled) return;
          const ids = new Set(list.map((f) => f.uniqueId).filter(Boolean) as string[]);
          const before = knownFriends.current;
          knownFriends.current = ids;
          if (!before) return;
          const added = list.filter((f) => f.uniqueId && !before.has(f.uniqueId));
          if (added.length) {
            if (isNative) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
            setNotice({ kind: 'success', message: t('friends.qr.my.newFriend', { name: added.map((f) => f.username || f.uniqueId).join(', ') }) });
            void refreshFriends();
          }
        } catch {
          // offline for a moment: try again on the next tick
        }
      };
      void poll();
      const timer = setInterval(poll, NEW_FRIEND_POLL_MS);
      return () => {
        cancelled = true;
        clearInterval(timer);
        // rejects when the wake lock never activated (web without wake lock support)
        deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => undefined);
      };
    }, [load, refreshFriends, t])
  );

  const share = async () => {
    if (!data) return;
    const message = t('friends.qr.my.shareMessage', { url: data.url });
    try {
      if (Platform.OS === 'web') {
        const nav: any = typeof navigator !== 'undefined' ? navigator : null;
        if (nav?.share) await nav.share({ title: t('friends.qr.my.shareTitle'), text: message, url: data.url });
        else await copy();
        return;
      }
      // iOS shows `url` as its own item, so the text there is just the invitation
      await Share.share(
        Platform.OS === 'ios' ? { message: t('friends.qr.my.shareTitle'), url: data.url } : { message, title: t('friends.qr.my.shareTitle') },
        { dialogTitle: t('friends.qr.my.shareTitle') }
      );
    } catch {
      // dismissed
    }
  };

  const copy = async () => {
    if (!data) return;
    await Clipboard.setStringAsync(data.url);
    if (isNative) Haptics.selectionAsync().catch(() => undefined);
    setNotice({ kind: 'success', message: t('friends.qr.my.copied') });
  };

  const save = async () => {
    if (!cardRef.current || saving) return;
    setSaving(true);
    setNotice(null);
    try {
      const { MediaLibrary, captureRef } = loadSaveModules();
      const perm = await MediaLibrary.requestPermissionsAsync(true, ['photo']);
      if (!perm.granted) {
        setNotice({ kind: 'error', message: t('friends.qr.my.photosDenied') });
        return;
      }
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      await MediaLibrary.Asset.create(uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      setNotice({ kind: 'success', message: t('friends.qr.my.saved') });
    } catch {
      setNotice({ kind: 'error', message: t('friends.qr.my.saveFailed') });
    } finally {
      setSaving(false);
    }
  };

  const reset = () =>
    confirmAction({
      title: t('friends.qr.my.resetTitle'),
      message: t('friends.qr.my.resetMessage'),
      confirmText: t('friends.qr.my.resetConfirm'),
      cancelText: t('common.cancel', 'Cancel'),
      destructive: true,
      onConfirm: async () => {
        setResetting(true);
        setNotice(null);
        try {
          setData(await FriendsApi.resetMyCode());
          setNotice({ kind: 'success', message: t('friends.qr.my.resetDone') });
        } catch (e) {
          setNotice({ kind: 'error', message: t(`friends.qr.errors.${friendQrErrorCode(e)}_body`) });
        } finally {
          setResetting(false);
        }
      },
    });

  const name = me?.username || me?.uniqueId || '';

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16, alignItems: 'stretch' }}>
      <YStack gap="$1" ai="center">
        <Text fontSize={22} fontWeight="800" color="$text" ta="center" accessibilityRole="header">
          {t('friends.qr.my.title')}
        </Text>
        <Text fontSize={15} color="$textMuted" ta="center">
          {t('friends.qr.my.subtitle')}
        </Text>
      </YStack>

      {!data ? (
        <YStack minHeight={320} ai="center" jc="center" gap="$3">
          {loading || !loadError ? (
            <Spinner size="large" />
          ) : (
            <>
              <Banner kind="error" message={loadError} />
              <Button title={t('common.retry', 'Retry')} variant="primary" size="large" onPress={() => void load()} />
            </>
          )}
        </YStack>
      ) : (
        <>
          <YStack ai="center" opacity={resetting ? 0.4 : 1}>
            <YStack borderRadius={26} borderWidth={1} borderColor="$borderColor" overflow="hidden">
              <PersonalQrCard ref={cardRef} value={data.url} name={name} uniqueId={me?.uniqueId} avatarUrl={me?.avatarUrl} />
            </YStack>
          </YStack>

          {!!notice && <Banner kind={notice.kind} message={notice.message} />}

          <XStack gap="$2" jc="center">
            <ActionTile icon={<AppIcon name="share" size={22} color="$onPrimary" />} label={t('friends.qr.my.share')} onPress={share} primary />
            {isNative && <ActionTile icon={<AppIcon name="download" size={22} color="$text" />} label={t('friends.qr.my.save')} onPress={save} busy={saving} />}
            <ActionTile icon={<AppIcon name="copy" size={22} color="$text" />} label={t('friends.qr.my.copy')} onPress={copy} />
          </XStack>

          <Text fontSize={13} color="$textMuted" ta="center">
            {t('friends.qr.my.permanentNote')}
          </Text>

          <Pressable
            onPress={reset}
            disabled={resetting}
            accessibilityRole="button"
            accessibilityLabel={t('friends.qr.my.reset')}
            style={{ alignSelf: 'center', minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' }}
          >
            <XStack ai="center" gap="$2">
              {resetting ? <Spinner size="small" /> : <AppIcon name="refresh" size={16} color="$danger" />}
              <Text fontSize={15} fontWeight="600" color="$danger">
                {t('friends.qr.my.reset')}
              </Text>
            </XStack>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

function ActionTile({ icon, label, onPress, primary, busy }: { icon: React.ReactNode; label: string; onPress: () => void; primary?: boolean; busy?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={busy} accessibilityRole="button" accessibilityLabel={label} style={{ flex: 1, maxWidth: 140 }}>
      {({ pressed }) => (
        <YStack
          minHeight={76}
          borderRadius={16}
          ai="center"
          jc="center"
          gap="$1.5"
          px="$2"
          py="$2.5"
          backgroundColor={primary ? '$primary' : '$surfaceAlt'}
          opacity={pressed || busy ? 0.7 : 1}
        >
          {busy ? <Spinner size="small" /> : icon}
          <Text fontSize={13} fontWeight="700" color={primary ? '$onPrimary' : '$text'} ta="center" numberOfLines={2}>
            {label}
          </Text>
        </YStack>
      )}
    </Pressable>
  );
}
