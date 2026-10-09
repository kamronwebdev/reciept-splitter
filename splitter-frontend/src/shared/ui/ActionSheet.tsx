import React from 'react';
import { ActionSheetIOS, Platform, Pressable } from 'react-native';
import { create } from 'zustand';
import { YStack } from 'tamagui';
import { Text } from '@/shared/ui/typography';
import BottomSheet from '@/shared/ui/BottomSheet';

export type SheetAction = { label: string; onPress: () => void; destructive?: boolean };
type Options = { title?: string; message?: string; actions: SheetAction[]; cancelLabel: string };

const useSheet = create<{ options: Options | null; set: (o: Options | null) => void }>((set) => ({
  options: null,
  set: (options) => set({ options }),
}));

/** Native action sheet on iOS; a themed bottom sheet elsewhere. */
export function showActionSheet(options: Options) {
  if (Platform.OS === 'ios') {
    const labels = [...options.actions.map((a) => a.label), options.cancelLabel];
    const destructive = options.actions.map((a, i) => (a.destructive ? i : -1)).filter((i) => i >= 0);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: labels,
        cancelButtonIndex: labels.length - 1,
        ...(destructive.length ? { destructiveButtonIndex: destructive } : {}),
        ...(options.title ? { title: options.title } : {}),
        ...(options.message ? { message: options.message } : {}),
      },
      (index) => {
        if (index < options.actions.length) options.actions[index]!.onPress();
      }
    );
    return;
  }
  useSheet.getState().set(options);
}

/** Rendered once at the root (AppProviders). */
export function ActionSheetHost() {
  const { options, set } = useSheet();
  const close = () => set(null);
  return (
    <BottomSheet visible={!!options} onClose={close} {...(options?.title ? { label: options.title } : {})}>
      {options && (
        <YStack gap="$2" pb="$1">
          {(!!options.title || !!options.message) && (
            <YStack ai="center" gap="$1" pb="$2">
              {!!options.title && <Text variant="footnote" fontWeight="600" color="$textMuted" ta="center">{options.title}</Text>}
              {!!options.message && <Text variant="footnote" color="$textMuted" ta="center">{options.message}</Text>}
            </YStack>
          )}
          <YStack backgroundColor="$surfaceAlt" borderRadius={14} overflow="hidden">
            {options.actions.map((a, i) => (
              <Pressable
                key={a.label}
                accessibilityRole="button"
                onPress={() => {
                  close();
                  a.onPress();
                }}
              >
                {({ pressed }) => (
                  <YStack minHeight={52} ai="center" jc="center" borderTopWidth={i ? 0.5 : 0} borderColor="$separator" opacity={pressed ? 0.6 : 1}>
                    <Text variant="body" color={a.destructive ? '$danger' : '$primaryText'}>
                      {a.label}
                    </Text>
                  </YStack>
                )}
              </Pressable>
            ))}
          </YStack>
          <Pressable accessibilityRole="button" onPress={close}>
            {({ pressed }) => (
              <YStack minHeight={52} ai="center" jc="center" borderRadius={14} backgroundColor="$surfaceAlt" opacity={pressed ? 0.6 : 1}>
                <Text variant="headline" color="$primaryText">
                  {options.cancelLabel}
                </Text>
              </YStack>
            )}
          </Pressable>
        </YStack>
      )}
    </BottomSheet>
  );
}
