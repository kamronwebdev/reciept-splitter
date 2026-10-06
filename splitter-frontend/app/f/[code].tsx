// app/f/[code].tsx — deep link target: receipt-splitter://f/<code> (and the https landing URL once
// universal links are configured). Opens the scanner's result card for that friend code.
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { normalizeFriendCode, setPendingFriendCode } from '@/shared/lib/utils/invite';

export default function FriendCodeLink() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const token = useAppStore((s) => s.token);
  const normalized = normalizeFriendCode(code);
  if (!normalized) return <Redirect href="/" />;
  if (!token) {
    // signed out: remember it and open the card right after sign-in (see app/tabs/_layout.tsx)
    setPendingFriendCode(normalized);
    return <Redirect href="/" />;
  }
  return <Redirect href={{ pathname: '/tabs/scan-invite', params: { code: normalized } }} />;
}
