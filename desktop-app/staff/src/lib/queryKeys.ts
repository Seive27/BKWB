import type { AnnouncementQueryOptions } from '../services/announcementService';
import type { BillQueryOptions } from '../services/billService';
import type { MeterReadingQueryOptions } from '../services/meterReadingService';
import type { NotificationQueryOptions } from '../services/notificationService';
import type { ReportCategory, ReportPeriod } from '../services/reportService';
import type { TicketQueryOptions } from '../services/ticketService';
import type { TrendGranularity } from '../services/analyticsService';

export interface NotificationListKey extends NotificationQueryOptions {
  userId: string;
}

function notificationListKey(options: NotificationListKey) {
  return {
    userId: options.userId,
    limit: options.limit ?? null,
    mineOnly: options.mineOnly ?? true,
    unreadOnly: options.unreadOnly ?? false,
  };
}

export const queryKeys = {
  tickets: {
    all: ['tickets'] as const,
    list: (options: TicketQueryOptions = {}) => ['tickets', 'list', options] as const,
    detail: (id: string) => ['tickets', 'detail', id] as const,
    assignees: () => ['tickets', 'assignees'] as const,
    residentOptions: () => ['tickets', 'resident-options'] as const,
  },
  meterReadings: {
    all: ['meter-readings'] as const,
    list: (options: MeterReadingQueryOptions = {}) =>
      ['meter-readings', 'list', options] as const,
    byAccount: (accountId: string) => ['meter-readings', 'account', accountId] as const,
    readers: () => ['meter-readings', 'readers'] as const,
    sitioOptions: (assignmentDate: string) =>
      ['meter-readings', 'sitio-options', assignmentDate] as const,
  },
  announcements: {
    all: ['announcements'] as const,
    list: (options: AnnouncementQueryOptions = {}) =>
      ['announcements', 'list', options] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: (options: NotificationListKey) =>
      ['notifications', 'list', notificationListKey(options)] as const,
    unread: (userId: string) => ['notifications', 'unread', userId] as const,
  },
  analytics: {
    all: ['analytics'] as const,
    detail: (days: number, granularity: TrendGranularity) =>
      ['analytics', days, granularity] as const,
  },
  residents: {
    all: ['residents'] as const,
    list: () => ['residents', 'list'] as const,
    sitios: () => ['residents', 'sitios'] as const,
  },
  bills: {
    all: ['bills'] as const,
    list: (options: BillQueryOptions = {}) => ['bills', 'list', options] as const,
    byResident: (residentId: string) => ['bills', 'resident', residentId] as const,
    receiptPreview: (readingId: string) => ['bills', 'receipt-preview', readingId] as const,
  },
  payments: {
    all: ['payments'] as const,
    pending: () => ['payments', 'pending'] as const,
  },
  reports: {
    all: ['reports'] as const,
    detail: (
      category: ReportCategory,
      period: ReportPeriod,
      options: { sitio?: string | null } = {}
    ) => ['reports', category, period, options.sitio ?? null] as const,
  },
  billingConfig: {
    all: ['billing-config'] as const,
  },
  profile: {
    all: ['profile'] as const,
    detail: (userId: string) => ['profile', userId] as const,
  },
};
