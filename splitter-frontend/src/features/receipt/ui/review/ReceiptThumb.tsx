import React, { useState } from 'react';
import { Image, Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { CAMERA } from '@/shared/theme/palette';
import AppIcon from '@/shared/ui/AppIcon';

/** Small receipt photo; tap to see it full screen (to compare with the parsed lines). */
export default function ReceiptThumb({ uri }: { uri: string }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState(false);
  if (broken) return null;
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="imagebutton" accessibilityLabel={t('receipt.review.viewPhoto', 'View receipt photo')}>
        <Image source={{ uri }} style={{ width: 64, height: 88, borderRadius: 8 }} resizeMode="cover" onError={() => setBroken(true)} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: CAMERA.black }}>
          <Image source={{ uri }} style={{ flex: 1 }} resizeMode="contain" />
          <Pressable
            onPress={() => setOpen(false)}
            accessibilityRole="button"
            accessibilityLabel={t('common.close', 'Close')}
            style={{ position: 'absolute', top: insets.top + 12, right: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: CAMERA.pill, alignItems: 'center', justifyContent: 'center' }}
          >
            <AppIcon name="close" size={22} color={CAMERA.onCamera} />
          </Pressable>
        </View>
      </Modal>
    </>
  );
}
