// ── Staff Feature Types ──
export interface Resident {
  id: string;
  name: string;
  address: string;
  meterId: string;
  status: 'active' | 'inactive';
}

// ── Meter Reading Types ──
// Mirrors the Supabase `meters`, `resident_accounts` and `meter_readings` tables.
export type MeterReadingStatus =
  | 'assigned'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'billed';

export interface Meter {
  id: string;
  meter_number: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResidentAccount {
  id: string;
  resident_id: string;
  account_number: string;
  meter_id: string | null;
  service_address: string | null;
  connection_status: 'active' | 'inactive' | 'disconnected';
  created_at: string;
  updated_at: string;
  resident?: TicketPerson | null;
  meter?: Meter | null;
}

/** A meter reader option used in the assign-reading picker. */
export interface MeterReaderOption {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface MeterReading {
  id: string;
  account_id: string;
  resident_id: string;
  meter_id: string | null;
  meter_reader_id: string | null;
  assigned_by: string | null;
  assignment_date: string;
  reading_date: string | null;
  previous_reading: number;
  current_reading: number | null;
  consumption: number | null;
  status: MeterReadingStatus;
  remarks: string | null;
  photo_url: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  /** Joined profiles row for the resident. */
  resident?: TicketPerson | null;
  /** Joined resident_accounts row (account number + address). */
  account?: {
    id: string;
    account_number: string;
    service_address: string | null;
  } | null;
  /** Joined meters row. */
  meter?: Meter | null;
  /** Joined profiles row for the assigned meter reader. */
  meter_reader?: TicketPerson | null;
  /** Joined profiles row for the staff who assigned it. */
  assigner?: TicketPerson | null;
  /** Joined profiles row for the staff who reviewed it. */
  reviewer?: TicketPerson | null;
}

export const METER_READING_STATUS_LABELS: Record<MeterReadingStatus, string> = {
  assigned: 'Assigned',
  pending_review: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  billed: 'Billed',
};

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

// ── Announcement Types ──

export type AnnouncementCategory =
  | 'schedule'
  | 'interruption'
  | 'maintenance'
  | 'billing'
  | 'general'
  | 'emergency';

export type AnnouncementPriority = 'normal' | 'important' | 'emergency';

export type AnnouncementAudience = 'all' | 'residents' | 'meter_readers' | 'staff';

export interface AnnouncementCreator {
  id: string;
  first_name: string;
  last_name: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  target_audience: AnnouncementAudience;
  created_by: string | null;
  is_published: boolean;
  expires_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  /** Joined profiles row (from created_by) for display */
  creator?: AnnouncementCreator | null;
}

/** Data captured by the create/edit announcement form. */
export interface AnnouncementDraft {
  title: string;
  content: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  target_audience: AnnouncementAudience;
  is_published: boolean;
  expires_at: string | null;
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

// ── Ticket Management Types ──
// Mirrors the Supabase `tickets` + `ticket_timeline` tables.
export type TicketCategory =
  | 'water_supply'
  | 'billing'
  | 'plumbing'
  | 'water_quality'
  | 'meter_concern'
  | 'other';
export type TicketPriority = 'low' | 'medium' | 'high';
export type TicketStatus = 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed';

export type TicketTimelineEventType = 'created' | 'assigned' | 'status_change';

/** A person joined from the profiles table (resident or staff). */
export interface TicketPerson {
  id: string;
  first_name: string;
  last_name: string;
}

/** One row of the ticket_timeline table. */
export interface TicketTimelineEvent {
  id: string;
  ticket_id: string;
  event_type: TicketTimelineEventType;
  description: string | null;
  performed_by: string | null;
  created_at: string;
  /** Joined profiles row (from performed_by) for display. */
  performer?: TicketPerson | null;
}

export interface Ticket {
  id: string;
  /** Human-readable reference, e.g. "TKT-2026-000001" (DB-generated). */
  ticket_number: string;
  resident_id: string;
  assigned_staff_id: string | null;
  category: TicketCategory;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  resolution: string | null;
  internal_notes: string | null;
  attachment_url: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
  deleted_at: string | null;
  /** Joined profiles row for the resident. */
  resident?: TicketPerson | null;
  /** Joined profiles row for the assigned staff member. */
  assigned_staff?: TicketPerson | null;
  /** Chronological history (ticket_timeline rows). */
  timeline?: TicketTimelineEvent[];
}

/** Data captured by the staff/super-admin create-ticket form (resident picker). */
export interface TicketDraft {
  resident_id: string;
  category: TicketCategory;
  subject: string;
  description: string;
  priority: TicketPriority;
}

/** A staff member option used in the assign-ticket picker. */
export interface StaffOption {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

/** A resident option used in the create-ticket picker. */
export interface ResidentOption {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  water_supply: 'Water Supply',
  billing: 'Billing',
  plumbing: 'Plumbing',
  water_quality: 'Water Quality',
  meter_concern: 'Meter Concern',
  other: 'Other',
};

/** Standardized subjects offered per category in the create-ticket form. */
export const TICKET_SUBJECTS: Record<TicketCategory, string[]> = {
  water_supply: [
    'No Water Supply',
    'Low Water Pressure',
    'Intermittent Water Supply',
    'Dirty Water',
    'Water Supply Inquiry',
  ],
  billing: [
    'Incorrect Bill',
    'Billing Inquiry',
    'Missing Payment',
    'Payment Verification',
    'Outstanding Balance',
  ],
  plumbing: [
    'Water Leak',
    'Broken Pipe',
    'Service Connection Issue',
    'Plumbing Inspection',
  ],
  water_quality: [
    'Discolored Water',
    'Unusual Odor or Taste',
    'Contamination Concern',
    'Water Quality Test Request',
  ],
  meter_concern: [
    'Faulty Water Meter',
    'Meter Reading Concern',
    'Request Meter Inspection',
    'Meter Replacement',
  ],
  other: ['General Inquiry', 'Other Concern'],
};

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

// ── Admin Feature Types ──
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

export interface AdminDashboardStats {
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

// ── Authentication Types ──

export interface Role {
  id: string;
  name: 'super_admin' | 'staff' | 'resident' | 'meter_reader';
}

export interface Profile {
  id: string;
  role_id: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  date_of_birth?: string;
  phone?: string;
  email: string;
  avatar_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  role: Role;
}

export interface AuthUser {
  id: string;
  email: string;
  role: Role['name'];
  profile: Profile;
}

// ── Notifications Types ──
// Mirrors the Supabase `notifications` table.
export type NotificationType =
  | 'announcement'
  | 'ticket_created'
  | 'ticket_assigned'
  | 'ticket_status'
  | 'ticket_resolved'
  | 'reading_assigned'
  | 'reading_approved'
  | 'reading_rejected'
  | 'billing'
  | 'payment'
  | 'system';

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  reference_type: string | null;
  reference_id: string | null;
  is_read: boolean;
  read_at: string | null;
  deleted_at: string | null;
  created_at: string;
  /** Joined profiles row for the recipient (super-admin monitoring view). */
  recipient?: { id: string; first_name: string; last_name: string } | null;
}

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  announcement: 'Announcement',
  ticket_created: 'Ticket Created',
  ticket_assigned: 'Ticket Assigned',
  ticket_status: 'Ticket Updated',
  ticket_resolved: 'Ticket Resolved',
  reading_assigned: 'Reading Assigned',
  reading_approved: 'Reading Approved',
  reading_rejected: 'Reading Rejected',
  billing: 'Billing',
  payment: 'Payment',
  system: 'System',
};

// ── Audit Log Types ──
// Mirrors the Supabase `audit_logs` table.
export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  role_name: string | null;
  module: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  description: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  /** Joined profiles row (from user_id) for display. */
  user?: { id: string; first_name: string; last_name: string } | null;
}

export interface AuditLogQueryOptions {
  module?: string | null;
  action?: string | null;
  search?: string | null;
  from?: string | null;
  to?: string | null;
  limit?: number;
  orderDirection?: 'asc' | 'desc';
}

export const AUDIT_MODULES = [
  'auth',
  'announcements',
  'tickets',
  'meter_readings',
  'residents',
  'system_settings',
] as const;

export const AUDIT_ACTIONS = [
  'login',
  'logout',
  'create',
  'update',
  'delete',
  'assign',
  'resolve',
  'close',
  'approved',
  'rejected',
  'submitted',
] as const;

// ── System Settings Types ──
// Mirrors the Supabase `system_settings` table (flexible key-value model).
export interface SystemSetting {
  id: string;
  key: string;
  /** JSON-decoded value (string | number | boolean). */
  value: unknown;
  category: string;
  label: string | null;
  description: string | null;
  is_public: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export const SYSTEM_SETTING_CATEGORIES = ['general', 'system', 'security', 'billing'] as const;

export const SYSTEM_SETTING_CATEGORY_LABELS: Record<string, string> = {
  general: 'General',
  system: 'System',
  security: 'Security',
  billing: 'Billing (Future)',
};

// ── Analytics Types ──
export interface TicketStatusCount {
  open: number;
  assigned: number;
  in_progress: number;
  resolved: number;
  closed: number;
}

export interface ReadingStatusCount {
  assigned: number;
  pending_review: number;
  approved: number;
  rejected: number;
  billed: number;
}

export interface AnalyticsSummary {
  totalResidents: number;
  totalStaff: number;
  totalMeterReaders: number;
  totalAnnouncements: number;
  activeStaff: number;
  tickets: TicketStatusCount;
  readings: ReadingStatusCount;
}

/** One point on a time-series chart (label + value). */
export interface TrendPoint {
  label: string;
  value: number;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  ticketTrends: TrendPoint[];
  readingCompletionTrends: TrendPoint[];
  announcementActivity: TrendPoint[];
  residentGrowth: TrendPoint[];
}
