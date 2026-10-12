import type { TFunction } from 'i18next';
import type { Href } from 'expo-router';
import { formatMoney } from '@/features/receipt/lib/money';
import type { AppNotification } from '../api/notifications.api';

/** One-line text for a notification (all wording lives in i18n: notifications.types.*). */
export function notificationText(n: AppNotification, t: TFunction, meUniqueId?: string): string {
  const d = n.data;
  const name = d.actor?.username ?? t('notifications.someone');
  const group = d.groupName ?? '';
  const receipt = d.sessionName || t('receipt.summary.untitled', 'Bill');
  const amount = d.amount != null && d.currency ? formatMoney(d.amount, d.currency) : '';
  switch (n.type) {
    case 'FRIEND_REQUEST':
    case 'FRIEND_ACCEPTED':
    case 'FRIEND_ADDED':
    case 'GROUP_JOIN_REQUEST':
      return t(`notifications.types.${n.type}`, { name, group });
    case 'GROUP_ADDED':
    case 'GROUP_JOIN_APPROVED':
    case 'GROUP_REMOVED':
      return t(`notifications.types.${n.type}`, { name, group });
    case 'GROUP_ROLE_CHANGED':
      return t(d.role === 'ADMIN' ? 'notifications.types.GROUP_ROLE_ADMIN' : 'notifications.types.GROUP_ROLE_MEMBER', { group });
    case 'RECEIPT_INCLUDED':
      return t('notifications.types.RECEIPT_INCLUDED', { name, receipt, amount });
    case 'RECEIPT_PAID':
      if (d.participantUniqueId && d.participantUniqueId === meUniqueId)
        return t(d.paid ? 'notifications.types.RECEIPT_PAID_YOURS' : 'notifications.types.RECEIPT_UNPAID_YOURS', { name, receipt, amount });
      return t(d.paid ? 'notifications.types.RECEIPT_PAID' : 'notifications.types.RECEIPT_UNPAID', { name, receipt, amount });
    default:
      return t('notifications.types.UNKNOWN');
  }
}

/** Where tapping a notification goes. */
export function notificationTarget(n: AppNotification): Href | null {
  const d = n.data;
  switch (n.type) {
    case 'FRIEND_REQUEST':
      return '/friends/requests';
    case 'FRIEND_ACCEPTED':
    case 'FRIEND_ADDED':
      return '/friends';
    case 'GROUP_REMOVED':
      return '/groups';
    case 'GROUP_ADDED':
    case 'GROUP_JOIN_REQUEST':
    case 'GROUP_JOIN_APPROVED':
    case 'GROUP_ROLE_CHANGED':
      return d.groupId ? { pathname: '/groups/[groupId]', params: { groupId: String(d.groupId) } } : '/groups';
    case 'RECEIPT_INCLUDED':
    case 'RECEIPT_PAID':
      return d.sessionId ? { pathname: '/home/history/[historyId]', params: { historyId: String(d.sessionId) } } : '/home/history';
    default:
      return null;
  }
}
