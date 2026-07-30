// Routes are rendered inline in App.tsx switch-case;
// this file provides a structured route config for future use
import Dashboard from '../pages/Dashboard';
import Residents from '../pages/Residents';
import MeterReadings from '../pages/MeterReadings';
import Bills from '../pages/Bills';
import Payments from '../pages/Payments';
import Announcements from '../pages/Announcements';
import Tickets from '../pages/Tickets';
import Notifications from '../pages/Notifications';
import Reports from '../pages/Reports';
import ProfileSettings from '../pages/ProfileSettings';
import Users from '../pages/Users';
import Analytics from '../pages/Analytics';
import AuditLogs from '../pages/AuditLogs';
import AuditLogsConsole from '../pages/AuditLogsConsole';
import SystemSettings from '../pages/SystemSettings';

import { ROUTES, type AppRoute } from '../constants';

interface RouteConfig {
  key: AppRoute;
  label: string;
  render: () => JSX.Element;
}

export const adminRoutes: RouteConfig[] = [
  { key: ROUTES.DASHBOARD, label: 'Dashboard', render: () => <Dashboard /> },
  { key: ROUTES.RESIDENTS, label: 'Residents', render: () => <Residents /> },
  { key: ROUTES.METER_READINGS, label: 'Meter Readings', render: () => <MeterReadings /> },
  { key: ROUTES.BILLS, label: 'Bills', render: () => <Bills /> },
  { key: ROUTES.PAYMENTS, label: 'Payments', render: () => <Payments /> },
  { key: ROUTES.ANNOUNCEMENTS, label: 'Announcements', render: () => <Announcements /> },
  { key: ROUTES.TICKET_MANAGEMENT, label: 'Ticketing System', render: () => <Tickets /> },
  { key: ROUTES.NOTIFICATIONS, label: 'Notifications', render: () => <Notifications /> },
  { key: ROUTES.REPORTS, label: 'Reports', render: () => <Reports /> },
  { key: ROUTES.PROFILE_SETTINGS, label: 'Profile Settings', render: () => <ProfileSettings /> },
  { key: ROUTES.USERS, label: 'Users', render: () => <Users /> },
  { key: ROUTES.ANALYTICS, label: 'Analytics', render: () => <Analytics /> },
  { key: ROUTES.AUDIT_LOGS, label: 'Audit Logs', render: () => <AuditLogs onNavigateToConsole={() => {}} /> },
  { key: ROUTES.AUDIT_LOGS_CONSOLE, label: 'Audit Logs Console', render: () => <AuditLogsConsole onNavigateBack={() => {}} /> },
  { key: ROUTES.SYSTEM_SETTINGS, label: 'System Settings', render: () => <SystemSettings /> },
];

/** Render the component for a given route key */
export function renderRoute(key: string): JSX.Element {
  const route = adminRoutes.find((r) => r.key === key);
  if (route) return route.render();
  return <Dashboard />;
}
