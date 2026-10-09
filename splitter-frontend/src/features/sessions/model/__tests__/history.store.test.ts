const mockListLatest = jest.fn();
jest.mock('@/features/sessions/api/history.api', () => ({
  SessionsHistoryApi: { listLatest: (...a: unknown[]) => mockListLatest(...a) },
}));

import { useSessionsHistoryStore, HISTORY_ERROR_BACKOFF_MS, HISTORY_MAX_AGE_MS } from '../history.store';

const empty = (limit = 5) => ({ entries: [], count: 0, limit });
const entries = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ sessionId: i + 1, sessionName: `Bill ${i}`, grandTotal: 1, participantUniqueIds: [] }));

let now = 1_000_000;
beforeEach(() => {
  mockListLatest.mockReset();
  useSessionsHistoryStore.getState().reset();
  jest.spyOn(Date, 'now').mockImplementation(() => now);
});
afterEach(() => jest.restoreAllMocks());

describe('refreshIfStale', () => {
  it('an EMPTY history is a fresh result: repeated calls fetch only once', async () => {
    mockListLatest.mockResolvedValue(empty());
    const { refreshIfStale } = useSessionsHistoryStore.getState();
    for (let i = 0; i < 20; i++) await refreshIfStale(undefined, 5);
    expect(mockListLatest).toHaveBeenCalledTimes(1);
  });

  it('refetches only after the data got stale', async () => {
    mockListLatest.mockResolvedValue(empty());
    const { refreshIfStale } = useSessionsHistoryStore.getState();
    await refreshIfStale(undefined, 5);
    now += HISTORY_MAX_AGE_MS - 1;
    await refreshIfStale(undefined, 5);
    expect(mockListLatest).toHaveBeenCalledTimes(1);
    now += 2;
    await refreshIfStale(undefined, 5);
    expect(mockListLatest).toHaveBeenCalledTimes(2);
  });

  it('does not retry right after an error (no loop), retries after the backoff', async () => {
    mockListLatest.mockRejectedValue(new Error('boom'));
    const { refreshIfStale } = useSessionsHistoryStore.getState();
    for (let i = 0; i < 10; i++) await refreshIfStale(undefined, 5);
    expect(mockListLatest).toHaveBeenCalledTimes(1);
    now += HISTORY_ERROR_BACKOFF_MS + 1;
    await refreshIfStale(undefined, 5);
    expect(mockListLatest).toHaveBeenCalledTimes(2);
  });

  it('a bigger page is fetched only when the last page was full', async () => {
    mockListLatest.mockResolvedValue({ entries: entries(5), count: 5, limit: 5 });
    const { refreshIfStale } = useSessionsHistoryStore.getState();
    await refreshIfStale(undefined, 5);
    await refreshIfStale(undefined, 20); // full page -> there may be more
    expect(mockListLatest).toHaveBeenCalledTimes(2);

    useSessionsHistoryStore.getState().reset();
    mockListLatest.mockReset();
    mockListLatest.mockResolvedValue({ entries: entries(2), count: 2, limit: 5 });
    await useSessionsHistoryStore.getState().refreshIfStale(undefined, 5);
    await useSessionsHistoryStore.getState().refreshIfStale(undefined, 20); // short page -> nothing more
    expect(mockListLatest).toHaveBeenCalledTimes(1);
  });

  it('forceRefresh (pull-to-refresh) always fetches', async () => {
    mockListLatest.mockResolvedValue(empty());
    await useSessionsHistoryStore.getState().refreshIfStale(undefined, 5);
    await useSessionsHistoryStore.getState().forceRefresh(5);
    expect(mockListLatest).toHaveBeenCalledTimes(2);
  });
});
