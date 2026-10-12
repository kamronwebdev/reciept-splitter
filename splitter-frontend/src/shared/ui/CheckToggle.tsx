import React, { useRef } from 'react';
import { Pressable } from 'react-native';
import AppIcon from '@/shared/ui/AppIcon';
import SuccessCheck from '@/shared/ui/motion/SuccessCheck';

/**
 * Compact on/off control for list rows (a check circle, 44pt target). Announced as a switch.
 * Turning it on draws the check (success feedback); rows that were already on show it still.
 */
export default function CheckToggle({ value, onChange, accessibilityLabel, accessibilityHint, disabled }: { value: boolean; onChange: (v: boolean) => void; accessibilityLabel: string; accessibilityHint?: string; disabled?: boolean }) {
  // animate only what the user just did, not the state the screen opened with
  const touched = useRef(false);
  const changed = touched.current;
  return (
    <Pressable
      onPress={() => {
        touched.current = true;
        onChange(!value);
      }}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !!disabled }}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      hitSlop={4}
      style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : pressed ? 0.6 : 1 })}
    >
      {value ? <SuccessCheck key="on" size={26} filled animate={changed} withHaptic={changed} /> : <AppIcon name="circle" size={24} color="$inactive" />}
    </Pressable>
  );
}
