import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Crop, RotateCw } from '@tamagui/lucide-icons';
import { XStack, YStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/ui/typography';
import { Button } from '@/shared/ui/Button';
import { CAMERA } from '@/shared/theme/palette';
import { cropImage, getImageSize, rotateImage, type LocalImage } from '../../lib/image';
import CropOverlay, { type CropRect } from './CropOverlay';

type Props = {
  image: LocalImage;
  onChange: (img: LocalImage) => void;
  onRetake: () => void;
  onUse: () => void;
};

/** After capture: check the photo, rotate or crop it, then "Use photo" or "Retake". */
export default function PreviewStage({ image, onChange, onRetake, onUse }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [natural, setNatural] = useState({ width: image.width, height: image.height });
  const [cropping, setCropping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rect, setRect] = useState<CropRect>({ x: 0, y: 0, width: 0, height: 0 });

  // real pixel size of the file (EXIF-safe), refreshed when the image changes
  useEffect(() => {
    let alive = true;
    getImageSize(image.uri)
      .then((s) => alive && setNatural(s))
      .catch(() => alive && setNatural({ width: image.width, height: image.height }));
    return () => {
      alive = false;
    };
  }, [image.uri, image.width, image.height]);

  // the image is shown with "contain": its displayed rectangle inside the box
  const fit = (() => {
    if (!box.w || !box.h || !natural.width || !natural.height) return { w: 0, h: 0, ox: 0, oy: 0 };
    const k = Math.min(box.w / natural.width, box.h / natural.height);
    const w = natural.width * k;
    const h = natural.height * k;
    return { w, h, ox: (box.w - w) / 2, oy: (box.h - h) / 2 };
  })();

  const startCrop = () => {
    const mx = fit.w * 0.06;
    const my = fit.h * 0.04;
    setRect({ x: mx, y: my, width: fit.w - 2 * mx, height: fit.h - 2 * my });
    setCropping(true);
  };

  const applyCrop = async () => {
    setBusy(true);
    try {
      const k = natural.width / fit.w;
      const next = await cropImage({ ...image, width: natural.width, height: natural.height }, { x: rect.x * k, y: rect.y * k, width: rect.width * k, height: rect.height * k });
      onChange(next);
      setCropping(false);
    } finally {
      setBusy(false);
    }
  };

  const rotate = async () => {
    setBusy(true);
    try {
      onChange(await rotateImage({ ...image, width: natural.width, height: natural.height }, 90));
    } finally {
      setBusy(false);
    }
  };

  const toolBtn = { minHeight: 48, minWidth: 120, borderRadius: 24, backgroundColor: CAMERA.pill, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 } as const;

  return (
    <View style={{ flex: 1, backgroundColor: CAMERA.black }}>
      <View style={{ flex: 1, marginTop: insets.top + 8 }} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        <Image source={{ uri: image.uri }} style={{ flex: 1 }} resizeMode="contain" accessibilityLabel={t('receipt.scan.previewLabel', 'Receipt photo preview')} />
        {cropping && fit.w > 0 && (
          <View style={{ position: 'absolute', left: fit.ox, top: fit.oy, width: fit.w, height: fit.h }}>
            <CropOverlay width={fit.w} height={fit.h} rect={rect} onChange={setRect} />
          </View>
        )}
        {busy && (
          <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' } as any}>
            <ActivityIndicator color={CAMERA.onCamera} size="large" />
          </View>
        )}
      </View>

      <YStack px="$4" pt="$3" gap="$3" style={{ paddingBottom: Math.max(insets.bottom, 12) + 8 }}>
        {cropping ? (
          <XStack gap="$3">
            <YStack f={1}>
              <Button title={t('common.cancel', 'Cancel')} variant="secondary" size="large" onPress={() => setCropping(false)} disabled={busy} />
            </YStack>
            <YStack f={1}>
              <Button title={t('receipt.scan.applyCrop', 'Apply crop')} variant="primary" size="large" onPress={applyCrop} loading={busy} />
            </YStack>
          </XStack>
        ) : (
          <>
            <XStack jc="center" gap="$3">
              <Pressable onPress={rotate} disabled={busy} accessibilityRole="button" accessibilityLabel={t('receipt.scan.rotate', 'Rotate')} style={toolBtn}>
                <RotateCw size={20} color={CAMERA.onCamera} />
                <Text fontSize={14} fontWeight="700" color={CAMERA.onCamera}>
                  {t('receipt.scan.rotate', 'Rotate')}
                </Text>
              </Pressable>
              <Pressable onPress={startCrop} disabled={busy || !fit.w} accessibilityRole="button" accessibilityLabel={t('receipt.scan.crop', 'Crop')} style={toolBtn}>
                <Crop size={20} color={CAMERA.onCamera} />
                <Text fontSize={14} fontWeight="700" color={CAMERA.onCamera}>
                  {t('receipt.scan.crop', 'Crop')}
                </Text>
              </Pressable>
            </XStack>
            <XStack gap="$3">
              <YStack f={1}>
                <Button title={t('receipt.scan.retake', 'Retake')} variant="secondary" size="large" onPress={onRetake} disabled={busy} />
              </YStack>
              <YStack f={1}>
                <Button title={t('receipt.scan.usePhoto', 'Use photo')} variant="primary" size="large" onPress={onUse} disabled={busy} />
              </YStack>
            </XStack>
          </>
        )}
      </YStack>
    </View>
  );
}
