import { supabase } from '../lib/supabase';
import type {
  AnalyticsData,
  AnalyticsSummary,
  TrendPoint,
} from '../types';

export function getAnalyticsErrorMessage(error: {
  message: string;
  code?: string;
}): string {
  const msg = error.message?.toLowerCase() ?? '';
  const code = error?.code ?? '';

  if (
    msg.includes('relation') ||
    msg.includes('does not exist') ||
    code === '42P01'
  ) {
    return 'The analytics data could not be loaded. Please run the SQL migration to create the required tables.';
  }
  if (code === '42501' || msg.includes('row-level security') || msg.includes('permission denied')) {
    return 'You do not have permission to view analytics data.';
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Network unavailable. Please check your connection and try again.';
  }
  console.log('Supabase analytics error:', error);
  console.log(JSON.stringify(error, null, 2));
  return error.message || 'An unexpected error occurred. Please try again.';
}

/** Count rows in a table with a head query (no data transfer). */
async function countRows(
  table: 'profiles' | 'announcements' | 'tickets' | 'meter_readings',
  build: (q: any) => any
): Promise<number> {
  let query: any = supabase.from(table).select('id', { count: 'exact', head: true });
  query = build(query);
  const { count, error } = await query;
  if (error) {
    throw new Error(getAnalyticsErrorMessage(error));
  }
  return count ?? 0;
}

const TICKET_STATUSES = [
  'open',
  'acknowledged',
  'assigned',
  'scheduled',
  'in_progress',
  'work_completed',
  'resolved',
  'closed',
] as const;
const READING_STATUSES = ['assigned', 'pending_review', 'approved', 'rejected', 'billed'] as const;

/** Fetch role-id â†’ role-name map once for profile role filters. */
async function getRoleIdMap(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from('roles').select('id, name');
  if (error) {
    throw new Error(getAnalyticsErrorMessage(error));
  }
  const map = new Map<string, string>();
  (data ?? []).forEach((r) => map.set(r.name, r.id));
  return map;
}

export type TrendGranularity = 'day' | 'week' | 'month' | 'year';

export type ChartPeriodId = 'daily' | 'weekly' | 'monthly' | 'yearly';

export const CHART_PERIODS: {
  id: ChartPeriodId;
  label: string;
  days: number;
  granularity: TrendGranularity;
  subtitle: string;
}[] = [
  {
    id: 'daily',
    label: 'Daily',
    days: 7,
    granularity: 'day',
    subtitle: 'Service requests created over the last 7 days',
  },
  {
    id: 'weekly',
    label: 'Weekly',
    days: 84,
    granularity: 'week',
    subtitle: 'Service requests created over the last 12 weeks',
  },
  {
    id: 'monthly',
    label: 'Monthly',
    days: 365,
    granularity: 'month',
    subtitle: 'Service requests created over the last 12 months',
  },
  {
    id: 'yearly',
    label: 'Yearly',
    days: 365 * 5,
    granularity: 'year',
    subtitle: 'Service requests created over the last 5 years',
  },
];

/** Build a list of day buckets for the last `days` days (oldest → newest). */
function dayBuckets(days: number): { key: string; label: string; date: Date }[] {
  const buckets: { key: string; label: string; date: Date }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    buckets.push({
      key: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      date: d,
    });
  }
  return buckets;
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfWeek(d: Date): Date {
  const day = startOfLocalDay(d);
  day.setDate(day.getDate() - day.getDay());
  return day;
}

function bucketKey(date: Date, granularity: TrendGranularity): string {
  if (granularity === 'day') {
    return startOfLocalDay(date).toISOString().slice(0, 10);
  }
  if (granularity === 'week') {
    return startOfWeek(date).toISOString().slice(0, 10);
  }
  if (granularity === 'month') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
  return String(date.getFullYear());
}

function bucketLabel(date: Date, granularity: TrendGranularity): string {
  if (granularity === 'day') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  if (granularity === 'week') {
    return startOfWeek(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  if (granularity === 'month') {
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
  return String(date.getFullYear());
}

function buildBuckets(
  days: number,
  granularity: TrendGranularity
): { key: string; label: string }[] {
  const now = new Date();
  const buckets: { key: string; label: string }[] = [];
  const seen = new Set<string>();

  if (granularity === 'day') {
    return dayBuckets(days).map((b) => ({ key: b.key, label: b.label }));
  }

  if (granularity === 'week') {
    const weeks = Math.max(1, Math.ceil(days / 7));
    for (let i = weeks - 1; i >= 0; i--) {
      const d = startOfWeek(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7));
      const key = bucketKey(d, 'week');
      if (seen.has(key)) continue;
      seen.add(key);
      buckets.push({ key, label: bucketLabel(d, 'week') });
    }
    return buckets;
  }

  if (granularity === 'month') {
    const months = Math.max(1, Math.round(days / 30));
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = bucketKey(d, 'month');
      if (seen.has(key)) continue;
      seen.add(key);
      buckets.push({ key, label: bucketLabel(d, 'month') });
    }
    return buckets;
  }

  const years = Math.max(1, Math.round(days / 365));
  for (let i = years - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear() - i, 0, 1);
    const key = bucketKey(d, 'year');
    if (seen.has(key)) continue;
    seen.add(key);
    buckets.push({ key, label: bucketLabel(d, 'year') });
  }
  return buckets;
}

function countPerBucket(
  rows: { created_at: string }[],
  days: number,
  granularity: TrendGranularity = 'day'
): TrendPoint[] {
  const buckets = buildBuckets(days, granularity);
  const counts = new Map<string, number>();
  buckets.forEach((b) => counts.set(b.key, 0));
  rows.forEach((row) => {
    const key = bucketKey(new Date(row.created_at), granularity);
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  });
  return buckets.map((b) => ({ label: b.label, value: counts.get(b.key) ?? 0 }));
}

/** Compute summary stats across residents, staff, tickets, readings, announcements. */
export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const roleMap = await getRoleIdMap();
  const residentRoleId = roleMap.get('resident') ?? '';
  const staffRoleId = roleMap.get('staff') ?? '';
  const meterReaderRoleId = roleMap.get('meter_reader') ?? '';
  const adminRoleId = roleMap.get('super_admin') ?? '';

  // Skip the query when a role is missing — Postgres rejects .eq('role_id', '') as an invalid UUID.
  const countActiveProfiles = (roleId: string) => {
    if (!roleId) return Promise.resolve(0);
    return countRows('profiles', (q) => q.eq('role_id', roleId).eq('is_active', true));
  };

  const [totalResidents, activeStaff, totalMeterReaders] = await Promise.all([
    countActiveProfiles(residentRoleId),
    countActiveProfiles(staffRoleId),
    countActiveProfiles(meterReaderRoleId),
  ]);

  const activeAdmins = await countActiveProfiles(adminRoleId);

  const [totalAnnouncements, ...ticketCounts] = await Promise.all([
    countRows('announcements', (q) => q.is('deleted_at', null)),
    ...TICKET_STATUSES.map((s) =>
      countRows('tickets', (q) => q.eq('status', s).is('deleted_at', null))
    ),
  ]);

  const readingCounts = await Promise.all(
    READING_STATUSES.map((s) =>
      countRows('meter_readings', (q) => q.eq('status', s).is('deleted_at', null))
    )
  );

  const tickets = {
    open: ticketCounts[0],
    acknowledged: ticketCounts[1],
    assigned: ticketCounts[2],
    scheduled: ticketCounts[3],
    in_progress: ticketCounts[4],
    work_completed: ticketCounts[5],
    resolved: ticketCounts[6],
    closed: ticketCounts[7],
  };
  const readings = {
    assigned: readingCounts[0],
    pending_review: readingCounts[1],
    approved: readingCounts[2],
    rejected: readingCounts[3],
    billed: readingCounts[4],
  };

  return {
    totalResidents,
    totalStaff: activeStaff + activeAdmins,
    totalMeterReaders,
    totalAnnouncements,
    activeStaff: activeStaff + activeAdmins,
    tickets,
    readings,
  };
}

async function fetchCreatedAt(
  table: 'tickets' | 'meter_readings' | 'announcements' | 'profiles',
  from: string,
  extra: (q: any) => any
): Promise<{ created_at: string }[]> {
  let query: any = supabase
    .from(table)
    .select('created_at')
    .gte('created_at', from)
    .order('created_at', { ascending: true });
  query = extra(query);
  const { data, error } = await query;
  if (error) {
    throw new Error(getAnalyticsErrorMessage(error));
  }
  return (data ?? []) as { created_at: string }[];
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

/** Tickets created per bucket over the last `days` days. */
export async function getTicketTrends(
  days = 30,
  granularity: TrendGranularity = 'day'
): Promise<TrendPoint[]> {
  const rows = await fetchCreatedAt('tickets', daysAgoIso(days), (q) =>
    q.is('deleted_at', null)
  );
  return countPerBucket(rows, days, granularity);
}

/** Readings submitted (left 'assigned') per bucket over the last `days` days. */
export async function getReadingCompletionTrends(
  days = 30,
  granularity: TrendGranularity = 'day'
): Promise<TrendPoint[]> {
  const rows = await fetchCreatedAt('meter_readings', daysAgoIso(days), (q) =>
    q.in('status', ['pending_review', 'approved', 'rejected', 'billed']).is('deleted_at', null)
  );
  return countPerBucket(rows, days, granularity);
}

/** Announcements published per bucket over the last `days` days. */
export async function getAnnouncementActivity(
  days = 30,
  granularity: TrendGranularity = 'day'
): Promise<TrendPoint[]> {
  const rows = await fetchCreatedAt('announcements', daysAgoIso(days), (q) =>
    q.eq('is_published', true).is('deleted_at', null)
  );
  return countPerBucket(rows, days, granularity);
}

/** Cumulative resident growth over the last `days` days (running total). */
export async function getResidentGrowth(days = 90): Promise<TrendPoint[]> {
  const roleMap = await getRoleIdMap();
  const residentRoleId = roleMap.get('resident');
  // Avoid .eq('role_id', '') which Postgres rejects as invalid UUID syntax.
  if (!residentRoleId) {
    return dayBuckets(days).map((b) => ({ label: b.label, value: 0 }));
  }
  const rows = await fetchCreatedAt('profiles', daysAgoIso(days), (q) =>
    q.eq('role_id', residentRoleId)
  );

  const buckets = dayBuckets(days);
  const counts = new Map<string, number>();
  buckets.forEach((b) => counts.set(b.key, 0));
  rows.forEach((row) => {
    const key = row.created_at.slice(0, 10);
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  });

  let running = 0;
  return buckets.map((b) => {
    running += counts.get(b.key) ?? 0;
    return { label: b.label, value: running };
  });
}

/** Convenience: load everything the analytics dashboard needs at once. */
export async function getAnalyticsData(
  days = 30,
  granularity: TrendGranularity = 'day'
): Promise<AnalyticsData> {
  const [summary, ticketTrends, readingCompletionTrends, announcementActivity, residentGrowth] =
    await Promise.all([
      getAnalyticsSummary(),
      getTicketTrends(days, granularity),
      getReadingCompletionTrends(days, granularity),
      getAnnouncementActivity(days, granularity),
      getResidentGrowth(Math.max(days, 90)),
    ]);

  return {
    summary,
    ticketTrends,
    readingCompletionTrends,
    announcementActivity,
    residentGrowth,
  };
}
