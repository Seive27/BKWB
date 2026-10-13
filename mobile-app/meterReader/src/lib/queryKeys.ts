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
  readings: {
    all: ['readings'] as const,
    assigned: (userId: string) => ['readings', 'assigned', userId] as const,
    history: (userId: string) => ['readings', 'history', userId] as const,
    consumers: (userId: string, sitio: string) =>
      ['readings', 'consumers', userId, sitio] as const,
  },
  sitios: {
    all: ['sitios'] as const,
    mine: (userId: string) => ['sitios', 'mine', userId] as const,
  },
  tickets: {
    all: ['tickets'] as const,
    list: (userId: string) => ['tickets', 'list', userId] as const,
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
  profile: {
    all: ['profile'] as const,
    detail: (userId: string) => ['profile', userId] as const,
    reader: (userId: string) => ['profile', 'reader', userId] as const,
  },
};
