import React from 'react';
import { Pressable } from 'react-native';
import { Text } from 'tamagui';

type Props = {
  title: string;
  onPress: () => void;
  /** emphasised (bold, green, underlined) – used for "Forgot password?" after a failed login */
  highlight?: boolean;
  align?: 'left' | 'center' | 'right';
  disabled?: boolean;
};

/** Inline text button with a 44pt touch target. */
export default function TextLink({ title, onPress, highlight, align = 'center', disabled }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="link"
      accessibilityLabel={title}
      hitSlop={6}
      style={{
        minHeight: 44,
        justifyContent: 'center',
        alignItems: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text
        fontSize="$3"
        color="#2ECC71"
        fontWeight={highlight ? '800' : '600'}
        textDecorationLine={highlight ? 'underline' : 'none'}
      >
        {title}
      </Text>
    </Pressable>
  );
}
