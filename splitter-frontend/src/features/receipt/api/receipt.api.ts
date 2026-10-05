import { apiClient } from '@/features/auth/api';
import type { DraftItem } from '../lib/draft';

export type ReceiptImagePayload = {
  mimeType: string;
  data: string; // base64 without data URI prefix
};

export interface ParseReceiptRequest {
  sessionName: string;
  language: string;
  image: ReceiptImagePayload;
}

export interface ParsedReceiptItem {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  kind: 'item' | 'fee' | 'discount' | 'tax';
}

export interface ReceiptSummary {
  subtotal: number | null;
  tax: number | null;
  serviceFee: number | null;
  discount: number | null;
  grandTotal: number | null;
  currency: string;
}

export interface ParseReceiptResponse {
  sessionId: number;
  sessionName: string;
  language: string;
  items: ParsedReceiptItem[];
  summary: ReceiptSummary;
  totalsMismatch: number | null;
  source: 'gemini' | 'mock';
  isDemo: boolean;
}

export type ReceiptParticipant = {
  uniqueId: string;
  username: string;
  avatarUrl?: string | null;
};

export interface FinalizeReceiptRequest {
  sessionId: number;
  sessionName: string;
  participants: ReceiptParticipant[];
  items: Array<Pick<DraftItem, 'id' | 'name' | 'kind' | 'quantity' | 'unitPrice' | 'totalPrice' | 'splitMode' | 'assignedTo' | 'perPersonCount'>>;
  currency: string;
  feeMode: 'proportional' | 'equal';
}

export interface FinalizeParticipantLine {
  itemId: string;
  name: string;
  kind: string;
  amount: number;
  units?: number;
}

export interface FinalizeTotalsByParticipant {
  uniqueId: string;
  username: string;
  amountOwed: number;
  itemsAmount?: number;
  feesAmount?: number;
  lines?: FinalizeParticipantLine[];
}

export interface FinalizeReceiptResponse {
  sessionId: number;
  sessionName: string | null;
  status: string;
  createdAt: string;
  finalizedAt: string;
  currency: string;
  totals: {
    grandTotal: number;
    currency: string;
    byParticipant: FinalizeTotalsByParticipant[];
    byItem: Array<{ itemId: string; name: string; total: number; kind?: string }>;
  };
}

export const ReceiptApi = {
  /** Reads a receipt photo. `signal` cancels the upload/parse (the Cancel button). */
  async parse(
    payload: ParseReceiptRequest,
    opts: { signal?: AbortSignal; onUploadProgress?: (fraction: number) => void } = {}
  ): Promise<ParseReceiptResponse> {
    const { data } = await apiClient.post<ParseReceiptResponse>('/sessions/scan', payload, {
      timeout: 120_000,
      ...(opts.signal ? { signal: opts.signal } : {}),
      onUploadProgress: (e) => {
        if (e.total) opts.onUploadProgress?.(e.loaded / e.total);
      },
    });
    return data;
  },

  /** Empty session for manual entry ("Enter items manually"). */
  async createSession(): Promise<{ id: number }> {
    const { data } = await apiClient.post<{ id: number }>('/sessions', {});
    return data;
  },

  /** Resolves when the session exists and belongs to the signed-in user; rejects with SESSION_NOT_FOUND / SESSION_FORBIDDEN. */
  async checkSession(id: number): Promise<void> {
    await apiClient.get(`/sessions/${id}`, { timeout: 15_000 });
  },

  async finalize(payload: FinalizeReceiptRequest): Promise<FinalizeReceiptResponse> {
    const { data } = await apiClient.post<FinalizeReceiptResponse>('/sessions/finalize', payload);
    return data;
  },
};
