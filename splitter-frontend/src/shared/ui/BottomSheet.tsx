import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/shared/theme/useAppTheme';
import { DURATION, SPRING } from '@/shared/ui/motion/tokens';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** accessibility label of the dialog */
  label?: string;
};

/**
 * Simple, dependable bottom sheet (RN Modal): works the same on iOS, Android and web, follows the theme,
 * closes on backdrop tap / Android back button. Opens with a quick spring (no overshoot) while the backdrop
 * fades in; closes in 180ms. Reduce Motion: a plain fade.
 */
export default function BottomSheet({ visible, onClose, children, label }: Props) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  // stays mounted until the close animation has finished
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);
  const height = useSharedValue(600);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = reduced ? withTiming(1, { duration: DURATION.fast }) : withSpring(1, SPRING.sheet);
    } else {
      progress.value = withTiming(0, { duration: 180 }, (finished) => {
        if (finished) scheduleOnRN(setMounted, false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reduced]);

  const backdrop = useAnimatedStyle(() => ({ opacity: progress.value }));
  const sheet = useAnimatedStyle(() =>
    reduced ? { opacity: progress.value } : { transform: [{ translateY: (1 - progress.value) * height.value }] }
  );

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      supportedOrientations={['portrait', 'landscape']}
    >
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.overlay }, backdrop]}>
          <Pressable
            style={{ flex: 1 }}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={label ? `${label} (close)` : 'Close'}
          />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          accessibilityLabel={label}
          // the sheet slides by its own height
          onLayout={(e) => {
            height.value = e.nativeEvent.layout.height + 40;
          }}
          // closing: touches go through to the backdrop / nothing, never blocked by a sheet that is leaving
          pointerEvents={visible ? 'auto' : 'none'}
          style={[
            {
              backgroundColor: colors.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingTop: 8,
              paddingHorizontal: 16,
              paddingBottom: Math.max(insets.bottom, 12) + 8,
              maxHeight: '85%',
              width: '100%',
              maxWidth: 560,
              alignSelf: 'center',
            },
            sheet,
          ]}
        >
          <View
            style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 12 }}
          />
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
