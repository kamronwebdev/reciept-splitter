import React, { useEffect, useRef, useState } from 'react';
import { ReduceMotion, useAnimatedReaction, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { DURATION, EASE_OUT } from './tokens';

/**
 * A number that counts to its new value when it changes (300ms, ease-out). The timing runs on the UI
 * thread; the text is updated at most once per frame and only when the rounded value changes.
 * Reduce Motion (ReduceMotion.System): jumps straight to the new value.
 *
 * `fromZero`: also count up on first show (Home balance); otherwise the first value is shown as is.
 */
export function useAnimatedNumber(target: number, { fromZero = false, decimals = 0 }: { fromZero?: boolean; decimals?: number } = {}) {
  const factor = 10 ** decimals;
  const round = (v: number) => Math.round(v * factor) / factor;
  const [shown, setShown] = useState(fromZero ? 0 : target);
  const value = useSharedValue(fromZero ? 0 : target);
  const first = useRef(true);

  useEffect(() => {
    if (first.current && !fromZero) {
      first.current = false;
      value.value = target;
      setShown(target);
      return;
    }
    first.current = false;
    value.value = withTiming(target, { duration: DURATION.slow, easing: EASE_OUT, reduceMotion: ReduceMotion.System });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  useAnimatedReaction(
    () => Math.round(value.value * factor) / factor,
    (now, prev) => {
      if (now !== prev) scheduleOnRN(setShown, now);
    },
    [factor]
  );

  // the final value is always exact (no rounding drift)
  return shown === round(target) ? target : shown;
}

/** Renders `format(value)` while counting. */
export default function AnimatedNumber({ value, format, fromZero, decimals }: { value: number; format: (v: number) => React.ReactNode; fromZero?: boolean; decimals?: number }) {
  const shown = useAnimatedNumber(value, { fromZero: !!fromZero, decimals: decimals ?? 0 });
  return <>{format(shown)}</>;
}
