import React, { useRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Text } from 'tamagui';

type Props = {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  error?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  accessibilityLabel?: string;
};

/**
 * N separate digit boxes backed by ONE real TextInput. That keeps paste, iOS one-time-code
 * autofill (textContentType="oneTimeCode") and Android SMS autofill working.
 */
export default function CodeInput({
  value,
  onChange,
  length = 6,
  error,
  disabled,
  autoFocus,
  accessibilityLabel,
}: Props) {
  const ref = useRef<TextInput>(null);
  const digits = value.split('');

  return (
    <Pressable
      onPress={() => ref.current?.focus()}
      accessibilityRole="none"
      accessible={false}
      style={{ alignSelf: 'stretch' }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }} pointerEvents="none">
        {Array.from({ length }).map((_, i) => {
          const active = !disabled && i === Math.min(digits.length, length - 1);
          return (
            <View
              key={i}
              style={{
                flex: 1,
                minWidth: 44,
                height: 56,
                borderRadius: 10,
                borderWidth: active ? 2 : 1,
                borderColor: error ? '#E5484D' : active ? '#2ECC71' : '#D1D5DB',
                backgroundColor: '#FFFFFF',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text fontSize={24} fontWeight="700" color="$gray12">
                {digits[i] ?? ''}
              </Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        maxLength={length * 2} // allow pasting "123 456"; sanitized above
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        importantForAutofill="yes"
        autoCorrect={false}
        autoFocus={autoFocus}
        editable={!disabled}
        accessibilityLabel={accessibilityLabel}
        caretHidden
        style={{ position: 'absolute', inset: 0, opacity: 0.02, fontSize: 1 } as any}
      />
    </Pressable>
  );
}
