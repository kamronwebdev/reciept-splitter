import { useCallback, useState } from 'react';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { resetAvatar, uploadAvatar } from '@/features/auth/api';
import { buildAvatarFormData, pickAvatar, type PickSource } from './avatar-picker';

export type AvatarOutcome =
  | { kind: 'ok' }
  | { kind: 'cancelled' }
  | { kind: 'denied'; source: PickSource; canAskAgain: boolean }
  | { kind: 'pick-error' }
  | { kind: 'error'; error: unknown };

/**
 * Avatar actions with optimistic UI: the new photo is shown immediately (from the local, already
 * resized file) and rolled back if the upload fails. The store is the single source of truth, so the
 * tabs header and every other place update at once.
 */
export function useAvatar() {
  const [busy, setBusy] = useState(false);

  const change = useCallback(async (source: PickSource): Promise<AvatarOutcome> => {
    const picked = await pickAvatar(source);
    if (picked.status === 'cancelled') return { kind: 'cancelled' };
    if (picked.status === 'denied') return { kind: 'denied', source, canAskAgain: picked.canAskAgain };
    if (picked.status === 'error') return { kind: 'pick-error' };

    const store = useAppStore.getState();
    const current = store.user;
    if (!current) return { kind: 'error', error: new Error('not signed in') };

    const previous = current.avatarUrl;
    store.setUser({ ...current, avatarUrl: picked.uri }); // optimistic
    setBusy(true);
    try {
      const form = await buildAvatarFormData(picked.uri);
      const res = await uploadAvatar(form);
      const latest = useAppStore.getState().user ?? current;
      useAppStore.getState().setUser(res.user ?? { ...latest, avatarUrl: res.avatarUrl });
      return { kind: 'ok' };
    } catch (error) {
      const latest = useAppStore.getState().user;
      if (latest) useAppStore.getState().setUser({ ...latest, avatarUrl: previous }); // roll back
      return { kind: 'error', error };
    } finally {
      setBusy(false);
    }
  }, []);

  const remove = useCallback(async (): Promise<AvatarOutcome> => {
    const store = useAppStore.getState();
    const current = store.user;
    if (!current) return { kind: 'error', error: new Error('not signed in') };

    const previous = current.avatarUrl;
    store.setUser({ ...current, avatarUrl: null }); // optimistic
    setBusy(true);
    try {
      const user = await resetAvatar();
      useAppStore.getState().setUser(user);
      return { kind: 'ok' };
    } catch (error) {
      const latest = useAppStore.getState().user;
      if (latest) useAppStore.getState().setUser({ ...latest, avatarUrl: previous });
      return { kind: 'error', error };
    } finally {
      setBusy(false);
    }
  }, []);

  return { busy, change, remove };
}
