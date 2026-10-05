import React, { useCallback, useState } from 'react';
import { Pressable } from 'react-native';
import { YStack, Text } from 'tamagui';
import { X } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';
import { Input } from '@/shared/ui/Input';
import { normalizeEmail, suggestEmail } from '@/shared/lib/utils/email';

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  /** validation error (usually produced by the form on blur) */
  error?: string | undefined;
  label?: string;
  placeholder?: string;
  required?: boolean;
  inputRef?: React.Ref<any>;
  onBlur?: () => void;
  onSubmitEditing?: () => void;
  returnKeyType?: 'next' | 'done' | 'go';
  autoFocus?: boolean;
  /** show the "Did you mean …?" typo hint (default true) */
  suggest?: boolean;
};

/**
 * The one e-mail field used on every auth screen: right keyboard, no autocorrect/capitalization,
 * normalizes while typing, typo suggestion for popular domains and a clear (x) button.
 */
export default function EmailInput({
  value,
  onChangeText,
  error,
  label,
  placeholder,
  required = true,
  inputRef,
  onBlur,
  onSubmitEditing,
  returnKeyType = 'next',
  autoFocus,
  suggest = true,
}: Props) {
  const { t } = useTranslation();
  const [suggestion, setSuggestion] = useState<string | null>(null);

  const handleChange = useCallback(
    (text: string) => {
      setSuggestion(null);
      onChangeText(normalizeEmail(text));
    },
    [onChangeText]
  );

  const handleBlur = useCallback(() => {
    const normalized = normalizeEmail(value);
    if (normalized !== value) onChangeText(normalized);
    setSuggestion(suggest ? suggestEmail(normalized) : null);
    onBlur?.();
  }, [value, onChangeText, onBlur, suggest]);

  const clear = (
    <Pressable
      onPress={() => handleChange('')}
      hitSlop={6}
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
      accessibilityRole="button"
      accessibilityLabel={t('auth.clearEmail', 'Clear email')}
    >
      <X size={18} color="rgba(0,0,0,0.55)" />
    </Pressable>
  );

  return (
    <YStack space="$2" w="100%">
      <Input
        label={label ?? t('auth.email', 'Email')}
        placeholder={placeholder ?? t('auth.emailPlaceholder', 'Enter your email')}
        value={value}
        onChangeText={handleChange}
        keyboardType="email-address"
        autoCapitalize="none"
        error={error}
        required={required}
        inputRef={inputRef}
        rightAdornment={value ? clear : undefined}
        textInputProps={{
          autoCorrect: false,
          spellCheck: false,
          textContentType: 'emailAddress',
          autoComplete: 'email',
          importantForAutofill: 'yes',
          returnKeyType,
          ...(autoFocus ? { autoFocus } : {}),
          ...(onSubmitEditing ? { onSubmitEditing, blurOnSubmit: returnKeyType !== 'next' } : {}),
          onBlur: handleBlur,
        }}
      />
      {!!suggestion && !error && (
        <Pressable
          onPress={() => {
            onChangeText(suggestion);
            setSuggestion(null);
          }}
          accessibilityRole="button"
          accessibilityLabel={t('auth.didYouMean', { email: suggestion, defaultValue: 'Did you mean {{email}}?' })}
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <Text fontSize="$3" color="$gray11">
            {t('auth.didYouMeanPrefix', 'Did you mean')}{' '}
            <Text fontSize="$3" color="#2ECC71" fontWeight="700" textDecorationLine="underline">
              {suggestion}
            </Text>
            ?
          </Text>
        </Pressable>
      )}
    </YStack>
  );
}
