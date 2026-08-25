import React, { useMemo, useRef, useState } from 'react';
import {
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  XCircle,
  FileText,
  RefreshCw,
  Database,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// ─── Types ───

interface ImportRow {
  seq: number;
  cons_code: string;
  last_name: string;
  first_name: string;
  middle_name: string;
  meter_serial: string;
  previous_period: string;
  previous_reading: string;
  current_reading: string;
  status: string;
  sitio: string;
}

interface RowError {
  seq: number;
  reason: string;
}

type Stage = 'upload' | 'preview' | 'summary';

const TEMPLATE_HEADERS = [
  'cons_code', 'last_name', 'first_name', 'middle_name', 'meter_serial',
  'previous_period', 'previous_reading', 'current_reading', 'status', 'sitio',
];

// ─── CSV helpers ───

/** Minimal RFC-4180-ish parser: handles quoted fields with commas/newlines. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      cur.push(field);
      field = '';
    } else if (ch === '\n') {
      cur.push(field);
      field = '';
      rows.push(cur);
      cur = [];
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    rows.push(cur);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

function downloadTemplate(): void {
  const sample = [
    TEMPLATE_HEADERS.join(','),
    '9283,ABELGAS,ALMA,MAGDADARO,12793,2021-07-01,1760,,inactive,AWIHAW',
    '7621,ABELGAS,VERONICA,SEPTIMO,25596,2026-05-01,1617,1626,active,ELLENA HOMES',
  ];
  const blob = new Blob([sample.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'bkwb-residents-import-template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Validation ───

const VALID_STATUSES = ['active', 'inactive', 'applicant'];

function isValidDate(value: string): boolean {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return !isNaN(new Date(value).getTime());
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [m, d] = value.split('/').map(Number);
    return m >= 1 && m <= 12 && d >= 1 && d <= 31;
  }
  return false;
}

/** Validate parsed rows. DB-level cross-checks run again inside the RPC. */
function validateRows(rows: ImportRow[]): RowError[] {
  const errors: RowError[] = [];
  const seenCodes = new Set<string>();
  const seenMeters = new Map<string, number>();

  for (const row of rows) {
    const push = (reason: string) => errors.push({ seq: row.seq, reason });

    if (!row.cons_code.trim()) push('Missing required field: Account Number (cons_code).');
    else if (seenCodes.has(row.cons_code.trim().toLowerCase()))
      push(`Duplicate account number "${row.cons_code}" within this file.`);
    else seenCodes.add(row.cons_code.trim().toLowerCase());

    if (!row.last_name.trim()) push('Missing required field: Last name.');
    if (!row.first_name.trim()) push('Missing required field: First name.');

    const status = row.status.trim().toLowerCase();
    if (status && !VALID_STATUSES.includes(status))
      push(`Invalid connection status "${row.status}" (expected Active, Inactive, or Applicant).`);

    if (row.previous_reading.trim() && (!/^\d+(\.\d+)?$/.test(row.previous_reading.trim())))
      push(`Previous reading "${row.previous_reading}" is not a valid non-negative number.`);
    if (row.current_reading.trim() && (!/^\d+(\.\d+)?$/.test(row.current_reading.trim())))
      push(`Current reading "${row.current_reading}" is not a valid non-negative number.`);

    if (
      row.current_reading.trim() &&
      row.previous_reading.trim() &&
      /^\d+(\.\d+)?$/.test(row.current_reading.trim()) &&
      /^\d+(\.\d+)?$/.test(row.previous_reading.trim()) &&
      Number(row.current_reading) < Number(row.previous_reading)
    ) {
      push('Current reading is lower than the previous reading.');
    }

    if (row.previous_period.trim() && !isValidDate(row.previous_period.trim()))
      push(`Previous period "${row.previous_period}" is not a valid date (YYYY-MM-DD or MM/DD/YYYY).`);

    if (row.meter_serial.trim()) {
      const key = row.meter_serial.trim();
      if (seenMeters.has(key)) {
        push(
          `Meter number "${key}" is used twice in this file (rows ${seenMeters.get(key)} and ${row.seq}).`
        );
      } else {
        seenMeters.set(key, row.seq);
      }
    }
  }
  return errors;
}

// ─── Page ───

const DataMigration: React.FC = () => {
  const [stage, setStage] = useState<Stage>('upload');
  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rows, setRows] = useState<ImportRow[]>([]);
  const [rowErrors, setRowErrors] = useState<RowError[]>([]);

  const [importMode, setImportMode] = useState<'upsert' | 'skip_existing'>('upsert');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    total_rows: number;
    created_users: number;
    created_accounts: number;
    updated_accounts: number;
    skipped: number;
    failed: number;
    errors: { row: number; cons_code?: string; error: string }[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStage('upload');
    setRows([]);
    setRowErrors([]);
    setError(null);
    setImportResult(null);
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFile = async (file: File) => {
    setError(null);
    setParsing(true);
    try {
      const text = await file.text();
      const table = parseCsv(text);
      if (table.length < 2) {
        throw new Error('The file has no data rows. Use the template as a guide.');
      }
      const header = table[0].map((h) => h.trim().toLowerCase());
      const missingCols = ['cons_code', 'last_name', 'first_name'].filter((c) => !header.includes(c));
      if (missingCols.length > 0) {
        throw new Error(`Missing required column(s): ${missingCols.join(', ')}. Download the template for the exact layout.`);
      }

      const idx = (name: string) => header.indexOf(name);
      const parsed: ImportRow[] = table.slice(1).map((cells, i) => ({
        seq: i + 1,
        cons_code: (cells[idx('cons_code')] ?? '').trim(),
        last_name: (cells[idx('last_name')] ?? '').trim(),
        first_name: (cells[idx('first_name')] ?? '').trim(),
        middle_name: (cells[idx('middle_name')] ?? '').trim(),
        meter_serial: (cells[idx('meter_serial')] ?? '').trim(),
        previous_period: (cells[idx('previous_period')] ?? '').trim(),
        previous_reading: (cells[idx('previous_reading')] ?? '').trim(),
        current_reading: (cells[idx('current_reading')] ?? '').trim(),
        status: (cells[idx('status')] ?? '').trim(),
        sitio: (cells[idx('sitio')] ?? '').trim(),
      }));

      const errs = validateRows(parsed);
      const invalidSeqs = new Set(errs.map((e) => e.seq));
      const valid = parsed.filter((r) => !invalidSeqs.has(r.seq));

      if (valid.length === 0) {
        throw new Error('No valid rows found. Fix the listed issues and upload again.');
      }

      setFileName(file.name);
      setRows(valid);
      setRowErrors(errs);
      setStage('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read the file.');
      setRows([]);
      setRowErrors([]);
    } finally {
      setParsing(false);
    }
  };

  const runImport = async () => {
    setImporting(true);
    setError(null);
    try {
      const payload = rows.map((r) => ({
        cons_code: r.cons_code,
        last_name: r.last_name,
        first_name: r.first_name,
        middle_name: r.middle_name || null,
        meter_serial: r.meter_serial || null,
        previous_period: r.previous_period || null,
        previous_reading: r.previous_reading || null,
        current_reading: r.current_reading || null,
        status: r.status.toLowerCase() || 'active',
        sitio: r.sitio || null,
      }));
      const { data, error: rpcError } = await supabase.rpc('import_resident_rows', {
        p_rows: payload,
        p_mode: importMode,
      });
      if (rpcError) throw new Error(rpcError.message);
      setImportResult(data as typeof importResult extends null ? never : NonNullable<typeof importResult>);
      setStage('summary');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  const validCount = rows.length;
  const errorCount = rowErrors.length;

  const summaryCards = useMemo(() => {
    if (!importResult) return [];
    return [
      { label: 'Rows processed', value: importResult.total_rows },
      { label: 'New accounts created', value: importResult.created_accounts },
      { label: 'New profiles created', value: importResult.created_users },
      { label: 'Existing accounts updated', value: importResult.updated_accounts },
      { label: 'Skipped (skip-existing)', value: importResult.skipped },
      { label: 'Failed rows', value: importResult.failed },
    ];
  }, [importResult]);

  return (
    <>
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Data Migration</h1>
            <p className="text-gray-600">
              Migrate the barangay masterlist from CSV. Existing cons codes are updated on their
              masterlist fields only — manually entered data is never overwritten.
            </p>
          </div>

          {/* Stepper */}
          <div className="flex items-center space-x-2 mb-6 text-sm">
            {(['upload', 'preview', 'summary'] as Stage[]).map((s, i) => (
              <React.Fragment key={s}>
                {i > 0 && <span className="text-gray-300">→</span>}
                <span
                  className={`px-3 py-1 rounded-full font-medium ${
                    stage === s ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-500'
                  }`}
                >
                  {i + 1}. {s === 'upload' ? 'Upload' : s === 'preview' ? 'Preview & Validate' : 'Summary'}
                </span>
              </React.Fragment>
            ))}
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-start justify-between gap-4">
              <span>{error}</span>
              <button onClick={reset} className="underline hover:text-red-800 whitespace-nowrap">
                Start over
              </button>
            </div>
          )}

          {/* Step 1 — Upload */}
          {stage === 'upload' && (
            <div className="space-y-6 max-w-3xl">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-2">1. Download the CSV template</h3>
                <p className="text-sm text-gray-500 mb-4">
                  The template contains the required columns and two example rows (delete them
                  before importing). Blank Current Reading is valid and stays blank.
                </p>
                <button
                  onClick={downloadTemplate}
                  className="inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Template</span>
                </button>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-2">2. Upload your completed CSV</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Required columns: cons_code, last_name, first_name. Optional: middle_name,
                  meter_serial, previous_period, previous_reading, current_reading, status, sitio.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleFile(f);
                  }}
                  disabled={parsing}
                  className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 disabled:opacity-50"
                />
                {parsing && (
                  <p className="mt-3 text-sm text-gray-500 flex items-center space-x-2">
                    <RefreshCw className="w-4 h-4 animate-spin" /> <span>Reading file…</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 2 — Preview */}
          {stage === 'preview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl border border-green-200 p-5">
                  <div className="flex items-center space-x-2 text-green-700 mb-1">
                    <CheckCircle2 className="w-5 h-5" />
                    <p className="text-xs uppercase font-semibold">Ready to import</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{validCount} row(s)</p>
                </div>
                <div className="bg-white rounded-xl border border-red-200 p-5">
                  <div className="flex items-center space-x-2 text-red-600 mb-1">
                    <XCircle className="w-5 h-5" />
                    <p className="text-xs uppercase font-semibold">Needs correction</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{errorCount} row(s)</p>
                </div>
                <div className="bg-white rounded-xl border border-blue-200 p-5">
                  <div className="flex items-center space-x-2 text-blue-700 mb-1">
                    <Database className="w-5 h-5" />
                    <p className="text-xs uppercase font-semibold">Existing-account handling</p>
                  </div>
                  <select
                    value={importMode}
                    onChange={(e) => setImportMode(e.target.value as 'upsert' | 'skip_existing')}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    <option value="upsert">Update existing cons codes</option>
                    <option value="skip_existing">Skip existing cons codes</option>
                  </select>
                </div>
              </div>

              {rowErrors.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-gray-900">Rows requiring correction</h3>
                    <span className="text-xs text-gray-400">{fileName}</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                    {rowErrors.map((e) => (
                      <div key={e.seq} className="px-6 py-2.5 text-sm flex items-start space-x-3">
                        <span className="font-mono text-xs text-gray-400 mt-0.5 w-12">#{e.seq}</span>
                        <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{e.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-gray-900">Records that will be imported</h3>
                  <span className="text-xs text-gray-400">
                    Blank current readings stay blank — never converted to zero or inactive.
                  </span>
                </div>
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                      <tr>
                        {['#', 'Cons Code', 'Last Name', 'First Name', 'Middle', 'Meter Serial', 'Prev Period', 'Prev Reading', 'Current Reading', 'Status', 'Sitio'].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rows.map((r) => (
                        <tr key={r.seq}>
                          <td className="px-4 py-2 text-xs text-gray-400">{r.seq}</td>
                          <td className="px-4 py-2 text-sm font-mono text-gray-800">{r.cons_code}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{r.last_name}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{r.first_name}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{r.middle_name || '—'}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{r.meter_serial || '—'}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{r.previous_period || '—'}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{r.previous_reading || '—'}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">
                            {r.current_reading || <span className="italic text-gray-400">blank</span>}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600 capitalize">{(r.status || 'active').toLowerCase()}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{r.sitio || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={reset}
                  className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={runImport}
                  disabled={importing || validCount === 0}
                  className="inline-flex items-center space-x-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  <span>{importing ? 'Importing…' : `Import ${validCount} Row(s)`}</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Summary */}
          {stage === 'summary' && importResult && (
            <div className="max-w-3xl space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <FileText className="w-5 h-5 text-primary-600" />
                  <h3 className="text-base font-semibold text-gray-900">Import summary — {fileName}</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {summaryCards.map((card) => (
                    <div key={card.label} className={`border rounded-xl px-4 py-3 ${Number(card.value) > 0 && card.label.includes('Fail') ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
                      <p className="text-xs text-gray-500 uppercase mb-1">{card.label}</p>
                      <p className="text-xl font-bold text-gray-900">{String(card.value)}</p>
                    </div>
                  ))}
                </div>
                {importResult.failed > 0 && (
                  <div className="mt-5">
                    <h4 className="text-sm font-semibold text-gray-800 mb-2">Failure reasons</h4>
                    <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-56 overflow-y-auto">
                      {importResult.errors.map((e, i) => (
                        <div key={i} className="px-4 py-2 text-sm flex items-start space-x-3">
                          <span className="font-mono text-xs text-gray-400 mt-0.5">#{e.row}</span>
                          <span className="font-mono text-xs text-gray-500 mt-0.5">{e.cons_code || '—'}</span>
                          <span className="text-gray-700">{e.error}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="mt-5 text-xs text-gray-400">
                  New consumers are imported as records without login credentials. Staff can issue
                  credentials per resident from the Residents page (Actions → Issue Login).
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={reset}
                  className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Import Another File
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DataMigration;
