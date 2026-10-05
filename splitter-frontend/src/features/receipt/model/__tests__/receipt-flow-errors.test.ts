jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined), removeItem: jest.fn(async () => undefined) },
}));
jest.mock('../../api/receipt.api', () => ({ ReceiptApi: { checkSession: jest.fn(), finalize: jest.fn() } }));

import { ApiError } from '@/features/auth/api';
import { isStaleSession, receiptErrorCode, unassignedItemIds } from '../receipt-errors';
import { useReceiptSessionStore } from '../receipt-session.store';
import { ReceiptApi } from '../../api/receipt.api';

const checkSession = ReceiptApi.checkSession as jest.Mock;
const finalize = ReceiptApi.finalize as jest.Mock;

describe('finalize error mapping', () => {
  it('maps backend codes to specific errors', () => {
    expect(receiptErrorCode(new ApiError('x', 404, 'SESSION_NOT_FOUND'))).toBe('SESSION_NOT_FOUND');
    expect(receiptErrorCode(new ApiError('x', 403, 'SESSION_FORBIDDEN'))).toBe('SESSION_FORBIDDEN');
    expect(receiptErrorCode(new ApiError('x', 400, 'ITEM_NOT_ASSIGNED', { itemIds: ['a'] }))).toBe('ITEM_NOT_ASSIGNED');
    expect(receiptErrorCode(new ApiError('offline'))).toBe('NETWORK');
    expect(receiptErrorCode(new ApiError('boom', 500, 'SERVER_ERROR'))).toBe('SERVER_ERROR');
    expect(receiptErrorCode(new Error('weird'))).toBe('UNKNOWN');
  });

  it('knows stale sessions and unassigned item ids', () => {
    expect(isStaleSession(new ApiError('x', 404, 'SESSION_NOT_FOUND'))).toBe(true);
    expect(isStaleSession(new ApiError('x', 500, 'SERVER_ERROR'))).toBe(false);
    expect(unassignedItemIds(new ApiError('x', 400, 'ITEM_NOT_ASSIGNED', { itemIds: ['i2', 3] }))).toEqual(['i2', '3']);
    expect(unassignedItemIds(new Error('x'))).toEqual([]);
  });
});

describe('persisted draft validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useReceiptSessionStore.setState({ active: true, sessionId: 42, items: [], participants: [], finalized: undefined });
  });

  it('resets a draft whose session no longer exists or belongs to someone else', async () => {
    checkSession.mockRejectedValueOnce(new ApiError('nf', 404, 'SESSION_NOT_FOUND'));
    await useReceiptSessionStore.getState().validateDraft();
    expect(useReceiptSessionStore.getState().active).toBe(false);
    expect(useReceiptSessionStore.getState().sessionId).toBeUndefined();

    useReceiptSessionStore.setState({ active: true, sessionId: 7 });
    checkSession.mockRejectedValueOnce(new ApiError('no', 403, 'SESSION_FORBIDDEN'));
    await useReceiptSessionStore.getState().validateDraft();
    expect(useReceiptSessionStore.getState().active).toBe(false);
  });

  it('keeps the draft when offline, on server errors and when the session is fine', async () => {
    checkSession.mockRejectedValueOnce(new ApiError('offline'));
    await useReceiptSessionStore.getState().validateDraft();
    checkSession.mockRejectedValueOnce(new ApiError('boom', 500, 'SERVER_ERROR'));
    await useReceiptSessionStore.getState().validateDraft();
    checkSession.mockResolvedValueOnce(undefined);
    await useReceiptSessionStore.getState().validateDraft();
    expect(useReceiptSessionStore.getState().active).toBe(true);
    expect(useReceiptSessionStore.getState().sessionId).toBe(42);
  });

  it('sends the payload the backend expects (unitPrice/totalPrice/kind/participant ids/sessionId)', async () => {
    finalize.mockResolvedValueOnce({ sessionId: 42 });
    useReceiptSessionStore.setState({
      sessionName: 'Dinner',
      currency: 'UZS',
      feeMode: 'proportional',
      participants: [{ uniqueId: 'ME1', username: 'Me' }, { uniqueId: 'F2', username: 'Fr' }],
      items: [
        { id: 'a', name: 'Osh', kind: 'item', quantity: 2, unitPrice: 25000, totalPrice: 50000, splitMode: 'count', assignedTo: [], perPersonCount: { ME1: 1, F2: 1 } },
        { id: 'b', name: 'Service', kind: 'fee', quantity: 1, unitPrice: 5000, totalPrice: 5000, splitMode: 'equal', assignedTo: [], perPersonCount: {} },
      ] as any,
    });
    await useReceiptSessionStore.getState().finalize();
    const sent = finalize.mock.calls[0][0];
    expect(sent).toMatchObject({ sessionId: 42, currency: 'UZS', feeMode: 'proportional' });
    expect(sent.participants.map((p: any) => p.uniqueId)).toEqual(['ME1', 'F2']);
    expect(sent.items[0]).toEqual({ id: 'a', name: 'Osh', kind: 'item', quantity: 2, unitPrice: 25000, totalPrice: 50000, splitMode: 'count', assignedTo: [], perPersonCount: { ME1: 1, F2: 1 } });
    expect(sent.items[1].kind).toBe('fee');
  });
});
