import type { AnnouncementQueryOptions } from '@/services/announcementService';
import type { NotificationQueryOptions } from '@/services/notificationService';

function notificationListKey(userId: string, options?: NotificationQueryOptions) {
  return {
    userId,
    limit: options?.limit ?? null,
    unreadOnly: options?.unreadOnly ?? false,
  };
}

function announcementListKey(options?: AnnouncementQueryOptions) {
  return {
    audience: options?.audience ?? null,
    limit: options?.limit ?? null,
  };
}

export const queryKeys = {
  tickets: {
    all: ['tickets'] as const,
    list: (userId: string) => ['tickets', 'list', userId] as const,
    detail: (userId: string, ticketId: string) => ['tickets', 'detail', userId, ticketId] as const,
    timeline: (userId: string, ticketId: string) =>
      ['tickets', 'timeline', userId, ticketId] as const,
  },
  announcements: {
    all: ['announcements'] as const,
    list: (options?: AnnouncementQueryOptions) =>
      ['announcements', 'list', announcementListKey(options)] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: (userId: string, options?: NotificationQueryOptions) =>
      ['notifications', 'list', notificationListKey(userId, options)] as const,
    unread: (userId: string) => ['notifications', 'unread', userId] as const,
  },
  bills: {
    all: ['bills'] as const,
    list: (userId: string) => ['bills', 'list', userId] as const,
  },
  payments: {
    all: ['payments'] as const,
    forBill: (userId: string, billId: string) => ['payments', 'bill', userId, billId] as const,
  },
  profile: {
    all: ['profile'] as const,
    detail: (userId: string) => ['profile', userId] as const,
  },
};
