import React, { useCallback, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { YStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/ui/typography';
import { Button } from '@/shared/ui/Button';
import Banner from '@/shared/ui/Banner';
import PasswordInput from '@/shared/ui/PasswordInput';
import Section from '@/shared/ui/Section';
import TextLink from '@/shared/ui/TextLink';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { deleteAccount } from '@/features/auth/api';
import { authErrorMessage, errorCodeOf } from '@/features/auth/model/auth-errors';

/** "Danger zone": permanent deletion, confirmed by typing the password. Ends on the Welcome screen. */
export default function DeleteAccountSection() {
  const { t } = useTranslation();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [otherError, setOtherError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);

  const submit = useCallback(async () => {
    if (busy.current || !password) return;
    busy.current = true;
    setLoading(true);
    setNetworkError(null);
    setOtherError(null);
    try {
      await deleteAccount({ password });
      // The account is gone: clear token, user, stores and caches, then leave the tabs for good.
      await useAppStore.getState().logout();
      try {
        if (router.canDismiss()) router.dismissAll();
      } catch {
        // nothing to dismiss
      }
      router.replace('/');
    } catch (e) {
      const code = errorCodeOf(e);
      const message = authErrorMessage(t, e);
      if (code === 'INVALID_PASSWORD') setPasswordError(message);
      else if (code === 'NETWORK') setNetworkError(message);
      else setOtherError(message);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [password, router, t]);

  return (
    <Section
      danger
      title={t('profile.danger.title', 'Danger zone')}
      right={
        <TextLink
          title={open ? t('profile.username.cancel', 'Cancel') : t('profile.danger.delete', 'Delete account')}
          onPress={() => {
            setOpen(!open);
            setPassword('');
            setPasswordError(undefined);
            setNetworkError(null);
            setOtherError(null);
          }}
          align="right"
          danger
        />
      }
    >
      {open && (
        <YStack gap="$3">
          <Text fontSize={14} color="$textMuted">
            {t('profile.danger.warning')}
          </Text>
          <PasswordInput
            label={t('profile.danger.passwordLabel', 'Type your password to confirm')}
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              if (passwordError) setPasswordError(undefined);
            }}
            mode="current"
            returnKeyType="go"
            onSubmitEditing={submit}
            error={passwordError}
          />
          {networkError && (
            <Banner kind="error" message={networkError} actionLabel={t('common.retry', 'Retry')} onAction={submit} actionLoading={loading} />
          )}
          {otherError && (
            <Text fontSize={13} color="$danger" accessibilityRole="alert">
              {otherError}
            </Text>
          )}
          <Button title={t('profile.danger.confirm', 'Delete my account')} variant="danger" size="large" onPress={submit} loading={loading} disabled={!password} />
        </YStack>
      )}
    </Section>
  );
}
