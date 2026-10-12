import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_EMAIL_KEY = 'last_login_email';

/** Remember only the e-mail (never the password) for the next login. */
export async function loadLastEmail(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(LAST_EMAIL_KEY)) ?? '';
  } catch {
    return '';
  }
}

export async function saveLastEmail(email: string): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_EMAIL_KEY, email);
  } catch {
    // non-critical
  }
}

interface AuthDraftState {
  /** e-mail typed on any auth screen; shared between Login / Register / Forgot password */
  email: string;
  /** single-use token obtained after the reset code was verified (memory only) */
  resetToken: string | null;
  setEmail: (email: string) => void;
  setResetToken: (token: string | null) => void;
  clearReset: () => void;
}

export const useAuthDraft = create<AuthDraftState>((set) => ({
  email: '',
  resetToken: null,
  setEmail: (email) => set({ email }),
  setResetToken: (resetToken) => set({ resetToken }),
  clearReset: () => set({ resetToken: null }),
}));
