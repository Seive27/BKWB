export interface ActivityLog {
  id: string;
  timestamp: string;
  user: string;
  userType: 'SA' | 'EXT' | 'user';
  action: string;
  status: 'success' | 'modified' | 'denied';
}

export interface GlobalSetting {
  id: string;
  name: string;
  description: string;
  status: 'enabled' | 'aes-256' | 'ok';
  icon: 'shield' | 'lock' | 'database';
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  securityAlerts: number;
  highPriorityAlerts: number;
}

export interface UserActivityData {
  day: string;
  value: number;
}
