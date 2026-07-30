import { type ComponentType } from 'react';
import Dashboard from '../pages/Dashboard';
import Residents from '../pages/Residents';
import MeterReadings from '../pages/MeterReadings';
import Bills from '../pages/Bills';
import Payments from '../pages/Payments';
import Announcements from '../pages/Announcements';
import Tickets from '../pages/Tickets';
import Reports from '../pages/Reports';
import ProfileSettings from '../pages/ProfileSettings';

import { ROUTES, type AppRoute } from '../constants';

interface RouteConfig {
  key: AppRoute;
  label: string;
  component: ComponentType;
}

export const staffRoutes: RouteConfig[] = [
  { key: ROUTES.DASHBOARD, label: 'Dashboard', component: Dashboard },
  { key: ROUTES.RESIDENTS, label: 'Residents', component: Residents },
  { key: ROUTES.METER_READINGS, label: 'Meter Readings', component: MeterReadings },
  { key: ROUTES.BILLS, label: 'Bills', component: Bills },
  { key: ROUTES.PAYMENTS, label: 'Payments', component: Payments },
  { key: ROUTES.ANNOUNCEMENTS, label: 'Announcements', component: Announcements },
  { key: ROUTES.TICKET_MANAGEMENT, label: 'Ticketing System', component: Tickets },
  { key: ROUTES.REPORTS, label: 'Reports', component: Reports },
  { key: ROUTES.PROFILE_SETTINGS, label: 'Profile Settings', component: ProfileSettings },
];

export function renderRoute(key: string, fallback: ComponentType = Dashboard): JSX.Element {
  const route = staffRoutes.find((r) => r.key === key);
  const Component = route?.component ?? fallback;
  return <Component />;
}
