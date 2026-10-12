import { Alert, Platform } from 'react-native';

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmText: string;
  cancelText: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
};

/**
 * Confirmation dialog that works everywhere. React Native's Alert.alert is a silent no-op on web,
 * so web uses window.confirm; iOS/Android use the native alert with a destructive button style.
 */
export function confirmAction({ title, message, confirmText, cancelText, destructive, onConfirm }: ConfirmOptions) {
  if (Platform.OS === 'web') {
    const ok = typeof window !== 'undefined' && window.confirm(message ? `${title}\n\n${message}` : title);
    if (ok) void onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: cancelText, style: 'cancel' },
    { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: () => void onConfirm() },
  ]);
}
