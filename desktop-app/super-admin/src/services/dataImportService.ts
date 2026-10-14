import ExcelJS from 'exceljs';
import { supabase } from '../lib/supabase';

/** Workbook columns. Names match the Supabase tables the import writes. */
export const IMPORT_COLUMNS = [
  'profiles.last_name',
  'profiles.first_name',
  'profiles.middle_name',
  'resident_accounts.account_number',
  'resident_accounts.sitio',
  'resident_accounts.service_address',
  'meters.meter_number',
  'resident_accounts.previous_reading_date',
  'resident_accounts.previous_reading',
  'resident_accounts.current_reading',
] as const;

export type ImportColumn = (typeof IMPORT_COLUMNS)[number];

export const IMPORT_SHEET_NAME = 'import';

/** Rows per RPC call. The database function rejects batches larger than 500. */
const BATCH_SIZE = 200;

export interface ConsumerImportRow {
  rowNumber: number;
  lastName: string;
  firstName: string;
  middleName: string;
  accountNumber: string;
  sitio: string;
  serviceAddress: string;
  meterNumber: string;
  /** Canonical YYYY-MM-DD when valid, otherwise the original cell text. */
  previousReadingDate: string;
  previousReading: string;
  /** Blank means the latest reading has not been recorded. */
  currentReading: string;
}

export interface ImportRowError {
  rowNumber: number;
  message: string;
}

export interface ParsedConsumerImport {
  rows: ConsumerImportRow[];
  errors: ImportRowError[];
}

export interface ImportSummary {
  created: number;
  updated: number;
  total: number;
}

export class ImportBatchError extends Error {
  created: number;
  updated: number;

  constructor(message: string, created: number, updated: number) {
    super(message);
    this.name = 'ImportBatchError';
    this.created = created;
    this.updated = updated;
  }
}

const NUMBER_PATTERN = /^\d+(\.\d+)?$/;

function unwrap(value: ExcelJS.CellValue): ExcelJS.CellValue {
  if (value && typeof value === 'object' && 'result' in value) {
    return unwrap(value.result as ExcelJS.CellValue);
  }
  return value;
}

function richText(value: ExcelJS.CellValue): string | null {
  if (value && typeof value === 'object' && 'richText' in value && Array.isArray(value.richText)) {
    return value.richText.map((part) => part.text).join('');
  }
  if (value && typeof value === 'object' && 'text' in value && typeof value.text === 'string') {
    return value.text;
  }
  return null;
}

/** Plain text for a cell. Dates become YYYY-MM-DD. Numbers stay exact integers when they are whole. */
export function cellText(value: ExcelJS.CellValue): string {
  const raw = unwrap(value);
  if (raw == null) return '';
  if (raw instanceof Date) {
    const year = raw.getFullYear();
    const month = String(raw.getMonth() + 1).padStart(2, '0');
    const day = String(raw.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    if (Number.isInteger(raw)) {
      return raw.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 0 });
    }
    return String(raw);
  }
  const text = richText(raw);
  if (text != null) return text.trim();
  return String(raw).trim();
}

/** Excel 1900 date system. Serial 46143 is 2026-05-01. */
export function excelSerialToIso(serial: number): string {
  const utc = new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000);
  const year = utc.getUTCFullYear();
  const month = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const day = String(utc.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeDate(value: string): { iso: string; valid: boolean } {
  const trimmed = value.trim();
  if (!trimmed) return { iso: '', valid: true };

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    const valid =
      date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
    return { iso: trimmed, valid };
  }

  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (us) {
    const month = Number(us[1]);
    const day = Number(us[2]);
    const year = Number(us[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    const valid =
      date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
    if (!valid) return { iso: trimmed, valid: false };
    return {
      iso: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      valid: true,
    };
  }

  return { iso: trimmed, valid: false };
}

function dateFromCell(value: ExcelJS.CellValue): string {
  const raw = unwrap(value);
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 20000 && raw < 80000) {
    return excelSerialToIso(raw);
  }
  return cellText(value);
}

function readingFromCell(value: ExcelJS.CellValue): string {
  return cellText(value).replace(/,/g, '').trim();
}

function isBlankRow(values: string[]): boolean {
  return values.every((value) => value.trim() === '');
}

export function validateConsumerRows(rows: ConsumerImportRow[]): ImportRowError[] {
  const errors: ImportRowError[] = [];
  const seenAccounts = new Map<string, number>();
  const seenMeters = new Map<string, number>();

  for (const row of rows) {
    const push = (message: string) => errors.push({ rowNumber: row.rowNumber, message });

    if (!row.accountNumber) {
      push('resident_accounts.account_number is required.');
    } else if (seenAccounts.has(row.accountNumber)) {
      const previous = seenAccounts.get(row.accountNumber) as number;
      const message = `resident_accounts.account_number "${row.accountNumber}" is duplicated on rows ${previous} and ${row.rowNumber}.`;
      push(message);
      errors.push({ rowNumber: previous, message });
    } else {
      seenAccounts.set(row.accountNumber, row.rowNumber);
    }

    if (!row.lastName) push('profiles.last_name is required.');
    if (!row.firstName) push('profiles.first_name is required.');

    if (row.previousReading && !NUMBER_PATTERN.test(row.previousReading)) {
      push(`resident_accounts.previous_reading "${row.previousReading}" must be a non-negative number.`);
    }
    if (row.currentReading && !NUMBER_PATTERN.test(row.currentReading)) {
      push(
        `resident_accounts.current_reading "${row.currentReading}" must be a non-negative number. Leave it blank when it has not been recorded.`
      );
    }
    if (
      row.previousReading &&
      row.currentReading &&
      NUMBER_PATTERN.test(row.previousReading) &&
      NUMBER_PATTERN.test(row.currentReading) &&
      Number(row.currentReading) < Number(row.previousReading)
    ) {
      push('resident_accounts.current_reading is lower than resident_accounts.previous_reading.');
    }

    if (row.previousReadingDate) {
      const date = normalizeDate(row.previousReadingDate);
      if (!date.valid) {
        push(
          `resident_accounts.previous_reading_date "${row.previousReadingDate}" must be YYYY-MM-DD.`
        );
      }
    }

    if (row.meterNumber) {
      const previous = seenMeters.get(row.meterNumber);
      if (previous != null) {
        const message = `meters.meter_number "${row.meterNumber}" is duplicated on rows ${previous} and ${row.rowNumber}.`;
        push(message);
        errors.push({ rowNumber: previous, message });
      } else {
        seenMeters.set(row.meterNumber, row.rowNumber);
      }
    }
  }

  return errors;
}

export async function parseConsumerWorkbook(file: ArrayBuffer): Promise<ParsedConsumerImport> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(file);

  const sheet = workbook.worksheets.find(
    (worksheet) => worksheet.name.trim().toLowerCase() === IMPORT_SHEET_NAME
  );
  if (!sheet) {
    throw new Error('The workbook has no sheet named "import". Download the template and fill that sheet.');
  }

  const headerRow = sheet.getRow(1);
  const headerIndex = new Map<string, number>();
  headerRow.eachCell({ includeEmpty: false }, (cell, col) => {
    const name = cellText(cell.value);
    if (name) headerIndex.set(name, col);
  });

  const missing = IMPORT_COLUMNS.filter((column) => !headerIndex.has(column));
  if (missing.length > 0) {
    throw new Error(
      `The import sheet is missing column(s): ${missing.join(', ')}. Download the template and keep the header row unchanged.`
    );
  }

  const column = (name: ImportColumn) => headerIndex.get(name) ?? 0;
  const rows: ConsumerImportRow[] = [];

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const excelRow = sheet.getRow(rowNumber);
    const read = (name: ImportColumn) => cellText(excelRow.getCell(column(name)).value);
    const values = IMPORT_COLUMNS.map((name) => read(name));
    if (isBlankRow(values)) continue;

    const dateCell = excelRow.getCell(column('resident_accounts.previous_reading_date')).value;
    const previousDate = normalizeDate(dateFromCell(dateCell));

    rows.push({
      rowNumber,
      lastName: read('profiles.last_name'),
      firstName: read('profiles.first_name'),
      middleName: read('profiles.middle_name'),
      accountNumber: read('resident_accounts.account_number'),
      sitio: read('resident_accounts.sitio'),
      serviceAddress: read('resident_accounts.service_address'),
      meterNumber: read('meters.meter_number'),
      previousReadingDate: previousDate.valid ? previousDate.iso : dateFromCell(dateCell),
      previousReading: readingFromCell(excelRow.getCell(column('resident_accounts.previous_reading')).value),
      currentReading: readingFromCell(excelRow.getCell(column('resident_accounts.current_reading')).value),
    });
  }

  if (rows.length === 0) {
    throw new Error('The import sheet has no data rows.');
  }

  return { rows, errors: validateConsumerRows(rows) };
}

function toPayload(row: ConsumerImportRow): Record<string, string | number | null> {
  const date = normalizeDate(row.previousReadingDate);
  return {
    _row: row.rowNumber,
    'profiles.last_name': row.lastName,
    'profiles.first_name': row.firstName,
    'profiles.middle_name': row.middleName || null,
    'resident_accounts.account_number': row.accountNumber,
    'resident_accounts.sitio': row.sitio || null,
    'resident_accounts.service_address': row.serviceAddress || null,
    'meters.meter_number': row.meterNumber || null,
    'resident_accounts.previous_reading_date': date.iso || null,
    'resident_accounts.previous_reading': row.previousReading || null,
    'resident_accounts.current_reading': row.currentReading || null,
  };
}

export async function importConsumerRows(
  rows: ConsumerImportRow[],
  onProgress?: (completedBatches: number, totalBatches: number) => void
): Promise<ImportSummary> {
  const totalBatches = Math.ceil(rows.length / BATCH_SIZE);
  let created = 0;
  let updated = 0;

  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    const batch = rows.slice(index, index + BATCH_SIZE).map(toPayload);
    const { data, error } = await supabase.rpc('import_consumer_masterlist', { p_rows: batch });
    if (error) {
      throw new ImportBatchError(error.message, created, updated);
    }
    const result = (data ?? {}) as { created?: number; updated?: number };
    created += result.created ?? 0;
    updated += result.updated ?? 0;
    onProgress?.(Math.floor(index / BATCH_SIZE) + 1, totalBatches);
  }

  return { created, updated, total: rows.length };
}
