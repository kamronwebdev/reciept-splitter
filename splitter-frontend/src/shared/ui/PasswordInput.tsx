import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { XStack } from 'tamagui';
import { Eye, EyeOff } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';
import { Input } from '@/shared/ui/Input';

type Props = {
  label?: string;
  placeholder?: string;
  value?: string;
  onChangeText?: (t: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  /**
   * 'current' (login / "current password"): lets the OS autofill the saved password.
   * 'new' (register / reset): lets iOS/Android suggest and save a strong password.
   */
  mode?: 'current' | 'new';
  inputRef?: React.Ref<any>;
  onSubmitEditing?: () => void;
  onBlur?: () => void;
  returnKeyType?: 'next' | 'done' | 'go';
  autoFocus?: boolean;
  textInputProps?: any; // дополнительные пропсы TextInput при необходимости
};

export default function PasswordInput({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  hint,
  required,
  autoCapitalize = 'none',
  mode = 'current',
  inputRef,
  onSubmitEditing,
  onBlur,
  returnKeyType,
  autoFocus,
  textInputProps,
}: Props) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);

  const eye = (
    <Pressable
      onPress={() => setShow((s) => !s)}
      hitSlop={6}
      android_ripple={{ color: 'rgba(0,0,0,0.08)', borderless: true }}
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
      accessibilityRole="button"
      accessibilityLabel={show ? t('auth.hidePassword', 'Hide password') : t('auth.showPassword', 'Show password')}
    >
      {show ? <EyeOff size={18} color="rgba(0,0,0,0.7)" /> : <Eye size={18} color="rgba(0,0,0,0.7)" />}
    </Pressable>
  );

  const autofill =
    mode === 'new'
      ? { textContentType: 'newPassword', autoComplete: 'new-password', importantForAutofill: 'yes' }
      : { textContentType: 'password', autoComplete: 'current-password', importantForAutofill: 'yes' };

  return (
    <XStack w="100%">
      <Input
        label={label}
        placeholder={placeholder ?? t('auth.passwordPlaceholder', 'Enter your password')}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!show}
        autoCapitalize={autoCapitalize}
        error={error}
        hint={hint}
        required={required}
        inputRef={inputRef}
        rightAdornment={eye}
        textInputProps={{
          ...autofill,
          autoCorrect: false,
          spellCheck: false,
          ...(returnKeyType ? { returnKeyType } : {}),
          ...(autoFocus ? { autoFocus } : {}),
          ...(onSubmitEditing ? { onSubmitEditing, blurOnSubmit: returnKeyType !== 'next' } : {}),
          ...(onBlur ? { onBlur } : {}),
          ...textInputProps,
        }}
      />
    </XStack>
  );
}
