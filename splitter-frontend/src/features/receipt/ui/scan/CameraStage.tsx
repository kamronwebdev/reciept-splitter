import React, { useCallback, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/ui/typography';
import { CAMERA } from '@/shared/theme/palette';
import type { LocalImage } from '../../lib/image';
import AppIcon from '@/shared/ui/AppIcon';
import { PressableScale, Pulse } from '@/shared/ui/motion';

type Props = {
  onCaptured: (img: LocalImage) => void;
  onGallery: () => void;
  onBack: () => void;
};

const ZOOM_2X = 0.1; // expo-camera zoom is 0..1 (share of the device's max zoom): ~2x on typical phones
const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const isNative = Platform.OS !== 'web';

/** Full-screen camera: receipt frame, light, zoom (pinch + 1x/2x), gallery and a big shutter. */
export default function CameraStage({ onCaptured, onGallery, onBack }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView | null>(null);
  const [torch, setTorch] = useState(false);
  const [zoom, setZoom] = useState(0);
  const zoomStart = useRef(0);
  const [capturing, setCapturing] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pinch = Gesture.Pinch()
    .runOnJS(true)
    .onStart(() => {
      zoomStart.current = zoom;
    })
    .onUpdate((e) => {
      // smooth, clamped to the valid 0..1 range
      setZoom(clamp(zoomStart.current + (e.scale - 1) * 0.35));
    });

  const shoot = useCallback(async () => {
    if (!cameraRef.current || capturing || !ready) return;
    setCapturing(true);
    setError(null);
    try {
      if (isNative) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      const picture = await cameraRef.current.takePictureAsync({ quality: 0.9, skipProcessing: false });
      if (!picture?.uri) throw new Error('no picture');
      onCaptured({ uri: picture.uri, width: picture.width, height: picture.height });
    } catch {
      setError(t('receipt.scan.captureFailed', 'Could not take the photo. Please try again.'));
    } finally {
      setCapturing(false);
    }
  }, [capturing, ready, onCaptured, t]);

  const zoomPill = (label: string, value: number) => {
    const active = Math.abs(zoom - value) < 0.03;
    return (
      <Pressable
        key={label}
        onPress={() => setZoom(value)}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={t('receipt.scan.zoomTo', { level: label, defaultValue: 'Zoom {{level}}' })}
        style={{ width: 48, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? CAMERA.onCamera : CAMERA.pill }}
      >
        <Text fontSize={14} fontWeight="800" color={active ? CAMERA.black : CAMERA.onCamera}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <GestureDetector gesture={pinch}>
        <View style={styles.fill}>
          <CameraView
            ref={cameraRef}
            style={styles.fill}
            facing="back"
            zoom={zoom}
            enableTorch={torch}
            onCameraReady={() => setReady(true)}
          />

          {/* receipt-shaped frame */}
          <View style={styles.frameLayer} pointerEvents="none">
            {/* the frame breathes gently while the camera waits for the shot (still with Reduce Motion) */}
            <Pulse active={ready && !capturing} style={styles.frame}>
              {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
                <View key={c} style={[styles.bracket, styles[c]]} />
              ))}
            </Pulse>
          </View>

          {/* top bar */}
          <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
            <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel={t('common.back', 'Back')} style={styles.roundBtn}>
              <AppIcon name="chevronLeft" size={24} color={CAMERA.onCamera} />
            </Pressable>
            {isNative && (
              <Pressable
                onPress={() => setTorch((v) => !v)}
                accessibilityRole="switch"
                accessibilityState={{ checked: torch }}
                accessibilityLabel={torch ? t('receipt.scan.lightOn', 'Light on') : t('receipt.scan.lightOff', 'Light off')}
                // icon only: the bolt (filled = on, slashed = off); the state is in the label and the switch state
                style={[styles.roundBtn, torch && { backgroundColor: CAMERA.onCamera }]}
              >
                {torch ? <AppIcon name="flash" size={22} color={CAMERA.black} /> : <AppIcon name="flashOff" size={22} color={CAMERA.onCamera} />}
              </Pressable>
            )}
          </View>

          {/* hint */}
          <View style={[styles.hintWrap, { top: insets.top + 72 }]} pointerEvents="none">
            <View style={styles.hint}>
              <Text fontSize={14} fontWeight="600" color={CAMERA.onCamera} ta="center">
                {t('receipt.scan.hint', 'Fit the whole receipt in the frame, good light')}
              </Text>
            </View>
          </View>

          {!!error && (
            <View style={[styles.hintWrap, { bottom: insets.bottom + 190 }]} pointerEvents="none">
              <View style={[styles.hint, { backgroundColor: CAMERA.warnBg }]}>
                <Text fontSize={14} fontWeight="600" color={CAMERA.warn} ta="center" accessibilityRole="alert">
                  {error}
                </Text>
              </View>
            </View>
          )}

          {/* bottom controls */}
          <View style={[styles.bottom, { paddingBottom: insets.bottom + 20 }]}>
            {isNative && <View style={styles.zoomRow}>{[zoomPill('1×', 0), zoomPill('2×', ZOOM_2X)]}</View>}
            <View style={styles.controls}>
              <Pressable onPress={onGallery} accessibilityRole="button" accessibilityLabel={t('receipt.scan.gallery', 'Choose from gallery')} style={styles.roundBtn}>
                <AppIcon name="photo" size={24} color={CAMERA.onCamera} />
              </Pressable>
              {/* shutter: presses in (spring) and stays slightly smaller while the photo is taken */}
              <PressableScale
                onPress={shoot}
                scaleTo={0.88}
                disabled={capturing || !ready}
                accessibilityRole="button"
                accessibilityLabel={t('receipt.scan.shutter', 'Take photo')}
                accessibilityState={{ disabled: capturing || !ready, busy: capturing }}
                style={[styles.shutterOuter, !ready && { opacity: 0.5 }]}
              >
                <View style={[styles.shutterInner, capturing && { transform: [{ scale: 0.82 }], opacity: 0.8 }]} />
              </PressableScale>
              <View style={{ width: 48 }} />
            </View>
          </View>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const FRAME_W = '82%';
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CAMERA.black },
  fill: { flex: 1 },
  frameLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  frame: { width: FRAME_W, aspectRatio: 0.62, borderRadius: 14, borderWidth: 1, borderColor: CAMERA.onCameraBorder },
  bracket: { position: 'absolute', width: 28, height: 28, borderColor: CAMERA.onCamera },
  tl: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 14 },
  tr: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 14 },
  bl: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 14 },
  br: { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 14 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 },
  roundBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: CAMERA.pill, alignItems: 'center', justifyContent: 'center' },
  hintWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: 24 },
  hint: { backgroundColor: CAMERA.pill, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', gap: 16 },
  zoomRow: { flexDirection: 'row', gap: 10 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 32 },
  shutterOuter: { width: 82, height: 82, borderRadius: 41, borderWidth: 4, borderColor: CAMERA.onCamera, alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: CAMERA.onCamera },
});
