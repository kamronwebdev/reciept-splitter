import React, { forwardRef } from 'react';
import { Pressable, type GestureResponderEvent, type PressableProps, type StyleProp, type View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { haptic as haptics } from '@/shared/lib/haptics';
import { SPRING } from './tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PressableScaleProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** how far it shrinks while pressed (cards/buttons ~0.97, full-width rows a bit less) */
  scaleTo?: number;
  /** haptic on press: 'tap' for primary actions, 'select' for rows / toggles */
  haptic?: 'tap' | 'select' | 'none';
};

/**
 * Pressable that scales down slightly while touched (spring on the UI thread).
 * Never blocks input: the press fires immediately, the scale just follows the finger.
 * With Reduce Motion on, it does not scale (the caller's pressed opacity still shows the touch).
 */
const PressableScale = forwardRef<View, PressableScaleProps>(function PressableScale(
  { scaleTo = 0.97, haptic = 'none', onPressIn, onPressOut, onPress, style, disabled, ...rest },
  ref
) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const pressIn = (e: GestureResponderEvent) => {
    if (!reduced && !disabled) scale.value = withSpring(scaleTo, SPRING.press);
    onPressIn?.(e);
  };
  const pressOut = (e: GestureResponderEvent) => {
    scale.value = withSpring(1, SPRING.press);
    onPressOut?.(e);
  };
  const press = onPress
    ? (e: GestureResponderEvent) => {
        if (haptic === 'tap') haptics.tap();
        else if (haptic === 'select') haptics.select();
        onPress(e);
      }
    : undefined;

  return <AnimatedPressable ref={ref} {...rest} disabled={disabled} onPressIn={pressIn} onPressOut={pressOut} onPress={press} style={[style, animated]} />;
});

export default PressableScale;
