import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { YStack, XStack } from 'tamagui';
import { Text } from '@/shared/ui/typography';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import Banner from '@/shared/ui/Banner';
import TextLink from '@/shared/ui/TextLink';
import EmailInput from '@/shared/ui/EmailInput';
import ScreenFormContainer from '@/shared/ui/ScreenFormContainer';
import PasswordInput from '@/shared/ui/PasswordInput';
import { isValidEmail, normalizeEmail } from '@/shared/lib/utils/email';
import { login, getCurrentUser } from '../api';
import { saveToken } from '@/shared/lib/utils/token-storage';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { loadLastEmail, saveLastEmail, useAuthDraft } from '../model/auth-draft.store';
import { authErrorMessage, errorCodeOf } from '../model/auth-errors';

type FormData = { email: string; password: string };
type FormError = { kind: 'credentials' | 'network' | 'other'; message: string } | null;

export default function LoginForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const setAuth = useAppStore((s) => s.setAuth);
  const sessionExpired = useAppStore((s) => s.sessionExpired);
  const setSessionExpired = useAppStore((s) => s.setSessionExpired);
  const draftEmail = useAuthDraft((s) => s.email);
  const setDraftEmail = useAuthDraft((s) => s.setEmail);

  const schema = React.useMemo(
    () =>
      z.object({
        email: z
          .string()
          .refine((v) => v.trim().length > 0, t('auth.errors.emailRequired', 'Please enter your email'))
          .refine((v) => v.trim().length === 0 || isValidEmail(v), t('auth.errors.INVALID_EMAIL', 'Please enter a valid email')),
        password: z.string().min(1, t('auth.errors.passwordRequired', 'Please enter your password')),
      }),
    [t]
  );

  const { control, handleSubmit, setValue, getValues, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    defaultValues: { email: draftEmail, password: '' },
  });

  const [isLoading, setIsLoading] = useState(false);
  const submitting = useRef(false);
  const [formError, setFormError] = useState<FormError>(null);
  const passwordRef = useRef<any>(null);
  const [emailPrefilled, setEmailPrefilled] = useState(!!draftEmail);

  // Prefill the last used e-mail (never the password) unless the user already typed one.
  useEffect(() => {
    if (draftEmail) return;
    let alive = true;
    loadLastEmail().then((last) => {
      if (alive && last && !getValues('email')) {
        setValue('email', last);
        setDraftEmail(last);
        setEmailPrefilled(true);
      }
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = useCallback(
    async (values: FormData) => {
      if (submitting.current) return; // no double submits
      submitting.current = true;
      setIsLoading(true);
      setFormError(null);
      try {
        const email = normalizeEmail(values.email);
        const res = await login({ email, password: values.password });
        await saveToken(res.token);

        let profile = res.user;
        try {
          profile = await getCurrentUser(res.token);
        } catch (fetchError) {
          console.warn('Login profile refresh failed');
        }

        await saveLastEmail(email);
        setSessionExpired(false);
        setAuth(res.token, profile);
        router.replace('/');
      } catch (error) {
        const code = errorCodeOf(error);
        if (code === 'INVALID_CREDENTIALS') {
          setFormError({ kind: 'credentials', message: authErrorMessage(t, error) });
        } else if (code === 'NETWORK') {
          setFormError({ kind: 'network', message: authErrorMessage(t, error) });
        } else {
          setFormError({ kind: 'other', message: authErrorMessage(t, error) });
        }
      } finally {
        submitting.current = false;
        setIsLoading(false);
      }
    },
    [router, setAuth, setSessionExpired, t]
  );

  const submit = handleSubmit(onSubmit);
  const goForgot = () => {
    setDraftEmail(normalizeEmail(getValues('email')));
    router.push('/forgot-password');
  };
  const goRegister = () => {
    setDraftEmail(normalizeEmail(getValues('email')));
    router.replace('/register');
  };

  return (
    <ScreenFormContainer>
      <YStack space="$6">
        <YStack alignItems="center" space="$4">
          <Text fontSize="$8" fontWeight="900" color="$gray12">
            {t('auth.signIn', 'Sign In')}
          </Text>
          <Text fontSize="$4" color="$gray10" textAlign="center">
            {t('auth.signInDesc', 'Welcome back! Please sign in to continue')}
          </Text>
        </YStack>

        {sessionExpired && (
          <Banner kind="info" message={t('auth.sessionExpired', 'Your session expired, please log in again')} />
        )}

        <Card>
          <YStack space="$5">
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <EmailInput
                  value={value}
                  onChangeText={(v) => {
                    onChange(v);
                    setDraftEmail(v);
                    if (formError) setFormError(null);
                  }}
                  onBlur={onBlur}
                  error={errors.email?.message}
                  autoFocus={!emailPrefilled}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <PasswordInput
                  label={t('auth.password', 'Password')}
                  value={value}
                  onChangeText={(v) => {
                    onChange(v);
                    if (formError) setFormError(null);
                  }}
                  onBlur={onBlur}
                  mode="current"
                  inputRef={passwordRef}
                  autoFocus={emailPrefilled}
                  returnKeyType="go"
                  onSubmitEditing={submit}
                  error={errors.password?.message}
                  required
                />
              )}
            />

            <XStack justifyContent="flex-end">
              <TextLink
                title={t('auth.forgotPassword', 'Forgot Password?')}
                onPress={goForgot}
                highlight={formError?.kind === 'credentials'}
                align="right"
              />
            </XStack>

            {formError && formError.kind === 'network' && (
              <Banner
                kind="error"
                message={formError.message}
                actionLabel={t('common.retry', 'Retry')}
                onAction={submit}
                actionLoading={isLoading}
              />
            )}
            {formError && formError.kind !== 'network' && (
              <Text fontSize="$3" color="$red10" accessibilityRole="alert">
                {formError.message}
              </Text>
            )}

            <Button
              title={t('auth.signIn', 'Sign In')}
              variant="primary"
              size="large"
              onPress={submit}
              loading={isLoading}
            />
          </YStack>
        </Card>

        <YStack alignItems="center" space="$1">
          <Text fontSize="$3" color="$gray9">
            {t('auth.noAccount', "Don't have an account?")}
          </Text>
          <TextLink title={t('auth.createAccount', 'Create Account')} onPress={goRegister} />
        </YStack>
      </YStack>
    </ScreenFormContainer>
  );
}
