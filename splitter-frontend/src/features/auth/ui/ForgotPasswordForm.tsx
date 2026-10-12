import React, { useCallback, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { YStack } from 'tamagui';
import { Text } from '@/shared/ui/typography';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import Banner from '@/shared/ui/Banner';
import TextLink from '@/shared/ui/TextLink';
import EmailInput from '@/shared/ui/EmailInput';
import ScreenFormContainer from '@/shared/ui/ScreenFormContainer';
import { isValidEmail, normalizeEmail } from '@/shared/lib/utils/email';
import { forgotPassword } from '../api';
import { useAuthDraft } from '../model/auth-draft.store';
import { authErrorMessage, errorCodeOf } from '../model/auth-errors';

export default function ForgotPasswordForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const email = useAuthDraft((s) => s.email);
  const setEmail = useAuthDraft((s) => s.setEmail);
  const clearReset = useAuthDraft((s) => s.clearReset);

  const [fieldError, setFieldError] = useState<string | undefined>();
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [otherError, setOtherError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const submitting = useRef(false);

  const validate = useCallback(() => {
    if (!email.trim()) {
      setFieldError(t('auth.errors.emailRequired', 'Please enter your email'));
      return false;
    }
    if (!isValidEmail(email)) {
      setFieldError(t('auth.errors.INVALID_EMAIL', 'Please enter a valid email'));
      return false;
    }
    setFieldError(undefined);
    return true;
  }, [email, t]);

  const submit = useCallback(async () => {
    if (submitting.current) return;
    if (!validate()) return;
    submitting.current = true;
    setIsLoading(true);
    setNetworkError(null);
    setOtherError(null);
    try {
      const normalized = normalizeEmail(email);
      setEmail(normalized);
      clearReset();
      await forgotPassword({ email: normalized });
      router.push('/reset-code');
    } catch (error) {
      const code = errorCodeOf(error);
      const message = authErrorMessage(t, error);
      if (code === 'INVALID_EMAIL') setFieldError(message);
      else if (code === 'NETWORK') setNetworkError(message);
      else setOtherError(message);
    } finally {
      submitting.current = false;
      setIsLoading(false);
    }
  }, [clearReset, email, router, setEmail, t, validate]);

  return (
    <ScreenFormContainer>
      <YStack space="$6">
        <YStack alignItems="center" space="$4">
          <Text fontSize="$8" fontWeight="900" color="$gray12" textAlign="center">
            {t('auth.forgot.title', 'Forgot password?')}
          </Text>
          <Text fontSize="$4" color="$gray10" textAlign="center">
            {t('auth.forgot.desc', "Enter your email and we'll send you a 6-digit code to reset your password.")}
          </Text>
        </YStack>

        <Card>
          <YStack space="$5">
            <EmailInput
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (fieldError) setFieldError(undefined);
              }}
              onBlur={() => email && validate()}
              error={fieldError}
              autoFocus
              returnKeyType="go"
              onSubmitEditing={submit}
            />

            {networkError && (
              <Banner
                kind="error"
                message={networkError}
                actionLabel={t('common.retry', 'Retry')}
                onAction={submit}
                actionLoading={isLoading}
              />
            )}
            {otherError && (
              <Text fontSize="$3" color="$red10" accessibilityRole="alert">
                {otherError}
              </Text>
            )}

            <Button
              title={t('auth.forgot.send', 'Send code')}
              variant="primary"
              size="large"
              onPress={submit}
              loading={isLoading}
            />
          </YStack>
        </Card>

        <TextLink title={t('auth.backToLogin', 'Back to Sign In')} onPress={() => router.replace('/login')} />
      </YStack>
    </ScreenFormContainer>
  );
}
