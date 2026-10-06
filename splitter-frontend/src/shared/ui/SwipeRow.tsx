import React, { useRef } from 'react';
import { Pressable } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { XStack } from 'tamagui';
import { Text } from '@/shared/ui/typography';
import { haptic } from '@/shared/lib/haptics';

export type SwipeAction = { label: string; onPress: () => void; destructive?: boolean };

/**
 * iOS-style trailing swipe actions (e.g. Delete / Remove). The same actions must also be reachable
 * without swiping (long-press action sheet or a detail screen) for accessibility and web.
 */
export default function SwipeRow({ actions, children }: { actions: SwipeAction[]; children: React.ReactNode }) {
  const ref = useRef<SwipeableMethods>(null);
  if (!actions.length) return <>{children}</>;
  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={() => (
        <XStack>
          {actions.map((a) => (
            <Pressable
              key={a.label}
              accessibilityRole="button"
              onPress={() => {
                haptic.press();
                ref.current?.close();
                a.onPress();
              }}
            >
              <XStack height="100%" minWidth={84} px="$3" ai="center" jc="center" backgroundColor={a.destructive ? '$danger' : '$inactive'}>
                <Text variant="subheadline" fontWeight="600" color="#FFFFFF">
                  {a.label}
                </Text>
              </XStack>
            </Pressable>
          ))}
        </XStack>
      )}
    >
      {children}
    </ReanimatedSwipeable>
  );
}
