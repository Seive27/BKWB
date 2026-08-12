// ── User Roles ──
export const ROLES = {
  RESIDENT: 'resident',
  METER_READER: 'meter-reader',
  STAFF: 'staff',
  SUPER_ADMIN: 'super-admin',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

// ── Application Routes ──
export const ROUTES = {
  DASHBOARD: 'dashboard',
  RESIDENTS: 'residents',
  METER_READINGS: 'meter-readings',
  BILLS: 'bills',
  PAYMENTS: 'payments',
  ANNOUNCEMENTS: 'announcements',
  TICKET_MANAGEMENT: 'ticket-management',
  MESSAGES: 'messages',
  REPORTS: 'reports',
  SETTINGS: 'settings',
  PROFILE_SETTINGS: 'profile-settings',
  NOTIFICATIONS: 'notifications',
  USERS: 'users',
  ANALYTICS: 'analytics',
  AUDIT_LOGS: 'audit-logs',
  AUDIT_LOGS_CONSOLE: 'audit-logs-console',
  SYSTEM_SETTINGS: 'system-settings',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

// ── Ticket Status ──
export const TICKET_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in-progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
} as const;

export type TicketStatus = (typeof TICKET_STATUS)[keyof typeof TICKET_STATUS];

// ── Bill Status ──
export const BILL_STATUS = {
  PAID: 'paid',
  PENDING: 'pending',
  OVERDUE: 'overdue',
} as const;

export type BillStatus = (typeof BILL_STATUS)[keyof typeof BILL_STATUS];

// ── Payment Status ──
export const PAYMENT_STATUS = {
  COMPLETED: 'completed',
  PENDING: 'pending',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

// ── Announcement Categories ──
export const ANNOUNCEMENT_CATEGORIES = {
  MAINTENANCE: 'maintenance',
  INTERRUPTION: 'interruption',
  SCHEDULE: 'schedule',
  GENERAL: 'general',
} as const;

// ── Announcement Status ──
export const ANNOUNCEMENT_STATUS = {
  ACTIVE: 'active',
  SCHEDULED: 'scheduled',
  ARCHIVED: 'archived',
} as const;

// ── Ticket Categories ──
export const TICKET_CATEGORIES = {
  BILLING: 'billing',
  PAYMENT: 'payment',
  METER_READING: 'meter-reading',
  WATER_SERVICE: 'water-service',
  LEAK_REPORT: 'leak-report',
  GENERAL_INQUIRY: 'general-inquiry',
} as const;

// ── Ticket Priority ──
export const TICKET_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

// ── Barangay Kalunasan sitios (meter reading assignment zones) ──
export const SITIO_OPTIONS = [
  'Back Crisanto',
  'Ellena Homes',
  'Lariha',
  'Lokana',
  'Lower Awihaw',
  'Lower Camparang',
  'Lower Kalunasan',
  'Mountain View Village',
  'Pang Pang Lanog',
  'San Jose Ville',
  'San Marcelo',
  'Sobusteha',
  'Unit 2',
  'Unit 3',
  'Unit 4',
  'Unit 5',
  'Upper Awiha',
  'Upper Camprang',
  'Upper Kalunasan',
  'Valle Estrella',
] as const;

export type SitioOption = (typeof SITIO_OPTIONS)[number];
