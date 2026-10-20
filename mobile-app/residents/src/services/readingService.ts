import { File } from 'expo-file-system';

import { friendlyErrorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

/**
 * Resident-side meter reading submission.
 *
 * A self-submitted reading is written straight into `meter_readings` with
 * status = 'pending_review' and source = 'resident', so staff review it in the
 * same Meter Readings queue used for meter readers (approve / reject / bill).
 * `previous_reading` and `consumption` stay database-owned (trigger).
 */

export type ResidentReadingStatus =
  | 'assigned'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'billed';

export const READING_STATUS_LABELS: Record<ResidentReadingStatus, string> = {
  assigned: 'Scheduled',
  pending_review: 'Waiting for review',
  approved: 'Approved',
  rejected: 'Needs correction',
  billed: 'Billed',
};

export interface ResidentReading {
  id: string;
  account_id: string;
  resident_id: string;
  meter_id: string | null;
  status: ResidentReadingStatus;
  source: 'meter_reader' | 'resident' | null;
  assignment_date: string;
  reading_date: string | null;
  previous_reading: number;
  current_reading: number | null;
  consumption: number | null;
  remarks: string | null;
  photo_url: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface ResidentReadingAccount {
  id: string;
  accountNumber: string;
  serviceAddress: string | null;
  sitio: string | null;
  meterId: string | null;
  meterNumber: string | null;
  /** Baseline the resident's current reading must reach. */
  previousReading: number;
  /** Existing assigned / pending reading for this account, if any. */
  openStatus: ResidentReadingStatus | null;
  openSource: 'meter_reader' | 'resident' | null;
}

const READING_SELECT =
  'id, account_id, resident_id, meter_id, status, source, assignment_date, reading_date, previous_reading, current_reading, consumption, remarks, photo_url, rejection_reason, created_at';

async function requireUserId(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error('You must be logged in to send a meter reading.');
  }
  return session.user.id;
}

/** Map PostgREST/storage failures to text a resident can act on. */
function readingErrorMessage(error: { message?: string; code?: string } | null): string {
  const code = error?.code ?? '';
  const msg = error?.message ?? '';

  if (
    code === '42P01' ||
    code === '42703' ||
    /relation .* does not exist|column .* does not exist/i.test(msg)
  ) {
    return 'Meter reading submission is not set up yet. Please contact the barangay office.';
  }
  if (code === '23505' || /duplicate key|unique/i.test(msg)) {
    return 'You already have a meter reading waiting for review.';
  }
  if (code === '42501' || /row-level security|permission denied/i.test(msg)) {
    return 'Your account is not allowed to send a reading right now. Please contact the barangay office.';
  }
  return friendlyErrorMessage(new Error(msg), 'Could not send your meter reading. Please try again.');
}

function toReading(row: unknown): ResidentReading {
  const r = row as ResidentReading;
  return {
    ...r,
    previous_reading: Number(r.previous_reading ?? 0),
    current_reading: r.current_reading === null ? null : Number(r.current_reading),
    consumption: r.consumption === null ? null : Number(r.consumption),
    source: r.source ?? 'resident',
  };
}

/**
 * Load the resident's active service account plus the baseline reading and
 * any reading already waiting for staff.
 */
export async function getReadingAccount(): Promise<ResidentReadingAccount | null> {
  const userId = await requireUserId();

  const { data: account, error: accountError } = await supabase
    .from('resident_accounts')
    .select(
      'id, account_number, service_address, sitio, current_reading, previous_reading, meter_id, meter:meters(meter_number)'
    )
    .eq('resident_id', userId)
    .eq('connection_status', 'active')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (accountError) {
    throw new Error(readingErrorMessage(accountError));
  }
  if (!account) return null;

  const row = account as unknown as {
    id: string;
    account_number: string;
    service_address: string | null;
    sitio: string | null;
    current_reading: number | null;
    previous_reading: number | null;
    meter_id: string | null;
    meter?: { meter_number: string } | null;
  };

  const [lastApproved, openReading] = await Promise.all([
    supabase
      .from('meter_readings')
      .select('current_reading')
      .eq('account_id', row.id)
      .in('status', ['approved', 'billed'])
      .not('current_reading', 'is', null)
      .order('reading_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('meter_readings')
      .select('status, source')
      .eq('account_id', row.id)
      .in('status', ['assigned', 'pending_review'])
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const approvedValue = (lastApproved.data as { current_reading: number | null } | null)
    ?.current_reading;
  const previousReading =
    approvedValue ?? row.current_reading ?? row.previous_reading ?? 0;

  const open = openReading.data as
    | { status: ResidentReadingStatus; source: 'meter_reader' | 'resident' | null }
    | null;

  return {
    id: row.id,
    accountNumber: row.account_number,
    serviceAddress: row.service_address,
    sitio: row.sitio,
    meterId: row.meter_id,
    meterNumber: row.meter?.meter_number ?? null,
    previousReading: Number(previousReading),
    openStatus: open?.status ?? null,
    openSource: open?.source ?? null,
  };
}

/** The resident's own readings (self-submitted and meter-reader ones). */
export async function getMyReadings(limit = 6): Promise<ResidentReading[]> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('meter_readings')
    .select(READING_SELECT)
    .eq('resident_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[readings] could not load history:', error.message);
    return [];
  }

  return (data ?? []).map(toReading);
}

// ── Photo upload ──

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

/** Read a camera/gallery file. Android file:// URIs often fail with fetch(). */
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

/** Upload to `meter-images/<auth.uid()>/…` and return a long-lived signed URL. */
async function uploadMeterPhoto(
  localUri: string,
  accountId: string,
  base64?: string | null
): Promise<string> {
  const userId = await requireUserId();
  const { bytes, ext } = await readLocalPhotoBytes(localUri, base64);
  const contentType =
    ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const path = `${userId}/resident-${accountId}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('meter-images')
    .upload(path, bytes, { upsert: true, contentType });

  if (uploadError) {
    throw new Error(uploadError.message || 'Failed to upload your meter photo.');
  }

  const { data, error: signError } = await supabase.storage
    .from('meter-images')
    .createSignedUrl(path, 60 * 60 * 24 * 365);

  if (signError || !data?.signedUrl) {
    throw new Error(signError?.message || 'Failed to prepare your meter photo.');
  }

  return data.signedUrl;
}

export interface SubmitReadingInput {
  currentReading: number;
  remarks?: string;
  /** New local photo picked from the camera or gallery. */
  photoUri?: string | null;
  photoBase64?: string | null;
  /** Keep the photo already stored on a rejected reading. */
  keepExistingPhoto?: boolean;
}

function validateReading(input: SubmitReadingInput, previousReading: number): number {
  if (!Number.isFinite(input.currentReading) || input.currentReading < 0) {
    throw new Error('Please enter a valid meter reading.');
  }
  if (input.currentReading < previousReading) {
    throw new Error(
      `Your reading cannot be lower than the previous reading (${previousReading.toLocaleString()} m³).`
    );
  }
  if (!input.photoUri && !input.photoBase64 && !input.keepExistingPhoto) {
    throw new Error('Please attach a photo of your meter before sending.');
  }
  return input.currentReading;
}

/** Send a new reading for staff review. */
export async function submitResidentReading(
  input: SubmitReadingInput
): Promise<ResidentReading> {
  const userId = await requireUserId();
  const account = await getReadingAccount();

  if (!account) {
    throw new Error('No active service account was found for your login.');
  }
  // A scheduled meter-reader visit does not block self-submission — that is the
  // whole point of this flow. Only a reading already awaiting review is blocked.
  if (account.openStatus === 'pending_review') {
    throw new Error('You already have a meter reading waiting for staff review.');
  }

  const currentReading = validateReading(input, account.previousReading);
  const photoUrl = await uploadMeterPhoto(
    input.photoUri ?? `meter.${Date.now()}.jpg`,
    account.id,
    input.photoBase64
  );

  const { data, error } = await supabase
    .from('meter_readings')
    .insert({
      account_id: account.id,
      resident_id: userId,
      meter_id: account.meterId,
      assignment_date: new Date().toISOString().slice(0, 10),
      reading_date: new Date().toISOString(),
      current_reading: currentReading,
      status: 'pending_review',
      source: 'resident',
      remarks: input.remarks?.trim() || null,
      photo_url: photoUrl,
    })
    .select(READING_SELECT)
    .single();

  if (error) {
    throw new Error(readingErrorMessage(error));
  }

  return toReading(data);
}

/** Correct a rejected reading and send it back for review. */
export async function resubmitRejectedReading(
  readingId: string,
  input: SubmitReadingInput
): Promise<ResidentReading> {
  const account = await getReadingAccount();
  const currentReading = validateReading(
    input,
    account?.previousReading ?? 0
  );

  let photoUrl: string | undefined;
  if (input.photoUri || input.photoBase64) {
    photoUrl = await uploadMeterPhoto(
      input.photoUri ?? `meter.${Date.now()}.jpg`,
      account?.id ?? readingId,
      input.photoBase64
    );
  }

  const { data, error } = await supabase
    .from('meter_readings')
    .update({
      current_reading: currentReading,
      remarks: input.remarks?.trim() || null,
      reading_date: new Date().toISOString(),
      status: 'pending_review',
      ...(photoUrl ? { photo_url: photoUrl } : {}),
    })
    .eq('id', readingId)
    .eq('status', 'rejected')
    .select(READING_SELECT)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('This reading can no longer be corrected.');
    }
    throw new Error(readingErrorMessage(error));
  }

  return toReading(data);
}
