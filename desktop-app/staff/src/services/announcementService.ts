import { supabase } from '../lib/supabase';
import type {
  Announcement,
  AnnouncementDraft,
  AnnouncementAudience,
} from '../types';

// ── Query Options ──

export interface AnnouncementQueryOptions {
  /** Restrict to announcements targeting this audience (plus 'all'). */
  audience?: AnnouncementAudience;
  /** Only return published (and not expired) announcements. */
  publishedOnly?: boolean;
  /** Maximum number of rows to return. */
  limit?: number;
}

// ── Error Handling ──

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
    return 'The announcements table has not been set up yet. Please run the SQL migration to create the required tables.';
  }
  if (code === '42501' || msg.includes('row-level security') || msg.includes('permission denied')) {
    return 'You do not have permission to perform this action. Only staff and administrators can manage announcements.';
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Network unavailable. Please check your connection and try again.';
  }
  if (msg.includes('rate limit')) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  // Surface the real error so the root cause is never hidden during development.
  console.log('Supabase announcement error:', error);
  console.log(JSON.stringify(error, null, 2));
  return error.message || 'An unexpected error occurred. Please try again.';
}

/**
 * Coerce a form-provided expiration date into SQL NULL or a valid ISO string.
 * Empty/null/invalid values become JavaScript `null` — never the string
 * `"null"` — so Postgres receives a proper NULL for the TIMESTAMPTZ column.
 */
function toNullableTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    console.warn('[announcements] Ignoring invalid expires_at:', value);
    return null;
  }
  return parsed.toISOString();
}

// ── Row Mapping ──

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

// ── Queries ──

/**
 * Fetch announcements.
 * - Staff/Admin: returns all non-deleted announcements (drafts + published).
 * - Read-only audiences (residents/meter readers): only published, non-expired,
 *   non-deleted announcements that target them (or 'all').
 */
export async function getAnnouncements(
  options: AnnouncementQueryOptions = {}
): Promise<Announcement[]> {
  let query = supabase
    .from('announcements')
    .select(SELECT_FIELDS)
    .eq('deleted_at', null)
    .order('created_at', { ascending: false });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.publishedOnly || options.audience) {
    query = query.eq('is_published', true);
    // PostgREST does NOT evaluate now() inside filters — it would send the
    // literal 'now()' and Postgres fails to cast it to timestamptz. Send a
    // real ISO timestamp computed on the client instead.
    query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
  }

  if (options.audience && options.audience !== 'all') {
    query = query.in('target_audience', ['all', options.audience]);
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
    .maybeSingle();

  if (error) {
    throw new Error(getAnnouncementErrorMessage(error));
  }

  return data ? mapRow(data as AnnouncementRow) : null;
}

// ── Mutations ──

/** Create a new announcement. */
export async function createAnnouncement(
  draft: AnnouncementDraft,
  createdBy: string
): Promise<Announcement> {
  const payload = {
    title: draft.title,
    content: draft.content,
    category: draft.category,
    priority: draft.priority,
    target_audience: draft.target_audience,
    is_published: draft.is_published,
    expires_at: toNullableTimestamp(draft.expires_at),
    created_by: createdBy,
  };
  console.log('Announcement payload:', payload);
  const { data, error } = await supabase
    .from('announcements')
    .insert(payload)
    .select(SELECT_FIELDS)
    .single();

  if (error) {
    throw new Error(getAnnouncementErrorMessage(error));
  }

  return mapRow(data as AnnouncementRow);
}

/** Update an existing announcement (editable fields only). */
export async function updateAnnouncement(
  id: string,
  draft: AnnouncementDraft
): Promise<Announcement> {
  const payload = {
    title: draft.title,
    content: draft.content,
    category: draft.category,
    priority: draft.priority,
    target_audience: draft.target_audience,
    is_published: draft.is_published,
    expires_at: toNullableTimestamp(draft.expires_at),
  };
  console.log('Announcement payload:', payload);
  const { data, error } = await supabase
    .from('announcements')
    .update(payload)
    .eq('id', id)
    .select(SELECT_FIELDS)
    .single();

  if (error) {
    throw new Error(getAnnouncementErrorMessage(error));
  }

  return mapRow(data as AnnouncementRow);
}

/** Soft-delete an announcement by setting deleted_at. */
export async function deleteAnnouncement(id: string): Promise<void> {
  const { error } = await supabase
    .from('announcements')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    throw new Error(getAnnouncementErrorMessage(error));
  }
}

// ── Realtime ──

/**
 * Subscribe to insert/update/delete events on the announcements table.
 * Returns an unsubscribe function. The callback fires with the event type
 * ('INSERT' | 'UPDATE' | 'DELETE') and the affected row (if any).
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
        const row = payload.new
          ? mapRow(payload.new as AnnouncementRow)
          : null;
        callback(event, row);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
