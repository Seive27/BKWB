export interface Resident {
  id: string;
  name: string;
  address: string;
  meterId: string;
  status: 'active' | 'inactive';
}

export interface MeterReading {
  id: string;
  residentName: string;
  meterId: string;
  currentReading: number;
  previousReading: number;
  consumption: number;
  status: 'normal' | 'high' | 'low';
  date: string;
}

export interface Bill {
  id: string;
  residentId: string;
  residentName: string;
  amount: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
  billingPeriod: string;
}

export interface Payment {
  id: string;
  billId: string;
  residentName: string;
  amount: number;
  date: string;
  method: 'cash' | 'gcash' | 'bank';
}

export interface Announcement {
  id: string;
  title: string;
  description: string;
  category: 'maintenance' | 'interruption' | 'schedule' | 'general';
  status: 'active' | 'scheduled' | 'archived';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  postedDate: string;
  scheduledDate?: string;
  publishImmediately: boolean;
  sendNotification: boolean;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
}

export interface DashboardStats {
  totalResidents: number;
  residentsGrowth: number;
  billsGenerated: number;
  pendingPayments: number;
  totalRevenue: number;
  revenueGrowth: number;
}
