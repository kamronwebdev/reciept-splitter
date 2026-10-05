import React, { ReactNode } from 'react';
import { TextInputProps } from 'react-native';
import { YStack, XStack, Input as TInput } from 'tamagui';
import { Text, useTextStyle } from '@/shared/ui/typography';

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
  const inputFont = useTextStyle(400, 16);
  return (
    <YStack space="$2" w="100%">
      {!!label && (
        <Text fontSize="$3" fontWeight="600" color="$textMuted">
          {label}
          {required && <Text color="$danger"> *</Text>}
        </Text>
      )}

      <XStack position="relative" w="100%">
        <TInput
          ref={inputRef as any}
          accessibilityLabel={accessibilityLabel ?? label ?? placeholder}
          w="100%"      // >>> всегда на полную ширину строки
          f={1}         // >>> растягивается внутри строки
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
          // запас под адорнмент справа
          paddingRight={rightAdornment ? 44 : undefined}
          borderRadius="$4"
          borderWidth={1}
          borderColor={error ? '$danger' : '$borderColor'}
          backgroundColor="$surface"
          height="$4"
          fontSize={inputFont.fontSize}
          fontFamily={(inputFont as any).fontFamily}
          color="$color"
          placeholderTextColor="$textSubtle"
          focusStyle={{ borderColor: error ? '$danger' : '$primary' }}
          {...textInputProps}
        />

        {rightAdornment && (
          <XStack
            position="absolute"
            right={8}
            top={0}
            bottom={0}
            ai="center"
            jc="center"
            pointerEvents="box-none"
          >
            {rightAdornment}
          </XStack>
        )}
      </XStack>

      {!!error && (
        <Text fontSize="$3" color="$danger" accessibilityRole="alert">
          {error}
        </Text>
      )}
      {!error && !!hint && (
        <Text fontSize="$2" color="$textMuted">
          {hint}
        </Text>
      )}
    </YStack>
  );
}

export default Input;
