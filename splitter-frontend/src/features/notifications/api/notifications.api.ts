import { z } from 'zod';
import { apiClient } from '@/features/auth/api';

export const NOTIFICATION_TYPES = [
  'FRIEND_REQUEST',
  'FRIEND_ACCEPTED',
  'FRIEND_ADDED',
  'GROUP_ADDED',
  'GROUP_JOIN_REQUEST',
  'GROUP_JOIN_APPROVED',
  'GROUP_ROLE_CHANGED',
  'GROUP_REMOVED',
  'RECEIPT_INCLUDED',
  'RECEIPT_PAID',
] as const;

const ZActor = z.object({ uniqueId: z.string(), username: z.string(), avatarUrl: z.string().nullish() });

const ZNotification = z.object({
  id: z.number(),
  // unknown future types are kept (rendered generically) instead of failing the whole list
  type: z.string(),
  data: z
    .object({
      actor: ZActor.optional(),
      groupId: z.number().optional(),
      groupName: z.string().optional(),
      sessionId: z.number().optional(),
      sessionName: z.string().nullish(),
      amount: z.number().optional(),
      currency: z.string().optional(),
      role: z.string().optional(),
      paid: z.boolean().optional(),
      participantUniqueId: z.string().optional(),
    })
    .passthrough(),
  read: z.boolean(),
  createdAt: z.string(),
});
export type AppNotification = z.infer<typeof ZNotification>;

const ZPage = z.object({ items: z.array(ZNotification), nextCursor: z.number().nullable(), unreadCount: z.number() });
export type NotificationPage = z.infer<typeof ZPage>;

export const NotificationsApi = {
  async list(cursor?: number | null): Promise<NotificationPage> {
    const { data } = await apiClient.get('/notifications', { params: cursor ? { cursor } : {} });
    return ZPage.parse(data);
  },
  async unreadCount(): Promise<number> {
    const { data } = await apiClient.get('/notifications/unread-count');
    return z.object({ count: z.number() }).parse(data).count;
  },
  async markRead(ids: number[] | 'all'): Promise<number> {
    const { data } = await apiClient.post('/notifications/read', ids === 'all' ? { all: true } : { ids });
    return z.object({ unreadCount: z.number() }).parse(data).unreadCount;
  },
  async remove(id: number): Promise<number> {
    const { data } = await apiClient.delete(`/notifications/${id}`);
    return z.object({ unreadCount: z.number() }).parse(data).unreadCount;
  },
};
