import { supabase } from '../lib/supabase';
import type { AuditLogEntry, AuditLogQueryOptions } from '../types';

export function getAuditLogErrorMessage(error: {
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
    return 'The audit_logs table has not been set up yet. Please run the SQL migration to create the required tables.';
  }
  if (code === '42501' || msg.includes('row-level security') || msg.includes('permission denied')) {
    return 'You do not have permission to view audit logs. Only staff and administrators can access them.';
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Network unavailable. Please check your connection and try again.';
  }
  console.log('Supabase audit log error:', error);
  console.log(JSON.stringify(error, null, 2));
  return error.message || 'An unexpected error occurred. Please try again.';
}

interface AuditLogRow {
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
  user?: { id: string; first_name: string; last_name: string } | null;
}

function mapRow(row: AuditLogRow): AuditLogEntry {
  return {
    id: row.id,
    user_id: row.user_id,
    role_name: row.role_name,
    module: row.module,
    action: row.action,
    target_type: row.target_type,
    target_id: row.target_id,
    description: row.description,
    old_value: row.old_value,
    new_value: row.new_value,
    ip_address: row.ip_address,
    created_at: row.created_at,
    user: row.user ?? null,
  };
}

const SELECT_FIELDS = '*, user:profiles!audit_logs_user_id_fkey(id, first_name, last_name)';

/**
 * Fetch audit log entries with optional filtering + sorting.
 * `search` matches against the description text.
 */
export async function getAuditLogs(
  options: AuditLogQueryOptions = {}
): Promise<AuditLogEntry[]> {
  let query = supabase
    .from('audit_logs')
    .select(SELECT_FIELDS)
    .order('created_at', { ascending: (options.orderDirection ?? 'desc') === 'asc' });

  if (options.module) {
    query = query.eq('module', options.module);
  }
  if (options.action) {
    query = query.eq('action', options.action);
  }
  if (options.from) {
    query = query.gte('created_at', options.from);
  }
  if (options.to) {
    query = query.lte('created_at', options.to);
  }
  if (options.search) {
    query = query.ilike('description', '%' + options.search + '%');
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(getAuditLogErrorMessage(error));
  }

  return (data ?? []).map(mapRow);
}

/**
 * Record an authentication event (login/logout) from the app layer.
 * Authentication cannot be captured by a DB trigger, so each desktop app
 * calls this after a successful sign-in or sign-out.
 */
export async function logAuthAction(
  action: 'login' | 'logout',
  userId: string,
  roleName: string | null
): Promise<void> {
  const { error } = await supabase.from('audit_logs').insert({
    user_id: userId,
    role_name: roleName,
    module: 'auth',
    action,
    target_type: 'session',
    description: action === 'login' ? 'User logged in' : 'User logged out',
  });

  if (error) {
    // Never block the auth flow on an audit failure — log and continue.
    console.warn('[audit] Failed to record', action, error.message);
  }
}

/** Subscribe to new audit log rows (live console feed). */
export function subscribeToAuditLogs(
  callback: (event: 'INSERT', row: AuditLogEntry) => void
): () => void {
  // Supabase channels are singletons keyed by name, so use a unique name per
  // call to avoid "cannot add callbacks after subscribe()" when the page and
  // console subscribe at once.
  const channel = supabase
    .channel(`audit-logs-changes-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'audit_logs' },
      (payload) => {
        if (payload.new) {
          callback('INSERT', mapRow(payload.new as AuditLogRow));
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/** Trigger a browser download of the given rows as a CSV file. */
export function exportAuditLogsToCsv(
  logs: AuditLogEntry[],
  filename = 'audit-logs.csv'
): void {
  const columns: { key: string; label: string }[] = [
    { key: 'created_at', label: 'Timestamp' },
    { key: 'user_name', label: 'User' },
    { key: 'role_name', label: 'Role' },
    { key: 'module', label: 'Module' },
    { key: 'action', label: 'Action' },
    { key: 'target_type', label: 'Target Type' },
    { key: 'target_id', label: 'Target ID' },
    { key: 'description', label: 'Description' },
  ];

  const rows = logs.map((log) => {
    const user = log.user
      ? [log.user.first_name, log.user.last_name].filter((n) => n && n.trim()).join(' ').trim() || 'Unknown User'
      : 'System';
    return {
      created_at: new Date(log.created_at).toLocaleString(),
      user_name: user,
      role_name: log.role_name ?? '',
      module: log.module,
      action: log.action,
      target_type: log.target_type ?? '',
      target_id: log.target_id ?? '',
      description: log.description ?? '',
    };
  });

  const header = columns.map((c) => c.label).join(',');
  const lines = rows.map((row) =>
    columns
      .map((c) => {
        const value = row[c.key as keyof typeof row];
        const text = value == null ? '' : String(value);
        return '"' + text.replace(/"/g, '""') + '"';
      })
      .join(',')
  );
  const csv = [header, ...lines].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
