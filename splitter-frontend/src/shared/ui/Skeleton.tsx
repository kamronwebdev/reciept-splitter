import React, { useEffect, useRef } from 'react';
import { Animated, Platform, View } from 'react-native';
import { YStack, XStack } from 'tamagui';
import { useAppTheme } from '@/shared/theme/useAppTheme';

/** Pulsing placeholder block (loading lists show their shape instead of a spinner). */
export function Skeleton({ width, height = 14, radius = 6 }: { width: number | `${number}%`; height?: number; radius?: number }) {
  const { colors } = useAppTheme();
  const opacity = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(opacity, { toValue: 0.55, duration: 650, useNativeDriver: Platform.OS !== 'web' }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={{ width, height, borderRadius: radius, backgroundColor: colors.surfaceAlt, opacity }} />;
}

/** A list section's worth of placeholder rows (avatar + two lines). */
export function ListSkeleton({ rows = 4, avatar = true }: { rows?: number; avatar?: boolean }) {
  return (
    <YStack backgroundColor="$surface" borderRadius={12} overflow="hidden" accessibilityLabel="Loading" accessibilityRole="progressbar">
      {Array.from({ length: rows }).map((_, i) => (
        <XStack key={i} px="$4" py="$3" gap="$3" ai="center">
          {avatar && <Skeleton width={36} height={36} radius={18} />}
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton width="60%" />
            <Skeleton width="35%" height={11} />
          </View>
        </XStack>
      ))}
    </YStack>
  );
}
