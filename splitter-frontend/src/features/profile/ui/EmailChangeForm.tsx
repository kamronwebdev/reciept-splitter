import React, { useCallback, useRef, useState } from 'react';
import { YStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/ui/typography';
import { Button } from '@/shared/ui/Button';
import Banner from '@/shared/ui/Banner';
import EmailInput from '@/shared/ui/EmailInput';
import PasswordInput from '@/shared/ui/PasswordInput';
import Section from '@/shared/ui/Section';
import TextLink from '@/shared/ui/TextLink';
import { isValidEmail, normalizeEmail } from '@/shared/lib/utils/email';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { updateEmail } from '@/features/auth/api';
import { authErrorMessage, errorCodeOf } from '@/features/auth/model/auth-errors';
import { saveLastEmail } from '@/features/auth/model/auth-draft.store';

/** Change e-mail: new address (typo suggestions) + the current password as confirmation. */
export default function EmailChangeForm() {
  const { t } = useTranslation();
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const setFlash = useAppStore((s) => s.setFlashMessage);

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [otherError, setOtherError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);
  const passwordRef = useRef<any>(null);

  const reset = () => {
    setEmail('');
    setPassword('');
    setEmailError(undefined);
    setPasswordError(undefined);
    setNetworkError(null);
    setOtherError(null);
  };

  const submit = useCallback(async () => {
    if (busy.current || !user) return;
    const normalized = normalizeEmail(email);
    let invalid = false;
    if (!isValidEmail(normalized)) {
      setEmailError(t('auth.errors.INVALID_EMAIL', 'Please enter a valid email'));
      invalid = true;
    } else if (normalized === user.email.toLowerCase()) {
      setEmailError(t('profile.email.same', 'This is already your email'));
      invalid = true;
    }
    if (!password) {
      setPasswordError(t('auth.errors.passwordRequired', 'Please enter your password'));
      invalid = true;
    }
    if (invalid) return;

    busy.current = true;
    setLoading(true);
    setNetworkError(null);
    setOtherError(null);
    try {
      const updated = await updateEmail({ email: normalized, currentPassword: password });
      setUser(updated);
      await saveLastEmail(updated.email);
      setFlash(t('profile.email.updated', 'Email updated'));
      reset();
      setOpen(false);
    } catch (e) {
      const code = errorCodeOf(e);
      const message = authErrorMessage(t, e);
      if (code === 'EMAIL_IN_USE' || code === 'INVALID_EMAIL') setEmailError(message);
      else if (code === 'WRONG_CURRENT_PASSWORD') setPasswordError(message);
      else if (code === 'NETWORK') setNetworkError(message);
      else setOtherError(message);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [email, password, setFlash, setUser, t, user]);

  return (
    <Section
      title={t('profile.email.title', 'Email')}
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
      <Text variant="body" numberOfLines={1} ellipsizeMode="middle">
        {user?.email}
      </Text>
      {open && (
        <YStack gap="$3">
          <EmailInput
            label={t('profile.email.newEmail', 'New email')}
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              if (emailError) setEmailError(undefined);
            }}
            error={emailError}
            autoFocus
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <PasswordInput
            label={t('profile.email.currentPassword', 'Current password')}
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              if (passwordError) setPasswordError(undefined);
            }}
            mode="current"
            inputRef={passwordRef}
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
          <Button title={t('profile.email.submit', 'Update email')} variant="primary" size="large" onPress={submit} loading={loading} />
        </YStack>
      )}
    </Section>
  );
}
