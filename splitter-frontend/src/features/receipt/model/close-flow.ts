import { useCallback } from 'react';
import { useNavigation, useRouter } from 'expo-router';

/** Leaves the full-screen receipt flow and returns to the tab the user came from. */
export function useCloseReceiptFlow() {
  const router = useRouter();
  const navigation = useNavigation();
  return useCallback(() => {
    // the flow's own stack -> its parent (root stack) pops the whole modal
    const parent = navigation.getParent();
    if (parent?.canGoBack()) parent.goBack();
    else router.replace('/home');
  }, [navigation, router]);
}
