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

export interface Message {
  id: string;
  text: string;
  senderId: string;
  senderType: 'resident' | 'staff';
  timestamp: string;
  read: boolean;
  imageUrl?: string;
  attachmentUrl?: string;
  attachmentName?: string;
}

export interface Conversation {
  id: string;
  residentId: string;
  residentName: string;
  residentAvatar?: string;
  residentInitials: string;
  accountNo: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  category: 'billing' | 'complaint' | 'inquiry' | 'payment' | 'technical';
  status: 'online' | 'offline';
  messages: Message[];
}

export type MessageCategory = 'billing' | 'complaint' | 'inquiry' | 'payment' | 'technical';

// Ticket Management Types
export type TicketCategory = 'billing' | 'payment' | 'meter-reading' | 'water-service' | 'leak-report' | 'general-inquiry';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketStatus = 'pending' | 'in-progress' | 'resolved' | 'closed';

export interface TicketActivity {
  id: string;
  type: 'submitted' | 'staff-reply' | 'resident-reply' | 'image' | 'status-change' | 'priority-change' | 'assignment';
  userId: string;
  userName: string;
  userRole: 'resident' | 'staff';
  message: string;
  imageUrl?: string;
  timestamp: string;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  residentId: string;
  residentName: string;
  residentInitials: string;
  accountNo: string;
  residentContact: string;
  residentAddress: string;
  category: TicketCategory;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignedStaff: string | null;
  attachments: { name: string; url: string }[];
  activities: TicketActivity[];
  dateCreated: string;
  dateUpdated: string;
}

export interface StaffProfile {
  id: string;
  fullName: string;
  employeeId: string;
  position: string;
  office: string;
  email: string;
  mobileNumber: string;
  address: string;
  profilePicture?: string;
  accountStatus: 'active' | 'inactive';
  lastLogin: string;
}

export interface SecuritySettings {
  requirePasswordOnLogin: boolean;
  enableTwoFactor: boolean;
  notifySuspiciousLogin: boolean;
}

export interface NotificationPreferences {
  newPayments: boolean;
  newMessages: boolean;
  newComplaints: boolean;
  announcementAlerts: boolean;
  dailySummary: boolean;
}

export interface ApplicationPreferences {
  theme: 'light' | 'dark';
  language: 'english' | 'filipino';
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY';
  autoRefresh: '1min' | '5min' | '10min';
}

export interface SessionInfo {
  currentDevice: string;
  operatingSystem: string;
  lastLogin: string;
  sessionStatus: 'active' | 'inactive';
}

export interface ActivitySummary {
  billsGenerated: number;
  paymentsVerified: number;
  residentsAssisted: number;
  announcementsPosted: number;
}
