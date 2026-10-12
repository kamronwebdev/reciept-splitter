import React, { ReactNode } from 'react';
import { TextInputProps } from 'react-native';
import { YStack, XStack, Input as TInput } from 'tamagui';
import { Text, useTextStyle } from '@/shared/ui/typography';
import { CONTROL_HEIGHT, RADIUS } from '@/shared/theme/spacing';

export type CustomInputProps = {
  label?: string;
  value?: string;
  onChangeText?: (t: string) => void;
  placeholder?: string;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  secureTextEntry?: boolean;
  error?: string;
  required?: boolean;
  /** small helper text under the field (hidden while an error is shown) */
  hint?: string;
  accessibilityLabel?: string;
  /** ref to the underlying TextInput (for focus chaining) */
  inputRef?: React.Ref<any>;

  /** Иконка/кнопка справа (например, «глаз»). */
  rightAdornment?: ReactNode;

  /** Любые нативные пропсы TextInput (returnKeyType, autoComplete и т.п.). */
  textInputProps?: Partial<TextInputProps>;
};

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
  error,
  required,
  hint,
  accessibilityLabel,
  inputRef,
  rightAdornment,
  textInputProps,
}: CustomInputProps) {
  const inputFont = useTextStyle(400, 17);
  return (
    <YStack gap="$2" w="100%">
      {!!label && (
        <Text variant="subheadline" fontWeight="600" color="$textMuted">
          {label}
          {required && <Text color="$danger"> *</Text>}
        </Text>
      )}

      {/* fixed 50pt field; the adornment (eye / clear) sits on the same vertical axis as the text */}
      <XStack position="relative" w="100%" ai="center">
        <TInput
          ref={inputRef as any}
          accessibilityLabel={accessibilityLabel ?? label ?? placeholder}
          w="100%"
          f={1}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
          height={CONTROL_HEIGHT.input}
          px="$4"
          paddingRight={rightAdornment ? 52 : undefined}
          borderRadius={RADIUS.control}
          borderWidth={1}
          borderColor={error ? '$danger' : '$borderColor'}
          backgroundColor="$surface"
          fontSize={inputFont.fontSize}
          fontFamily={(inputFont as any).fontFamily}
          color="$color"
          placeholderTextColor="$textSubtle"
          focusStyle={{ borderColor: error ? '$danger' : '$primary' }}
          {...textInputProps}
        />

        {rightAdornment && (
          <XStack position="absolute" right={4} top={0} bottom={0} width={44} ai="center" jc="center" pointerEvents="box-none">
            {rightAdornment}
          </XStack>
        )}
      </XStack>

      {!!error && (
        <Text variant="footnote" color="$danger" accessibilityRole="alert">
          {error}
        </Text>
      )}
      {!error && !!hint && (
        <Text variant="footnote" color="$textMuted">
          {hint}
        </Text>
      )}
    </YStack>
  );
}

export default Input;
