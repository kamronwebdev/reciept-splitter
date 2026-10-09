import React from 'react';
import { Pressable } from 'react-native';
import AppIcon from '@/shared/ui/AppIcon';

/** Compact on/off control for list rows (a check circle, 44pt target). Announced as a switch. */
export default function CheckToggle({ value, onChange, accessibilityLabel, disabled }: { value: boolean; onChange: (v: boolean) => void; accessibilityLabel: string; disabled?: boolean }) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !!disabled }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={4}
      style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : pressed ? 0.6 : 1 })}
    >
      <AppIcon name={value ? 'checkCircle' : 'circle'} size={24} color={value ? '$success' : '$inactive'} weight={value ? 'semibold' : 'regular'} />
    </Pressable>
  );
}
