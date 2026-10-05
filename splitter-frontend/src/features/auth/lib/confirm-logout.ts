import type { useRouter } from 'expo-router';
import type { TFunction } from 'i18next';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { confirmAction } from '@/shared/lib/utils/confirm';

/**
 * "Log out?" confirmation. Logging out is local (token + user + user-specific stores + query cache),
 * so it works even without a network connection. Afterwards the whole stack is replaced by the
 * Welcome screen, so the back button can never return to the tabs.
 */
export function confirmLogout(t: TFunction, router: ReturnType<typeof useRouter>) {
  confirmAction({
    title: t('auth.logout.title', 'Log out?'),
    message: t('auth.logout.message', 'You will need to sign in again to use the app.'),
    confirmText: t('auth.logout.confirm', 'Log out'),
    cancelText: t('common.cancel', 'Cancel'),
    destructive: true,
    onConfirm: async () => {
      await useAppStore.getState().logout();
      try {
        if (router.canDismiss()) router.dismissAll();
      } catch {
        // no stack to dismiss
      }
      router.replace('/');
    },
  });
}
