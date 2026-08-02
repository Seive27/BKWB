import { 
  Resident, 
  MonthlyRevenue, 
  ActivityLog, 
  GlobalSetting, 
  AdminDashboardStats, 
  UserActivityData,
  DashboardStats,
} from '../types';

// ── Staff Feature Mock Data ──

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
];

// ── Admin Feature Mock Data ──

export const mockAdminDashboardStats: AdminDashboardStats = {
  totalUsers: 12842,
  activeUsers: 9201,
  pendingUsers: 3641,
  securityAlerts: 3,
  highPriorityAlerts: 3,
};

export const mockActivityLogs: ActivityLog[] = [
  {
    id: '1',
    timestamp: '2023-10-27 14:22:01',
    user: 'jane_doe',
    userType: 'user',
    action: 'User Suspended',
    status: 'success',
  },
  {
    id: '2',
    timestamp: '2023-10-27 13:58:46',
    user: 'sys_admin',
    userType: 'SA',
    action: 'Config Change',
    status: 'modified',
  },
  {
    id: '3',
    timestamp: '2023-10-27 13:12:10',
    user: 'external_api',
    userType: 'EXT',
    action: 'Login Attempt',
    status: 'denied',
  },
];

export const mockGlobalSettings: GlobalSetting[] = [
  {
    id: '1',
    name: 'MFA Status',
    description: 'Enforced globally',
    status: 'enabled',
    icon: 'shield',
  },
  {
    id: '2',
    name: 'Encryption',
    description: 'End-to-end secured',
    status: 'aes-256',
    icon: 'lock',
  },
  {
    id: '3',
    name: 'Data Backup',
    description: 'Last ran 2 hours ago',
    status: 'ok',
    icon: 'database',
  },
];

export const mockUserActivityData: UserActivityData[] = [
  { day: 'Mon', value: 45 },
  { day: 'Tue', value: 60 },
  { day: 'Wed', value: 55 },
  { day: 'Thu', value: 80 },
  { day: 'Fri', value: 95 },
  { day: 'Sat', value: 85 },
  { day: 'Sun', value: 100 },
];
