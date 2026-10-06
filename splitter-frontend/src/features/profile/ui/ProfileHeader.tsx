import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { XStack, YStack } from 'tamagui';
import { Camera, Check, Copy, Pencil, QrCode } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';
import UserAvatar from '@/shared/ui/UserAvatar';
import Input from '@/shared/ui/Input';
import { Text } from '@/shared/ui/typography';
import { Button } from '@/shared/ui/Button';
import Section from '@/shared/ui/Section';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { updateUsername } from '@/features/auth/api';
import { authErrorMessage } from '@/features/auth/model/auth-errors';

const USERNAME_MIN = 2;
const USERNAME_MAX = 30;

type Props = {
  busy: boolean;
  onAvatarPress: () => void;
  onShareQr: () => void;
};

/** Avatar, username (inline edit), email, unique id with copy feedback and the invite-QR shortcut. */
export default function ProfileHeader({ busy, onAvatarPress, onShareQr }: Props) {
  const { t } = useTranslation();
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const setFlash = useAppStore((s) => s.setFlashMessage);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(user?.username ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  const startEdit = () => {
    setDraft(user?.username ?? '');
    setError(null);
    setEditing(true);
  };

  const save = useCallback(async () => {
    if (!user || saving) return;
    const value = draft.trim();
    if (value.length < USERNAME_MIN || value.length > USERNAME_MAX) {
      setError(t('auth.errors.INVALID_USERNAME', 'Username must be 2-30 characters'));
      return;
    }
    if (value === user.username) {
      setEditing(false);
      return;
    }
    const previous = user;
    setSaving(true);
    setError(null);
    setUser({ ...user, username: value }); // optimistic
    setEditing(false);
    try {
      const updated = await updateUsername({ username: value });
      setUser(updated);
      setFlash(t('profile.username.updated', 'Username updated'));
    } catch (e) {
      setUser(previous); // roll back
      setDraft(value);
      setError(authErrorMessage(t, e));
      setEditing(true);
    } finally {
      setSaving(false);
    }
  }, [draft, saving, setFlash, setUser, t, user]);

  const copyId = async () => {
    if (!user?.uniqueId) return;
    try {
      await Clipboard.setStringAsync(user.uniqueId);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard unavailable: nothing to confirm
    }
  };

  const name = user?.username || t('profile.labels.guest', 'Guest');

  return (
    <Section>
      <YStack ai="center" gap="$3">
        <Pressable
          onPress={onAvatarPress}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={t('profile.avatar.change', 'Change profile photo')}
          style={{ width: 104, height: 104, alignItems: 'center', justifyContent: 'center' }}
        >
          <UserAvatar uri={user?.avatarUrl} label={name} seed={user?.uniqueId} size={96} busy={busy} />
          <YStack
            position="absolute"
            right={0}
            bottom={0}
            w={32}
            h={32}
            br={16}
            ai="center"
            jc="center"
            backgroundColor="$primary"
            borderWidth={2}
            borderColor="$surface"
          >
            <Camera size={16} color="$onPrimary" />
          </YStack>
        </Pressable>
        {busy && (
          <Text fontSize={12} color="$textMuted" accessibilityLiveRegion="polite">
            {t('profile.avatar.uploading', 'Uploading…')}
          </Text>
        )}

        {editing ? (
          <YStack w="100%" gap="$2">
            <Input
              label={t('profile.username.label', 'Username')}
              value={draft}
              onChangeText={(v) => {
                setDraft(v);
                if (error) setError(null);
              }}
              error={error ?? undefined}
              hint={t('profile.username.rule', '2-30 characters')}
              textInputProps={{
                autoFocus: true,
                autoCapitalize: 'words',
                autoCorrect: false,
                maxLength: USERNAME_MAX + 10,
                returnKeyType: 'done',
                onSubmitEditing: save,
              }}
            />
            <XStack gap="$2">
              <Button title={t('profile.username.cancel', 'Cancel')} variant="secondary" size="medium" onPress={() => setEditing(false)} />
              <Button title={t('profile.username.save', 'Save')} variant="primary" size="medium" onPress={save} loading={saving} />
            </XStack>
          </YStack>
        ) : (
          <YStack ai="center" gap="$1">
            <XStack ai="center" gap="$2">
              <Text fontSize={22} fontWeight="800" color="$text" numberOfLines={1} maxWidth={240}>
                {name}
              </Text>
              <Pressable
                onPress={startEdit}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('profile.username.edit', 'Edit username')}
                style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <Pencil size={18} color="$textMuted" />
              </Pressable>
            </XStack>
            {!!error && (
              <Text fontSize={13} color="$danger" accessibilityRole="alert">
                {error}
              </Text>
            )}
            <Text fontSize={14} color="$textMuted">
              {user?.email}
            </Text>
          </YStack>
        )}

        <XStack ai="center" gap="$2" backgroundColor="$surfaceAlt" borderRadius={999} pl="$3" pr="$1" minHeight={44}>
          <Text fontSize={14} color="$textMuted">
            {t('profile.header.idLabel', 'ID')}
          </Text>
          <Text fontSize={15} fontWeight="700" color="$text" selectable>
            {user?.uniqueId ?? '—'}
          </Text>
          <Pressable
            onPress={copyId}
            accessibilityRole="button"
            accessibilityLabel={t('profile.header.copyId', 'Copy ID')}
            style={{ minWidth: 44, height: 44, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4, paddingHorizontal: 6 }}
          >
            {copied ? <Check size={18} color="$success" /> : <Copy size={18} color="$textMuted" />}
            {copied && (
              <Text fontSize={13} fontWeight="600" color="$success" accessibilityLiveRegion="polite">
                {t('profile.header.copied', 'Copied')}
              </Text>
            )}
          </Pressable>
        </XStack>

        <Button
          title={t('profile.header.shareQr', 'My QR code')}
          variant="outline"
          size="medium"
          onPress={onShareQr}
        />
      </YStack>
    </Section>
  );
}
