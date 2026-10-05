// src/features/friends/model/friends.store.ts
import { create } from 'zustand';
import { FriendsApi } from '../api/friends.api';

type State = {
  friends: any[];
  requestsRaw: any | null;
  loading: boolean;
  error?: string;
  lastFetchedAt?: number | null;
  lastErrorAt?: number | null;
};

type Actions = {
  fetchAll: () => Promise<void>;
  /** Loads only when never loaded or older than maxAgeMs (and not right after a failure). */
  fetchIfStale: (maxAgeMs?: number) => Promise<void>;
  search: (q: string) => Promise<any[]>;
  send: (uniqueId: string) => Promise<void>;
  remove: (uniqueId: string) => Promise<void>; // <-- меняем тип
};

export const useFriendsStore = create<State & Actions>((set, get) => ({
  friends: [],
  requestsRaw: null,
  loading: false,
  lastFetchedAt: null,
  lastErrorAt: null,

  async fetchIfStale(maxAgeMs = 15_000) {
    const { loading, lastFetchedAt, lastErrorAt } = get();
    if (loading) return;
    if (lastErrorAt && Date.now() - lastErrorAt < 30_000) return;
    if (!lastFetchedAt || Date.now() - lastFetchedAt > maxAgeMs) await get().fetchAll();
  },

  async fetchAll() {
    set({ loading: true, error: undefined });
    try {
      const [friendsRaw, requestsRaw] = await Promise.all([
        FriendsApi.list(),
        FriendsApi.requests(),
      ]);
      const normalizedFriends = friendsRaw.map((item: any) => {
        const raw = item.raw ?? item;
        const rawUser = raw.user ?? raw;
        const avatarUrl = item.avatarUrl ?? raw.avatarUrl ?? rawUser?.avatarUrl ?? null;
        const uniqueId = item.uniqueId ?? raw.uniqueId ?? rawUser?.uniqueId;
        const username = item.username ?? raw.username ?? rawUser?.username;

        return {
          ...raw,
          user: { ...rawUser, avatarUrl, uniqueId, username },
          avatarUrl,
          uniqueId,
          username,
          since: item.since ?? null,
          raw,
        };
      });

      set({ friends: normalizedFriends, requestsRaw, lastFetchedAt: Date.now(), lastErrorAt: null });
    } catch (e: any) {
      set({ error: e?.message || 'Failed to load', lastErrorAt: Date.now() });
    } finally {
      set({ loading: false });
    }
  },

  async search(q) {
    return FriendsApi.search(q);
  },

  async send(uniqueId) {
    await FriendsApi.sendRequest(uniqueId);
    await get().fetchAll();
  },

  async remove(uniqueId) {
    await FriendsApi.remove(uniqueId); // <-- передаем строку
    await get().fetchAll(); // обновляем список после удаления
  },
}));
