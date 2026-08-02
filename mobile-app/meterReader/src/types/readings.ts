/**
 * Meter reading types for the meter reader app.
 * Mirrors the Supabase `meter_readings`, `resident_accounts` and `meters` tables.
 */

export type MeterReadingStatus =
  | 'assigned'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'billed';

/** A person joined from the profiles table (resident, meter reader, staff). */
export interface ReadingPerson {
  id: string;
  first_name: string;
  last_name: string;
}

/** The resident account (service connection) the reading belongs to. */
export interface ReadingAccount {
  id: string;
  account_number: string;
  service_address: string | null;
}

/** The water meter attached to the account. */
export interface ReadingMeter {
  id: string;
  meter_number: string;
}

/** A row of the meter_readings table, with joined people/account/meter. */
export interface MeterReading {
  id: string;
  account_id: string;
  resident_id: string;
  meter_id: string | null;
  meter_reader_id: string | null;
  assigned_by: string | null;
  assignment_date: string;
  reading_date: string | null;
  previous_reading: number;
  current_reading: number | null;
  /** Auto-calculated by the database: current - previous (never negative). */
  consumption: number | null;
  status: MeterReadingStatus;
  remarks: string | null;
  photo_url: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  /** Joined profiles row for the resident. */
  resident?: ReadingPerson | null;
  /** Joined resident_accounts row (account number + address). */
  account?: ReadingAccount | null;
  /** Joined meters row. */
  meter?: ReadingMeter | null;
  /** Joined profiles row for the assigned meter reader. */
  meter_reader?: ReadingPerson | null;
  /** Joined profiles row for the staff who assigned it. */
  assigner?: ReadingPerson | null;
  /** Joined profiles row for the staff who reviewed it. */
  reviewer?: ReadingPerson | null;
}

export const METER_READING_STATUS_LABELS: Record<MeterReadingStatus, string> = {
  assigned: 'Assigned',
  pending_review: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  billed: 'Billed',
};
