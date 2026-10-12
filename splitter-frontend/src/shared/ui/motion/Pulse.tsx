import React, { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

/**
 * A gentle "breathing" loop (opacity 1 ↔ 0.55, scale 1 ↔ 1.015) while `active`. Ambient, so the loop is
 * slower than the 150-300ms of interactive motion; it never moves layout. Reduce Motion: still.
 */
export default function Pulse({ active = true, children, style, scale = 1.015, period = 1400 }: { active?: boolean; children: React.ReactNode; style?: StyleProp<ViewStyle>; scale?: number; period?: number }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (!active || reduced) {
      cancelAnimation(t);
      t.value = withTiming(0, { duration: 150 });
      return;
    }
    t.value = withRepeat(withTiming(1, { duration: period / 2, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, reduced, period]);
  const animated = useAnimatedStyle(() => ({ opacity: 1 - 0.45 * t.value, transform: [{ scale: 1 + (scale - 1) * t.value }] }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}
