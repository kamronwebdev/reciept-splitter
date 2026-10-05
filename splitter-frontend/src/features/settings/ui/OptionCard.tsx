import React from 'react';
import { Pressable } from 'react-native';
import { YStack } from 'tamagui';
import { Check } from '@tamagui/lucide-icons';

type Props = {
  selected: boolean;
  onPress: () => void;
  label: string;
  children: React.ReactNode;
  flex?: boolean;
};

/** Selectable card used by the theme / font / text-size pickers (radio semantics, 44pt+ target). */
export default function OptionCard({ selected, onPress, label, children, flex = true }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={({ pressed }) => ({ flex: flex ? 1 : undefined, opacity: pressed ? 0.75 : 1 })}
    >
      <YStack
        minHeight={64}
        borderRadius={14}
        borderWidth={selected ? 2 : 1}
        borderColor={selected ? '$primary' : '$borderColor'}
        backgroundColor={selected ? '$primarySoft' : '$surface'}
        ai="center"
        jc="center"
        p="$2.5"
        gap="$1"
      >
        {children}
        {selected && (
          <YStack position="absolute" top={6} right={6}>
            <Check size={14} color="$primaryText" />
          </YStack>
        )}
      </YStack>
    </Pressable>
  );
}
