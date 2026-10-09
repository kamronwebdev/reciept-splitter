import React, { useCallback, useRef, useState } from 'react';
import { YStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/ui/typography';
import { Button } from '@/shared/ui/Button';
import Banner from '@/shared/ui/Banner';
import PasswordInput from '@/shared/ui/PasswordInput';
import PasswordChecklist from '@/shared/ui/PasswordChecklist';
import Section from '@/shared/ui/Section';
import TextLink from '@/shared/ui/TextLink';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { changePassword } from '@/features/auth/api';
import { isStrongPassword } from '@/features/auth/model/password';
import { authErrorMessage, errorCodeOf } from '@/features/auth/model/auth-errors';

/**
 * Change password: current + new (live requirements checklist, show/hide toggles).
 * The backend signs out every OTHER device and returns a fresh token, so this device stays signed in.
 */
export default function PasswordChangeForm() {
  const { t } = useTranslation();
  const setToken = useAppStore((s) => s.setToken);
  const setFlash = useAppStore((s) => s.setFlashMessage);

  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [currentError, setCurrentError] = useState<string | undefined>();
  const [nextError, setNextError] = useState<string | undefined>();
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [otherError, setOtherError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);
  const nextRef = useRef<any>(null);

  const canSubmit = !!current && isStrongPassword(next);

  const reset = () => {
    setCurrent('');
    setNext('');
    setCurrentError(undefined);
    setNextError(undefined);
    setNetworkError(null);
    setOtherError(null);
  };

  const submit = useCallback(async () => {
    if (busy.current || !canSubmit) return;
    if (next === current) {
      setNextError(t('profile.password.same', 'Choose a different password'));
      return;
    }
    busy.current = true;
    setLoading(true);
    setNetworkError(null);
    setOtherError(null);
    try {
      const changed = await changePassword({ currentPassword: current, newPassword: next });
      if (changed.token) setToken(changed.token); // keeps THIS device signed in
      setFlash(t('profile.password.updated', 'Password updated. Other devices were signed out.'));
      reset();
      setOpen(false);
    } catch (e) {
      const code = errorCodeOf(e);
      const message = authErrorMessage(t, e);
      if (code === 'WRONG_CURRENT_PASSWORD') setCurrentError(message);
      else if (code === 'WEAK_PASSWORD') setNextError(message);
      else if (code === 'NETWORK') setNetworkError(message);
      else setOtherError(message);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [canSubmit, current, next, setFlash, setToken, t]);

  return (
    <Section
      title={t('profile.password.title', 'Password')}
      right={
        <TextLink
          title={open ? t('profile.username.cancel', 'Cancel') : t('profile.change', 'Change')}
          onPress={() => {
            if (open) reset();
            setOpen(!open);
          }}
          align="right"
        />
      }
    >
      {!open && (
        <Text fontSize={15} color="$textMuted" letterSpacing={2}>
          ••••••••
        </Text>
      )}
      {open && (
        <YStack gap="$3">
          <PasswordInput
            label={t('profile.password.current', 'Current password')}
            value={current}
            onChangeText={(v) => {
              setCurrent(v);
              if (currentError) setCurrentError(undefined);
            }}
            mode="current"
            autoFocus
            returnKeyType="next"
            onSubmitEditing={() => nextRef.current?.focus()}
            error={currentError}
          />
          <PasswordInput
            label={t('profile.password.new', 'New password')}
            placeholder={t('auth.newPasswordPlaceholder', 'Create a password')}
            value={next}
            onChangeText={(v) => {
              setNext(v);
              if (nextError) setNextError(undefined);
            }}
            mode="new"
            inputRef={nextRef}
            returnKeyType="go"
            onSubmitEditing={submit}
            error={nextError}
          />
          <PasswordChecklist password={next} />
          {networkError && (
            <Banner kind="error" message={networkError} actionLabel={t('common.retry', 'Retry')} onAction={submit} actionLoading={loading} />
          )}
          {otherError && (
            <Text fontSize={13} color="$danger" accessibilityRole="alert">
              {otherError}
            </Text>
          )}
          <Button title={t('profile.password.submit', 'Update password')} variant="primary" size="large" onPress={submit} loading={loading} disabled={!canSubmit} />
        </YStack>
      )}
    </Section>
  );
}
