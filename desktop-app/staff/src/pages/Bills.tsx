import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Download,
  Eye,
  CheckCircle,
  Receipt,
  DollarSign,
  Clock,
  AlertTriangle,
  Settings2,
  RefreshCw,
  AlertCircle,
  X,
  ChevronDown,
} from 'lucide-react';
import ConfigureBillsModal from '../components/modals/ConfigureBillsModal';
import {
  getBills,
  setBillStatus
} from '../services/billService';
import type { Bill, BillStatus } from '../types';

const PAGE_SIZE = 10;

function formatPeso(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `₱${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** '2026-05' -> 'May 2026'; falls back to the raw value. */
function formatPeriod(period: string): string {
  const m = period.match(/^(\d{4})-(\d{2})$/);
  if (!m) return period;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  if (isNaN(d.getTime())) return period;
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

function getStatusColor(status: BillStatus): string {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-700';
    case 'overdue':
      return 'bg-red-100 text-red-700';
    case 'void':
      return 'bg-gray-100 text-gray-500';
    default:
      return 'bg-yellow-100 text-yellow-700';
  }
}

function getStatusText(status: BillStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

// ─── Bill Detail Modal ───

const BillDetailModal: React.FC<{ bill: Bill; onClose: () => void }> = ({ bill, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-5 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{bill.bill_number}</h3>
          <p className="text-sm text-gray-500">{formatPeriod(bill.billing_period)} billing statement</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="px-6 py-5 space-y-5">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-500 uppercase">Resident</p>
            <p className="font-medium text-gray-900">
              {bill.resident ? `${bill.resident.first_name} ${bill.resident.last_name}` : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Account Number</p>
            <p className="font-medium text-gray-900">{bill.account?.account_number ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Sitio</p>
            <p className="font-medium text-gray-900">{bill.account?.sitio ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Billing Period</p>
            <p className="font-medium text-gray-900">{formatPeriod(bill.billing_period)}</p>
          </div>
        </div>

        <div className="border border-gray-200 rounded-xl divide-y divide-gray-100">
          <div className="flex justify-between px-4 py-2.5 text-sm">
            <span className="text-gray-500">Previous Reading</span>
            <span className="text-gray-900 font-medium">
              {bill.previous_reading !== null && bill.previous_reading !== undefined ? `${bill.previous_reading.toLocaleString()} m³` : '—'}
            </span>
          </div>
          <div className="flex justify-between px-4 py-2.5 text-sm">
            <span className="text-gray-500">Current Reading</span>
            <span className="text-gray-900 font-medium">
              {bill.current_reading !== null && bill.current_reading !== undefined ? `${bill.current_reading.toLocaleString()} m³` : '—'}
            </span>
          </div>
          <div className="flex justify-between px-4 py-2.5 text-sm">
            <span className="text-gray-500">Consumption</span>
            <span className="text-gray-900 font-medium">
              {bill.consumption !== null && bill.consumption !== undefined ? `${bill.consumption.toLocaleString()} m³` : '—'}
            </span>
          </div>
          <div className="flex justify-between px-4 py-2.5 text-sm">
            <span className="text-gray-500">Water Rate (per m³)</span>
            <span className="text-gray-900 font-medium">{formatPeso(bill.water_rate)}</span>
          </div>
          {(bill.extra_components ?? []).map((c, i) => (
            <div key={`${c.category}-${i}`} className="flex justify-between px-4 py-2.5 text-sm">
              <span className="text-gray-500">{c.category}</span>
              <span className="text-gray-900 font-medium">{formatPeso(c.price)}</span>
            </div>
          ))}
          <div className="flex justify-between px-4 py-3 bg-primary-50 rounded-b-xl">
            <span className="text-sm font-semibold text-primary-800">Amount Due</span>
            <span className="text-base font-bold text-primary-800">{formatPeso(bill.amount_due)}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-500 uppercase">Due Date</p>
            <p className="font-medium text-gray-900">{formatDate(bill.due_date)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Date Issued</p>
            <p className="font-medium text-gray-900">{formatDate(bill.created_at)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Payment Date</p>
            <p className="font-medium text-gray-900">
              {bill.paid_at ? formatDate(bill.paid_at) : 'Not paid'}
            </p>
          </div>
        </div>

        <div>
          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(bill.status)}`}>
            {getStatusText(bill.status)}
          </span>
        </div>
      </div>
    </div>
  </div>
);

// ─── Page ───

const Bills: React.FC = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showConfigureBills, setShowConfigureBills] = useState(false);
  const [detailBill, setDetailBill] = useState<Bill | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 5000);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBills(await getBills());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bills.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Reset pagination whenever a filter/search changes.
  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, periodFilter]);

  const periods = useMemo(
    () => [...new Set(bills.map((b) => b.billing_period))].sort().reverse(),
    [bills]
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return bills.filter((b) => {
      if (statusFilter && b.status !== statusFilter) return false;
      if (periodFilter && b.billing_period !== periodFilter) return false;
      if (!q) return true;
      const residentName = b.resident
        ? `${b.resident.first_name} ${b.resident.last_name}`.toLowerCase()
        : '';
      return (
        (b.bill_number ?? '').toLowerCase().includes(q) ||
        (b.account?.account_number ?? '').toLowerCase().includes(q) ||
        residentName.includes(q) ||
        (b.account?.sitio ?? '').toLowerCase().includes(q)
      );
    });
  }, [bills, searchQuery, statusFilter, periodFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const stats = useMemo(() => {
    let collected = 0;
    let pendingCount = 0;
    let overdueCount = 0;
    for (const b of bills) {
      if (b.status === 'paid') collected += Number(b.amount_due ?? 0);
      else if (b.status === 'pending') pendingCount += 1;
      else if (b.status === 'overdue') overdueCount += 1;
    }
    return { total: bills.length, collected, pendingCount, overdueCount };
  }, [bills]);

  const handleMarkPaid = async (bill: Bill) => {
    setBusyId(bill.id);
    setError(null);
    try {
      await setBillStatus(bill.id, 'paid');
      await load();
      showToast('success', `Bill ${bill.bill_number} marked as paid.`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update the bill.');
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkOverdue = async (bill: Bill) => {
    setBusyId(bill.id);
    setError(null);
    try {
      await setBillStatus(bill.id, 'overdue');
      await load();
      showToast('success', `Bill ${bill.bill_number} marked as overdue.`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update the bill.');
    } finally {
      setBusyId(null);
    }
  };

  const handleExport = () => {
    if (filtered.length === 0) return;
    const header = [
      'Bill Number', 'Resident', 'Account No.', 'Sitio', 'Billing Period',
      'Previous Reading', 'Current Reading', 'Consumption', 'Water Rate',
      'Extra Components', 'Amount Due', 'Due Date', 'Status', 'Paid At',
    ];
    const rows = filtered.map((b) => [
      b.bill_number,
      b.resident ? `${b.resident.first_name} ${b.resident.last_name}` : '',
      b.account?.account_number ?? '',
      b.account?.sitio ?? '',
      b.billing_period,
      b.previous_reading ?? '',
      b.current_reading ?? '',
      b.consumption ?? '',
      b.water_rate,
      (b.extra_components ?? []).map((c) => `${c.category}: ${c.price}`).join('; '),
      b.amount_due,
      b.due_date ?? '',
      getStatusText(b.status),
      b.paid_at ?? '',
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bills.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div
        className={`flex-1 overflow-y-auto bg-gray-50 transition-[filter] duration-300 ease-out ${
          showConfigureBills ? 'blur-sm pointer-events-none' : 'blur-none'
        }`}
        aria-hidden={showConfigureBills}
      >
        <div className="p-8">
          {/* Header */}
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Bills Management</h1>
              <p className="text-gray-600">
                Bills are generated automatically when meter readings are approved. Track payments and billing status here.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowConfigureBills(true)}
              className="flex-shrink-0 inline-flex items-center space-x-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-800 rounded-lg hover:bg-gray-50 hover:border-primary-300 hover:text-primary-700 transition-colors shadow-sm"
            >
              <Settings2 className="w-4 h-4" />
              <span className="text-sm font-medium">Configure Bills</span>
            </button>
          </div>

          {toast && (
            <div
              className={`mb-6 rounded-lg px-4 py-3 text-sm ${
                toast.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}
            >
              {toast.message}
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-center justify-between">
              <span>{error}</span>
              <button onClick={load} className="underline hover:text-red-800">Retry</button>
            </div>
          )}

          {/* Stats Cards (real totals) */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 uppercase mb-1">Total Bills Generated</p>
              <h3 className="text-3xl font-bold text-gray-900">{stats.total.toLocaleString()}</h3>
              <p className="text-xs text-gray-500 mt-1">All recorded bills</p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 uppercase mb-1">Total Collected Revenue</p>
              <h3 className="text-3xl font-bold text-gray-900">{formatPeso(stats.collected)}</h3>
              <p className="text-xs text-gray-500 mt-1">From bills marked as paid</p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 uppercase mb-1">Pending Payments</p>
              <h3 className="text-3xl font-bold text-gray-900">{stats.pendingCount.toLocaleString()}</h3>
              <p className="text-xs text-gray-500 mt-1">Awaiting payment</p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 uppercase mb-1">Overdue Bills</p>
              <h3 className="text-3xl font-bold text-gray-900">{stats.overdueCount.toLocaleString()}</h3>
              <p className="text-xs text-gray-500 mt-1">Requires follow-up</p>
            </div>
          </div>

          {/* Table Section */}
          <div className="bg-white rounded-xl border border-gray-200">
            {/* Filters */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by bill no., account, resident, or sitio"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 w-80 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div className="relative">
                    <select
                      value={periodFilter}
                      onChange={(e) => setPeriodFilter(e.target.value)}
                      className="appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      title="Filter by billing period"
                    >
                      <option value="">All Periods</option>
                      {periods.map((p) => (
                        <option key={p} value={p}>{formatPeriod(p)}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      title="Filter by status"
                    >
                      <option value="">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                      <option value="void">Void</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={load}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    title="Refresh"
                  >
                    <RefreshCw className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={handleExport}
                    disabled={filtered.length === 0}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40"
                  >
                    <Download className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-700">Export CSV</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Billing ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Resident</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Account No.</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Period</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Consumption</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount Due</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center">
                        <div className="flex items-center justify-center space-x-2 text-gray-400">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Loading bills…</span>
                        </div>
                      </td>
                    </tr>
                  ) : pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center">
                        <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">
                          {bills.length === 0
                            ? 'No bills yet. Approve an approved-rate reading in Meter Readings to generate the first bill.'
                            : 'No bills match your search or filters.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((bill) => {
                      const residentName = bill.resident
                        ? `${bill.resident.first_name} ${bill.resident.last_name}`
                        : 'Unknown resident';
                      return (
                        <tr key={bill.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {bill.bill_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                <span className="text-xs font-semibold text-blue-600">
                                  {initialsOf(residentName)}
                                </span>
                              </div>
                              <span className="text-sm font-medium text-gray-900">{residentName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {bill.account?.account_number ?? '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {formatPeriod(bill.billing_period)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {bill.consumption ?? '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                            {formatPeso(bill.amount_due)}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${bill.status === 'overdue' ? 'text-red-600' : 'text-gray-600'}`}>
                            {formatDate(bill.due_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(bill.status)}`}>
                              {getStatusText(bill.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                onClick={() => setDetailBill(bill)}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="View details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {(bill.status === 'pending' || bill.status === 'overdue') && (
                                <button
                                  onClick={() => handleMarkPaid(bill)}
                                  disabled={busyId === bill.id}
                                  className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-40"
                                  title="Mark as paid"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              )}
                              {bill.status === 'pending' && (
                                <button
                                  onClick={() => handleMarkOverdue(bill)}
                                  disabled={busyId === bill.id}
                                  className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors disabled:opacity-40"
                                  title="Mark as overdue"
                                >
                                  <AlertTriangle className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600 uppercase">
                Showing{' '}
                {filtered.length === 0
                  ? 0
                  : (safePage - 1) * PAGE_SIZE + 1}
                {' '}to{' '}
                {Math.min(safePage * PAGE_SIZE, filtered.length)}
                {' '}of {filtered.length} entries
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage(Math.max(1, safePage - 1))}
                  disabled={safePage <= 1}
                  className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-40"
                >
                  &lt;
                </button>
                <span className="px-3 py-1 text-sm bg-primary-600 text-white rounded">
                  {safePage}
                </span>
                <span className="px-2 text-sm text-gray-500">of {totalPages}</span>
                <button
                  onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                  disabled={safePage >= totalPages}
                  className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-40"
                >
                  &gt;
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showConfigureBills && <ConfigureBillsModal isOpen={showConfigureBills} onClose={() => setShowConfigureBills(false)} />}
      {detailBill && <BillDetailModal bill={detailBill} onClose={() => setDetailBill(null)} />}
    </>
  );
};

export default Bills;


