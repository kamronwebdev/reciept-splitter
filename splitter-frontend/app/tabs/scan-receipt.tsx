import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useIsFocused, useFocusEffect } from 'expo-router';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { DEFAULT_LANGUAGE } from '@/shared/config/languages';
import { ReceiptApi } from '@/features/receipt/api/receipt.api';
import { defaultSessionName, useReceiptSessionStore } from '@/features/receipt/model/receipt-session.store';
import { isPhotoProblem, receiptErrorCode, type ReceiptErrorCode } from '@/features/receipt/model/receipt-errors';
import { getImageSize, prepareReceiptImage, type LocalImage, type PreparedImage } from '@/features/receipt/lib/image';
import CameraStage from '@/features/receipt/ui/scan/CameraStage';
import PreviewStage from '@/features/receipt/ui/scan/PreviewStage';
import ProcessingStage from '@/features/receipt/ui/scan/ProcessingStage';
import MessageStage, { type MessageAction } from '@/shared/ui/MessageScreen';

type Stage =
  | { name: 'camera' }
  | { name: 'preview'; image: LocalImage }
  | { name: 'processing'; image: LocalImage; phase: 'preparing' | 'uploading' | 'reading' }
  | { name: 'error'; image?: LocalImage; code: ReceiptErrorCode };

/** Step 1: scan. camera -> preview (retake / rotate / crop) -> processing (cancellable) -> Review items. */
export default function ScanReceiptScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const isFocused = useIsFocused();
  const language = useAppStore((s) => s.language) || DEFAULT_LANGUAGE;
  const startFromScan = useReceiptSessionStore((s) => s.startFromScan);
  const startManual = useReceiptSessionStore((s) => s.startManual);

  const [perm, requestPerm] = useCameraPermissions();
  const [stage, setStage] = useState<Stage>({ name: 'camera' });
  const [uploadFraction, setUploadFraction] = useState(0);
  const [manualBusy, setManualBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const askedRef = useRef(false);

  // ask for the camera once when the screen opens (no loop: guarded by a ref)
  useEffect(() => {
    if (perm && !perm.granted && perm.canAskAgain && !askedRef.current) {
      askedRef.current = true;
      requestPerm().catch(() => undefined);
    }
  }, [perm, requestPerm]);

  // Tab screens stay mounted: when the user leaves (e.g. on to Review items) cancel anything running and
  // start from the camera next time, instead of showing a stale "processing" or preview state.
  useFocusEffect(
    useCallback(
      () => () => {
        abortRef.current?.abort();
        setStage({ name: 'camera' });
        setUploadFraction(0);
      },
      []
    )
  );

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/tabs');
  }, [router]);

  const pickFromGallery = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, allowsEditing: false });
      if (result.canceled || !result.assets?.length) return;
      const a = result.assets[0]!;
      const size = a.width && a.height ? { width: a.width, height: a.height } : await getImageSize(a.uri);
      setStage({ name: 'preview', image: { uri: a.uri, width: size.width, height: size.height } });
    } catch {
      setStage({ name: 'error', code: 'IMAGE_UNREADABLE' });
    }
  }, []);

  const run = useCallback(
    async (image: LocalImage) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setUploadFraction(0);
      setStage({ name: 'processing', image, phase: 'preparing' });
      let prepared: PreparedImage;
      try {
        prepared = await prepareReceiptImage(image);
      } catch {
        setStage({ name: 'error', image, code: 'IMAGE_UNREADABLE' });
        return;
      }
      if (controller.signal.aborted) return;
      setStage({ name: 'processing', image, phase: 'uploading' });
      try {
        const response = await ReceiptApi.parse(
          { sessionName: defaultSessionName(), language, image: { mimeType: prepared.mimeType, data: prepared.base64 } },
          {
            signal: controller.signal,
            onUploadProgress: (f) => {
              setUploadFraction(f);
              if (f >= 1) setStage((s) => (s.name === 'processing' ? { ...s, phase: 'reading' } : s));
            },
          }
        );
        startFromScan(response, prepared.uri);
        router.replace('/tabs/receipt/review');
      } catch (e) {
        const code = receiptErrorCode(e);
        if (code === 'CANCELLED') {
          setStage({ name: 'preview', image });
          return;
        }
        setStage({ name: 'error', image, code });
      } finally {
        abortRef.current = null;
      }
    },
    [language, router, startFromScan]
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setStage((s) => (s.name === 'processing' ? { name: 'preview', image: s.image } : s));
  }, []);

  const enterManually = useCallback(async () => {
    setManualBusy(true);
    try {
      const { id } = await ReceiptApi.createSession();
      startManual(id, defaultSessionName());
      router.replace('/tabs/receipt/review');
    } catch (e) {
      setStage({ name: 'error', code: receiptErrorCode(e) === 'NETWORK' ? 'NETWORK' : 'SERVER_ERROR' });
    } finally {
      setManualBusy(false);
    }
  }, [router, startManual]);

  // ---------- render ----------
  if (!perm) return null;

  if (stage.name === 'processing') return <ProcessingStage phase={stage.phase} uploadFraction={uploadFraction} onCancel={cancel} />;

  if (stage.name === 'preview') {
    return (
      <PreviewStage
        image={stage.image}
        onChange={(image) => setStage({ name: 'preview', image })}
        onRetake={() => setStage({ name: 'camera' })}
        onUse={() => void run(stage.image)}
      />
    );
  }

  if (stage.name === 'error') {
    const code = stage.code;
    const image = stage.image;
    const actions: MessageAction[] = [];
    if (image && (code === 'NETWORK' || code === 'SERVER_ERROR' || code === 'PARSE_FAILED' || code === 'RATE_LIMITED')) {
      actions.push({ title: t('receipt.scan.tryAgain', 'Try again'), onPress: () => void run(image), variant: 'primary' });
    }
    if (isPhotoProblem(code) || code === 'UNKNOWN') {
      actions.push({ title: t('receipt.scan.retake', 'Retake'), onPress: () => setStage({ name: 'camera' }), variant: actions.length ? 'outline' : 'primary' });
    }
    actions.push({ title: t('receipt.scan.chooseAnother', 'Choose another photo'), onPress: () => void pickFromGallery(), variant: 'outline' });
    actions.push({ title: t('receipt.scan.manual', 'Enter items manually'), onPress: () => void enterManually(), variant: code === 'GEMINI_NOT_CONFIGURED' ? 'primary' : 'outline', loading: manualBusy });
    return <MessageStage kind="error" title={t(`receipt.errorTitles.${code}`, t('receipt.errorTitles.UNKNOWN'))} message={t(`receipt.errors.${code}`, t('receipt.errors.UNKNOWN'))} actions={actions} />;
  }

  // camera stage
  if (!perm.granted) {
    const actions: MessageAction[] = [];
    if (perm.canAskAgain) actions.push({ title: t('receipt.scan.allowCamera', 'Allow camera access'), onPress: () => void requestPerm(), variant: 'primary' });
    else if (Platform.OS !== 'web') actions.push({ title: t('profile.avatar.openSettings', 'Open Settings'), onPress: () => void Linking.openSettings().catch(() => undefined), variant: 'primary' });
    actions.push({ title: t('receipt.scan.chooseFromGallery', 'Choose from gallery'), onPress: () => void pickFromGallery(), variant: 'outline' });
    actions.push({ title: t('receipt.scan.manual', 'Enter items manually'), onPress: () => void enterManually(), variant: 'outline', loading: manualBusy });
    actions.push({ title: t('common.back', 'Back'), onPress: goBack, variant: 'secondary' });
    return (
      <MessageStage
        kind="permission"
        title={t('receipt.scan.permissionTitle', 'Camera access is needed')}
        message={t('receipt.scan.permissionBody', 'The camera is only used to photograph your receipt so the items can be read. You can also pick a photo from the gallery or type the items yourself.')}
        actions={actions}
      />
    );
  }

  return isFocused ? <CameraStage onCaptured={(img) => setStage({ name: 'preview', image: img })} onGallery={() => void pickFromGallery()} onBack={goBack} /> : null;
}
