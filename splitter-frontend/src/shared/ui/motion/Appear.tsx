import React, { createContext, useContext, useEffect, useRef } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { DURATION, EASE_OUT, STAGGER } from './tokens';

/**
 * "Has this list already been shown?" A list provides it; items mounted after the first paint (a friend
 * added, a request approved) animate immediately whatever their index, items of the first paint are staggered.
 */
const ListPhase = createContext<React.MutableRefObject<boolean> | null>(null);

/** Wrap a list (or a screen's cards) so Appear knows first paint from later additions. */
export function AppearGroup({ children }: { children: React.ReactNode }) {
  const shown = useRef(false);
  useEffect(() => {
    shown.current = true;
  }, []);
  return <ListPhase.Provider value={shown}>{children}</ListPhase.Provider>;
}

type Props = {
  /** position in the list: delay = index × 30ms; items from index 8 on appear instantly */
  index?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** turn the animation off (e.g. long lists beyond the first screen) */
  disabled?: boolean;
};

/**
 * Fade + slide up 8pt, once, when mounted (never on re-render or refresh: it only runs on mount).
 * Runs on the UI thread. Reduce Motion: fade only, no movement.
 */
export default function Appear({ index = 0, children, style, disabled }: Props) {
  const reduced = useReducedMotion();
  const listShown = useContext(ListPhase);
  const late = !!listShown?.current; // added after the list was first shown
  const animate = !disabled && (late || index < STAGGER.max);
  const progress = useSharedValue(animate ? 0 : 1);

  useEffect(() => {
    if (!animate) return;
    const delay = late ? 0 : index * STAGGER.step;
    progress.value = withDelay(delay, withTiming(1, { duration: DURATION.base, easing: EASE_OUT }));
    // mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animated = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: reduced ? [] : [{ translateY: (1 - progress.value) * STAGGER.offset }],
  }));

  if (!animate) return <View style={style}>{children}</View>;
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}
