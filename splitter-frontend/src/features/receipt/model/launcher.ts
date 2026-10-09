import { useCallback, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ReceiptApi } from '../api/receipt.api';
import { defaultSessionName, useReceiptSessionStore, type ReceiptStep } from './receipt-session.store';
import { receiptErrorMessage } from './receipt-errors';
import { toast } from '@/shared/ui/Toast';

const STEP_PATHS: Record<Exclude<ReceiptStep, 'scan'>, '/receipt/review' | '/receipt/people' | '/receipt/split' | '/receipt/summary'> = {
  items: '/receipt/review',
  people: '/receipt/people',
  split: '/receipt/split',
  summary: '/receipt/summary',
};
const ORDER: Exclude<ReceiptStep, 'scan'>[] = ['items', 'people', 'split', 'summary'];

/**
 * Starting a receipt from anywhere (Scan tab, Home, a group): opens the full-screen receipt flow, and
 * offers to continue an unfinished receipt saved on the phone.
 */
export function useReceiptLauncher() {
  const router = useRouter();
  const { t } = useTranslation();
  const [manualBusy, setManualBusy] = useState(false);

  const resume = useCallback(() => {
    const step = useReceiptSessionStore.getState().step;
    const upTo = step === 'scan' ? 0 : ORDER.indexOf(step);
    // rebuild the stack so Back walks through the earlier steps
    for (let i = 0; i <= Math.max(0, upTo); i++) router.push(STEP_PATHS[ORDER[i]!]);
  }, [router]);

  const withDraftCheck = useCallback(
    (start: () => void) => {
      const draft = useReceiptSessionStore.getState();
      if (!draft.active || draft.finalized) {
        if (draft.active) draft.reset();
        start();
        return;
      }
      const title = t('receipt.resume.title', 'Continue your receipt?');
      const message = t('receipt.resume.message', 'You have an unfinished receipt.');
      const startNew = () => {
        draft.reset();
        start();
      };
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) resume();
        else startNew();
        return;
      }
      Alert.alert(title, message, [
        { text: t('receipt.resume.continue', 'Continue'), onPress: resume },
        { text: t('receipt.resume.startNew', 'Start new'), style: 'destructive', onPress: startNew },
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
      ]);
    },
    [resume, t]
  );

  const openScanner = useCallback(() => withDraftCheck(() => router.push('/receipt/scan')), [router, withDraftCheck]);

  const enterManually = useCallback(
    () =>
      withDraftCheck(async () => {
        setManualBusy(true);
        try {
          const { id } = await ReceiptApi.createSession();
          useReceiptSessionStore.getState().startManual(id, defaultSessionName());
          router.push('/receipt/review');
        } catch (e) {
          toast.error(receiptErrorMessage(t, e));
        } finally {
          setManualBusy(false);
        }
      }),
    [router, t, withDraftCheck]
  );

  return { openScanner, enterManually, manualBusy };
}
