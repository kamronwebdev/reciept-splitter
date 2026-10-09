import React from 'react';
import { View, type DimensionValue } from 'react-native';
import { YStack, XStack } from 'tamagui';
import Shimmer, { ShimmerGroup } from '@/shared/ui/motion/Shimmer';

/** Placeholder block with a shimmer (loading lists show their shape instead of a spinner). */
export function Skeleton({ width, height = 14, radius = 6 }: { width: DimensionValue; height?: number; radius?: number }) {
  return <Shimmer width={width} height={height} radius={radius} />;
}

/** A list section's worth of placeholder rows (avatar + two lines), all shimmering in sync. */
export function ListSkeleton({ rows = 4, avatar = true }: { rows?: number; avatar?: boolean }) {
  return (
    <ShimmerGroup>
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
    </ShimmerGroup>
  );
}
