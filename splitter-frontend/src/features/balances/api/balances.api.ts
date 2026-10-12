import { z } from 'zod';
import { apiClient } from '@/features/auth/api';

const ZMoney = z.object({ currency: z.string(), amount: z.number() });
export type Money = z.infer<typeof ZMoney>;

const ZBalances = z.object({
  owedToMe: z.array(ZMoney),
  iOwe: z.array(ZMoney),
  people: z.array(
    z.object({
      uniqueId: z.string(),
      username: z.string(),
      avatarUrl: z.string().nullish(),
      owedToMe: z.array(ZMoney),
      iOwe: z.array(ZMoney),
      receipts: z.array(
        z.object({
          sessionId: z.number(),
          sessionName: z.string().nullish(),
          finalizedAt: z.string(),
          currency: z.string(),
          amount: z.number(),
          direction: z.enum(['owedToMe', 'iOwe']),
        })
      ),
    })
  ),
});
export type Balances = z.infer<typeof ZBalances>;

const ZPayments = z.object({ sessionId: z.number(), payments: z.record(z.string(), z.string().nullable()), settled: z.boolean() });

export const BalancesApi = {
  async get(): Promise<Balances> {
    const { data } = await apiClient.get('/balances');
    return ZBalances.parse(data);
  },
  /** creator: anyone's share; participant: only their own */
  async setPaid(sessionId: number, uniqueId: string, paid: boolean) {
    const { data } = await apiClient.post(`/sessions/${sessionId}/payments`, { uniqueId, paid });
    return ZPayments.parse(data);
  },
};
