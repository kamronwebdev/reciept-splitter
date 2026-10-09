import React, { useCallback, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { YStack } from 'tamagui';
import { Text } from '@/shared/ui/typography';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Card } from '@/shared/ui/Card';
import Banner from '@/shared/ui/Banner';
import TextLink from '@/shared/ui/TextLink';
import EmailInput from '@/shared/ui/EmailInput';
import PasswordInput from '@/shared/ui/PasswordInput';
import PasswordChecklist from '@/shared/ui/PasswordChecklist';
import ScreenFormContainer from '@/shared/ui/ScreenFormContainer';
import { isValidEmail, normalizeEmail } from '@/shared/lib/utils/email';
import { register as registerUser, getCurrentUser } from '../api';
import { saveToken } from '@/shared/lib/utils/token-storage';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { isStrongPassword } from '../model/password';
import { saveLastEmail, useAuthDraft } from '../model/auth-draft.store';
import { authErrorMessage, errorCodeOf } from '../model/auth-errors';

type FormData = { username: string; email: string; password: string };

const USERNAME_MIN = 2;
const USERNAME_MAX = 30;

export default function RegisterForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const setAuth = useAppStore((s) => s.setAuth);
  const draftEmail = useAuthDraft((s) => s.email);
  const setDraftEmail = useAuthDraft((s) => s.setEmail);

  const schema = React.useMemo(
    () =>
      z.object({
        username: z
          .string()
          .transform((v) => v.trim())
          .pipe(z.string().min(USERNAME_MIN, t('auth.errors.INVALID_USERNAME', 'Username must be 2-30 characters')).max(USERNAME_MAX, t('auth.errors.INVALID_USERNAME', 'Username must be 2-30 characters'))),
        email: z
          .string()
          .refine((v) => v.trim().length > 0, t('auth.errors.emailRequired', 'Please enter your email'))
          .refine((v) => v.trim().length === 0 || isValidEmail(v), t('auth.errors.INVALID_EMAIL', 'Please enter a valid email')),
        password: z.string().refine(isStrongPassword, t('auth.errors.WEAK_PASSWORD', 'Password does not meet the requirements')),
      }),
    [t]
  );

  const { control, handleSubmit, setError, clearErrors, getValues, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    defaultValues: { username: '', email: draftEmail, password: '' },
  });

  const password = watch('password');
  const usernameLen = watch('username').trim().length;
  const emailValue = watch('email');
  const canSubmit =
    isStrongPassword(password) &&
    usernameLen >= USERNAME_MIN &&
    usernameLen <= USERNAME_MAX &&
    isValidEmail(emailValue);

  const [isLoading, setIsLoading] = useState(false);
  const submitting = useRef(false);
  const [emailTaken, setEmailTaken] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [otherError, setOtherError] = useState<string | null>(null);
  const emailRef = useRef<any>(null);
  const passwordRef = useRef<any>(null);

  const onSubmit = useCallback(
    async (values: FormData) => {
      if (submitting.current) return; // no double submits
      submitting.current = true;
      setIsLoading(true);
      setEmailTaken(false);
      setNetworkError(null);
      setOtherError(null);
      try {
        const email = normalizeEmail(values.email);
        const res = await registerUser({ username: values.username.trim(), email, password: values.password });
        await saveToken(res.token);

        let profile = res.user;
        try {
          profile = await getCurrentUser(res.token);
        } catch {
          console.warn('Registration profile refresh failed');
        }

        await saveLastEmail(email);
        setAuth(res.token, profile);
        router.replace('/');
      } catch (error) {
        const code = errorCodeOf(error);
        const message = authErrorMessage(t, error);
        if (code === 'EMAIL_IN_USE') {
          setEmailTaken(true);
          setError('email', { message });
        } else if (code === 'INVALID_EMAIL') {
          setError('email', { message });
        } else if (code === 'INVALID_USERNAME') {
          setError('username', { message });
        } else if (code === 'WEAK_PASSWORD') {
          setError('password', { message });
        } else if (code === 'NETWORK') {
          setNetworkError(message);
        } else {
          setOtherError(message);
        }
      } finally {
        submitting.current = false;
        setIsLoading(false);
      }
    },
    [router, setAuth, setError, t]
  );

  const submit = handleSubmit(onSubmit);

  const goLogin = () => {
    setDraftEmail(normalizeEmail(getValues('email')));
    router.replace('/login');
  };

  return (
    <ScreenFormContainer>
      <YStack space="$6">
        <YStack alignItems="center" space="$4">
          <Text fontSize="$8" fontWeight="900" color="$gray12">
            {t('auth.createAccount', 'Create Account')}
          </Text>
          <Text fontSize="$4" color="$gray10" textAlign="center">
            {t('auth.createAccountDesc', 'Join us to start splitting bills with friends')}
          </Text>
        </YStack>

        <Card>
          <YStack space="$5">
            <Controller
              control={control}
              name="username"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={t('auth.username', 'Username')}
                  placeholder={t('auth.usernamePlaceholder', 'Enter your username')}
                  value={value}
                  onChangeText={onChange}
                  error={errors.username?.message}
                  hint={t('auth.usernameRule', '2-30 characters')}
                  required
                  textInputProps={{
                    autoFocus: true,
                    autoCapitalize: 'words',
                    autoCorrect: false,
                    textContentType: 'username',
                    autoComplete: 'username-new',
                    maxLength: USERNAME_MAX + 10,
                    returnKeyType: 'next',
                    onSubmitEditing: () => emailRef.current?.focus(),
                    blurOnSubmit: false,
                    onBlur: () => {
                      onChange(value.trim());
                      onBlur();
                    },
                  }}
                />
              )}
            />

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <YStack space="$1">
                  <EmailInput
                    value={value}
                    onChangeText={(v) => {
                      onChange(v);
                      setDraftEmail(v);
                      if (emailTaken) {
                        setEmailTaken(false);
                        clearErrors('email');
                      }
                    }}
                    onBlur={onBlur}
                    error={errors.email?.message}
                    inputRef={emailRef}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                  />
                  {emailTaken && <TextLink title={t('auth.logInInstead', 'Log in instead')} onPress={goLogin} align="left" highlight />}
                </YStack>
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <YStack space="$3">
                  <PasswordInput
                    label={t('auth.password', 'Password')}
                    placeholder={t('auth.newPasswordPlaceholder', 'Create a password')}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    mode="new"
                    inputRef={passwordRef}
                    returnKeyType="go"
                    onSubmitEditing={() => canSubmit && submit()}
                    error={errors.password?.message}
                    required
                  />
                  <PasswordChecklist password={value} />
                </YStack>
              )}
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
              title={t('auth.createAccount', 'Create Account')}
              variant="primary"
              size="large"
              onPress={submit}
              loading={isLoading}
              disabled={!canSubmit}
            />
          </YStack>
        </Card>

        <YStack alignItems="center" space="$1">
          <Text fontSize="$3" color="$gray9">
            {t('auth.haveAccount', 'Already have an account?')}
          </Text>
          <TextLink title={t('auth.signIn', 'Sign In')} onPress={goLogin} />
        </YStack>
      </YStack>
    </ScreenFormContainer>
  );
}
