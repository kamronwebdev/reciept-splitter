// app/receipt/_layout.tsx — the receipt flow (Scan → Items → People → Split → Summary) as one full-screen
// modal stack above the tabs: standard back between steps, "Cancel" asks before throwing the receipt away.
import { Pressable } from 'react-native';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/ui/typography';
import { confirmAction } from '@/shared/lib/utils/confirm';
import { useStackOptions } from '@/shared/lib/navigation/stack-options';
import { useReceiptSessionStore } from '@/features/receipt/model/receipt-session.store';
import { useCloseReceiptFlow } from '@/features/receipt/model/close-flow';

function CancelButton() {
  const { t } = useTranslation();
  const close = useCloseReceiptFlow();
  const onPress = () => {
    const draft = useReceiptSessionStore.getState();
    if (!draft.active || draft.finalized) return close();
    confirmAction({
      title: t('receipt.discard.title', 'Discard this receipt?'),
      message: t('receipt.discard.message', 'The items and the split you entered will be lost.'),
      confirmText: t('receipt.discard.confirm', 'Discard'),
      cancelText: t('receipt.discard.keep', 'Keep editing'),
      destructive: true,
      onConfirm: () => {
        draft.reset();
        close();
      },
    });
  };
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 }}>
      <Text variant="body" color="$primaryText">
        {t('common.cancel')}
      </Text>
    </Pressable>
  );
}

export default function ReceiptFlowLayout() {
  const { t } = useTranslation();
  const options = useStackOptions();
  return (
    <Stack screenOptions={{ ...options, headerRight: () => <CancelButton /> }}>
      <Stack.Screen name="scan" options={{ headerShown: false }} />
      <Stack.Screen name="review" options={{ title: t('receipt.titles.items', 'Review items') }} />
      <Stack.Screen name="people" options={{ title: t('receipt.titles.people', 'Who is splitting?') }} />
      <Stack.Screen name="split" options={{ title: t('receipt.titles.split', 'Split items') }} />
      <Stack.Screen name="summary" options={{ title: t('receipt.titles.summary', 'Summary'), headerRight: () => null, headerBackVisible: false, gestureEnabled: false }} />
    </Stack>
  );
}

