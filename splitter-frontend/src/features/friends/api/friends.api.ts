import { apiClient } from '@/features/auth/api'       // единый axios-инстанс проекта
import { z } from 'zod'
import { ZRequestsPayload } from '../model/types'

// Временные «loose»-схемы, пока не зафиксировали точные ответы
const ZUserLoose = z.object({
  id: z.number().optional(),
  userId: z.number().optional(),
  username: z.string().optional(),
  uniqueId: z.string().optional(),
  email: z.string().email().optional(),
  displayName: z.string().optional(),
}).catchall(z.unknown())

const ZFriendLoose = z.object({
  user: ZUserLoose.optional(),
  uniqueId: z.string().optional(),
  username: z.string().optional(),
  // the server sends null when a user has no photo (the app then shows initials)
  avatarUrl: z.string().nullish(),
  since: z.string().nullish(),
}).transform((f) => ({
  uniqueId: f.uniqueId ?? f.user?.uniqueId,
  username: f.username ?? f.user?.username,
  avatarUrl: (f.avatarUrl ?? (f.user?.avatarUrl as string | null | undefined) ?? null) as string | null,
  since: f.since ?? null,
  raw: f,
}));

const ZPublicFriend = z.object({
  uniqueId: z.string(),
  username: z.string(),
  avatarUrl: z.string().nullish().transform((v) => v ?? null),
});
export type PublicFriend = z.infer<typeof ZPublicFriend>;

export const FRIENDSHIP_STATUSES = ['none', 'pending_outgoing', 'pending_incoming', 'friends', 'self'] as const;
export type FriendshipStatus = (typeof FRIENDSHIP_STATUSES)[number];

const ZFriendCard = ZPublicFriend.extend({ friendshipStatus: z.enum(FRIENDSHIP_STATUSES) });
export type FriendCard = z.infer<typeof ZFriendCard>;

const ZMyCode = z.object({ code: z.string(), url: z.string(), deepLink: z.string() });
export type MyFriendCode = z.infer<typeof ZMyCode>;

export const FriendsApi = {
  /** GET /friends — список друзей */
  async list() {
    const { data } = await apiClient.get('/friends')
    return z.array(ZFriendLoose).parse(data)
  },

  /** GET /friends/requests — входящие/исходящие заявки */
  async requests() {
    const { data } = await apiClient.get('/friends/requests')
    return ZRequestsPayload.parse(data)
  },

  /** GET /friends/search?q=USER#1234 — поиск по uniqueId */
  async search(q: string) {
    const { data } = await apiClient.get('/friends/search', { params: { q } })
    return z.array(ZUserLoose).parse(data)
  },

  /** POST /friends/request { uniqueId } — отправить инвайт */
  async sendRequest(uniqueId: string) {
    const { data } = await apiClient.post('/friends/request', { uniqueId })
    return data
  },

  /** PATCH /friends/accept — { uniqueId, requesterId } */
  async accept(uniqueId: string, requesterId: number) {
    const { data } = await apiClient.patch('/friends/accept', { uniqueId, requesterId })
    return data
  },

  /** PATCH /friends/reject — { uniqueId, requesterId } */
  async reject(uniqueId: string, requesterId: number) {
    const { data } = await apiClient.patch('/friends/reject', { uniqueId, requesterId })
    return data
  },

  /** DELETE /friends/{userId} — удалить из друзей/отменить связь */
  async remove(uniqueId: string) {
    const { data } = await apiClient.delete(`/friends/${encodeURIComponent(uniqueId)}`);
    return data as { success?: boolean; removed?: boolean };
  },

  /** GET /friends/my-code -> my permanent friend QR ({ code, url (https landing page), deepLink }) */
  async myCode(): Promise<MyFriendCode> {
    const { data } = await apiClient.get('/friends/my-code');
    return ZMyCode.parse(data);
  },

  /** POST /friends/my-code/reset -> new code; the old QR stops working */
  async resetMyCode(): Promise<MyFriendCode> {
    const { data } = await apiClient.post('/friends/my-code/reset');
    return ZMyCode.parse(data);
  },

  /** GET /friends/code/:code -> owner card + friendship status (404 INVALID_CODE) */
  async lookupCode(code: string): Promise<FriendCard> {
    const { data } = await apiClient.get(`/friends/code/${encodeURIComponent(code)}`);
    return ZFriendCard.parse(data);
  },

  /** POST /friends/code/:code/add -> accepted friendship (errors: SELF, ALREADY_FRIENDS, INVALID_CODE) */
  async addByCode(code: string): Promise<{ action: string; friend: PublicFriend }> {
    const { data } = await apiClient.post(`/friends/code/${encodeURIComponent(code)}/add`);
    return z.object({ action: z.string(), friend: ZPublicFriend }).parse(data);
  },

  /** POST /friends/join { token } — old time-limited QR codes; returns the inviter card */
  async joinByToken(token: string): Promise<{ action: string; friend?: PublicFriend }> {
    const { data } = await apiClient.post('/friends/join', { token });
    return z.object({ action: z.string(), friend: ZPublicFriend.optional() }).parse(data);
  },
};


