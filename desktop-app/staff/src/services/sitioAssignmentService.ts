import { supabase } from '../lib/supabase';
import type { MeterReaderOption } from '../types';

/** One row of the sitio_assignments table (+ joined reader name). */
export interface SitioAssignment {
  id: string;
  sitio: string;
  meter_reader_id: string;
  assigned_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  /** Joined profiles row for the assigned reader. */
  reader?: { id: string; first_name: string; last_name: string } | null;
}

export function getSitioAssignmentErrorMessage(error: {
  message: string;
  code?: string;
}): string {
  const msg = error.message?.toLowerCase() ?? '';
  const code = error?.code ?? '';

  if (msg.includes('relation') || msg.includes('does not exist') || code === '42P01') {
    return 'Sitio assignments have not been set up yet. Please run the latest SQL migration.';
  }
  if (
    code === '42501' ||
    msg.includes('row-level security') ||
    msg.includes('permission denied')
  ) {
    return 'You do not have permission to manage sitio assignments. Only staff can.';
  }
  if (msg.includes('duplicate') || msg.includes('unique')) {
    return 'That sitio is already assigned to a meter reader.';
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Network unavailable. Please check your connection and try again.';
  }
  return error.message || 'An unexpected error occurred. Please try again.';
}

const SELECT =
  '*, reader:profiles!sitio_assignments_meter_reader_id_fkey(id, first_name, last_name)';

function mapRow(row: SitioAssignment): SitioAssignment {
  return { ...row, reader: row.reader ?? null };
}

/** All sitio assignments (one per sitio). */
export async function getSitioAssignments(): Promise<SitioAssignment[]> {
  const { data, error } = await supabase
    .from('sitio_assignments')
    .select(SELECT)
    .order('sitio', { ascending: true });

  if (error) {
    throw new Error(getSitioAssignmentErrorMessage(error));
  }

  return (data ?? []).map((row) => mapRow(row as unknown as SitioAssignment));
}

/**
 * Assign one sitio to a meter reader. The sitio column is UNIQUE in the
 * database, so assigning an already-assigned sitio fails unless it is
 * reassigned explicitly through reassignSitio().
 */
export async function assignSitio(
  sitio: string,
  meterReaderId: string,
  assignedBy: string
): Promise<SitioAssignment> {
  const { data, error } = await supabase
    .from('sitio_assignments')
    .insert({ sitio: sitio.trim(), meter_reader_id: meterReaderId, assigned_by: assignedBy })
    .select(SELECT)
    .single();

  if (error) {
    throw new Error(getSitioAssignmentErrorMessage(error));
  }

  return mapRow(data as unknown as SitioAssignment);
}

/** Explicitly move a sitio to another meter reader (requires confirmation in the UI). */
export async function reassignSitio(
  sitio: string,
  meterReaderId: string,
  assignedBy: string
): Promise<SitioAssignment> {
  const { data, error } = await supabase
    .from('sitio_assignments')
    .update({ meter_reader_id: meterReaderId, assigned_by: assignedBy })
    .eq('sitio', sitio.trim())
    .select(SELECT)
    .single();

  if (error) {
    throw new Error(getSitioAssignmentErrorMessage(error));
  }

  return mapRow(data as unknown as SitioAssignment);
}

/** Remove a sitio assignment, leaving the sitio unassigned. */
export async function unassignSitio(sitio: string): Promise<void> {
  const { error } = await supabase
    .from('sitio_assignments')
    .delete()
    .eq('sitio', sitio.trim());

  if (error) {
    throw new Error(getSitioAssignmentErrorMessage(error));
  }
}

/** Active meter readers for the assignment picker (same shape as readings). */
export async function getAssignableReaders(): Promise<MeterReaderOption[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, role:roles!inner(name)')
    .eq('is_active', true)
    .eq('role.name', 'meter_reader')
    .order('last_name');

  if (error) {
    throw new Error(getSitioAssignmentErrorMessage(error));
  }

  return (data ?? []) as unknown as MeterReaderOption[];
}

/**
 * Distinct sitios that actually exist on resident accounts, so newly added
 * areas appear without code changes (canonical list first, extras appended).
 */
export async function getKnownSitios(): Promise<string[]> {
  const { SITIO_OPTIONS } = await import('../constants');
  const { data, error } = await supabase
    .from('resident_accounts')
    .select('sitio')
    .not('sitio', 'is', null)
    .order('sitio', { ascending: true });

  if (error) {
    throw new Error(getSitioAssignmentErrorMessage(error));
  }

  const dbSitios = [
    ...new Set(
      (data ?? [])
        .map((d) => ((d as { sitio: string | null }).sitio ?? '').trim())
        .filter(Boolean)
    ),
  ];
  const known = new Set<string>(SITIO_OPTIONS);
  return [...SITIO_OPTIONS, ...dbSitios.filter((s) => !known.has(s))];
}
