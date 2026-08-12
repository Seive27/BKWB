import { File } from 'expo-file-system';

import { supabase } from '@/lib/supabase';
import type { MeterReading } from '@/types/readings';

/** Progress summary for one sitio assignment route. */
export interface SitioRouteProgress {
  sitio: string;
  total: number;
  completed: number;
  remaining: number;
  percent: number;
  readings: MeterReading[];
}

// ── Error Handling ──

/** Map Supabase/PostgREST errors to user-friendly messages. */
export function getMeterReadingErrorMessage(error: {
  message: string;
  code?: string;
}): string {
  const msg = error.message?.toLowerCase() ?? '';
  const code = error?.code ?? '';

  if (
    code === '42P01' ||
    (msg.includes('does not exist') &&
      (msg.includes('relation') || msg.includes('table')))
  ) {
    return 'The meter readings tables have not been set up yet. Please run the SQL migration.';
  }
  if (
    code === '42501' ||
    msg.includes('row-level security') ||
    msg.includes('permission denied')
  ) {
    return 'You do not have permission to perform this action.';
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Network unavailable. Please check your connection and try again.';
  }
  if (msg.includes('rate limit')) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  return error.message || 'An unexpected error occurred. Please try again.';
}

// ── Row Mapping ──

/** Full row shape incl. optional joined resources (resident/account/meter/…). */
type MeterReadingRow = MeterReading;

function mapRow(row: MeterReadingRow): MeterReading {
  return {
    ...row,
    resident: row.resident ?? null,
    account: row.account ?? null,
    meter: row.meter ?? null,
    meter_reader: row.meter_reader ?? null,
    assigner: row.assigner ?? null,
    reviewer: row.reviewer ?? null,
  };
}

const READING_SELECT =
  '*, resident:profiles!meter_readings_resident_id_fkey(id, first_name, last_name), account:resident_accounts!meter_readings_account_id_fkey(id, account_number, service_address, sitio), meter:meters!meter_readings_meter_id_fkey(id, meter_number), meter_reader:profiles!meter_readings_meter_reader_id_fkey(id, first_name, last_name), assigner:profiles!meter_readings_assigned_by_fkey(id, first_name, last_name), reviewer:profiles!meter_readings_reviewed_by_fkey(id, first_name, last_name)';

/** Returns the currently authenticated meter reader's id or throws. */
async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error('You must be logged in to view meter readings.');
  }
  return data.user.id;
}

// ── Queries ──

/** Fetch the reader's current assigned (not yet submitted) readings. */
export async function getAssignedReadings(): Promise<MeterReading[]> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('meter_readings')
    .select(READING_SELECT)
    .eq('meter_reader_id', userId)
    .eq('status', 'assigned')
    .is('deleted_at', null)
    .order('assignment_date', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(getMeterReadingErrorMessage(error));
  }

  return (data ?? []).map((row) => mapRow(row as unknown as MeterReadingRow));
}

/**
 * Fetch progress for sitios the reader still has open assignments in.
 * Includes submitted readings from the same assignment dates so the progress
 * bar can move as the reader completes the route.
 */
export async function getSitioRouteProgress(): Promise<SitioRouteProgress[]> {
  const userId = await requireUserId();

  const { data: openRows, error: openError } = await supabase
    .from('meter_readings')
    .select(READING_SELECT)
    .eq('meter_reader_id', userId)
    .eq('status', 'assigned')
    .is('deleted_at', null)
    .order('assignment_date', { ascending: true })
    .order('created_at', { ascending: true });

  if (openError) {
    throw new Error(getMeterReadingErrorMessage(openError));
  }

  const remaining = (openRows ?? []).map((row) =>
    mapRow(row as unknown as MeterReadingRow)
  );
  if (remaining.length === 0) return [];

  const sitios = [
    ...new Set(
      remaining.map((r) => (r.account?.sitio ?? '').trim() || 'Unassigned Sitio')
    ),
  ];
  const dates = [...new Set(remaining.map((r) => r.assignment_date))];

  const { data: routeRows, error: routeError } = await supabase
    .from('meter_readings')
    .select(READING_SELECT)
    .eq('meter_reader_id', userId)
    .in('assignment_date', dates)
    .is('deleted_at', null);

  if (routeError) {
    throw new Error(getMeterReadingErrorMessage(routeError));
  }

  const allRoute = (routeRows ?? []).map((row) =>
    mapRow(row as unknown as MeterReadingRow)
  );

  return sitios
    .map((sitio) => {
      const sitioRemaining = remaining.filter(
        (r) => ((r.account?.sitio ?? '').trim() || 'Unassigned Sitio') === sitio
      );
      const sitioAll = allRoute.filter(
        (r) =>
          ((r.account?.sitio ?? '').trim() || 'Unassigned Sitio') === sitio &&
          dates.includes(r.assignment_date)
      );
      const total = Math.max(sitioAll.length, sitioRemaining.length);
      const completed = Math.max(0, total - sitioRemaining.length);
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        sitio,
        total,
        completed,
        remaining: sitioRemaining.length,
        percent,
        readings: sitioRemaining,
      };
    })
    .sort((a, b) => a.sitio.localeCompare(b.sitio));
}

/** Fetch the reader's submitted readings (history), newest first. */
export async function getReadingHistory(): Promise<MeterReading[]> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('meter_readings')
    .select(READING_SELECT)
    .eq('meter_reader_id', userId)
    .neq('status', 'assigned')
    .is('deleted_at', null)
    .order('reading_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(getMeterReadingErrorMessage(error));
  }

  return (data ?? []).map((row) => mapRow(row as unknown as MeterReadingRow));
}

/** Fetch the logged-in meter reader's profile (first name for greetings). */
export async function getCurrentReaderProfile(): Promise<{
  id: string;
  first_name: string;
  last_name: string;
} | null> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data
    ? {
        id: data.id,
        first_name: data.first_name ?? '',
        last_name: data.last_name ?? '',
      }
    : null;
}

// ── Mutations ──

/**
 * Submit a reading for an assigned meter reading.
 * The consumption value is calculated by a database trigger; we also
 * validate current >= previous client-side so the reader gets instant
 * feedback and the DB stays consistent even if bypassed.
 */
export async function submitReading(
  id: string,
  currentReading: number,
  remarks?: string,
  photoUrl?: string | null
): Promise<MeterReading> {
  if (!Number.isFinite(currentReading) || currentReading < 0) {
    throw new Error('Please enter a valid current reading.');
  }

  const { data, error } = await supabase
    .from('meter_readings')
    .update({
      current_reading: currentReading,
      remarks: remarks && remarks.trim().length > 0 ? remarks.trim() : null,
      reading_date: new Date().toISOString(),
      status: 'pending_review',
      ...(photoUrl ? { photo_url: photoUrl } : {}),
    })
    .eq('id', id)
    .select(READING_SELECT)
    .single();

  if (error) {
    throw new Error(getMeterReadingErrorMessage(error));
  }

  return mapRow(data as unknown as MeterReadingRow);
}

function normalizeMeterNumber(value: string): string {
  return value.trim().toUpperCase();
}

function sitioLabel(reading: MeterReading): string {
  return (reading.account?.sitio ?? '').trim() || 'Unassigned Sitio';
}

function base64ToUint8Array(base64: string): Uint8Array {
  const normalized = base64.includes(',') ? (base64.split(',').pop() ?? '') : base64;
  const binary = globalThis.atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function extensionFromUri(uri: string): string {
  const extMatch = uri.split('?')[0]?.match(/\.(\w+)$/);
  const ext = (extMatch?.[1] ?? 'jpg').toLowerCase();
  return ext === 'jpeg' ? 'jpg' : ext;
}

/** Read a local camera/gallery file. Android file:// URIs often fail with fetch(). */
async function readLocalPhotoBytes(
  localUri: string,
  base64?: string | null
): Promise<{ bytes: Uint8Array; ext: string }> {
  const ext = extensionFromUri(localUri);

  if (base64 && base64.length > 0) {
    return { bytes: base64ToUint8Array(base64), ext };
  }

  try {
    const file = new File(localUri);
    const bytes = await file.bytes();
    if (bytes.byteLength > 0) {
      return { bytes, ext };
    }
  } catch {
    // Fall through to fetch for content:// or unusual URIs.
  }

  try {
    const response = await fetch(localUri);
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > 0) {
      return { bytes: new Uint8Array(buffer), ext };
    }
  } catch {
    // Handled below.
  }

  throw new Error('Could not read the meter photo. Please retake it and try again.');
}

/** Upload a meter photo to the `meter-images` bucket and return a signed URL. */
async function uploadMeterPhoto(
  localUri: string,
  readingId: string,
  base64?: string | null
): Promise<string> {
  const userId = await requireUserId();
  const { bytes, ext } = await readLocalPhotoBytes(localUri, base64);
  const contentType =
    ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const path = `${userId}/${readingId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('meter-images')
    .upload(path, bytes, {
      upsert: true,
      contentType,
    });

  if (uploadError) {
    throw new Error(uploadError.message || 'Failed to upload meter photo.');
  }

  const { data, error: signError } = await supabase.storage
    .from('meter-images')
    .createSignedUrl(path, 60 * 60 * 24 * 365);

  if (signError || !data?.signedUrl) {
    throw new Error(signError?.message || 'Failed to create a photo link.');
  }

  return data.signedUrl;
}

/**
 * Match the typed meter number to an open assignment in the selected sitio,
 * then submit the reading (and optional photo) against that resident account.
 */
export async function submitReadingByMeterNumber(input: {
  meterNumber: string;
  sitio: string;
  currentReading: number;
  remarks?: string;
  photoUri?: string | null;
  photoBase64?: string | null;
}): Promise<MeterReading> {
  if (!Number.isFinite(input.currentReading) || input.currentReading < 0) {
    throw new Error('Please enter a valid current reading.');
  }

  const meterNumber = normalizeMeterNumber(input.meterNumber);
  const sitio = input.sitio.trim();
  if (!meterNumber) {
    throw new Error('Please enter the meter number.');
  }
  if (!sitio) {
    throw new Error('Please select a sitio.');
  }

  const assigned = await getAssignedReadings();
  const inSitio = assigned.filter((reading) => sitioLabel(reading) === sitio);

  if (inSitio.length === 0) {
    throw new Error(`You have no assigned readings in ${sitio}.`);
  }

  let match =
    inSitio.find(
      (reading) => normalizeMeterNumber(reading.meter?.meter_number ?? '') === meterNumber
    ) ?? null;

  if (!match) {
    const { data: meter, error: meterError } = await supabase
      .from('meters')
      .select('id')
      .eq('meter_number', meterNumber)
      .maybeSingle();

    if (meterError) {
      throw new Error(getMeterReadingErrorMessage(meterError));
    }

    match = meter
      ? (inSitio.find((reading) => reading.meter_id === meter.id) ?? null)
      : null;
  }

  if (!match) {
    throw new Error(
      `Meter ${meterNumber} does not match any assigned resident account in ${sitio}.`
    );
  }

  if (input.currentReading < match.previous_reading) {
    throw new Error(
      `Current reading must be at least the previous reading (${match.previous_reading} m³).`
    );
  }

  let photoUrl: string | null = null;
  if (input.photoUri || input.photoBase64) {
    photoUrl = await uploadMeterPhoto(input.photoUri ?? `meter.${Date.now()}.jpg`, match.id, input.photoBase64);
  }

  return submitReading(match.id, input.currentReading, input.remarks, photoUrl);
}

// ── Realtime ──

/**
 * Subscribe to changes on the meter_readings table. Realtime respects RLS,
 * so the reader only receives events for their own rows. Returns an
 * unsubscribe function.
 */
export function subscribeToMeterReadings(
  callback: (event: 'INSERT' | 'UPDATE' | 'DELETE', row?: MeterReading | null) => void
): () => void {
  // Supabase channels are singletons keyed by name, and components can mount
  // multiple subscriptions at once (e.g. the dashboard's assignments + history
  // hooks). Using a unique name per call avoids "cannot add callbacks after
  // subscribe()".
  const channel = supabase
    .channel(`meter-readings-changes-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'meter_readings' },
      (payload) => {
        const event = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
        const row = payload.new ? mapRow(payload.new as MeterReadingRow) : null;
        callback(event, row);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
