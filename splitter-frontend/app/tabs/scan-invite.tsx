// app/tabs/scan-invite.tsx — scan a friend's personal QR (or a group invite) and act on it.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { scanFromURLAsync, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { CAMERA } from '@/shared/theme/palette';
import MessageScreen, { type MessageAction } from '@/shared/ui/MessageScreen';
import { parseScannedInvite, type ScannedInvite } from '@/shared/lib/utils/invite';
import { ApiError } from '@/features/auth/api';
import { FriendsApi, type FriendCard } from '@/features/friends/api/friends.api';
import { useFriendsStore } from '@/features/friends/model/friends.store';
import { friendQrErrorCode } from '@/features/friends/model/qr-errors';
import { GroupsApi } from '@/features/groups/api/groups.api';
import { useGroupsStore } from '@/features/groups/model/groups.store';
import QrCameraStage from '@/features/friends/ui/scan/QrCameraStage';
import ScanResultSheet, { type ScanResult } from '@/features/friends/ui/scan/ScanResultSheet';

type FromParam = 'friends' | 'friends-requests' | 'groups-index' | 'receipt';

const isNative = Platform.OS !== 'web';
/** the same QR is usually still in front of the camera after "Scan another": ignore it for a moment */
const SAME_CODE_COOLDOWN_MS = 2500;

const haptic = {
  scanned: () => isNative && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined),
  success: () => isNative && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined),
  warning: () => isNative && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined),
};

export default function ScanInviteScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const isFocused = useIsFocused();
  const params = useLocalSearchParams<{ from?: FromParam; code?: string }>();
  const refreshFriends = useFriendsStore((s) => s.fetchAll);
  const refreshGroups = useGroupsStore((s) => s.fetchGroups);

  const [perm, requestPerm] = useCameraPermissions();
  const [result, setResult] = useState<ScanResult | null>(null);
  const handling = useRef(false);
  const lastScan = useRef<{ data: string; at: number } | null>(null);
  const askedRef = useRef(false);

  // ask once when the screen opens
  useEffect(() => {
    if (isFocused && perm && !perm.granted && perm.canAskAgain && !askedRef.current) {
      askedRef.current = true;
      requestPerm().catch(() => undefined);
    }
  }, [isFocused, perm, requestPerm]);

  // the tab screen stays mounted: start clean every time it is opened
  useFocusEffect(
    useCallback(
      () => () => {
        setResult(null);
        handling.current = false;
        lastScan.current = null;
      },
      []
    )
  );

  const goBack = useCallback(() => {
    if (params.from === 'groups-index') router.replace('/tabs/groups' as never);
    else if (router.canGoBack()) router.back();
    else router.replace('/tabs/friends' as never);
  }, [params.from, router]);

  const lookupCode = useCallback(async (code: string) => {
    setResult({ kind: 'checking' });
    try {
      const card = await FriendsApi.lookupCode(code);
      setResult({ kind: 'card', code, card });
    } catch (e) {
      haptic.warning();
      const errorCode = friendQrErrorCode(e);
      setResult({ kind: 'error', code: errorCode, ...(errorCode === 'NETWORK' || errorCode === 'UNKNOWN' ? { retry: () => void lookupCode(code) } : {}) });
    }
  }, []);

  const redeem = useCallback(
    async (invite: ScannedInvite) => {
      if (invite.kind === 'friend-code') return lookupCode(invite.code);

      if (invite.kind === 'friend') {
        // old, time-limited friend QR codes
        setResult({ kind: 'checking' });
        try {
          const res = await FriendsApi.joinByToken(invite.token);
          if (res.action === 'self' && res.friend) {
            setResult({ kind: 'card', code: '', card: { ...res.friend, friendshipStatus: 'self' } });
            return;
          }
          haptic.success();
          setResult({ kind: 'added', friend: res.friend ?? null });
          void refreshFriends();
        } catch (e) {
          haptic.warning();
          const code = friendQrErrorCode(e);
          setResult({ kind: 'error', code, ...(code === 'NETWORK' || code === 'UNKNOWN' ? { retry: () => void redeem(invite) } : {}) });
        }
        return;
      }

      setResult({ kind: 'group-joining' });
      try {
        const r = await GroupsApi.joinByToken(invite.token);
        haptic.success();
        setResult({ kind: 'group-done', result: r });
        void refreshGroups();
        void refreshFriends();
      } catch (e) {
        haptic.warning();
        const code = friendQrErrorCode(e);
        setResult({ kind: 'error', code, ...(code === 'NETWORK' || code === 'UNKNOWN' ? { retry: () => void redeem(invite) } : {}) });
      }
    },
    [lookupCode, refreshFriends, refreshGroups]
  );

  const handleData = useCallback(
    (data: string) => {
      if (handling.current) return;
      const last = lastScan.current;
      if (last && last.data === data && Date.now() - last.at < SAME_CODE_COOLDOWN_MS) return;
      handling.current = true;
      lastScan.current = { data, at: Date.now() };
      haptic.scanned();
      const invite = parseScannedInvite(data);
      if (!invite) {
        haptic.warning();
        setResult({ kind: 'error', code: 'NOT_OUR_QR' });
        return;
      }
      void redeem(invite);
    },
    [redeem]
  );

  // receipt-splitter://f/<code> deep links land here with ?code=
  useEffect(() => {
    if (!isFocused || !params.code) return;
    const code = params.code;
    router.setParams({ code: undefined } as never);
    handling.current = true;
    void redeem({ kind: 'friend-code', code });
  }, [isFocused, params.code, redeem, router]);

  const add = useCallback(
    async (code: string) => {
      setResult((r) => (r?.kind === 'card' ? { ...r, busy: true } : r));
      try {
        const res = await FriendsApi.addByCode(code);
        haptic.success();
        setResult({ kind: 'added', friend: res.friend });
        void refreshFriends();
      } catch (e) {
        if (e instanceof ApiError && (e.code === 'ALREADY_FRIENDS' || e.code === 'SELF')) {
          const friend = e.data?.friend as FriendCard | undefined;
          setResult((r) =>
            r?.kind === 'card'
              ? { kind: 'card', code, card: { ...(friend ?? r.card), friendshipStatus: e.code === 'SELF' ? 'self' : 'friends' } }
              : r
          );
          return;
        }
        haptic.warning();
        const errorCode = friendQrErrorCode(e);
        setResult({ kind: 'error', code: errorCode, ...(errorCode === 'NETWORK' || errorCode === 'UNKNOWN' ? { retry: () => void lookupCode(code) } : {}) });
      }
    },
    [lookupCode, refreshFriends]
  );

  const scanAnother = useCallback(() => {
    setResult(null);
    if (lastScan.current) lastScan.current.at = Date.now();
    handling.current = false;
  }, []);

  const pickPhoto = useCallback(async () => {
    if (handling.current) return;
    try {
      const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, allowsEditing: false });
      if (picked.canceled || !picked.assets?.length) return;
      handling.current = true;
      setResult({ kind: 'checking' });
      const found = await scanFromURLAsync(picked.assets[0]!.uri, ['qr']);
      const data = found.find((f) => parseScannedInvite(f.data))?.data ?? found[0]?.data;
      if (!data) {
        haptic.warning();
        setResult({ kind: 'no-qr' });
        return;
      }
      handling.current = false;
      lastScan.current = null;
      handleData(data);
    } catch {
      handling.current = true;
      setResult({ kind: 'no-qr' });
    }
  }, [handleData]);

  const sheet = (
    <ScanResultSheet
      result={result}
      onAdd={(code) => void add(code)}
      onDone={goBack}
      onScanAnother={scanAnother}
      onOpenGroups={() => router.replace('/tabs/groups' as never)}
    />
  );

  if (!perm) return <View style={{ flex: 1, backgroundColor: CAMERA.black }} />;

  if (!perm.granted) {
    const actions: MessageAction[] = [];
    if (perm.canAskAgain) actions.push({ title: t('friends.qr.scan.allowCamera'), onPress: () => void requestPerm(), variant: 'primary' });
    else if (isNative) actions.push({ title: t('friends.qr.scan.openSettings'), onPress: () => void Linking.openSettings().catch(() => undefined), variant: 'primary' });
    actions.push({ title: t('friends.qr.scan.fromPhotos'), onPress: () => void pickPhoto(), variant: 'outline' });
    actions.push({ title: t('common.back', 'Back'), onPress: goBack, variant: 'secondary' });
    return (
      <>
        <MessageScreen kind="permission" title={t('friends.qr.scan.permissionTitle')} message={t('friends.qr.scan.permissionBody')} actions={actions} />
        {sheet}
      </>
    );
  }

  return (
    <>
      {isFocused ? (
        <QrCameraStage scanning={!result} onScanned={handleData} onPickPhoto={() => void pickPhoto()} onBack={goBack} />
      ) : (
        <View style={{ flex: 1, backgroundColor: CAMERA.black }} />
      )}
      {sheet}
    </>
  );
}
