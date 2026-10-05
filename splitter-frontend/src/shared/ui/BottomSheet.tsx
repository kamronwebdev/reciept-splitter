import React from 'react';
import { Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/shared/theme/useAppTheme';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** accessibility label of the dialog */
  label?: string;
};

/**
 * Simple, dependable bottom sheet (RN Modal): works the same on iOS, Android and web,
 * follows the theme, closes on backdrop tap / Android back button.
 */
export default function BottomSheet({ visible, onClose, children, label }: Props) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType={Platform.OS === 'web' ? 'fade' : 'slide'}
      onRequestClose={onClose}
      statusBarTranslucent
      supportedOrientations={['portrait', 'landscape']}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.overlay }}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={label ? `${label} (close)` : 'Close'}
        />
        <View
          accessibilityViewIsModal
          accessibilityLabel={label}
          style={{
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
          }}
        >
          <View
            style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 12 }}
          />
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
