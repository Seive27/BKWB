import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, BookOpen, CheckCircle2, Download, RefreshCw, Table2, Upload, X, XCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { downloadConsumerImportTemplate } from '../utils/consumerImportTemplate';
import {
  IMPORT_COLUMNS,
  ImportBatchError,
  importConsumerRows,
  parseConsumerWorkbook,
  type ConsumerImportRow,
  type ImportColumn,
  type ImportRowError,
  type ImportSummary,
} from '../services/dataImportService';

const PREVIEW_LIMIT = 200;

type Guide = 'instructions' | 'sample';

const IMPORT_INSTRUCTIONS = [
  'Fill the import sheet. One row is one consumer. Do not rename the column headers or the sheet.',
  'Split a printed name such as "ABELGAS, ALMA MAGDADARO" into profiles.last_name, profiles.first_name, and profiles.middle_name.',
  'resident_accounts.account_number is the Cons Code. Uploading the same code again updates that account and does not create a second profile.',
  'resident_accounts.previous_reading_date uses YYYY-MM-DD.',
  'Leave resident_accounts.current_reading blank when the latest reading has not been taken. A blank cell stays blank and is not stored as zero.',
  'meters.meter_number is text. Keep leading zeros and values such as 2024-0006697. Leave it blank when the consumer has no meter yet.',
  'A blank resident_accounts.service_address does not erase an address already saved on that account.',
  'Imported consumers have no login, so they appear as No Account Yet until staff issue credentials from the Residents page.',
];

/** Two real rows from the barangay meter-reader masterlist. */
const SAMPLE_ROWS: Record<ImportColumn, string | number | null>[] = [
  {
    'profiles.last_name': 'ABELGAS',
    'profiles.first_name': 'ALMA',
    'profiles.middle_name': 'MAGDADARO',
    'resident_accounts.account_number': '9283',
    'resident_accounts.sitio': 'AWIHAW',
    'resident_accounts.service_address': null,
    'meters.meter_number': '12793',
    'resident_accounts.previous_reading_date': '2021-07-01',
    'resident_accounts.previous_reading': 1760,
    'resident_accounts.current_reading': null,
  },
  {
    'profiles.last_name': 'ALONSABE',
    'profiles.first_name': 'NATHAN',
    'profiles.middle_name': 'O.',
    'resident_accounts.account_number': '13429',
    'resident_accounts.sitio': 'ELLENA HOMES',
    'resident_accounts.service_address': null,
    'meters.meter_number': '562',
    'resident_accounts.previous_reading_date': '2026-05-01',
    'resident_accounts.previous_reading': 309,
    'resident_accounts.current_reading': 312,
  },
];

function display(value: string): string {
  return value.trim() ? value : '—';
}

function cellDisplay(value: string | number | null): string {
  if (value == null || value === '') return '—';
  return String(value);
}

const ImportGuideModal: React.FC<{ guide: Guide; onClose: () => void }> = ({ guide, onClose }) => {
  const isSample = guide === 'sample';

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-guide-title"
    >
      <div className={`bg-white rounded-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col ${isSample ? 'max-w-6xl' : 'max-w-2xl'}`}>
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 id="import-guide-title" className="text-lg font-semibold text-gray-900">
            {isSample ? 'Sample rows' : 'Import instructions'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto overflow-x-hidden px-6 py-5">
          {isSample ? (
            <>
              <p className="text-sm text-gray-500 mb-4">
                These two rows are from the barangay meter-reader masterlist. Copy the shape into the import sheet. They are not part of the downloaded file.
              </p>
              <div className="border border-gray-300 rounded-md overflow-hidden">
                <table className="w-full table-fixed border-collapse">
                  <thead>
                    <tr>
                      {IMPORT_COLUMNS.map((column) => (
                        <th
                          key={column}
                          className="border border-white/20 bg-[#1F7A66] px-1.5 py-2 text-left text-[11px] font-semibold leading-snug text-white align-bottom break-words"
                        >
                          {column.replace(/\./g, '.\u200b').replace(/_/g, '_\u200b')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SAMPLE_ROWS.map((row, index) => (
                      <tr key={String(row['resident_accounts.account_number'])} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {IMPORT_COLUMNS.map((column) => (
                          <td key={column} className="border border-gray-200 px-1.5 py-2 text-xs text-gray-800 align-top break-words">
                            {cellDisplay(row[column])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <ol className="space-y-3 list-decimal list-inside text-sm text-gray-700">
              {IMPORT_INSTRUCTIONS.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
};

const DataImportPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ConsumerImportRow[]>([]);
  const [rowErrors, setRowErrors] = useState<ImportRowError[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [guide, setGuide] = useState<Guide | null>(null);

  const errorRows = useMemo(() => new Set(rowErrors.map((item) => item.rowNumber)), [rowErrors]);
  const previewRows = rows.slice(0, PREVIEW_LIMIT);
  const canImport = rows.length > 0 && rowErrors.length === 0 && !importing;

  const resetFile = () => {
    setFileName('');
    setRows([]);
    setRowErrors([]);
    setSummary(null);
    setError(null);
    setProgress('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFile = async (file: File) => {
    setError(null);
    setSummary(null);
    setParsing(true);
    try {
      const parsed = await parseConsumerWorkbook(await file.arrayBuffer());
      setFileName(file.name);
      setRows(parsed.rows);
      setRowErrors(parsed.errors);
    } catch (err) {
      resetFile();
      setError(err instanceof Error ? err.message : 'The workbook could not be read.');
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!canImport) return;
    setImporting(true);
    setError(null);
    setProgress('');
    try {
      const result = await importConsumerRows(rows, (completed, total) => {
        setProgress(`Importing batch ${completed} of ${total}…`);
      });
      setSummary(result);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.residents.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
      ]);
    } catch (err) {
      if (err instanceof ImportBatchError && (err.created > 0 || err.updated > 0)) {
        setSummary({ created: err.created, updated: err.updated, total: rows.length });
        setError(
          `${err.message} ${err.created} account(s) were created and ${err.updated} were updated before this batch stopped. Upload the file again to continue. Existing account numbers are updated in place.`
        );
      } else {
        setError(err instanceof Error ? err.message : 'Import failed.');
      }
    } finally {
      setImporting(false);
      setProgress('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-2">1. Download the template</h2>
          <p className="text-sm text-gray-500 mb-4">
            The workbook has one sheet named import. Its columns use the Supabase names for profiles, meters, and resident accounts.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void downloadConsumerImportTemplate()}
              className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download template</span>
            </button>
            <button
              type="button"
              onClick={() => setGuide('instructions')}
              className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              <span>Instructions</span>
            </button>
            <button
              type="button"
              onClick={() => setGuide('sample')}
              className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Table2 className="w-4 h-4" />
              <span>Sample</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-2">2. Upload the filled template</h2>
          <p className="text-sm text-gray-500 mb-4">
            Account number is the Cons Code. Uploading the same code again updates that account.
            Imported consumers appear as No Account Yet until a login is issued. A blank current reading stays blank.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            disabled={parsing || importing}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
            className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
          />
          {parsing && (
            <p className="mt-3 text-sm text-gray-500 flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Reading workbook…</span>
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {summary && (
        <div className="bg-white rounded-xl border border-emerald-200 p-6">
          <div className="flex items-center space-x-2 text-emerald-700 mb-4">
            <CheckCircle2 className="w-5 h-5" />
            <h2 className="text-base font-semibold">Import finished{fileName ? ` — ${fileName}` : ''}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-xl px-4 py-3">
              <p className="text-xs uppercase text-gray-500 mb-1">Rows in file</p>
              <p className="text-xl font-bold text-gray-900">{summary.total}</p>
            </div>
            <div className="border border-gray-200 rounded-xl px-4 py-3">
              <p className="text-xs uppercase text-gray-500 mb-1">Accounts created</p>
              <p className="text-xl font-bold text-gray-900">{summary.created}</p>
            </div>
            <div className="border border-gray-200 rounded-xl px-4 py-3">
              <p className="text-xs uppercase text-gray-500 mb-1">Accounts updated</p>
              <p className="text-xl font-bold text-gray-900">{summary.updated}</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            Imported consumers appear as No Account Yet. Staff can issue credentials from the Residents page.
          </p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-emerald-200 p-5">
              <div className="flex items-center space-x-2 text-emerald-700 mb-1">
                <CheckCircle2 className="w-5 h-5" />
                <p className="text-xs uppercase font-semibold">Rows in the import sheet</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{rows.length}</p>
            </div>
            <div className={`bg-white rounded-xl border p-5 ${rowErrors.length > 0 ? 'border-red-200' : 'border-gray-200'}`}>
              <div className={`flex items-center space-x-2 mb-1 ${rowErrors.length > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                <XCircle className="w-5 h-5" />
                <p className="text-xs uppercase font-semibold">Issues to fix</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{rowErrors.length}</p>
            </div>
          </div>

          {rowErrors.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-base font-semibold text-gray-900">Rows that need correction</h3>
                <p className="text-xs text-gray-500 mt-1">Import stays off until every issue in this file is fixed.</p>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                {rowErrors.map((item, index) => (
                  <div key={`${item.rowNumber}-${index}`} className="px-6 py-2.5 text-sm flex items-start space-x-3">
                    <span className="font-mono text-xs text-gray-400 mt-0.5 w-12">#{item.rowNumber}</span>
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{item.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
              <h3 className="text-base font-semibold text-gray-900">Preview</h3>
              <span className="text-xs text-gray-400">
                {rows.length > PREVIEW_LIMIT
                  ? `Showing the first ${PREVIEW_LIMIT} of ${rows.length} rows`
                  : fileName}
              </span>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    {['Row', 'profiles.last_name', 'profiles.first_name', 'resident_accounts.account_number', 'resident_accounts.sitio', 'meters.meter_number', 'resident_accounts.previous_reading', 'resident_accounts.current_reading'].map((header) => (
                      <th key={header} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {previewRows.map((row) => (
                    <tr key={row.rowNumber} className={errorRows.has(row.rowNumber) ? 'bg-red-50' : undefined}>
                      <td className="px-4 py-2 text-xs text-gray-400">{row.rowNumber}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{display(row.lastName)}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{display(row.firstName)}</td>
                      <td className="px-4 py-2 text-sm font-mono text-gray-800">{display(row.accountNumber)}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{display(row.sitio)}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{display(row.meterNumber)}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{display(row.previousReading)}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {row.currentReading ? row.currentReading : <span className="italic text-gray-400">blank</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={resetFile}
              disabled={importing}
              className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => void handleImport()}
              disabled={!canImport}
              className="inline-flex items-center space-x-2 px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span>{importing ? progress || 'Importing…' : `Import ${rows.length} row(s)`}</span>
            </button>
          </div>
        </div>
      )}
      {guide && <ImportGuideModal guide={guide} onClose={() => setGuide(null)} />}
    </div>
  );
};

export default DataImportPanel;
