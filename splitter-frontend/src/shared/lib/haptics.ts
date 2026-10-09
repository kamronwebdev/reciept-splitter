import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/** Light haptic feedback for main actions (no-op on web). Never throws. */
const native = Platform.OS !== 'web';
export const haptic = {
  tap: () => native && void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined),
  press: () => native && void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined),
  select: () => native && void Haptics.selectionAsync().catch(() => undefined),
  success: () => native && void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined),
  warning: () => native && void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined),
  error: () => native && void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined),
};
