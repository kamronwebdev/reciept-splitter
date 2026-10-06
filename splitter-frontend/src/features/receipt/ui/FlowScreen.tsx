import React, { useEffect } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';
import { useAppTheme } from '@/shared/theme/useAppTheme';
import StepIndicator from './StepIndicator';
import { useCloseReceiptFlow } from '../model/close-flow';
import { useReceiptHydrated, useReceiptSessionStore, type ReceiptStep } from '../model/receipt-session.store';

type Props = {
  step: ReceiptStep;
  children: React.ReactNode;
  /** sticky bottom area: the ONE main action of the screen (plus optional summary bar above it) */
  footer?: React.ReactNode;
};

/** Shared layout of every receipt step: step indicator, scrollable content, sticky footer, keyboard-safe. */
export default function FlowScreen({ step, children, footer }: Props) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const active = useReceiptSessionStore((s) => s.active);
  const hydrated = useReceiptHydrated();
  // opened without a receipt (deep link, finished and reset): go home instead of showing an empty step
  const close = useCloseReceiptFlow();
  useEffect(() => {
    if (hydrated && !active) close();
  }, [hydrated, active, close]);
  if (hydrated && !active) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 16 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          <StepIndicator current={step} />
          {children}
        </ScrollView>
        {footer ? (
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: colors.border,
              backgroundColor: colors.surface,
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: Math.max(insets.bottom, 12),
            }}
          >
            <YStack gap="$2">{footer}</YStack>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  );
}
