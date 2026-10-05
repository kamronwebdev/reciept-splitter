import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { YStack, Text } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { Card } from '@/shared/ui/Card';
import Banner from '@/shared/ui/Banner';
import TextLink from '@/shared/ui/TextLink';
import CodeInput from '@/shared/ui/CodeInput';
import { Button } from '@/shared/ui/Button';
import ScreenFormContainer from '@/shared/ui/ScreenFormContainer';
import { forgotPassword, verifyResetCode } from '../api';
import { useAuthDraft } from '../model/auth-draft.store';
import { authErrorMessage, errorCodeOf } from '../model/auth-errors';

const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function ResetCodeForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const email = useAuthDraft((s) => s.email);
  const setResetToken = useAuthDraft((s) => s.setResetToken);

  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<{ kind: 'code' | 'network' | 'other'; message: string } | null>(null);
  const [locked, setLocked] = useState(false); // too many attempts / expired: a new code is needed
  const [info, setInfo] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  const verify = useCallback(
    async (value: string) => {
      if (busy.current || value.length !== CODE_LENGTH) return;
      busy.current = true;
      setVerifying(true);
      setError(null);
      setInfo(null);
      try {
        const { resetToken } = await verifyResetCode({ email, code: value });
        setResetToken(resetToken);
        router.replace('/reset-password');
      } catch (e) {
        const errCode = errorCodeOf(e);
        const message = authErrorMessage(t, e);
        if (errCode === 'NETWORK') {
          setError({ kind: 'network', message });
        } else if (errCode === 'INVALID_CODE') {
          setError({ kind: 'code', message });
          setCode('');
        } else if (errCode === 'TOO_MANY_ATTEMPTS' || errCode === 'CODE_EXPIRED') {
          setError({ kind: 'code', message });
          setLocked(true);
        } else {
          setError({ kind: 'other', message });
        }
      } finally {
        busy.current = false;
        setVerifying(false);
      }
    },
    [email, router, setResetToken, t]
  );

  const onChange = (v: string) => {
    setCode(v);
    if (error?.kind === 'code') setError(null);
    if (v.length === CODE_LENGTH) void verify(v);
  };

  const resend = useCallback(async () => {
    if (resending || secondsLeft > 0) return;
    setResending(true);
    setError(null);
    try {
      await forgotPassword({ email });
      setCode('');
      setLocked(false);
      setSecondsLeft(RESEND_SECONDS);
      setInfo(t('auth.reset.codeSent', 'A new code has been sent.'));
    } catch (e) {
      const errCode = errorCodeOf(e);
      setError({ kind: errCode === 'NETWORK' ? 'network' : 'other', message: authErrorMessage(t, e) });
    } finally {
      setResending(false);
    }
  }, [email, resending, secondsLeft, t]);

  if (!email) return <Redirect href="/forgot-password" />;

  return (
    <ScreenFormContainer>
      <YStack space="$6">
        <YStack alignItems="center" space="$4">
          <Text fontSize="$8" fontWeight="900" color="$gray12" textAlign="center">
            {t('auth.reset.codeTitle', 'Enter the code')}
          </Text>
          <Text fontSize="$4" color="$gray10" textAlign="center">
            {t('auth.reset.codeDesc', { email, defaultValue: 'We sent a 6-digit code to {{email}}. It expires in 15 minutes.' })}
          </Text>
        </YStack>

        <Card>
          <YStack space="$5">
            <CodeInput
              value={code}
              onChange={onChange}
              length={CODE_LENGTH}
              error={error?.kind === 'code'}
              disabled={verifying || locked}
              autoFocus
              accessibilityLabel={t('auth.reset.codeLabel', 'Verification code')}
            />

            {error?.kind === 'code' && (
              <Text fontSize="$3" color="$red10" textAlign="center" accessibilityRole="alert">
                {error.message}
              </Text>
            )}
            {error?.kind === 'network' && (
              <Banner
                kind="error"
                message={error.message}
                actionLabel={t('common.retry', 'Retry')}
                onAction={() => (code.length === CODE_LENGTH ? verify(code) : resend())}
                actionLoading={verifying || resending}
              />
            )}
            {error?.kind === 'other' && (
              <Text fontSize="$3" color="$red10" textAlign="center" accessibilityRole="alert">
                {error.message}
              </Text>
            )}
            {!!info && !error && <Banner kind="success" message={info} />}

            <Button
              title={t('auth.reset.verify', 'Continue')}
              variant="primary"
              size="large"
              onPress={() => verify(code)}
              loading={verifying}
              disabled={code.length !== CODE_LENGTH || locked}
            />

            <TextLink
              title={
                secondsLeft > 0
                  ? t('auth.reset.resendIn', { seconds: secondsLeft, defaultValue: 'Resend code in {{seconds}}s' })
                  : t('auth.reset.resend', 'Resend code')
              }
              onPress={resend}
              disabled={secondsLeft > 0 || resending}
              highlight={locked && secondsLeft <= 0}
            />
          </YStack>
        </Card>

        <TextLink title={t('auth.reset.changeEmail', 'Change email')} onPress={() => router.back()} />
      </YStack>
    </ScreenFormContainer>
  );
}
