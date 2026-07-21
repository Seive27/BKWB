import type { AssignedReading } from '@/types/readings';

export const MOCK_ASSIGNED_READINGS: AssignedReading[] = [
  {
    id: '1',
    name: 'Maria Santos',
    accountNo: 'KLN-1024',
    areaRoute: 'Zone 1, Purok Ilang-Ilang',
    lastReadingDate: 'Jul 24, 2024',
    previousReading: 980,
    status: 'pending',
  },
  {
    id: '2',
    name: 'Juan Dela Cruz',
    accountNo: 'KLN-0955',
    areaRoute: 'Zone 1, Purok Sampaguita',
    lastReadingDate: 'Jul 24, 2024',
    previousReading: 1240,
    status: 'pending',
  },
  {
    id: '3',
    name: 'Ana Reyes',
    accountNo: 'KLN-1102',
    areaRoute: 'Zone 2, Purok Rosal',
    lastReadingDate: 'Jul 23, 2024',
    previousReading: 1560,
    status: 'completed',
  },
];
