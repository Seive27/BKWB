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

const TICKET_STATUSES = ['open', 'assigned', 'in_progress', 'resolved', 'closed'] as const;
const READING_STATUSES = ['assigned', 'pending_review', 'approved', 'rejected', 'billed'] as const;

/** Fetch role-id → role-name map once for profile role filters. */
async function getRoleIdMap(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from('roles').select('id, name');
  if (error) {
    throw new Error(getAnalyticsErrorMessage(error));
  }
  const map = new Map<string, string>();
  (data ?? []).forEach((r) => map.set(r.name, r.id));
  return map;
}

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

function countPerDay(rows: { created_at: string }[], days: number): TrendPoint[] {
  const buckets = dayBuckets(days);
  const counts = new Map<string, number>();
  buckets.forEach((b) => counts.set(b.key, 0));
  rows.forEach((row) => {
    const key = row.created_at.slice(0, 10);
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
    assigned: ticketCounts[1],
    in_progress: ticketCounts[2],
    resolved: ticketCounts[3],
    closed: ticketCounts[4],
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

/** Tickets created per day over the last `days` days. */
export async function getTicketTrends(days = 30): Promise<TrendPoint[]> {
  const rows = await fetchCreatedAt('tickets', daysAgoIso(days), (q) =>
    q.is('deleted_at', null)
  );
  return countPerDay(rows, days);
}

/** Readings submitted (left 'assigned') per day over the last `days` days. */
export async function getReadingCompletionTrends(days = 30): Promise<TrendPoint[]> {
  const rows = await fetchCreatedAt('meter_readings', daysAgoIso(days), (q) =>
    q.in('status', ['pending_review', 'approved', 'rejected', 'billed']).is('deleted_at', null)
  );
  return countPerDay(rows, days);
}

/** Announcements published per day over the last `days` days. */
export async function getAnnouncementActivity(days = 30): Promise<TrendPoint[]> {
  const rows = await fetchCreatedAt('announcements', daysAgoIso(days), (q) =>
    q.eq('is_published', true).is('deleted_at', null)
  );
  return countPerDay(rows, days);
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
export async function getAnalyticsData(days = 30): Promise<AnalyticsData> {
  const [summary, ticketTrends, readingCompletionTrends, announcementActivity, residentGrowth] =
    await Promise.all([
      getAnalyticsSummary(),
      getTicketTrends(days),
      getReadingCompletionTrends(days),
      getAnnouncementActivity(days),
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
