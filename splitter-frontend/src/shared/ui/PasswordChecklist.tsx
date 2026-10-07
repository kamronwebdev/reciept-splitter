import React from 'react';
import { YStack, XStack } from 'tamagui';
import { Text } from '@/shared/ui/typography';
import { useTranslation } from 'react-i18next';
import { PASSWORD_RULES, passwordChecks } from '@/features/auth/model/password';
import AppIcon from '@/shared/ui/AppIcon';

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
            {ok ? <AppIcon name="check" size={16} color="$primaryText" /> : <AppIcon name="circle" size={16} color="$textSubtle" />}
            <Text fontSize="$3" color={ok ? '$primaryText' : '$textMuted'} fontWeight={ok ? '600' : '400'}>
              {text}
            </Text>
          </XStack>
        );
      })}
    </YStack>
  );
}
