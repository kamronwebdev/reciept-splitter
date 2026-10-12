import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useAppTheme } from '@/shared/theme/useAppTheme';
import { DURATION } from './tokens';

/**
 * Thin progress bar. With `fraction` (0..1) it fills smoothly to that value; without, a short segment glides
 * across (indeterminate, "reading items"). Reduce Motion: indeterminate shows a still, half-filled bar.
 */
export default function IndeterminateBar({ fraction, height = 4, accessibilityLabel }: { fraction?: number | undefined; height?: number; accessibilityLabel?: string }) {
  const { colors } = useAppTheme();
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  const fill = useSharedValue(fraction ?? 0);
  const indeterminate = fraction === undefined;

  useEffect(() => {
    if (!indeterminate) {
      cancelAnimation(t);
      fill.value = withTiming(Math.max(0, Math.min(1, fraction!)), { duration: DURATION.base });
      return;
    }
    if (reduced) return;
    t.value = 0;
    t.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.cubic) }), -1, false);
    return () => cancelAnimation(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indeterminate, fraction, reduced]);

  // transforms only (no layout work per frame): the segment is 35% wide and travels from -100% to +286% of itself
  const bar = useAnimatedStyle(() =>
    indeterminate
      ? { width: '35%', transform: [{ translateX: reduced ? '0%' : `${-100 + t.value * 386}%` }] as any }
      : { width: '100%', transformOrigin: 'left', transform: [{ scaleX: fill.value }] }
  );

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      {...(indeterminate ? {} : { accessibilityValue: { min: 0, max: 100, now: Math.round((fraction ?? 0) * 100) } })}
      style={{ height, borderRadius: height / 2, backgroundColor: colors.surfaceAlt, overflow: 'hidden', width: '100%' }}
    >
      <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: height / 2, backgroundColor: colors.primary }, bar]} />
    </View>
  );
}
