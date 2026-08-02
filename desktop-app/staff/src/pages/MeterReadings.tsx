import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Plus,
  Gauge,
  Droplet,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  Calendar,
  FileText,
  X,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useMeterReadings } from '../hooks/useMeterReadings';
import {
  approveReading,
  createAssignment,
  getMeterReaders,
  getResidentAccounts,
  rejectReading,
  type AccountOption,
} from '../services/meterReadingService';
import {
  MeterReaderOption,
  MeterReading,
  MeterReadingStatus,
  METER_READING_STATUS_LABELS,
} from '../types';

type StatusFilter = 'all' | MeterReadingStatus;
type SortKey = 'newest' | 'oldest' | 'status';

const PAGE_SIZE = 10;

const statusStyles: Record<MeterReadingStatus, { bg: string; text: string; dot: string }> = {
  assigned: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  pending_review: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  approved: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  billed: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
};

function fullName(person?: { first_name: string; last_name: string } | null): string {
  if (!person) return '';
  return `${person.first_name} ${person.last_name}`.trim();
}

function initials(person?: { first_name: string; last_name: string } | null): string {
  const name = fullName(person);
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatNumber(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('en-US');
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const MeterReadings: React.FC = () => {
  const { user } = useAuth();
  const { readings, loading, refreshing, error, refresh } = useMeterReadings();

  // ── Filters / sort / pagination ──
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [page, setPage] = useState(1);

  // ── Selection ──
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // ── Assign modal ──
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [meterReaders, setMeterReaders] = useState<MeterReaderOption[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedReaderId, setSelectedReaderId] = useState('');
  const [assignmentDate, setAssignmentDate] = useState(todayISO());
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);

  const [actionBusy, setActionBusy] = useState(false);

  // ── Toasts ──
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    setToast({ type, message });
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3500);
  };

  const selectedReading = readings.find((r) => r.id === selectedId) ?? null;

  // ── Stats ──
  const stats = useMemo(() => {
    let assigned = 0;
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    for (const r of readings) {
      if (r.status === 'assigned') assigned += 1;
      else if (r.status === 'pending_review') pending += 1;
      else if (r.status === 'approved') approved += 1;
      else if (r.status === 'rejected') rejected += 1;
    }
    return { assigned, pending, approved, rejected };
  }, [readings]);

  // ── Filter + sort ──
  const filteredReadings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = readings.filter((r) => {
      const matchesSearch =
        q.length === 0 ||
        fullName(r.resident).toLowerCase().includes(q) ||
        (r.account?.account_number ?? '').toLowerCase().includes(q) ||
        (r.meter?.meter_number ?? '').toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'oldest':
          return new Date(a.assignment_date).getTime() - new Date(b.assignment_date).getTime();
        case 'status':
          return a.status.localeCompare(b.status);
        case 'newest':
        default:
          return new Date(b.assignment_date).getTime() - new Date(a.assignment_date).getTime();
      }
    });
  }, [readings, searchQuery, statusFilter, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filteredReadings.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filteredReadings.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, sortKey]);

  // Load picker data when the assign modal opens.
  useEffect(() => {
    if (!showAssignModal) return;
    setPickerLoading(true);
    setPickerError(null);
    Promise.all([getResidentAccounts(), getMeterReaders()])
      .then(([accs, readers]) => {
        setAccounts(accs);
        setMeterReaders(readers);
      })
      .catch((err) =>
        setPickerError(err instanceof Error ? err.message : 'Failed to load picker data.')
      )
      .finally(() => setPickerLoading(false));
  }, [showAssignModal]);

  const actorId = user?.id ?? '';

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? null;

  const handleAssign = async () => {
    if (!selectedAccountId || !selectedReaderId || actionBusy) return;
    if (!actorId) {
      showToast('error', 'You must be logged in to assign readings.');
      return;
    }
    setActionBusy(true);
    try {
      await createAssignment(
        {
          account_id: selectedAccountId,
          meter_reader_id: selectedReaderId,
          assignment_date: assignmentDate,
        },
        actorId
      );
      await refresh();
      setShowAssignModal(false);
      setSelectedAccountId('');
      setSelectedReaderId('');
      setAssignmentDate(todayISO());
      showToast('success', 'Reading assigned to meter reader.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to assign reading.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedReading || actionBusy) return;
    if (!actorId) {
      showToast('error', 'You must be logged in to review readings.');
      return;
    }
    setActionBusy(true);
    try {
      await approveReading(selectedReading.id, actorId);
      await refresh();
      setShowReviewModal(false);
      showToast('success', 'Reading approved. It is ready for billing.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to approve reading.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleReject = async () => {
    if (!selectedReading || actionBusy) return;
    if (rejectionReason.trim().length === 0) {
      showToast('error', 'A rejection reason is required.');
      return;
    }
    if (!actorId) {
      showToast('error', 'You must be logged in to review readings.');
      return;
    }
    setActionBusy(true);
    try {
      await rejectReading(selectedReading.id, actorId, rejectionReason);
      await refresh();
      setShowRejectModal(false);
      setRejectionReason('');
      showToast('success', 'Reading rejected. The meter reader has been notified.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to reject reading.');
    } finally {
      setActionBusy(false);
    }
  };

  const openReview = (reading: MeterReading) => {
    setSelectedId(reading.id);
    setRejectionReason('');
    setShowReviewModal(true);
  };

  const getStatusBadge = (status: MeterReadingStatus) => {
    const s = statusStyles[status];
    return (
      <span
        className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        <span>{METER_READING_STATUS_LABELS[status]}</span>
      </span>
    );
  };

  const selectStyles =
    'px-3 py-2 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white text-gray-700';

  return (
    <>
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-8">
          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Meter Readings</h1>
              <p className="text-gray-600">
                Assign readings to meter readers and review their submissions.
              </p>
            </div>
            <button
              onClick={() => setShowAssignModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Assign Reading</span>
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">ASSIGNED</p>
              <h3 className="text-3xl font-bold text-gray-900">{stats.assigned}</h3>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center">
                  <Gauge className="w-6 h-6 text-amber-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">PENDING REVIEW</p>
              <h3 className="text-3xl font-bold text-gray-900">{stats.pending}</h3>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">APPROVED</p>
              <h3 className="text-3xl font-bold text-gray-900">{stats.approved}</h3>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">REJECTED</p>
              <h3 className="text-3xl font-bold text-gray-900">{stats.rejected}</h3>
            </div>
          </div>

          {/* Table Section */}
          <div className="bg-white rounded-xl border border-gray-200">
            {/* Table Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by resident, account, or meter"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 w-96 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                    className={selectStyles}
                  >
                    <option value="all">All Statuses</option>
                    {(Object.keys(METER_READING_STATUS_LABELS) as MeterReadingStatus[]).map((st) => (
                      <option key={st} value={st}>
                        {METER_READING_STATUS_LABELS[st]}
                      </option>
                    ))}
                  </select>
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                    className={selectStyles}
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="status">Status</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Resident
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Account
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Meter
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Meter Reader
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Assigned
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Consumption
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={`sk-${i}`} className="animate-pulse">
                        <td className="px-6 py-4">
                          <div className="h-3 bg-gray-200 rounded w-32" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-3 bg-gray-200 rounded w-20" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-3 bg-gray-200 rounded w-20" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-3 bg-gray-200 rounded w-24" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-3 bg-gray-200 rounded w-24" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-3 bg-gray-200 rounded w-14" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 bg-gray-200 rounded-full w-20" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 bg-gray-200 rounded w-16" />
                        </td>
                      </tr>
                    ))
                  ) : error ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center">
                        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <AlertCircle className="w-6 h-6 text-red-400" />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-1">
                          Couldn't load meter readings
                        </h3>
                        <p className="text-xs text-gray-500 mb-4">{error}</p>
                        <button
                          onClick={() => refresh()}
                          className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all text-sm font-medium"
                        >
                          <Loader2 className="w-4 h-4" />
                          <span>Try Again</span>
                        </button>
                      </td>
                    </tr>
                  ) : pageItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center">
                        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <FileText className="w-6 h-6 text-gray-400" />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-1">
                          {readings.length === 0 ? 'No meter readings yet' : 'No matching readings'}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {readings.length === 0
                            ? 'Assign a reading to a meter reader to get started.'
                            : 'Try adjusting your search or filters'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    pageItems.map((reading) => (
                      <tr key={reading.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                              <span className="text-xs font-semibold text-blue-600">
                                {initials(reading.resident)}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {fullName(reading.resident) || 'Unknown resident'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {reading.account?.account_number ?? '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {reading.meter?.meter_number ?? '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {fullName(reading.meter_reader) || (
                            <span className="text-gray-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(reading.assignment_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatNumber(reading.consumption)} m³
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(reading.status)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => openReview(reading)}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-300 text-gray-700 hover:border-primary-300 hover:text-primary-700 transition-all"
                          >
                            <EyeIcon />
                            <span>Review</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && !error && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {(safePage - 1) * PAGE_SIZE + 1}–
                  {Math.min(safePage * PAGE_SIZE, filteredReadings.length)} of{' '}
                  {filteredReadings.length} readings
                  {refreshing && (
                    <Loader2 className="ml-2 inline w-3.5 h-3.5 text-primary-500 animate-spin" />
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="px-2 text-sm text-gray-600">
                    {safePage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Assign Reading Modal ── */}
      {showAssignModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAssignModal(false);
          }}
        >
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                  <Gauge className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Assign Meter Reading</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Assign a resident account to a meter reader
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors group"
              >
                <X className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
              </button>
            </div>

            <div className="px-8 py-6 space-y-6">
              {pickerError && (
                <div className="flex items-start space-x-3 p-4 bg-red-50 rounded-xl border border-red-100">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-800">{pickerError}</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Resident Account <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  disabled={pickerLoading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white disabled:bg-gray-50"
                >
                  <option value="">
                    {pickerLoading ? 'Loading accounts…' : 'Select a resident account'}
                  </option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.resident_name} — {acc.account_number}
                    </option>
                  ))}
                </select>
                {selectedAccount && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-lg px-4 py-3">
                      <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider mb-1">
                        Meter
                      </p>
                      <p className="text-sm font-semibold text-gray-900">
                        {selectedAccount.meter_number || '—'}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg px-4 py-3">
                      <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider mb-1">
                        Service Address
                      </p>
                      <p className="text-sm font-semibold text-gray-900">
                        {selectedAccount.service_address || '—'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                    Meter Reader <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedReaderId}
                    onChange={(e) => setSelectedReaderId(e.target.value)}
                    disabled={pickerLoading}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white disabled:bg-gray-50"
                  >
                    <option value="">
                      {pickerLoading ? 'Loading readers…' : 'Select a meter reader'}
                    </option>
                    {meterReaders.map((reader) => (
                      <option key={reader.id} value={reader.id}>
                        {reader.first_name} {reader.last_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                    Assignment Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={assignmentDate}
                    onChange={(e) => setAssignmentDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white"
                  />
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <Calendar className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-800">
                  The previous reading is set automatically from the account's most recent approved
                  reading (0 for a first reading). The meter reader receives this assignment
                  instantly.
                </p>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-8 py-4 flex items-center justify-end space-x-3 rounded-b-2xl">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-all text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={!selectedAccountId || !selectedReaderId || actionBusy}
                className="px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all text-sm font-medium shadow-sm disabled:opacity-50 inline-flex items-center space-x-2"
              >
                {actionBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{actionBusy ? 'Assigning…' : 'Assign Reading'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Review Reading Modal ── */}
      {showReviewModal && selectedReading && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowReviewModal(false);
          }}
        >
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Gauge className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Review Reading</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {fullName(selectedReading.resident) || 'Resident'} ·{' '}
                    {selectedReading.account?.account_number ?? '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {getStatusBadge(selectedReading.status)}
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors group"
                >
                  <X className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                </button>
              </div>
            </div>

            <div className="px-8 py-6 space-y-6">
              {/* Reading metrics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-xl px-4 py-4 text-center">
                  <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider mb-1">
                    Previous Reading
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatNumber(selectedReading.previous_reading)} m³
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl px-4 py-4 text-center">
                  <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider mb-1">
                    Current Reading
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatNumber(selectedReading.current_reading)} m³
                  </p>
                </div>
                <div className="bg-primary-50 rounded-xl px-4 py-4 text-center">
                  <p className="text-[11px] text-primary-600 font-medium uppercase tracking-wider mb-1">
                    Consumption
                  </p>
                  <p className="text-xl font-bold text-primary-700">
                    {formatNumber(selectedReading.consumption)} m³
                  </p>
                </div>
              </div>

              {/* Photo placeholder */}
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                <Droplet className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  {selectedReading.photo_url ? 'Photo attached' : 'No photo attached'}
                </p>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Remarks
                </label>
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-sm text-gray-700">
                    {selectedReading.remarks || (
                      <span className="text-gray-400 italic">No remarks</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Rejection reason (when rejected) */}
              {selectedReading.status === 'rejected' && selectedReading.rejection_reason && (
                <div className="flex items-start space-x-3 p-4 bg-red-50 rounded-xl border border-red-100">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-800 mb-1">Rejection reason</p>
                    <p className="text-sm text-red-700">{selectedReading.rejection_reason}</p>
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[11px] text-gray-500 font-medium">Meter Reader</span>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">
                    {fullName(selectedReading.meter_reader) || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-gray-500 font-medium">Reading Date</span>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">
                    {formatDate(selectedReading.reading_date)}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            {selectedReading.status === 'pending_review' && (
              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-8 py-4 flex items-center justify-end space-x-3 rounded-b-2xl">
                <button
                  onClick={() => {
                    setShowRejectModal(true);
                  }}
                  disabled={actionBusy}
                  className="px-6 py-2.5 border border-red-300 text-red-700 rounded-xl hover:bg-red-50 transition-all text-sm font-medium disabled:opacity-50 inline-flex items-center space-x-2"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject</span>
                </button>
                <button
                  onClick={handleApprove}
                  disabled={actionBusy}
                  className="px-6 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all text-sm font-medium shadow-sm disabled:opacity-50 inline-flex items-center space-x-2"
                >
                  {actionBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                  <CheckCircle className="w-4 h-4" />
                  <span>Approve</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Reject Modal ── */}
      {showRejectModal && selectedReading && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowRejectModal(false);
          }}
        >
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-slide-up">
            <div className="flex items-start space-x-4 mb-5">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">Reject Reading</h2>
                <p className="text-sm text-gray-500">
                  {selectedReading.account?.account_number ?? 'Reading'} ·{' '}
                  {formatNumber(selectedReading.consumption)} m³
                </p>
              </div>
            </div>

            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explain why this reading was rejected…"
              rows={4}
              maxLength={500}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-none mb-5"
            />
            <p className="text-xs text-gray-500 mb-5">
              The meter reader will see this reason in their reading history.
            </p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-all text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionBusy || rejectionReason.trim().length === 0}
                className="px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all text-sm font-medium shadow-sm disabled:opacity-50 inline-flex items-center space-x-2"
              >
                {actionBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Reject Reading</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[70] px-5 py-3.5 rounded-xl shadow-2xl text-sm font-medium text-white animate-slide-up ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.message}
        </div>
      )}
    </>
  );
};

function EyeIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

export default MeterReadings;
