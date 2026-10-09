import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Screen from '@/shared/ui/Screen';
import { ListRow, ListSection } from '@/shared/ui/List';
import Banner from '@/shared/ui/Banner';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { confirmLogout } from '@/features/auth/lib/confirm-logout';
import { getCurrentUser, getUserStats } from '@/features/auth/api';
import { authErrorMessage } from '@/features/auth/model/auth-errors';
import { useAvatar, type AvatarOutcome } from '@/features/profile/lib/use-avatar';
import ProfileHeader from '@/features/profile/ui/ProfileHeader';
import StatsCard from '@/features/profile/ui/StatsCard';
import EmailChangeForm from '@/features/profile/ui/EmailChangeForm';
import PasswordChangeForm from '@/features/profile/ui/PasswordChangeForm';
import DeleteAccountSection from '@/features/profile/ui/DeleteAccountSection';
import AvatarSheet, { type BlockedState } from '@/features/profile/ui/AvatarSheet';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const setFlash = useAppStore((s) => s.setFlashMessage);

  const avatar = useAvatar();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [blocked, setBlocked] = useState<BlockedState>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);

  const stats = useQuery({
    queryKey: ['user-stats', user?.id],
    queryFn: getUserStats,
    enabled: !!user,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshError(false);
    try {
      const [me] = await Promise.all([getCurrentUser(), stats.refetch()]);
      setUser(me);
    } catch {
      setRefreshError(true);
    } finally {
      setRefreshing(false);
    }
  }, [setUser, stats]);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setBlocked(null);
  }, []);

  const handleOutcome = useCallback(
    (outcome: AvatarOutcome, successKey: 'updated' | 'removed') => {
      switch (outcome.kind) {
        case 'ok':
          setFlash(t(`profile.avatar.${successKey}`, successKey === 'updated' ? 'Profile photo updated' : 'Profile photo removed'));
          break;
        case 'denied':
          // keep the sheet open and explain how to fix it (Open Settings when it can't be asked again)
          setBlocked({ source: outcome.source, canAskAgain: outcome.canAskAgain });
          setSheetOpen(true);
          break;
        case 'pick-error':
          setAvatarError(t('profile.avatar.pickFailed', 'Could not read the photo. Please try another one.'));
          break;
        case 'error':
          setAvatarError(authErrorMessage(t, outcome.error));
          break;
        default:
          break; // cancelled
      }
    },
    [setFlash, t]
  );

  /** iOS cannot present the picker while the sheet (a Modal) is still dismissing. */
  const runAfterSheet = useCallback(async (action: () => Promise<AvatarOutcome>, successKey: 'updated' | 'removed') => {
    setAvatarError(null);
    closeSheet();
    await wait(Platform.OS === 'ios' ? 450 : 50);
    handleOutcome(await action(), successKey);
  }, [closeSheet, handleOutcome]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen refreshing={refreshing} onRefresh={onRefresh} keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
        {refreshError && <Banner kind="error" message={t('profile.refreshFailed', 'Could not refresh your profile. Pull down to try again.')} />}
        {!!avatarError && <Banner kind="error" message={avatarError} />}

        <ProfileHeader
          busy={avatar.busy}
          onAvatarPress={() => {
            setAvatarError(null);
            setBlocked(null);
            setSheetOpen(true);
          }}
          onShareQr={() => router.push('/my-qr')}
        />

        <StatsCard stats={stats.data} />
        <EmailChangeForm />
        <PasswordChangeForm />
        <DeleteAccountSection />

        <ListSection>
          <ListRow title={t('profile.logout', 'Log out')} destructive onPress={() => confirmLogout(t, router)} />
        </ListSection>
      </Screen>

      <AvatarSheet
        visible={sheetOpen}
        onClose={closeSheet}
        hasPhoto={!!user?.avatarUrl}
        blocked={blocked}
        onTakePhoto={() => runAfterSheet(() => avatar.change('camera'), 'updated')}
        onChooseLibrary={() => runAfterSheet(() => avatar.change('library'), 'updated')}
        onRemove={() => runAfterSheet(() => avatar.remove(), 'removed')}
      />
    </KeyboardAvoidingView>
  );
}
