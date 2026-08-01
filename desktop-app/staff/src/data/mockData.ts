import { 
  Resident, 
  MeterReading, 
  MonthlyRevenue, 
  DashboardStats 
} from '../types';

export const dashboardStats: DashboardStats = {
  totalResidents: 1482,
  residentsGrowth: 4,
  billsGenerated: 1205,
  pendingPayments: 214,
  totalRevenue: 142500,
  revenueGrowth: 12,
};

export const monthlyRevenue: MonthlyRevenue[] = [
  { month: 'JAN', revenue: 98500 },
  { month: 'FEB', revenue: 102300 },
  { month: 'MAR', revenue: 115800 },
  { month: 'APR', revenue: 128600 },
  { month: 'MAY', revenue: 142500 },
  { month: 'JUN', revenue: 136200 },
];

export const recentMeterReadings: MeterReading[] = [
  {
    id: '1',
    residentName: 'Ricardo Dalisay',
    meterId: 'M4-10293',
    currentReading: 1240,
    previousReading: 1180,
    consumption: 60,
    status: 'normal',
    date: 'Oct 24, 2023',
  },
  {
    id: '2',
    residentName: 'Elena Gilbert',
    meterId: 'M4-88271',
    currentReading: 2504,
    previousReading: 2350,
    consumption: 154,
    status: 'high',
    date: 'Oct 23, 2023',
  },
  {
    id: '3',
    residentName: 'Tito Sotto',
    meterId: 'M4-77123',
    currentReading: 912,
    previousReading: 895,
    consumption: 17,
    status: 'low',
    date: 'Oct 23, 2023',
  },
  {
    id: '4',
    residentName: 'Maria Santos',
    meterId: 'M4-55482',
    currentReading: 1856,
    previousReading: 1790,
    consumption: 66,
    status: 'normal',
    date: 'Oct 22, 2023',
  },
  {
    id: '5',
    residentName: 'Jose Reyes',
    meterId: 'M4-92034',
    currentReading: 3245,
    previousReading: 3080,
    consumption: 165,
    status: 'high',
    date: 'Oct 22, 2023',
  },
];

export const residents: Resident[] = [
  {
    id: '1',
    name: 'Ricardo Dalisay',
    address: 'Purok 4, Block 2, Lot 5',
    meterId: 'M4-10293',
    status: 'active',
  },
  {
    id: '2',
    name: 'Elena Gilbert',
    address: 'Purok 4, Block 8, Lot 12',
    meterId: 'M4-88271',
    status: 'active',
  },
  // Add more as needed
];
