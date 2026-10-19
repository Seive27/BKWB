import ExcelJS from 'exceljs';
import { supabase } from '../lib/supabase';
import { sitiosMatch } from '../utils';

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

/** Past-bill workbook. Staff type the reading, consumption, bill amount, and amount due. */
export const BILL_IMPORT_COLUMNS = [
  'profiles.last_name',
  'profiles.first_name',
  'resident_accounts.account_number',
  'bills.billing_period',
  'bills.previous_reading',
  'bills.current_reading',
  'bills.consumption',
  'bills.amount',
  'bills.amount_due',
] as const;

export type BillImportColumn = (typeof BILL_IMPORT_COLUMNS)[number];

export const BILL_IMPORT_SHEET_NAME = 'bill_import';

/** One downloaded bill history file never lists more than this many accounts. */
export const BILL_HISTORY_ROW_LIMIT = 100;

/** Select value for accounts whose sitio is blank. */
export const NO_SITIO_VALUE = '__none__';

const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Columns that are already on the downloaded row. A month with only these filled is skipped. */
const PREFILLED_BILL_COLUMNS = new Set<BillImportColumn>([
  'profiles.last_name',
  'profiles.first_name',
  'resident_accounts.account_number',
  'bills.billing_period',
]);

export interface BillHistoryAccount {
  accountNumber: string;
  lastName: string;
  firstName: string;
}

export interface BillImportRow {
  rowNumber: number;
  lastName: string;
  firstName: string;
  accountNumber: string;
  billingPeriod: string;
  previousReading: string;
  currentReading: string;
  consumption: string;
  amount: string;
  amountDue: string;
}

export interface ParsedBillImport {
  rows: BillImportRow[];
  errors: ImportRowError[];
  /** Prefilled accounts left blank. They are not sent. */
  skipped: number;
}

export interface BillImportSummary {
  created: number;
  updated: number;
  skipped: number;
  total: number;
}

interface ProfileName {
  last_name: string | null;
  first_name: string | null;
}

interface AccountForBillHistory extends BillHistoryAccount {
  id: string;
}

function compareAccounts(left: BillHistoryAccount, right: BillHistoryAccount): number {
  const byLast = left.lastName.localeCompare(right.lastName, undefined, { sensitivity: 'base' });
  if (byLast !== 0) return byLast;
  const byFirst = left.firstName.localeCompare(right.firstName, undefined, { sensitivity: 'base' });
  if (byFirst !== 0) return byFirst;
  return left.accountNumber.localeCompare(right.accountNumber, undefined, { numeric: true });
}

async function fetchAccountsForSitio(sitio: string | null): Promise<AccountForBillHistory[]> {
  const pageSize = 1000;
  const accounts: AccountForBillHistory[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from('resident_accounts')
      .select('id, account_number, sitio, resident:profiles!resident_accounts_resident_id_fkey(last_name, first_name)')
      .order('account_number')
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(error.message);
    }

    const page = data ?? [];
    for (const row of page) {
      const storedSitio = (row.sitio ?? '').trim();
      const matches = sitio == null ? storedSitio === '' : sitiosMatch(storedSitio, sitio);
      if (!matches) continue;
      const resident = (Array.isArray(row.resident) ? row.resident[0] : row.resident) as ProfileName | null;
      accounts.push({
        id: row.id,
        accountNumber: row.account_number,
        lastName: resident?.last_name?.trim() ?? '',
        firstName: resident?.first_name?.trim() ?? '',
      });
    }

    if (page.length < pageSize) break;
    from += pageSize;
  }

  return accounts;
}

/** True when at least one account has a blank sitio. */
export async function hasAccountsWithoutSitio(): Promise<boolean> {
  const { count, error } = await supabase
    .from('resident_accounts')
    .select('id', { count: 'exact', head: true })
    .or('sitio.is.null,sitio.eq.');

  if (error) {
    throw new Error(error.message);
  }
  return (count ?? 0) > 0;
}

/**
 * Accounts in the sitio that have no bill for this period.
 * A deleted bill does not count. Ordered by last name, then account number.
 */
export async function fetchAccountsMissingBillHistory(
  sitio: string | null,
  period: string
): Promise<{ missing: BillHistoryAccount[]; totalInSitio: number }> {
  const accounts = await fetchAccountsForSitio(sitio);
  if (accounts.length === 0) return { missing: [], totalInSitio: 0 };

  const billed = new Set<string>();
  const chunkSize = 200;
  for (let index = 0; index < accounts.length; index += chunkSize) {
    const ids = accounts.slice(index, index + chunkSize).map((account) => account.id);
    const { data, error } = await supabase
      .from('bills')
      .select('account_id')
      .in('account_id', ids)
      .eq('billing_period', period)
      .is('deleted_at', null);

    if (error) {
      throw new Error(error.message);
    }
    for (const row of data ?? []) {
      if (row.account_id) billed.add(row.account_id);
    }
  }

  return {
    missing: accounts.filter((account) => !billed.has(account.id)).sort(compareAccounts),
    totalInSitio: accounts.length,
  };
}

function optionalNumber(value: string, label: string, push: (message: string) => void): number | null {
  if (!value) return null;
  if (!NUMBER_PATTERN.test(value)) {
    push(`${label} "${value}" must be a non-negative number.`);
    return null;
  }
  return Number(value);
}

function decimalPlaces(value: string): number {
  const dot = value.indexOf('.');
  return dot === -1 ? 0 : value.length - dot - 1;
}

function greaterThan(left: string, right: string): boolean {
  const scale = Math.max(decimalPlaces(left), decimalPlaces(right));
  const factor = 10 ** scale;
  return Math.round(Number(left) * factor) > Math.round(Number(right) * factor);
}

function subtractNumbers(left: string, right: string): string {
  const scale = Math.max(decimalPlaces(left), decimalPlaces(right));
  const factor = 10 ** scale;
  const diff = Math.round(Number(left) * factor) - Math.round(Number(right) * factor);
  if (scale === 0) return String(diff);
  return (diff / factor).toFixed(scale).replace(/\.?0+$/, '');
}

function periodBounds(period: string): { start: string; end: string } | null {
  if (!PERIOD_PATTERN.test(period)) return null;
  const year = Number(period.slice(0, 4));
  const month = Number(period.slice(5, 7));
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    start: `${period}-01`,
    end: `${period}-${String(lastDay).padStart(2, '0')}`,
  };
}

function billingPeriodFromCell(value: ExcelJS.CellValue): string {
  const text = dateFromCell(value);
  if (PERIOD_PATTERN.test(text)) return text;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text.slice(0, 7);
  return cellText(value);
}

export function validateBillRows(rows: BillImportRow[]): ImportRowError[] {
  const errors: ImportRowError[] = [];
  const seen = new Map<string, number>();

  for (const row of rows) {
    const push = (message: string) => errors.push({ rowNumber: row.rowNumber, message });

    if (!row.accountNumber) {
      push('resident_accounts.account_number is required.');
    }

    if (!PERIOD_PATTERN.test(row.billingPeriod)) {
      push('bills.billing_period must be YYYY-MM.');
    } else if (row.accountNumber) {
      const key = `${row.accountNumber}|${row.billingPeriod}`;
      const previous = seen.get(key);
      if (previous != null) {
        const message = `Account ${row.accountNumber} already has billing period ${row.billingPeriod} on row ${previous}.`;
        push(message);
        errors.push({ rowNumber: previous, message });
      } else {
        seen.set(key, row.rowNumber);
      }
    }

    const previousReading = optionalNumber(row.previousReading, 'bills.previous_reading', push);
    const currentReading = optionalNumber(row.currentReading, 'bills.current_reading', push);
    optionalNumber(row.consumption, 'bills.consumption', push);
    if (previousReading != null && currentReading != null && currentReading < previousReading) {
      push('bills.current_reading is lower than bills.previous_reading.');
    }

    const amount = optionalNumber(row.amount, 'bills.amount', push);
    const amountDue = optionalNumber(row.amountDue, 'bills.amount_due', push);
    if (!row.amount) push('bills.amount is required.');
    if (!row.amountDue) push('bills.amount_due is required.');

    if (amount != null && amountDue != null && greaterThan(row.amountDue, row.amount)) {
      push('bills.amount_due is greater than bills.amount.');
    }
  }

  return errors;
}

export async function parseBillWorkbook(file: ArrayBuffer): Promise<ParsedBillImport> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(file);

  const sheet = workbook.worksheets.find(
    (worksheet) => worksheet.name.trim().toLowerCase() === BILL_IMPORT_SHEET_NAME
  );
  if (!sheet) {
    throw new Error('The workbook has no sheet named "bill_import". Download the bill history template and fill that sheet.');
  }

  const headerRow = sheet.getRow(1);
  const headerIndex = new Map<string, number>();
  headerRow.eachCell({ includeEmpty: false }, (cell, col) => {
    const name = cellText(cell.value);
    if (name) headerIndex.set(name, col);
  });

  const missing = BILL_IMPORT_COLUMNS.filter((column) => !headerIndex.has(column));
  if (missing.length > 0) {
    throw new Error(
      `The bill_import sheet is missing column(s): ${missing.join(', ')}. Download the template and keep the header row unchanged.`
    );
  }

  const column = (name: BillImportColumn) => headerIndex.get(name) ?? 0;
  const rows: BillImportRow[] = [];
  let skipped = 0;

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const excelRow = sheet.getRow(rowNumber);
    const read = (name: BillImportColumn) => cellText(excelRow.getCell(column(name)).value);
    const values = BILL_IMPORT_COLUMNS.map((name) => read(name));
    if (isBlankRow(values)) continue;

    const entered = BILL_IMPORT_COLUMNS.some((name) => !PREFILLED_BILL_COLUMNS.has(name) && read(name) !== '');
    const billingPeriod = billingPeriodFromCell(excelRow.getCell(column('bills.billing_period')).value);

    if (!entered) {
      skipped += 1;
      continue;
    }

    const readNumber = (name: BillImportColumn) => readingFromCell(excelRow.getCell(column(name)).value);
    const previousReading = readNumber('bills.previous_reading');
    const currentReading = readNumber('bills.current_reading');
    let consumption = readNumber('bills.consumption');
    if (
      !consumption &&
      previousReading &&
      currentReading &&
      NUMBER_PATTERN.test(previousReading) &&
      NUMBER_PATTERN.test(currentReading) &&
      !greaterThan(previousReading, currentReading)
    ) {
      consumption = subtractNumbers(currentReading, previousReading);
    }

    rows.push({
      rowNumber,
      lastName: read('profiles.last_name'),
      firstName: read('profiles.first_name'),
      accountNumber: read('resident_accounts.account_number'),
      billingPeriod,
      previousReading,
      currentReading,
      consumption,
      amount: readNumber('bills.amount'),
      amountDue: readNumber('bills.amount_due'),
    });
  }

  if (rows.length === 0) {
    throw new Error(
      skipped > 0
        ? 'No months were filled. A row with only the account and billing period is skipped.'
        : 'The bill_import sheet has no data rows.'
    );
  }

  return { rows, errors: validateBillRows(rows), skipped };
}

function toBillPayload(row: BillImportRow): Record<string, string | number | null> {
  const bounds = periodBounds(row.billingPeriod);
  const amountCents = Math.round(Number(row.amount) * 100);
  const dueCents = Math.round(Number(row.amountDue) * 100);
  const status = dueCents === 0 ? 'paid' : dueCents < amountCents ? 'partially_paid' : 'pending';
  const payment = dueCents < amountCents ? subtractNumbers(row.amount, row.amountDue) : '';

  return {
    _row: row.rowNumber,
    'resident_accounts.account_number': row.accountNumber,
    'bills.billing_period': row.billingPeriod,
    'bills.period_start': bounds?.start ?? null,
    'bills.period_end': bounds?.end ?? null,
    'bills.previous_reading': row.previousReading || null,
    'bills.current_reading': row.currentReading || null,
    'bills.consumption': row.consumption || null,
    'bills.water_rate': '0',
    'bills.amount': row.amount,
    'bills.previous_balance': '0',
    'payments.amount': payment || null,
    'bills.amount_due': row.amountDue,
    'bills.status': status,
    'bills.due_date': null,
    'bills.paid_at': status === 'paid' ? bounds?.end ?? null : null,
  };
}

export async function importBillHistoryRows(
  rows: BillImportRow[],
  skipped: number,
  onProgress?: (completedBatches: number, totalBatches: number) => void
): Promise<BillImportSummary> {
  const totalBatches = Math.ceil(rows.length / BATCH_SIZE);
  let created = 0;
  let updated = 0;

  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    const batch = rows.slice(index, index + BATCH_SIZE).map(toBillPayload);
    const { data, error } = await supabase.rpc('import_bill_history', { p_rows: batch });
    if (error) {
      throw new ImportBatchError(error.message, created, updated);
    }
    const result = (data ?? {}) as { created?: number; updated?: number };
    created += result.created ?? 0;
    updated += result.updated ?? 0;
    onProgress?.(Math.floor(index / BATCH_SIZE) + 1, totalBatches);
  }

  return { created, updated, skipped, total: rows.length };
}
