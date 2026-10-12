import React from 'react';
import { Pressable } from 'react-native';
import { XStack, YStack } from 'tamagui';
import { Text } from '@/shared/ui/typography';
import { haptic } from '@/shared/lib/haptics';

type Option<T extends string> = { value: T; label: string };

/** iOS segmented control (tinted track, raised selected segment). */
export default function SegmentedControl<T extends string>({ options, value, onChange }: { options: Option<T>[]; value: T; onChange: (v: T) => void }) {
  return (
    <XStack backgroundColor="$surfaceAlt" borderRadius={10} p={2} accessibilityRole="tablist">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            style={{ flex: 1 }}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              if (!selected) {
                haptic.select();
                onChange(o.value);
              }
            }}
          >
            <YStack minHeight={36} ai="center" jc="center" borderRadius={8} px="$2" backgroundColor={selected ? '$surface' : 'transparent'} shadowColor="$shadowColor" shadowOpacity={selected ? 0.12 : 0} shadowRadius={3} shadowOffset={{ width: 0, height: 1 }}>
              <Text variant="subheadline" fontWeight={selected ? '600' : '400'} numberOfLines={1}>
                {o.label}
              </Text>
            </YStack>
          </Pressable>
        );
      })}
    </XStack>
  );
}
