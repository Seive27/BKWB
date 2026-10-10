import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  submitReading,
  submitReadingByMeterNumber,
} from '@/services/meterReadingService';

const STORAGE_KEY = 'meter_reader_pending_readings';

type PendingReadingById = {
  local_id: string;
  queued_at: string;
  reading_id: string;
  current_reading: number;
  notes?: string;
};

type PendingReadingByMeter = {
  local_id: string;
  queued_at: string;
  meter_number: string;
  sitio: string;
  current_reading: number;
  notes?: string;
  photo_uri?: string | null;
  photo_base64?: string | null;
};

export type PendingReading = PendingReadingById | PendingReadingByMeter;

export type EnqueueReadingInput =
  | Omit<PendingReadingById, 'local_id' | 'queued_at'>
  | Omit<PendingReadingByMeter, 'local_id' | 'queued_at'>;

async function readQueue(): Promise<PendingReading[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PendingReading[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(items: PendingReading[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const message = err.message.toLowerCase();
  return (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('unavailable')
  );
}

/** Readings saved on the device and not yet sent to the server. */
export async function getPendingReadings(): Promise<PendingReading[]> {
  return readQueue();
}

/** Store a reading locally until the device is online again. */
export async function enqueueReading(input: EnqueueReadingInput): Promise<void> {
  const queue = await readQueue();
  queue.push({
    ...input,
    local_id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    queued_at: new Date().toISOString(),
  });
  await writeQueue(queue);
}

let syncing = false;

/**
 * Upload queued readings. Stops at the first network failure so the rest
 * stay queued for the next reconnect. Other failures stay in the queue.
 */
export async function syncPendingReadings(): Promise<void> {
  if (syncing) return;
  syncing = true;

  try {
    const queue = await readQueue();
    if (queue.length === 0) return;

    const remaining: PendingReading[] = [];

    for (let index = 0; index < queue.length; index += 1) {
      const item = queue[index];
      try {
        if ('reading_id' in item) {
          await submitReading(item.reading_id, item.current_reading, item.notes);
        } else {
          await submitReadingByMeterNumber({
            meterNumber: item.meter_number,
            sitio: item.sitio,
            currentReading: item.current_reading,
            remarks: item.notes,
            photoUri: item.photo_uri,
            photoBase64: item.photo_base64,
          });
        }
      } catch (err) {
        remaining.push(item);
        if (isNetworkError(err)) {
          remaining.push(...queue.slice(index + 1));
          break;
        }
      }
    }

    await writeQueue(remaining);
  } finally {
    syncing = false;
  }
}
