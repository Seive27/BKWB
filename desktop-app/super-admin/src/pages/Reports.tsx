import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Download,
  FileText,
  Loader2,
  RefreshCcw,
  AlertCircle,
} from 'lucide-react';
import StyledSelect from '../components/ui/StyledSelect';
import { SITIO_OPTIONS } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { ANALYTICS_STALE_TIME } from '../lib/queryClient';
import { queryErrorMessage } from '../lib/queryError';
import { queryKeys } from '../lib/queryKeys';
import {
  REPORT_CATEGORIES,
  exportReportCsv,
  exportReportPdf,
  getPeriodRange,
  getReport,
  type ReportCategory,
  type ReportPeriod,
} from '../services/reportService';
import { getSitioOptions } from '../services/residentService';

const BASE_PERIOD_KINDS: { id: ReportPeriod['kind']; label: string }[] = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'quarterly', label: 'Quarterly' },
  { id: 'yearly', label: 'Yearly' },
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function currentYear(): number {
  return new Date().getFullYear();
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

const Reports: React.FC = () => {
  const [category, setCategory] = useState<ReportCategory>('residents');
  const [kind, setKind] = useState<ReportPeriod['kind']>('monthly');
  const [year, setYear] = useState(currentYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [day, setDay] = useState(new Date().getDate());
  const [quarter, setQuarter] = useState(Math.floor(new Date().getMonth() / 3) + 1);
  const [sitioFilter, setSitioFilter] = useState('');

  const { isAuthenticated } = useAuth();
  const [submitted, setSubmitted] = useState<{
    category: ReportCategory;
    period: ReportPeriod;
    sitio: string;
  }>(() => ({
    category: 'residents',
    period: {
      kind: 'monthly',
      year: currentYear(),
      month: new Date().getMonth() + 1,
    },
    sitio: '',
  }));
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const isPayments = category === 'payments';

  const periodKinds = useMemo(
    () =>
      isPayments
        ? [{ id: 'daily' as const, label: 'Daily' }, ...BASE_PERIOD_KINDS]
        : BASE_PERIOD_KINDS,
    [isPayments]
  );

  const dayOptions = useMemo(
    () => Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1),
    [year, month]
  );

  useEffect(() => {
    if (!isPayments && kind === 'daily') {
      setKind('monthly');
    }
  }, [isPayments, kind]);

  useEffect(() => {
    const maxDay = daysInMonth(year, month);
    if (day > maxDay) setDay(maxDay);
  }, [year, month, day]);

  const sitiosQuery = useQuery({
    queryKey: queryKeys.residents.sitios(),
    queryFn: () => getSitioOptions().catch(() => [] as string[]),
    enabled: isAuthenticated && isPayments,
  });
  const sitios =
    sitiosQuery.data && sitiosQuery.data.length > 0
      ? sitiosQuery.data
      : (SITIO_OPTIONS as unknown as string[]);

  const activeCategory = useMemo(
    () => REPORT_CATEGORIES.find((c) => c.id === category)!,
    [category]
  );

  const period: ReportPeriod = useMemo(() => {
    if (kind === 'daily') return { kind, year, month, day };
    if (kind === 'monthly') return { kind, year, month };
    if (kind === 'quarterly') return { kind, year, quarter };
    return { kind, year };
  }, [kind, year, month, day, quarter]);

  const reportQuery = useQuery({
    queryKey: queryKeys.reports.detail(
      submitted.category,
      submitted.period,
      { sitio: submitted.sitio || null }
    ),
    queryFn: () =>
      getReport(submitted.category, submitted.period, {
        sitio: submitted.category === 'payments' ? submitted.sitio || null : null,
      }),
    enabled: isAuthenticated,
    staleTime: ANALYTICS_STALE_TIME,
  });
  const result = reportQuery.data ?? null;
  const loading = reportQuery.isFetching;
  const error =
    exportError ?? queryErrorMessage(reportQuery.error, 'Failed to generate the report.');

  const generate = () => {
    setExportError(null);
    const nextSitio = isPayments ? sitioFilter : '';
    const same =
      submitted.category === category &&
      JSON.stringify(submitted.period) === JSON.stringify(period) &&
      submitted.sitio === nextSitio;
    if (same) {
      void reportQuery.refetch();
      return;
    }
    setSubmitted({ category, period, sitio: nextSitio });
  };

  const handleExportCsv = async () => {
    if (!result) return;
    setExportingCsv(true);
    setExportError(null);
    try {
      await exportReportCsv(result, category);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Failed to export CSV.');
    } finally {
      setExportingCsv(false);
    }
  };

  const handleExportPdf = async () => {
    if (!result) return;
    setExportingPdf(true);
    setExportError(null);
    try {
      await exportReportPdf(result, category);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Failed to export PDF.');
    } finally {
      setExportingPdf(false);
    }
  };

  const years = useMemo(() => {
    const y = currentYear();
    return [y, y - 1, y - 2, y - 3, y - 4];
  }, []);

  const selectCategory = (next: ReportCategory) => {
    setCategory(next);
    if (next !== 'payments') {
      setSitioFilter('');
      if (kind === 'daily') setKind('monthly');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Reports</h1>
            <p className="text-gray-600">
              Operational reports generated from live system data — daily, monthly, quarterly, or yearly.
            </p>
          </div>
          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Report Builder */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          {/* Category pills */}
          <div className="flex flex-wrap gap-2 mb-5">
            {REPORT_CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => selectCategory(c.id)}
                title={c.description}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  category === c.id
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Period controls */}
          <div className="flex flex-wrap items-end gap-4 mb-1">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Frequency</label>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                {periodKinds.map((k) => (
                  <button
                    key={k.id}
                    onClick={() => setKind(k.id)}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      kind === k.id
                        ? 'bg-primary-50 text-primary-700'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {k.label}
                  </button>
                ))}
              </div>
            </div>

            {(kind === 'monthly' || kind === 'daily') && (
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Month</label>
                <StyledSelect
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </StyledSelect>
              </div>
            )}

            {kind === 'daily' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Day</label>
                <StyledSelect
                  value={day}
                  onChange={(e) => setDay(Number(e.target.value))}
                  className="py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {dayOptions.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </StyledSelect>
              </div>
            )}

            {kind === 'quarterly' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Quarter</label>
                <StyledSelect
                  value={quarter}
                  onChange={(e) => setQuarter(Number(e.target.value))}
                  className="py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {[1, 2, 3, 4].map((q) => (
                    <option key={q} value={q}>Q{q}</option>
                  ))}
                </StyledSelect>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Year</label>
              <StyledSelect
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </StyledSelect>
            </div>

            {isPayments && (
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Sitio</label>
                <StyledSelect
                  searchable
                  searchPlaceholder="Search sitios…"
                  value={sitioFilter || 'all'}
                  onChange={(e) =>
                    setSitioFilter(e.target.value === 'all' ? '' : e.target.value)
                  }
                  className="min-w-[12rem] py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  title="Filter by Sitio"
                >
                  <option value="all">All Sitios</option>
                  {sitios.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </StyledSelect>
              </div>
            )}

            <button
              onClick={generate}
              disabled={loading}
              className="inline-flex items-center space-x-2 px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
              <span>{loading ? 'Generating…' : 'Generate Report'}</span>
            </button>

            <div className="ml-auto flex items-center space-x-2">
              <button
                onClick={handleExportCsv}
                disabled={!result || result.rows.length === 0 || exportingCsv}
                className="inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40"
              >
                {exportingCsv ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>{exportingCsv ? 'Saving…' : 'Export'}</span>
              </button>
              <button
                onClick={handleExportPdf}
                disabled={!result || result.rows.length === 0 || exportingPdf}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40"
              >
                {exportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                <span>{exportingPdf ? 'Saving…' : 'Export PDF'}</span>
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
        )}

        {/* Result */}
        {result && (
          <>
            {/* Title + summary */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-gray-900">
                  {result.title}
                  {result.periodLabel ? ` — ${result.periodLabel}` : ''}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Generated {new Date(result.generatedAt).toLocaleString()} ·{' '}
                  {getPeriodRange(submitted.period).label !== '' ? `${result.rows.length} row(s)` : ''}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {result.summary.map((s) => (
                  <div key={s.label} className="border border-gray-200 rounded-xl px-4 py-3">
                    <p className="text-xs text-gray-500 uppercase mb-1">{s.label}</p>
                    <p className="text-lg font-bold text-gray-900 break-words">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {result.columns.map((c) => (
                        <th
                          key={c.key}
                          className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap"
                        >
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {result.rows.length === 0 ? (
                      <tr>
                        <td colSpan={result.columns.length} className="px-6 py-12 text-center">
                          <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">
                            No {activeCategory.label.toLowerCase()} records found for this period.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      result.rows.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                          {result.columns.map((c) => (
                            <td key={c.key} className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">
                              {row[c.key]}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Reports;
