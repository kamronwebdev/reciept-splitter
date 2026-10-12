import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { NotificationsApi, type NotificationPage } from '../api/notifications.api';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: ['notifications', 'list'] as const,
  unread: ['notifications', 'unread'] as const,
};

/**
 * Unread count for the bell and the Home tab badge. No polling: it refreshes when the app comes back
 * to the foreground (focusManager), on pull-to-refresh and after mutations; 30s stale time.
 */
export function useUnreadCount() {
  const token = useAppStore((s) => s.token);
  return useQuery({
    queryKey: notificationKeys.unread,
    queryFn: NotificationsApi.unreadCount,
    enabled: !!token,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useNotifications() {
  return useInfiniteQuery({
    queryKey: notificationKeys.list,
    queryFn: ({ pageParam }) => NotificationsApi.list(pageParam),
    initialPageParam: null as number | null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 30_000,
  });
}

type ListData = InfiniteData<NotificationPage, number | null>;

/** Mark read / delete with an optimistic update of the list and the unread count. */
export function useNotificationMutations() {
  const qc = useQueryClient();
  const patchList = (fn: (n: NotificationPage['items'][number]) => NotificationPage['items'][number] | null) =>
    qc.setQueryData<ListData>(notificationKeys.list, (old) =>
      old ? { ...old, pages: old.pages.map((p) => ({ ...p, items: p.items.map(fn).filter(Boolean) as NotificationPage['items'] })) } : old
    );

  const markRead = useMutation({
    mutationFn: (ids: number[] | 'all') => NotificationsApi.markRead(ids),
    onMutate: (ids) => {
      patchList((n) => (ids === 'all' || ids.includes(n.id) ? { ...n, read: true } : n));
      if (ids === 'all') qc.setQueryData(notificationKeys.unread, 0);
    },
    onSuccess: (count) => qc.setQueryData(notificationKeys.unread, count),
  });
  const remove = useMutation({
    mutationFn: (id: number) => NotificationsApi.remove(id),
    onMutate: (id) => patchList((n) => (n.id === id ? null : n)),
    onSuccess: (count) => qc.setQueryData(notificationKeys.unread, count),
    onError: () => qc.invalidateQueries({ queryKey: notificationKeys.list }),
  });
  return { markRead, remove };
}
