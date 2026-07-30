import {
  StaffProfile,
  SecuritySettings,
  NotificationPreferences,
  ApplicationPreferences,
  SessionInfo,
  ActivitySummary,
} from '../types';

export const mockStaffProfile: StaffProfile = {
  id: 'staff-001',
  fullName: 'Juan Dela Cruz',
  employeeId: 'ST-2026-001',
  position: 'Water Billing Staff',
  office: 'Barangay Kalunasan Water Services',
  email: 'juan.delacruz@kalunasanwaters.gov.ph',
  mobileNumber: '+63 960 123 4567',
  address: '123 Kalunasan St., Cebu City, Philippines',
  accountStatus: 'active',
  lastLogin: 'July 13, 2026 - 8:45 AM',
};

export const mockSecuritySettings: SecuritySettings = {
  requirePasswordOnLogin: true,
  enableTwoFactor: false,
  notifySuspiciousLogin: true,
};

export const mockNotificationPreferences: NotificationPreferences = {
  newPayments: true,
  newMessages: true,
  newComplaints: true,
  announcementAlerts: true,
  dailySummary: false,
};

export const mockApplicationPreferences: ApplicationPreferences = {
  theme: 'light',
  language: 'english',
  dateFormat: 'MM/DD/YYYY',
  autoRefresh: '5min',
};

export const mockSessionInfo: SessionInfo = {
  currentDevice: 'BKWB Staff Desktop',
  operatingSystem: 'Windows 11',
  lastLogin: 'July 13, 2026 - 8:45 AM',
  sessionStatus: 'active',
};

export const mockActivitySummary: ActivitySummary = {
  billsGenerated: 248,
  paymentsVerified: 156,
  residentsAssisted: 89,
  announcementsPosted: 12,
};
