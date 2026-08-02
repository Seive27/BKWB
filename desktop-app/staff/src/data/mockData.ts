import {
  Resident,
  MonthlyRevenue,
  DashboardStats,
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
