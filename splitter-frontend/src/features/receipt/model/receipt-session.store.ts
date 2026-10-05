import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ReceiptApi,
  type FinalizeReceiptResponse,
  type ParseReceiptResponse,
  type ReceiptParticipant,
} from '../api/receipt.api';
import { makeItem, lineTotal, remainingUnits, type DraftItem } from '../lib/draft';
import type { FeeMode } from '../lib/split';

export type ReceiptSource = 'gemini' | 'mock' | 'manual';
export type ReceiptStep = 'scan' | 'items' | 'people' | 'split' | 'summary';

export interface ReceiptDraftState {
  /** a receipt is in progress (drives "discard?" prompts and "continue?" on Home) */
  active: boolean;
  step: ReceiptStep;
  sessionId?: number;
  sessionName: string;
  currency: string;
  source?: ReceiptSource;
  /** local file URI of the photo (never the base64) */
  imageUri?: string;
  receiptGrandTotal: number | null;
  items: DraftItem[];
  participants: ReceiptParticipant[];
  feeMode: FeeMode;
  finalized?: FinalizeReceiptResponse;
}

interface ReceiptActions {
  /** Starts a receipt from a parsed scan. */
  startFromScan: (response: ParseReceiptResponse, imageUri?: string) => void;
  /** Starts an empty receipt for manual entry. */
  startManual: (sessionId: number, sessionName: string, currency?: string) => void;
  setStep: (step: ReceiptStep) => void;
  setSessionName: (name: string) => void;
  setCurrency: (currency: string) => void;
  setReceiptGrandTotal: (value: number | null) => void;
  addItem: (item: Partial<DraftItem> & { name: string }) => void;
  updateItem: (id: string, patch: Partial<DraftItem>) => void;
  removeItem: (id: string) => void;
  setParticipants: (participants: ReceiptParticipant[]) => void;
  setFeeMode: (mode: FeeMode) => void;

  // splitting
  toggleAssignee: (itemId: string, uniqueId: string) => void;
  setSplitMode: (itemId: string, mode: 'equal' | 'count') => void;
  changeCount: (itemId: string, uniqueId: string, delta: number) => void;
  splitAllEqually: () => void;
  clearAssignments: () => void;

  finalize: () => Promise<FinalizeReceiptResponse>;
  reset: () => void;
}

const INITIAL: ReceiptDraftState = {
  active: false,
  step: 'scan',
  sessionId: undefined,
  sessionName: '',
  currency: 'UZS',
  source: undefined,
  imageUri: undefined,
  receiptGrandTotal: null,
  items: [],
  participants: [],
  feeMode: 'proportional',
  finalized: undefined,
};

export function defaultSessionName(now = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export const useReceiptSessionStore = create<ReceiptDraftState & ReceiptActions>()(
  persist(
    (set, get) => ({
      ...INITIAL,

      startFromScan(response, imageUri) {
        const currency = response.summary?.currency || 'UZS';
        set({
          ...INITIAL,
          active: true,
          step: 'items',
          sessionId: response.sessionId,
          sessionName: response.sessionName,
          currency,
          source: response.source,
          imageUri,
          receiptGrandTotal: response.summary?.grandTotal ?? null,
          items: response.items.map((it) =>
            makeItem(
              {
                id: it.id,
                name: it.name,
                kind: it.kind,
                quantity: it.quantity,
                unitPrice: it.unitPrice,
                totalPrice: it.totalPrice,
                splitMode: it.quantity > 1 ? 'count' : 'equal',
              },
              currency
            )
          ),
        });
      },

      startManual(sessionId, sessionName, currency = 'UZS') {
        set({ ...INITIAL, active: true, step: 'items', sessionId, sessionName, currency, source: 'manual' });
      },

      setStep: (step) => set({ step }),
      setSessionName: (sessionName) => set({ sessionName }),
      setReceiptGrandTotal: (receiptGrandTotal) => set({ receiptGrandTotal }),

      setCurrency(currency) {
        // totals are stored in major units: recompute lines whose total came from unit x quantity is not needed,
        // the amounts keep their numeric value and are simply shown in the new currency.
        set({ currency });
      },

      addItem(partial) {
        const currency = get().currency;
        set((s) => ({ items: [...s.items, makeItem({ splitMode: (partial.quantity ?? 1) > 1 ? 'count' : 'equal', ...partial }, currency)] }));
      },

      updateItem(id, patch) {
        const currency = get().currency;
        set((s) => ({
          items: s.items.map((it) => {
            if (it.id !== id) return it;
            const next = { ...it, ...patch };
            // editing quantity / unit price recomputes the line total (unless the total itself was edited)
            if (('quantity' in patch || 'unitPrice' in patch) && !('totalPrice' in patch) && next.kind !== 'discount') {
              next.totalPrice = lineTotal(next.unitPrice, next.quantity, currency);
            }
            if (next.kind === 'discount') {
              next.totalPrice = -Math.abs(next.totalPrice);
              next.unitPrice = next.totalPrice;
            } else if ('totalPrice' in patch && next.quantity > 0 && !('unitPrice' in patch)) {
              next.unitPrice = next.totalPrice / next.quantity;
            }
            // a changed quantity invalidates "by count" distributions
            if ('quantity' in patch && patch.quantity !== it.quantity) {
              next.perPersonCount = {};
              next.splitMode = next.quantity > 1 ? next.splitMode : 'equal';
            }
            return next;
          }),
        }));
      },

      removeItem: (id) => set((s) => ({ items: s.items.filter((it) => it.id !== id) })),

      setParticipants(participants) {
        const ids = new Set(participants.map((p) => p.uniqueId));
        set((s) => ({
          participants,
          // forget assignments of people who are no longer in the split
          items: s.items.map((it) => ({
            ...it,
            assignedTo: it.assignedTo.filter((u) => ids.has(u)),
            perPersonCount: Object.fromEntries(Object.entries(it.perPersonCount).filter(([u]) => ids.has(u))),
          })),
        }));
      },

      setFeeMode: (feeMode) => set({ feeMode }),

      toggleAssignee(itemId, uniqueId) {
        set((s) => ({
          items: s.items.map((it) => {
            if (it.id !== itemId) return it;
            const has = it.assignedTo.includes(uniqueId);
            return { ...it, assignedTo: has ? it.assignedTo.filter((u) => u !== uniqueId) : [...it.assignedTo, uniqueId] };
          }),
        }));
      },

      setSplitMode(itemId, mode) {
        set((s) => ({
          items: s.items.map((it) => (it.id === itemId ? { ...it, splitMode: mode, perPersonCount: mode === 'count' ? it.perPersonCount : {} } : it)),
        }));
      },

      changeCount(itemId, uniqueId, delta) {
        set((s) => ({
          items: s.items.map((it) => {
            if (it.id !== itemId) return it;
            const current = it.perPersonCount[uniqueId] ?? 0;
            const left = remainingUnits(it);
            const next = Math.max(0, current + delta);
            if (delta > 0 && left <= 0) return it; // nothing left to hand out
            const counts = { ...it.perPersonCount };
            if (next === 0) delete counts[uniqueId];
            else counts[uniqueId] = next;
            return { ...it, perPersonCount: counts };
          }),
        }));
      },

      splitAllEqually() {
        const everyone = get().participants.map((p) => p.uniqueId);
        set((s) => ({
          items: s.items.map((it) => (it.kind === 'item' ? { ...it, splitMode: 'equal', assignedTo: everyone, perPersonCount: {} } : it)),
        }));
      },

      clearAssignments() {
        set((s) => ({ items: s.items.map((it) => ({ ...it, assignedTo: [], perPersonCount: {} })) }));
      },

      async finalize() {
        const { sessionId, sessionName, participants, items, currency, feeMode } = get();
        if (!sessionId) throw new Error('No session to finalize');
        const response = await ReceiptApi.finalize({
          sessionId,
          sessionName,
          participants,
          currency,
          feeMode,
          items: items.map((i) => ({
            id: i.id,
            name: i.name,
            kind: i.kind,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            totalPrice: i.totalPrice,
            splitMode: i.splitMode,
            assignedTo: i.assignedTo,
            perPersonCount: i.perPersonCount,
          })),
        });
        set({ finalized: response, step: 'summary' });
        return response;
      },

      reset: () => set({ ...INITIAL }),
    }),
    {
      name: 'receipt-draft',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      // keep everything except functions (zustand does that) — the photo is only a file URI, never base64
      partialize: (s) => ({
        active: s.active,
        step: s.step,
        sessionId: s.sessionId,
        sessionName: s.sessionName,
        currency: s.currency,
        source: s.source,
        imageUri: s.imageUri,
        receiptGrandTotal: s.receiptGrandTotal,
        items: s.items,
        participants: s.participants,
        feeMode: s.feeMode,
        finalized: s.finalized,
      }),
    }
  )
);

/** true once the saved draft was read from storage (so screens don't redirect before it is loaded). */
export function useReceiptHydrated(): boolean {
  const [hydrated, setHydrated] = useState(useReceiptSessionStore.persist.hasHydrated());
  useEffect(() => {
    if (useReceiptSessionStore.persist.hasHydrated()) setHydrated(true);
    return useReceiptSessionStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);
  return hydrated;
}
