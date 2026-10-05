import React from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { Check, Circle } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';
import { PASSWORD_RULES, passwordChecks } from '@/features/auth/model/password';

const DEFAULTS = {
  length: '8+ characters',
  upper: 'One uppercase letter',
  lower: 'One lowercase letter',
  number: 'One number',
  special: 'One special character',
} as const;

/** Live password requirements: every rule turns green with a check once satisfied. */
export default function PasswordChecklist({ password }: { password: string }) {
  const { t } = useTranslation();
  const checks = passwordChecks(password);
  return (
    <YStack space="$1.5" accessibilityLabel={t('auth.passwordRequirements', 'Password requirements')}>
      {PASSWORD_RULES.map(({ key }) => {
        const ok = checks[key];
        const text = t(`auth.passwordRules.${key}`, DEFAULTS[key]);
        return (
          <XStack
            key={key}
            ai="center"
            space="$2"
            accessible
            accessibilityLabel={`${text}: ${ok ? t('auth.ruleMet', 'met') : t('auth.ruleNotMet', 'not met')}`}
          >
            {ok ? <Check size={16} color="#2ECC71" /> : <Circle size={16} color="$gray8" />}
            <Text fontSize="$3" color={ok ? '#1E9E55' : '$gray10'} fontWeight={ok ? '600' : '400'}>
              {text}
            </Text>
          </XStack>
        );
      })}
    </YStack>
  );
}
