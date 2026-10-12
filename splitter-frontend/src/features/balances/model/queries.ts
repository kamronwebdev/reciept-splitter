import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { useSessionsHistoryStore } from '@/features/sessions/model/history.store';
import { BalancesApi } from '../api/balances.api';

export const balanceKeys = { all: ['balances'] as const };

export function useBalances() {
  const token = useAppStore((s) => s.token);
  return useQuery({ queryKey: balanceKeys.all, queryFn: BalancesApi.get, enabled: !!token, staleTime: 30_000 });
}

/** Paid toggle on a receipt: updates the history entry immediately, then refreshes balances. */
export function useSetPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, uniqueId, paid }: { sessionId: number; uniqueId: string; paid: boolean }) => BalancesApi.setPaid(sessionId, uniqueId, paid),
    onSuccess: (res) => {
      useSessionsHistoryStore.getState().setPayments(res.sessionId, res.payments, res.settled);
      void qc.invalidateQueries({ queryKey: balanceKeys.all });
    },
  });
}
