import ExcelJS from 'exceljs';
import { downloadFile, type DownloadResult } from './downloadFile';

/** BKWB brand green — matches desktop-app `primary-600` (#1F7A66). */
export const EXPORT_HEADER_FILL = 'FF1F7A66';

const HEADER_FONT_SIZE = 12;
const DATA_FONT_SIZE = 10;
const MIN_COL_WIDTH = 12;
const MAX_COL_WIDTH = 45;

export type SpreadsheetCell = string | number | boolean | null | undefined | Date;

export interface ExportSpreadsheetOptions {
  /** Column header labels (styled: bold, larger, green fill, wrap). */
  headers: string[];
  /** Data rows aligned to headers. */
  rows: SpreadsheetCell[][];
  /**
   * What kind of data this is (e.g. Billing, Residents, Meter_Readings, Audit_Logs).
   * Spaces become underscores in the filename.
   */
  dataKind: string;
  /** Optional sitio / related scope appended to the filename. */
  scope?: string | null;
  /** Worksheet tab name. Defaults to dataKind. */
  sheetName?: string;
  /**
   * File extension. Defaults to `xlsx` so header styling (bold/fill/wrap/autofit)
   * is preserved when opened in Excel / Numbers / Sheets.
   * Use `csv` only when the consumer must remain plain CSV (e.g. import templates).
   */
  extension?: string;
}

/** Sanitize a filename segment: spaces → `_`, strip unsafe chars. */
export function sanitizeFilenamePart(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Naming convention:
 * `(ISO DATE)_(DataKind)_(Scope?).ext`
 * Example: `2026-09-29_Billing_ELLENA_HOMES.xlsx`
 */
export function buildExportFilename(
  dataKind: string,
  scope?: string | null,
  extension = 'xlsx'
): string {
  const date = new Date().toISOString().slice(0, 10);
  const parts = [date, sanitizeFilenamePart(dataKind)];
  const scopePart = scope ? sanitizeFilenamePart(scope) : '';
  if (scopePart) parts.push(scopePart);
  const ext = extension.replace(/^\./, '') || 'xlsx';
  return `${parts.filter(Boolean).join('_')}.${ext}`;
}

/** If every row shares one non-empty sitio value, return it; otherwise null. */
export function singleSharedScope(values: Array<string | null | undefined>): string | null {
  const unique = [
    ...new Set(values.map((v) => (v ?? '').trim()).filter(Boolean)),
  ];
  return unique.length === 1 ? unique[0] : null;
}

function applyHeaderStyle(cell: ExcelJS.Cell): void {
  cell.font = {
    bold: true,
    size: HEADER_FONT_SIZE,
    color: { argb: 'FFFFFFFF' },
  };
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: EXPORT_HEADER_FILL },
  };
  cell.alignment = {
    wrapText: true,
    vertical: 'middle',
    horizontal: 'center',
  };
}

function applyDataStyle(cell: ExcelJS.Cell): void {
  cell.font = { size: DATA_FONT_SIZE };
  cell.alignment = {
    wrapText: true,
    vertical: 'top',
  };
}

function autofitColumns(sheet: ExcelJS.Worksheet, headers: string[], rows: SpreadsheetCell[][]): void {
  headers.forEach((header, colIndex) => {
    let maxLen = String(header ?? '').length;
    for (const row of rows) {
      const value = row[colIndex];
      const len = value == null ? 0 : String(value).length;
      if (len > maxLen) maxLen = len;
    }
    const width = Math.min(Math.max(maxLen + 2, MIN_COL_WIDTH), MAX_COL_WIDTH);
    sheet.getColumn(colIndex + 1).width = width;
  });
}

/**
 * Build a styled workbook and trigger a download.
 * Headers: green fill, bold, larger font, wrap text, auto-fitted columns.
 */
export async function exportSpreadsheet(options: ExportSpreadsheetOptions): Promise<DownloadResult> {
  const {
    headers,
    rows,
    dataKind,
    scope,
    sheetName,
    extension = 'xlsx',
  } = options;

  const filename = buildExportFilename(dataKind, scope, extension);

  if (extension === 'csv') {
    const escape = (v: SpreadsheetCell) =>
      `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
    const csv = [
      headers.map(escape).join(','),
      ...rows.map((row) => headers.map((_, i) => escape(row[i])).join(',')),
    ].join('\n');
    return downloadFile(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filename);
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BKWB';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sanitizeFilenamePart(sheetName || dataKind).slice(0, 31) || 'Export');

  const headerRow = sheet.addRow(headers);
  headerRow.height = 28;
  headerRow.eachCell((cell) => applyHeaderStyle(cell));

  for (const rowValues of rows) {
    const dataRow = sheet.addRow(
      headers.map((_, i) => {
        const v = rowValues[i];
        return v == null ? '' : v;
      })
    );
    dataRow.eachCell((cell) => applyDataStyle(cell));
  }

  autofitColumns(sheet, headers, rows);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  return downloadFile(blob, filename);
}
