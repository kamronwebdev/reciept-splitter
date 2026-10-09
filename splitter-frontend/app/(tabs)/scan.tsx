// app/(tabs)/scan.tsx — the center "Scan" tab. It is an action, not a place: selecting it switches back to
// the previous tab and opens the full-screen receipt scanner on top (the system tab bar on iOS cannot
// cancel a tab press, so this screen does it; the JS tab bar intercepts the press before getting here).
import { useCallback } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAppTheme } from '@/shared/theme/useAppTheme';
import { getLastTab } from '@/shared/lib/navigation/last-tab';
import { useReceiptLauncher } from '@/features/receipt/model/launcher';

export default function ScanTab() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { openScanner } = useReceiptLauncher();
  useFocusEffect(
    useCallback(() => {
      router.navigate(getLastTab());
      openScanner();
    }, [router, openScanner])
  );
  return <View style={{ flex: 1, backgroundColor: colors.groupedBackground }} />;
}
