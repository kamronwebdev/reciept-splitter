import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { CameraView } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/ui/typography';
import { CAMERA } from '@/shared/theme/palette';
import AppIcon from '@/shared/ui/AppIcon';

type Props = {
  /** false while a result is shown: the camera stays on but ignores codes */
  scanning: boolean;
  onScanned: (data: string) => void;
  onPickPhoto: () => void;
  onBack: () => void;
};

const isNative = Platform.OS !== 'web';

/** Full-screen QR camera: square frame, light, "Choose from photos". */
export default function QrCameraStage({ scanning, onScanned, onPickPhoto, onBack }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [torch, setTorch] = useState(false);
  const frame = Math.min(width * 0.72, height * 0.42, 320);

  return (
    <View style={styles.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        {...(scanning ? { onBarcodeScanned: (r: { data: string }) => onScanned(r.data) } : {})}
      />

      <View style={styles.frameLayer} pointerEvents="none">
        <View style={{ width: frame, height: frame }}>
          {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
            <View key={c} style={[styles.bracket, styles[c]]} />
          ))}
        </View>
      </View>

      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel={t('common.back', 'Back')} style={styles.roundBtn}>
          <AppIcon name="chevronLeft" size={24} color={CAMERA.onCamera} />
        </Pressable>
        <View style={styles.titlePill}>
          <Text fontSize={17} fontWeight="800" color={CAMERA.onCamera} accessibilityRole="header" numberOfLines={1}>
            {t('friends.qr.scan.title')}
          </Text>
        </View>
        {isNative ? (
          <Pressable
            onPress={() => setTorch((v) => !v)}
            accessibilityRole="switch"
            accessibilityState={{ checked: torch }}
            accessibilityLabel={t('friends.qr.scan.light')}
            style={[styles.roundBtn, torch && { backgroundColor: CAMERA.onCamera }]}
          >
            {torch ? <AppIcon name="flash" size={22} color={CAMERA.black} /> : <AppIcon name="flashOff" size={22} color={CAMERA.onCamera} />}
          </Pressable>
        ) : (
          <View style={{ width: 48 }} />
        )}
      </View>

      {scanning && (
        <View style={[styles.hintWrap, { top: insets.top + 76 }]} pointerEvents="none">
          <View style={styles.hint}>
            <Text fontSize={15} fontWeight="600" color={CAMERA.onCamera} ta="center">
              {t('friends.qr.scan.hint')}
            </Text>
          </View>
        </View>
      )}

      {/* hidden while a result sheet is open, so nothing shows through or competes with it */}
      {scanning && (
        <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
          <Pressable onPress={onPickPhoto} accessibilityRole="button" style={styles.photoBtn}>
            <AppIcon name="photo" size={22} color={CAMERA.onCamera} />
            <Text fontSize={16} fontWeight="700" color={CAMERA.onCamera}>
              {t('friends.qr.scan.fromPhotos')}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const B = 4;
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CAMERA.black },
  frameLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bracket: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderColor: CAMERA.onCamera,
  },
  tl: {
    top: 0,
    left: 0,
    borderTopWidth: B,
    borderLeftWidth: B,
    borderTopLeftRadius: 16,
  },
  tr: {
    top: 0,
    right: 0,
    borderTopWidth: B,
    borderRightWidth: B,
    borderTopRightRadius: 16,
  },
  bl: {
    bottom: 0,
    left: 0,
    borderBottomWidth: B,
    borderLeftWidth: B,
    borderBottomLeftRadius: 16,
  },
  br: {
    bottom: 0,
    right: 0,
    borderBottomWidth: B,
    borderRightWidth: B,
    borderBottomRightRadius: 16,
  },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roundBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: CAMERA.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titlePill: {
    backgroundColor: CAMERA.pill,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexShrink: 1,
    marginHorizontal: 8,
  },
  hintWrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  hint: {
    backgroundColor: CAMERA.pill,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: 420,
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  photoBtn: {
    minHeight: 56,
    borderRadius: 28,
    paddingHorizontal: 22,
    backgroundColor: CAMERA.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
