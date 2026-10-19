import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, BookOpen, CheckCircle2, Download, RefreshCw, Table2, Upload, X, XCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import StyledSelect from './ui/StyledSelect';
import { downloadBillHistoryTemplate } from '../utils/billHistoryTemplate';
import { downloadConsumerImportTemplate } from '../utils/consumerImportTemplate';
import { getSitioOptions } from '../services/residentService';
import {
  BILL_HISTORY_ROW_LIMIT,
  BILL_IMPORT_COLUMNS,
  IMPORT_COLUMNS,
  ImportBatchError,
  NO_SITIO_VALUE,
  fetchAccountsMissingBillHistory,
  hasAccountsWithoutSitio,
  importBillHistoryRows,
  importConsumerRows,
  parseBillWorkbook,
  parseConsumerWorkbook,
  type BillHistoryAccount,
  type BillImportColumn,
  type BillImportRow,
  type BillImportSummary,
  type ConsumerImportRow,
  type ImportColumn,
  type ImportRowError,
  type ImportSummary,
} from '../services/dataImportService';

const PREVIEW_LIMIT = 200;

type Guide = 'instructions' | 'sample' | 'bill-instructions' | 'bill-sample';

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

const BILL_INSTRUCTIONS = [
  'Import consumers first. Download bill history for one sitio and one month. The file lists only accounts that do not yet have a bill for that month, up to 100 accounts. When more remain, download the next part.',
  'profiles.last_name, profiles.first_name, resident_accounts.account_number, and bills.billing_period are filled for you. Names and the account number are not written back.',
  'Fill bills.previous_reading, bills.current_reading, bills.amount, and bills.amount_due. Leave bills.consumption blank when both readings are filled. It is saved as the current reading minus the previous reading. That month, the readings, and the consumption are also saved under Meter Information.',
  'A month with no readings and no amounts is skipped. bills.amount_due of 0 is saved as paid. A balance still owed stays payable. The outstanding total is the sum of amount due and is not a column in this sheet.',
  'Uploading the same account and month again updates that bill.',
];

/** Column shape only. The downloaded file is one sitio and one month. */
const BILL_SAMPLE_ROWS: Record<BillImportColumn, string | number | null>[] = [
  {
    'profiles.last_name': 'ABELGAS',
    'profiles.first_name': 'ALMA',
    'resident_accounts.account_number': '9283',
    'bills.billing_period': '2026-06',
    'bills.previous_reading': 1760,
    'bills.current_reading': 1785,
    'bills.consumption': 25,
    'bills.amount': 625,
    'bills.amount_due': 0,
  },
  {
    'profiles.last_name': 'ABELGAS',
    'profiles.first_name': 'ALMA',
    'resident_accounts.account_number': '9283',
    'bills.billing_period': '2026-07',
    'bills.previous_reading': 1785,
    'bills.current_reading': 1800,
    'bills.consumption': 15,
    'bills.amount': 375,
    'bills.amount_due': 375,
  },
];

function display(value: string): string {
  return value.trim() ? value : '—';
}

function cellDisplay(value: string | number | null): string {
  if (value == null || value === '') return '—';
  return String(value);
}

function SampleTable<Column extends string>({
  note,
  columns,
  rows,
  rowKey,
}: {
  note: string;
  columns: readonly Column[];
  rows: Record<Column, string | number | null>[];
  rowKey: (row: Record<Column, string | number | null>) => string;
}) {
  return (
    <>
      <p className="text-sm text-gray-500 mb-4">{note}</p>
      <div className="border border-gray-300 rounded-md overflow-hidden">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr>
              {columns.map((column) => (
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
            {rows.map((row, index) => (
              <tr key={rowKey(row)} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {columns.map((column) => (
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
  );
}

const GUIDE_TITLES: Record<Guide, string> = {
  instructions: 'Import instructions',
  sample: 'Sample rows',
  'bill-instructions': 'Bill history instructions',
  'bill-sample': 'Bill history sample',
};

const ImportGuideModal: React.FC<{ guide: Guide; onClose: () => void }> = ({ guide, onClose }) => {
  const isSample = guide === 'sample' || guide === 'bill-sample';

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
            {GUIDE_TITLES[guide]}
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
          {guide === 'sample' && (
            <SampleTable
              note="These two rows are from the barangay meter-reader masterlist. Copy the shape into the import sheet. They are not part of the downloaded file."
              columns={IMPORT_COLUMNS}
              rows={SAMPLE_ROWS}
              rowKey={(row) => String(row['resident_accounts.account_number'])}
            />
          )}
          {guide === 'bill-sample' && (
            <SampleTable
              note="The downloaded file is one sitio and one month, and only accounts that still need that month. These two rows show a paid month and a month that still has an amount due."
              columns={BILL_IMPORT_COLUMNS}
              rows={BILL_SAMPLE_ROWS}
              rowKey={(row) => `${row['resident_accounts.account_number']}-${row['bills.billing_period']}`}
            />
          )}
          {guide === 'instructions' && (
            <ol className="space-y-3 list-decimal list-inside text-sm text-gray-700">
              {IMPORT_INSTRUCTIONS.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
          )}
          {guide === 'bill-instructions' && (
            <ol className="space-y-3 list-decimal list-inside text-sm text-gray-700">
              {BILL_INSTRUCTIONS.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
};

const MONTH_OPTIONS = [
  ['01', 'January'],
  ['02', 'February'],
  ['03', 'March'],
  ['04', 'April'],
  ['05', 'May'],
  ['06', 'June'],
  ['07', 'July'],
  ['08', 'August'],
  ['09', 'September'],
  ['10', 'October'],
  ['11', 'November'],
  ['12', 'December'],
] as const;

const NO_SITIO_LABEL = 'No sitio';

const BillHistoryFilterModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const now = new Date();
  const [sitios, setSitios] = useState<string[]>([]);
  const [hasNoSitio, setHasNoSitio] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [sitioChoice, setSitioChoice] = useState('');
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [part, setPart] = useState(1);
  const [missing, setMissing] = useState<BillHistoryAccount[] | null>(null);
  const [totalInSitio, setTotalInSitio] = useState(0);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const period = `${year}-${month}`;
  const periodReady = /^\d{4}$/.test(year);
  const sitio = sitioChoice === NO_SITIO_VALUE ? null : sitioChoice;
  const sitioLabel = sitioChoice === NO_SITIO_VALUE ? NO_SITIO_LABEL : sitioChoice;
  const totalParts = missing ? Math.ceil(missing.length / BILL_HISTORY_ROW_LIMIT) : 0;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (document.querySelector('[aria-expanded="true"]')) return;
      onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setOptionsLoading(true);
    setOptionsError(null);
    Promise.all([getSitioOptions(), hasAccountsWithoutSitio()])
      .then(([names, blank]) => {
        if (cancelled) return;
        setSitios(names);
        setHasNoSitio(blank);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setOptionsError(err instanceof Error ? err.message : 'Sitios could not be loaded.');
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!sitioChoice || !periodReady) {
      setMissing(null);
      setTotalInSitio(0);
      return;
    }
    let cancelled = false;
    setLookupLoading(true);
    setLookupError(null);
    setPart(1);
    fetchAccountsMissingBillHistory(sitio, period)
      .then((result) => {
        if (cancelled) return;
        setMissing(result.missing);
        setTotalInSitio(result.totalInSitio);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setMissing(null);
        setLookupError(err instanceof Error ? err.message : 'Accounts could not be checked.');
      })
      .finally(() => {
        if (!cancelled) setLookupLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sitio, sitioChoice, period, periodReady]);

  const handleDownload = async () => {
    if (!missing || missing.length === 0 || !sitioChoice) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      await downloadBillHistoryTemplate({
        accounts: missing,
        sitioLabel,
        period,
        part,
      });
      onClose();
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'The bill history template could not be downloaded.');
    } finally {
      setDownloading(false);
    }
  };

  const status = (() => {
    if (!sitioChoice) return 'Choose a sitio and a month. The file lists accounts that still need that month.';
    if (lookupLoading) return 'Checking which accounts still need this month…';
    if (lookupError) return lookupError;
    if (!missing) return '';
    if (totalInSitio === 0) return 'No accounts in this sitio. Import those consumers first.';
    if (missing.length === 0) return 'Every account in this sitio already has a bill for that month.';
    const shown = Math.min(BILL_HISTORY_ROW_LIMIT, missing.length - (part - 1) * BILL_HISTORY_ROW_LIMIT);
    if (totalParts > 1) {
      return `${missing.length} accounts still need ${period}. This file is part ${part} of ${totalParts} (${shown} accounts).`;
    }
    return `${missing.length} account${missing.length === 1 ? '' : 's'} still need ${period}.`;
  })();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bill-filter-title"
    >
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 id="bill-filter-title" className="text-lg font-semibold text-gray-900">
            Download bill history
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
        <div className="px-6 py-5 space-y-4">
          {optionsError && (
            <p className="text-sm text-red-700">{optionsError}</p>
          )}
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">Sitio</span>
            <StyledSelect
              value={sitioChoice}
              disabled={optionsLoading || downloading}
              onChange={(event) => setSitioChoice(event.target.value)}
              wrapperClassName="w-full"
              className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              title="Sitio"
            >
              <option value="">{optionsLoading ? 'Loading sitios…' : 'Select a sitio'}</option>
              {sitios.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
              {hasNoSitio && <option value={NO_SITIO_VALUE}>{NO_SITIO_LABEL}</option>}
            </StyledSelect>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">Year</span>
              <input
                type="number"
                min={2000}
                max={2100}
                value={year}
                disabled={downloading}
                onChange={(event) => setYear(event.target.value)}
                className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">Month</span>
              <StyledSelect
                value={month}
                disabled={downloading}
                onChange={(event) => setMonth(event.target.value)}
                wrapperClassName="w-full"
                className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                title="Month"
              >
                {MONTH_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </StyledSelect>
            </label>
          </div>
          {totalParts > 1 && (
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">Part</span>
              <StyledSelect
                value={String(part)}
                disabled={downloading}
                onChange={(event) => setPart(Number(event.target.value))}
                wrapperClassName="w-full"
                className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                title="Part"
              >
                {Array.from({ length: totalParts }, (_, index) => {
                  const start = index * BILL_HISTORY_ROW_LIMIT + 1;
                  const end = Math.min((index + 1) * BILL_HISTORY_ROW_LIMIT, missing?.length ?? 0);
                  return (
                    <option key={start} value={index + 1}>
                      Part {index + 1} (rows {start}–{end})
                    </option>
                  );
                })}
              </StyledSelect>
            </label>
          )}
          <p className={`text-sm ${lookupError || downloadError ? 'text-red-700' : 'text-gray-600'}`}>
            {downloadError || status}
          </p>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={downloading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleDownload()}
              disabled={!missing || missing.length === 0 || lookupLoading || downloading || !periodReady}
              className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {downloading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{downloading ? 'Preparing…' : 'Download'}</span>
            </button>
          </div>
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
  const billFileInputRef = useRef<HTMLInputElement>(null);
  const [billFileName, setBillFileName] = useState('');
  const [billFilterOpen, setBillFilterOpen] = useState(false);
  const [billParsing, setBillParsing] = useState(false);
  const [billImporting, setBillImporting] = useState(false);
  const [billProgress, setBillProgress] = useState('');
  const [billError, setBillError] = useState<string | null>(null);
  const [billRows, setBillRows] = useState<BillImportRow[]>([]);
  const [billRowErrors, setBillRowErrors] = useState<ImportRowError[]>([]);
  const [billSkipped, setBillSkipped] = useState(0);
  const [billSummary, setBillSummary] = useState<BillImportSummary | null>(null);

  const errorRows = useMemo(() => new Set(rowErrors.map((item) => item.rowNumber)), [rowErrors]);
  const previewRows = rows.slice(0, PREVIEW_LIMIT);
  const canImport = rows.length > 0 && rowErrors.length === 0 && !importing;
  const billErrorRows = useMemo(() => new Set(billRowErrors.map((item) => item.rowNumber)), [billRowErrors]);
  const billPreviewRows = billRows.slice(0, PREVIEW_LIMIT);
  const canImportBills = billRows.length > 0 && billRowErrors.length === 0 && !billImporting;

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

  const resetBillFile = () => {
    setBillFileName('');
    setBillRows([]);
    setBillRowErrors([]);
    setBillSkipped(0);
    setBillSummary(null);
    setBillError(null);
    setBillProgress('');
    if (billFileInputRef.current) billFileInputRef.current.value = '';
  };

  const handleBillFile = async (file: File) => {
    setBillError(null);
    setBillSummary(null);
    setBillParsing(true);
    try {
      const parsed = await parseBillWorkbook(await file.arrayBuffer());
      setBillFileName(file.name);
      setBillRows(parsed.rows);
      setBillRowErrors(parsed.errors);
      setBillSkipped(parsed.skipped);
    } catch (err) {
      resetBillFile();
      setBillError(err instanceof Error ? err.message : 'The workbook could not be read.');
    } finally {
      setBillParsing(false);
    }
  };

  const handleBillImport = async () => {
    if (!canImportBills) return;
    setBillImporting(true);
    setBillError(null);
    setBillProgress('');
    try {
      const result = await importBillHistoryRows(billRows, billSkipped, (completed, total) => {
        setBillProgress(`Importing batch ${completed} of ${total}…`);
      });
      setBillSummary(result);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.bills.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.payments.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.meterReadings.all }),
      ]);
    } catch (err) {
      if (err instanceof ImportBatchError && (err.created > 0 || err.updated > 0)) {
        setBillSummary({ created: err.created, updated: err.updated, skipped: billSkipped, total: billRows.length });
        setBillError(
          `${err.message} ${err.created} bill(s) were saved and ${err.updated} were updated before this batch stopped. Upload the file again. The same account and month updates the existing history bill.`
        );
      } else {
        setBillError(err instanceof Error ? err.message : 'Bill import failed.');
      }
    } finally {
      setBillImporting(false);
      setBillProgress('');
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
      <div className="pt-2 border-t border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Past billings</h2>
        <p className="text-sm text-gray-500 mt-1">
          Choose a sitio and a month. The file lists accounts that do not yet have a bill for that month, up to 100 at a time. Fill the reading, the bill amount, and the amount still due.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-2">1. Download accounts</h2>
          <p className="text-sm text-gray-500 mb-4">
            Pick a sitio and a month. Name, account number, and billing period are filled for accounts that still need that month. Each file has at most 100 accounts.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setBillFilterOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download bill history</span>
            </button>
            <button
              type="button"
              onClick={() => setGuide('bill-instructions')}
              className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              <span>Instructions</span>
            </button>
            <button
              type="button"
              onClick={() => setGuide('bill-sample')}
              className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Table2 className="w-4 h-4" />
              <span>Sample</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-2">2. Upload filled months</h2>
          <p className="text-sm text-gray-500 mb-4">
            Match is by Cons Code. The same account and month updates that history bill. A row with no readings and no amounts is left out.
          </p>
          <input
            ref={billFileInputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            disabled={billParsing || billImporting}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleBillFile(file);
            }}
            className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
          />
          {billParsing && (
            <p className="mt-3 text-sm text-gray-500 flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Reading workbook…</span>
            </p>
          )}
        </div>
      </div>

      {billError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{billError}</span>
        </div>
      )}

      {billSummary && (
        <div className="bg-white rounded-xl border border-emerald-200 p-6">
          <div className="flex items-center space-x-2 text-emerald-700 mb-4">
            <CheckCircle2 className="w-5 h-5" />
            <h2 className="text-base font-semibold">Bill history finished{billFileName ? ` — ${billFileName}` : ''}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="border border-gray-200 rounded-xl px-4 py-3">
              <p className="text-xs uppercase text-gray-500 mb-1">Months in file</p>
              <p className="text-xl font-bold text-gray-900">{billSummary.total}</p>
            </div>
            <div className="border border-gray-200 rounded-xl px-4 py-3">
              <p className="text-xs uppercase text-gray-500 mb-1">Bills created</p>
              <p className="text-xl font-bold text-gray-900">{billSummary.created}</p>
            </div>
            <div className="border border-gray-200 rounded-xl px-4 py-3">
              <p className="text-xs uppercase text-gray-500 mb-1">Bills updated</p>
              <p className="text-xl font-bold text-gray-900">{billSummary.updated}</p>
            </div>
            <div className="border border-gray-200 rounded-xl px-4 py-3">
              <p className="text-xs uppercase text-gray-500 mb-1">Blank months skipped</p>
              <p className="text-xl font-bold text-gray-900">{billSummary.skipped}</p>
            </div>
          </div>
        </div>
      )}

      {billRows.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border border-emerald-200 p-5">
              <div className="flex items-center space-x-2 text-emerald-700 mb-1">
                <CheckCircle2 className="w-5 h-5" />
                <p className="text-xs uppercase font-semibold">Months to import</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{billRows.length}</p>
            </div>
            <div className={`bg-white rounded-xl border p-5 ${billRowErrors.length > 0 ? 'border-red-200' : 'border-gray-200'}`}>
              <div className={`flex items-center space-x-2 mb-1 ${billRowErrors.length > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                <XCircle className="w-5 h-5" />
                <p className="text-xs uppercase font-semibold">Issues to fix</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{billRowErrors.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs uppercase font-semibold text-gray-500 mb-1">Blank months skipped</p>
              <p className="text-2xl font-bold text-gray-900">{billSkipped}</p>
            </div>
          </div>

          {billRowErrors.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-base font-semibold text-gray-900">Bill rows that need correction</h3>
                <p className="text-xs text-gray-500 mt-1">Import stays off until every issue in this file is fixed.</p>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                {billRowErrors.map((item, index) => (
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
              <h3 className="text-base font-semibold text-gray-900">Bill preview</h3>
              <span className="text-xs text-gray-400">
                {billRows.length > PREVIEW_LIMIT
                  ? `Showing the first ${PREVIEW_LIMIT} of ${billRows.length} months`
                  : billFileName}
              </span>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    {['Row', 'resident_accounts.account_number', 'bills.billing_period', 'bills.previous_reading', 'bills.current_reading', 'bills.consumption', 'bills.amount', 'bills.amount_due'].map((header) => (
                      <th key={header} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {billPreviewRows.map((row) => (
                    <tr key={row.rowNumber} className={billErrorRows.has(row.rowNumber) ? 'bg-red-50' : undefined}>
                      <td className="px-4 py-2 text-xs text-gray-400">{row.rowNumber}</td>
                      <td className="px-4 py-2 text-sm font-mono text-gray-800">{display(row.accountNumber)}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{display(row.billingPeriod)}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{display(row.previousReading)}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{display(row.currentReading)}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{display(row.consumption)}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{display(row.amount)}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{display(row.amountDue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={resetBillFile}
              disabled={billImporting}
              className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => void handleBillImport()}
              disabled={!canImportBills}
              className="inline-flex items-center space-x-2 px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {billImporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span>{billImporting ? billProgress || 'Importing…' : `Import ${billRows.length} month(s)`}</span>
            </button>
          </div>
        </div>
      )}

      {guide && <ImportGuideModal guide={guide} onClose={() => setGuide(null)} />}
      {billFilterOpen && <BillHistoryFilterModal onClose={() => setBillFilterOpen(false)} />}
    </div>
  );
};

export default DataImportPanel;
