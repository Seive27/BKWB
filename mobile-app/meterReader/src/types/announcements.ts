/**
 * Announcement domain types for the meter reader app.
 * Mirrors the Supabase `announcements` table schema.
 */

export type AnnouncementCategory =
  | 'schedule'
  | 'interruption'
  | 'maintenance'
  | 'billing'
  | 'general'
  | 'emergency';

export type AnnouncementPriority = 'normal' | 'important' | 'emergency';

export type AnnouncementAudience = 'all' | 'residents' | 'meter_readers' | 'staff';

export interface AnnouncementCreator {
  id: string;
  first_name: string;
  last_name: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  target_audience: AnnouncementAudience;
  created_by: string | null;
  is_published: boolean;
  expires_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  /** Joined profiles row (from created_by) for display. */
  creator?: AnnouncementCreator | null;
}

export const ANNOUNCEMENT_CATEGORY_LABELS: Record<AnnouncementCategory, string> = {
  schedule: 'Water Schedule',
  interruption: 'Water Interruption',
  maintenance: 'Maintenance',
  billing: 'Billing',
  general: 'General Announcement',
  emergency: 'Emergency',
};

export const ANNOUNCEMENT_PRIORITY_LABELS: Record<AnnouncementPriority, string> = {
  normal: 'Normal',
  important: 'Important',
  emergency: 'Emergency',
};
