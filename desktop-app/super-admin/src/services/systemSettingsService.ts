import { supabase } from '../lib/supabase';
import type { SystemSetting } from '../types';

export function getSystemSettingsErrorMessage(error: {
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
    return 'The system_settings table has not been set up yet. Please run the SQL migration to create the required tables.';
  }
  if (code === '42501' || msg.includes('row-level security') || msg.includes('permission denied')) {
    return 'You do not have permission to manage system settings.';
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Network unavailable. Please check your connection and try again.';
  }
  console.log('Supabase system settings error:', error);
  console.log(JSON.stringify(error, null, 2));
  return error.message || 'An unexpected error occurred. Please try again.';
}

interface SystemSettingRow {
  id: string;
  key: string;
  value: unknown;
  category: string;
  label: string | null;
  description: string | null;
  is_public: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: SystemSettingRow): SystemSetting {
  return {
    id: row.id,
    key: row.key,
    value: row.value,
    category: row.category,
    label: row.label,
    description: row.description,
    is_public: row.is_public,
    updated_by: row.updated_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** Fetch settings, optionally filtered by category. */
export async function getSystemSettings(
  category?: string
): Promise<SystemSetting[]> {
  let query = supabase
    .from('system_settings')
    .select('*')
    .order('key', { ascending: true });

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(getSystemSettingsErrorMessage(error));
  }

  return (data ?? []).map(mapRow);
}

/** Fetch a single setting value by key (decoded). */
export async function getSettingValue(key: string): Promise<unknown> {
  const { data, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error) {
    throw new Error(getSystemSettingsErrorMessage(error));
  }

  return data?.value ?? null;
}

/**
 * Save a batch of settings. Only `key` + `value` (plus audit metadata) are
 * written; category/label/description stay untouched via upsert-on-conflict.
 */
export async function saveSystemSettings(
  entries: { key: string; value: unknown }[]
): Promise<void> {
  if (entries.length === 0) return;

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;

  const payload = entries.map((entry) => ({
    key: entry.key,
    value: entry.value,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('system_settings')
    .upsert(payload, { onConflict: 'key' });

  if (error) {
    throw new Error(getSystemSettingsErrorMessage(error));
  }
}

/** Subscribe to setting changes (syncs the page across sessions). */
export function subscribeToSystemSettings(
  callback: (event: 'INSERT' | 'UPDATE' | 'DELETE', row?: SystemSetting | null) => void
): () => void {
  // Supabase channels are singletons keyed by name, so use a unique name per
  // call to avoid "cannot add callbacks after subscribe()".
  const channel = supabase
    .channel(`system-settings-changes-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'system_settings' },
      (payload) => {
        const event = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
        const row = payload.new ? mapRow(payload.new as SystemSettingRow) : null;
        callback(event, row);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
