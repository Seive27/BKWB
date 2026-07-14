import { ActivityLog, GlobalSetting, DashboardStats, UserActivityData } from '../types';

export const mockDashboardStats: DashboardStats = {
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
