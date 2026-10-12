import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, { useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { useAppTheme } from '@/shared/theme/useAppTheme';
import { haptic } from '@/shared/lib/haptics';
import { DURATION, EASE_OUT, SPRING } from './tokens';

const AnimatedPath = Animated.createAnimatedComponent(Path);
// the check stroke in a 24×24 box, and its length (for the "draw" effect)
const CHECK = 'M7 12.5l3.3 3.3L17 9';
const CHECK_LEN = 16;
// SVG stroke animation is native-only; on web the check pops in already drawn
const DRAW = Platform.OS !== 'web';

type Props = {
  size?: number;
  /** filled circle (big success moments) or just the stroke (inline) */
  filled?: boolean;
  /** a success haptic as it appears */
  withHaptic?: boolean;
  delay?: number;
  /** false: show it already drawn (e.g. a row that was paid before the screen opened) */
  animate?: boolean;
  /** stroke color for the outline style (default: success green) */
  color?: string;
  accessibilityLabel?: string;
};

/**
 * Success feedback: the circle scales in, then the check mark is drawn (≈300ms total, UI thread).
 * Used after finishing a split, adding a friend, joining a group, marking a share paid.
 * Reduce Motion: appears with a short fade, no scale or drawing.
 */
export default function SuccessCheck({ size = 64, filled = true, withHaptic = false, delay = 0, animate = true, color, accessibilityLabel }: Props) {
  const { colors } = useAppTheme();
  const reduced = useReducedMotion() || !animate;
  const scale = useSharedValue(reduced ? 1 : 0.6);
  const opacity = useSharedValue(animate ? 0 : 1);
  const draw = useSharedValue(reduced || !DRAW ? 1 : 0);

  useEffect(() => {
    if (!animate) return;
    opacity.value = withDelay(delay, withTiming(1, { duration: DURATION.fast }));
    if (!reduced) {
      scale.value = withDelay(delay, withSpring(1, SPRING.pop));
      if (DRAW) draw.value = withDelay(delay + 90, withTiming(1, { duration: DURATION.base, easing: EASE_OUT }));
    }
    if (withHaptic) haptic.success();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const circleStyle = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));
  const pathProps = useAnimatedProps(() => ({ strokeDashoffset: CHECK_LEN * (1 - draw.value) }));
  const tint = color ?? colors.success;
  const stroke = filled ? colors.onPrimary : tint;

  return (
    <View accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel} accessibilityRole={accessibilityLabel ? 'image' : undefined} style={{ width: size, height: size }}>
      <Animated.View style={[{ width: size, height: size }, circleStyle]}>
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={filled ? 12 : 10.5} fill={filled ? tint : 'none'} stroke={filled ? 'none' : tint} strokeWidth={filled ? 0 : 1.6} />
          {DRAW ? (
            <AnimatedPath d={CHECK} stroke={stroke} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray={CHECK_LEN} animatedProps={pathProps} />
          ) : (
            <Path d={CHECK} stroke={stroke} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          )}
        </Svg>
      </Animated.View>
    </View>
  );
}
