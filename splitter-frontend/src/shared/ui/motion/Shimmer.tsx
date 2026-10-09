import React, { createContext, useContext, useEffect } from 'react';
import { View, type DimensionValue } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import { useAppTheme } from '@/shared/theme/useAppTheme';

const PERIOD = 1200;
const Progress = createContext<SharedValue<number> | null>(null);

function useLoop(enabled: boolean) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (!enabled) return;
    t.value = withRepeat(withTiming(1, { duration: PERIOD, easing: Easing.inOut(Easing.quad) }), -1, false);
    return () => cancelAnimation(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
  return t;
}

/** One shimmer clock for a group of placeholders, so all bars sweep together. */
export function ShimmerGroup({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const t = useLoop(!reduced);
  return <Progress.Provider value={t}>{children}</Progress.Provider>;
}

type Props = { width: DimensionValue; height?: number; radius?: number };

/**
 * Placeholder block with a soft highlight sweeping left → right (UI thread, transform only).
 * Reduce Motion: a still block.
 */
export default function Shimmer({ width, height = 14, radius = 6 }: Props) {
  const { colors } = useAppTheme();
  const reduced = useReducedMotion();
  const shared = useContext(Progress);
  const own = useLoop(!shared && !reduced);
  const t = shared ?? own;
  const band = useAnimatedStyle(() => ({
    // the band is half the block wide and travels from fully left (-100%) to fully right (+200%)
    transform: [{ translateX: `${-100 + t.value * 300}%` as any }],
  }));
  return (
    <View style={{ width, height, borderRadius: radius, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }}>
      {!reduced && <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '50%', backgroundColor: colors.surface, opacity: 0.55 }, band]} />}
    </View>
  );
}
