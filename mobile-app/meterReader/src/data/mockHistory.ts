import type { HistoryReading } from '@/types/readings';

export const MOCK_HISTORY_META = {
  lastSyncedRelative: '2 mins ago',
  lastSyncedAt: 'Aug 24, 08:30 AM',
  unsyncedCount: 12,
};

export const MOCK_HISTORY_READINGS: HistoryReading[] = [
  {
    id: '1',
    name: 'Maria Clara',
    recordedAt: 'Aug 24, 2024 • 09:15 AM',
    previous: 1245,
    current: 1260,
    consumption: 15,
    syncStatus: 'pending',
  },
  {
    id: '2',
    name: 'Juan Dela Cruz',
    recordedAt: 'Aug 24, 2024 • 08:42 AM',
    previous: 980,
    current: 1002,
    consumption: 22,
    syncStatus: 'synced',
  },
  {
    id: '3',
    name: 'Andres Bonifacio',
    recordedAt: 'Aug 23, 2024 • 04:20 PM',
    previous: 2100,
    current: 2108,
    consumption: 8,
    syncStatus: 'synced',
  },
];
