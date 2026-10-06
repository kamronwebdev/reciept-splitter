import { create } from 'zustand';

import {
  SessionsHistoryApi,
  SessionHistoryEntry,
  SessionHistoryEntryRaw,
  SessionHistoryResponseRaw,
  SessionHistoryPayload,
} from '@/features/sessions/api/history.api';

type State = {
  sessions: SessionHistoryEntry[];
  count: number;
  limit?: number;
  loading: boolean;
  initialized: boolean;
  error?: string;
  lastFetchedAt?: number | null; // <= когда последний раз успешно загрузили
  lastErrorAt?: number | null; // <= когда последний раз загрузка упала (для паузы перед повтором)
};

type Actions = {
  fetchHistory: (limit?: number, all?: boolean) => Promise<SessionHistoryResponseRaw | undefined>;
  /** Принудительное обновление, игнорируя давность */
  forceRefresh: (limit?: number, all?: boolean) => Promise<SessionHistoryResponseRaw | undefined>;
  /**
   * Loads only when needed: never loaded, older than maxAgeMs, or a bigger page is wanted and the last
   * page was full. An EMPTY result is a valid fresh result and never triggers a refetch by itself;
   * after an error nothing is retried for HISTORY_ERROR_BACKOFF_MS.
   */
  refreshIfStale: (maxAgeMs?: number, limit?: number, all?: boolean) => Promise<void>;
  getSession: (sessionId: string | number) => SessionHistoryEntry | undefined;
  clearError: () => void;
  /** local update after marking a share paid / unpaid */
  setPayments: (sessionId: number, payments: Record<string, string | null>, settled: boolean) => void;
  reset: () => void;
};

const initialState: State = {
  sessions: [],
  count: 0,
  limit: undefined,
  loading: false,
  initialized: false,
  error: undefined,
  lastFetchedAt: null,
  lastErrorAt: null,
};

/** After a failed load nothing retries automatically for this long (pull-to-refresh still works). */
export const HISTORY_ERROR_BACKOFF_MS = 30_000;
/** Default freshness window for refreshIfStale. */
export const HISTORY_MAX_AGE_MS = 30_000;

const normalizeEntry = (raw: SessionHistoryEntryRaw): SessionHistoryEntry => {
  const p: SessionHistoryPayload | undefined = raw.payload;

  const participants =
    p?.totals?.byParticipant?.map(bp => ({
      uniqueId: bp.uniqueId,
      username: bp.username,
      avatarUrl: bp.avatarUrl ?? null,
    })) ?? [];

  const finalizedAt = raw.finalizedAt || p?.finalizedAt;
  const createdAt = p?.createdAt;

  const grandTotal =
    typeof raw.grandTotal === 'number' ? raw.grandTotal : p?.totals?.grandTotal ?? 0;

  return {
    sessionId: raw.sessionId ?? p?.sessionId ?? 0,
    sessionName: raw.sessionName || p?.sessionName || 'Bill',
    finalizedAt,
    createdAt,
    grandTotal,
    currency: raw.currency ?? p?.currency ?? p?.totals?.currency ?? 'UZS',
    participantUniqueIds: raw.participantUniqueIds ?? [],
    totals: p?.totals,
    allocations: p?.allocations ?? [],
    participants,
    isCreator: raw.isCreator,
    payload: p!,
    payments: raw.payments ?? {},
    settled: raw.settled ?? false,
    creatorUniqueId: raw.creatorUniqueId ?? null,
  };
};

export const useSessionsHistoryStore = create<State & Actions>((set, get) => ({
  ...initialState,

  setPayments(sessionId, payments, settled) {
    set((s) => ({ sessions: s.sessions.map((e) => (e.sessionId === sessionId ? { ...e, payments, settled } : e)) }));
  },

  async fetchHistory(requestedLimit, all = false) {
    const { loading } = get();

    if (loading) return undefined; // a request is already in flight

    set({ loading: true, error: undefined });

    try {
      const response = await SessionsHistoryApi.listLatest({
        limit: requestedLimit,
        all,
      });

      const normalized = (response.entries ?? []).map(normalizeEntry);

      set({
        sessions: normalized,
        count: response.count ?? 0,
        limit: response.limit,
        initialized: true,
        loading: false,
        lastFetchedAt: Date.now(),
        lastErrorAt: null,
      });

      return response;
    } catch (error: any) {
      const errorMessage =
        error?.message === 'Request cancelled'
          ? 'Request was cancelled'
          : error?.message ?? 'Failed to load sessions history';

      set({
        error: errorMessage,
        initialized: true,
        loading: false,
        lastErrorAt: Date.now(),
      });

      return undefined;
    }
  },

  async forceRefresh(limit, all = false) {
    // просто делегируем в fetchHistory (можно было бы игнорировать loading, но у нас уже защита есть)
    return get().fetchHistory(limit, all);
  },

  async refreshIfStale(maxAgeMs = HISTORY_MAX_AGE_MS, limit, all = false) {
    const { loading, lastFetchedAt, lastErrorAt, limit: haveLimit, sessions } = get();
    if (loading) return;

    // Failed recently: do not hammer the server (and never loop).
    if (lastErrorAt && Date.now() - lastErrorAt < HISTORY_ERROR_BACKOFF_MS) return;

    // Never loaded successfully.
    if (!lastFetchedAt) {
      await get().fetchHistory(limit, all);
      return;
    }

    // A bigger page was requested and the last page was full, so there may be more rows.
    // (An empty or short list means the server has nothing more: that is NOT a reason to refetch.)
    if (!all && limit && haveLimit != null && limit > haveLimit && sessions.length >= haveLimit) {
      await get().fetchHistory(limit, all);
      return;
    }

    // Stale by age.
    if (Date.now() - lastFetchedAt > maxAgeMs) {
      await get().fetchHistory(limit, all);
    }
  },

  getSession(sessionId) {
    const idNumber = typeof sessionId === 'number' ? sessionId : Number(sessionId);
    if (Number.isNaN(idNumber)) return undefined;
    return get().sessions.find(session => session.sessionId === idNumber);
  },

  clearError() {
    set({ error: undefined });
  },

  reset() {
    set(initialState);
  },
}));
