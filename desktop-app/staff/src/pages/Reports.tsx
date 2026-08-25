import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Download,
  FileText,
  Loader2,
  RefreshCcw,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import {
  REPORT_CATEGORIES,
  exportReportCsv,
  exportReportPdf,
  getPeriodRange,
  getReport,
  type ReportCategory,
  type ReportPeriod,
  type ReportResult,
} from '../services/reportService';

const PERIOD_KINDS: { id: ReportPeriod['kind']; label: string }[] = [
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

const Reports: React.FC = () => {
  const [category, setCategory] = useState<ReportCategory>('residents');
  const [kind, setKind] = useState<ReportPeriod['kind']>('monthly');
  const [year, setYear] = useState(currentYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [quarter, setQuarter] = useState(Math.floor(new Date().getMonth() / 3) + 1);

  const [result, setResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeCategory = useMemo(
    () => REPORT_CATEGORIES.find((c) => c.id === category)!,
    [category]
  );

  const period: ReportPeriod = useMemo(
    () =>
      kind === 'monthly'
        ? { kind, year, month }
        : kind === 'quarterly'
          ? { kind, year, quarter }
          : { kind, year },
    [kind, year, month, quarter]
  );

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(await getReport(category, period));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate the report.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [category, period]);

  // Initial load.
  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const years = useMemo(() => {
    const y = currentYear();
    return [y, y - 1, y - 2, y - 3, y - 4];
  }, []);

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Reports</h1>
            <p className="text-gray-600">
              Operational reports generated from live system data — monthly, quarterly, or yearly.
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
                onClick={() => setCategory(c.id)}
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
                {PERIOD_KINDS.map((k) => (
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

            {kind === 'monthly' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Month</label>
                <div className="relative">
                  <select
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className="appearance-none pl-3 pr-10 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i + 1}>{m}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
            )}

            {kind === 'quarterly' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Quarter</label>
                <div className="relative">
                  <select
                    value={quarter}
                    onChange={(e) => setQuarter(Number(e.target.value))}
                    className="appearance-none pl-3 pr-10 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {[1, 2, 3, 4].map((q) => (
                      <option key={q} value={q}>Q{q}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Year</label>
              <div className="relative">
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="appearance-none pl-3 pr-10 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

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
                onClick={() => result && exportReportCsv(result, category)}
                disabled={!result || result.rows.length === 0}
                className="inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => result && exportReportPdf(result)}
                disabled={!result || result.rows.length === 0}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40"
              >
                <FileText className="w-4 h-4" />
                <span>Export PDF</span>
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
                  {getPeriodRange(period).label !== '' ? `${result.rows.length} row(s)` : ''}
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
