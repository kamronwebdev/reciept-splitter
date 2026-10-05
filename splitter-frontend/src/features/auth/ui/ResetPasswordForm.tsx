import React, { useCallback, useRef, useState } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { YStack, Text } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import Banner from '@/shared/ui/Banner';
import TextLink from '@/shared/ui/TextLink';
import PasswordInput from '@/shared/ui/PasswordInput';
import PasswordChecklist from '@/shared/ui/PasswordChecklist';
import ScreenFormContainer from '@/shared/ui/ScreenFormContainer';
import { resetPassword } from '../api';
import { saveToken } from '@/shared/lib/utils/token-storage';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { isStrongPassword } from '../model/password';
import { saveLastEmail, useAuthDraft } from '../model/auth-draft.store';
import { authErrorMessage, errorCodeOf } from '../model/auth-errors';

export default function ResetPasswordForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const resetToken = useAuthDraft((s) => s.resetToken);
  const clearReset = useAuthDraft((s) => s.clearReset);
  const setAuth = useAppStore((s) => s.setAuth);
  const setFlashMessage = useAppStore((s) => s.setFlashMessage);
  const setSessionExpired = useAppStore((s) => s.setSessionExpired);

  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState<{ kind: 'field' | 'network' | 'token' | 'other'; message: string } | null>(null);

  const canSubmit = isStrongPassword(password);

  const submit = useCallback(async () => {
    if (submitting.current || !canSubmit || !resetToken) return;
    submitting.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const res = await resetPassword({ resetToken, newPassword: password });
      await saveToken(res.token);
      await saveLastEmail(res.user.email);
      clearReset();
      setSessionExpired(false);
      setAuth(res.token, res.user);
      setFlashMessage(t('auth.reset.success', 'Password updated. You are now signed in.'));
      router.replace('/');
    } catch (e) {
      const code = errorCodeOf(e);
      const message = authErrorMessage(t, e);
      if (code === 'WEAK_PASSWORD') setError({ kind: 'field', message });
      else if (code === 'INVALID_RESET_TOKEN') setError({ kind: 'token', message });
      else if (code === 'NETWORK') setError({ kind: 'network', message });
      else setError({ kind: 'other', message });
    } finally {
      submitting.current = false;
      setIsLoading(false);
    }
  }, [canSubmit, clearReset, password, resetToken, router, setAuth, setFlashMessage, setSessionExpired, t]);

  if (!resetToken && !isLoading) return <Redirect href="/forgot-password" />;

  return (
    <ScreenFormContainer>
      <YStack space="$6">
        <YStack alignItems="center" space="$4">
          <Text fontSize="$8" fontWeight="900" color="$gray12" textAlign="center">
            {t('auth.reset.newPasswordTitle', 'Choose a new password')}
          </Text>
          <Text fontSize="$4" color="$gray10" textAlign="center">
            {t('auth.reset.newPasswordDesc', 'Pick a strong password you have not used before.')}
          </Text>
        </YStack>

        <Card>
          <YStack space="$5">
            <PasswordInput
              label={t('auth.newPassword', 'New password')}
              placeholder={t('auth.newPasswordPlaceholder', 'Create a password')}
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                if (error?.kind === 'field') setError(null);
              }}
              mode="new"
              autoFocus
              returnKeyType="go"
              onSubmitEditing={submit}
              error={error?.kind === 'field' ? error.message : undefined}
              required
            />
            <PasswordChecklist password={password} />

            {error?.kind === 'network' && (
              <Banner
                kind="error"
                message={error.message}
                actionLabel={t('common.retry', 'Retry')}
                onAction={submit}
                actionLoading={isLoading}
              />
            )}
            {error?.kind === 'token' && (
              <YStack space="$2">
                <Text fontSize="$3" color="$red10" accessibilityRole="alert">
                  {error.message}
                </Text>
                <TextLink
                  title={t('auth.reset.startOver', 'Start over')}
                  onPress={() => {
                    clearReset();
                    router.replace('/forgot-password');
                  }}
                  highlight
                />
              </YStack>
            )}
            {error?.kind === 'other' && (
              <Text fontSize="$3" color="$red10" accessibilityRole="alert">
                {error.message}
              </Text>
            )}

            <Button
              title={t('auth.reset.submit', 'Update password')}
              variant="primary"
              size="large"
              onPress={submit}
              loading={isLoading}
              disabled={!canSubmit}
            />
          </YStack>
        </Card>
      </YStack>
    </ScreenFormContainer>
  );
}
