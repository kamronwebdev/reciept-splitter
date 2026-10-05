import { Alert } from 'react-native';
import type { useRouter } from 'expo-router';
import type { TFunction } from 'i18next';
import { useAppStore } from '@/shared/lib/stores/app-store';

/**
 * "Log out?" confirmation. Logging out is local (token + user + user-specific stores + query cache),
 * so it works even without a network connection. Afterwards the whole stack is replaced by the
 * Welcome screen, so the back button can never return to the tabs.
 */
export function confirmLogout(t: TFunction, router: ReturnType<typeof useRouter>) {
  Alert.alert(
    t('auth.logout.title', 'Log out?'),
    t('auth.logout.message', 'You will need to sign in again to use the app.'),
    [
      { text: t('common.cancel', 'Cancel'), style: 'cancel' },
      {
        text: t('auth.logout.confirm', 'Log out'),
        style: 'destructive',
        onPress: async () => {
          await useAppStore.getState().logout();
          try {
            if (router.canDismiss()) router.dismissAll();
          } catch {
            // no stack to dismiss
          }
          router.replace('/');
        },
      },
    ]
  );
}
