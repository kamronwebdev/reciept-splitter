import React, { useEffect, useRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { DURATION, SPRING } from './tokens';

/**
 * Pops its child slightly (scale 1 → 1.18 → 1, ≈250ms) whenever `trigger` changes after the first render.
 * Used by count badges. Reduce Motion: no pop.
 */
export default function Pop({ trigger, children, style }: { trigger: unknown; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduced) return;
    scale.value = withSequence(withTiming(1.18, { duration: DURATION.fast * 0.6 }), withSpring(1, SPRING.pop));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}
