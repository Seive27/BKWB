import { supabase } from '@/lib/supabase';
import type { Announcement, AnnouncementAudience } from '@/types/announcements';

export interface AnnouncementQueryOptions {
  /** Restrict to announcements targeting this audience (plus 'all'). */
  audience?: AnnouncementAudience;
  /** Maximum number of rows to return. */
  limit?: number;
}

/** Map Supabase/PostgREST errors to user-friendly messages. */
export function getAnnouncementErrorMessage(error: {
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
    return 'The announcements table has not been set up yet. Please run the SQL migration.';
  }
  if (code === '42501' || msg.includes('row-level security') || msg.includes('permission denied')) {
    return "You don't have permission to view announcements.";
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Network unavailable. Please check your connection and try again.';
  }
  return error.message || 'An unexpected error occurred. Please try again.';
}

interface AnnouncementRow {
  id: string;
  title: string;
  content: string;
  category: Announcement['category'];
  priority: Announcement['priority'];
  target_audience: AnnouncementAudience;
  created_by: string | null;
  is_published: boolean;
  expires_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  creator?: { id: string; first_name: string; last_name: string } | null;
}

function mapRow(row: AnnouncementRow): Announcement {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    category: row.category,
    priority: row.priority,
    target_audience: row.target_audience,
    created_by: row.created_by,
    is_published: row.is_published,
    expires_at: row.expires_at,
    deleted_at: row.deleted_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    creator: row.creator ?? null,
  };
}

const SELECT_FIELDS = '*, creator:profiles!announcements_created_by_fkey(id, first_name, last_name)';

/**
 * Fetch published, non-expired, non-deleted announcements that target the
 * given audience (or 'all'). Residents have read-only access.
 */
export async function getAnnouncements(
  options: AnnouncementQueryOptions = {}
): Promise<Announcement[]> {
  let query = supabase
    .from('announcements')
    .select(SELECT_FIELDS)
    .eq('deleted_at', null)
    .eq('is_published', true)
    .or('expires_at.is.null,expires_at.gt.now()')
    .order('created_at', { ascending: false });

  if (options.audience && options.audience !== 'all') {
    query = query.in('target_audience', ['all', options.audience]);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(getAnnouncementErrorMessage(error));
  }

  return (data ?? []).map(mapRow);
}

/** Fetch a single announcement by id. */
export async function getAnnouncementById(id: string): Promise<Announcement | null> {
  const { data, error } = await supabase
    .from('announcements')
    .select(SELECT_FIELDS)
    .eq('id', id)
    .eq('deleted_at', null)
    .eq('is_published', true)
    .maybeSingle();

  if (error) {
    throw new Error(getAnnouncementErrorMessage(error));
  }

  return data ? mapRow(data as AnnouncementRow) : null;
}

/**
 * Subscribe to insert/update/delete events on the announcements table.
 * Returns an unsubscribe function. The callback fires with the event type
 * and the affected row (if any).
 */
export function subscribeToAnnouncements(
  callback: (event: 'INSERT' | 'UPDATE' | 'DELETE', row?: Announcement | null) => void
): () => void {
  const channel = supabase
    .channel('announcements-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'announcements' },
      (payload) => {
        const event = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
        const row = payload.new ? mapRow(payload.new as AnnouncementRow) : null;
        callback(event, row);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
