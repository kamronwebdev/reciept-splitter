import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { XStack } from 'tamagui';
import { Text } from '@/shared/ui/typography';
import { haptic } from '@/shared/lib/haptics';
import AppIcon from '@/shared/ui/AppIcon';

type ToastKind = 'success' | 'error' | 'info';
type ToastState = { message: string | null; kind: ToastKind; id: number; show: (kind: ToastKind, message: string) => void; hide: () => void };

const useToastStore = create<ToastState>((set) => ({
  message: null,
  kind: 'info',
  id: 0,
  show: (kind, message) => set((s) => ({ kind, message, id: s.id + 1 })),
  hide: () => set({ message: null }),
}));

/** Short confirmation/error at the top of the screen. Errors stay a bit longer. */
export const toast = {
  success: (message: string) => {
    haptic.success();
    useToastStore.getState().show('success', message);
  },
  error: (message: string) => {
    haptic.error();
    useToastStore.getState().show('error', message);
  },
  info: (message: string) => useToastStore.getState().show('info', message),
};

const ICON = { success: 'checkCircle', error: 'error', info: 'info' } as const;
const ICON_COLOR = { success: '$success', error: '$danger', info: '$primaryText' } as const;

/** Rendered once at the root (AppProviders). */
export function ToastHost() {
  const { message, kind, id, hide } = useToastStore();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(hide, kind === 'error' ? 5000 : 2800);
    return () => clearTimeout(t);
  }, [message, kind, id, hide]);
  if (!message) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16, zIndex: 2000, alignItems: 'center' }}>
      <Pressable onPress={hide} accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ maxWidth: 480, width: '100%' }}>
        <XStack
          backgroundColor="$surface"
          borderRadius={14}
          px="$3.5"
          py="$3"
          gap="$2.5"
          ai="center"
          borderWidth={1}
          borderColor="$borderColor"
          shadowColor="$shadowColor"
          shadowOpacity={0.18}
          shadowRadius={14}
          shadowOffset={{ width: 0, height: 4 }}
          elevation={6}
        >
          <AppIcon name={ICON[kind]} size={20} color={ICON_COLOR[kind]} />
          <Text variant="subheadline" f={1} fontWeight="600">
            {message}
          </Text>
        </XStack>
      </Pressable>
    </View>
  );
}
