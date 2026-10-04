import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Gauge,
  Droplet,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  FileText,
  X,
  Receipt,
} from 'lucide-react';
import StyledSelect from '../components/ui/StyledSelect';
import BillReceiptCard from '../components/ui/BillReceiptCard';
import { useAuth } from '../hooks/useAuth';
import { useMeterReadings } from '../hooks/useMeterReadings';
import GenerateBillModal from '../components/modals/GenerateBillModal';
import {
  generateBillForReading,
  getBillReceiptData,
  previewBillReceiptForReading,
  type BillReceiptData,
} from '../services/billService';
import {
  approveReading,
  markReadingBilled,
  rejectReading,
} from '../services/meterReadingService';
import {
  MeterReading,
  MeterReadingStatus,
  METER_READING_STATUS_LABELS,
} from '../types';

type StatusFilter = 'all' | MeterReadingStatus | 'pending';

const PENDING_READING_STATUSES: MeterReadingStatus[] = ['assigned', 'pending_review'];

function matchesReadingStatus(status: MeterReadingStatus, filter: StatusFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'pending') return PENDING_READING_STATUSES.includes(status);
  return status === filter;
}

const statusStyles: Record<MeterReadingStatus, { bg: string; text: string; dot: string }> = {
  assigned: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  pending_review: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  billed: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
};

function fullName(person?: { first_name: string; last_name: string } | null): string {
  if (!person) return 'Unknown resident';
  return `${person.first_name} ${person.last_name}`.trim();
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

const MeterReadings: React.FC<{
  initialSelectedId?: string | null;
  onInitialSelectedIdConsumed?: () => void;
  initialStatusFilter?: string | null;
  onInitialStatusFilterConsumed?: () => void;
}> = ({
  initialSelectedId = null,
  onInitialSelectedIdConsumed,
  initialStatusFilter = null,
  onInitialStatusFilterConsumed,
}) => {
  const { user } = useAuth();
  const { readings, loading, refreshing, error, refresh } = useMeterReadings();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    (initialStatusFilter as StatusFilter) || 'all'
  );
  /** Brief border flash on stats-card click; fades out over 3s. */
  const [cardFlash, setCardFlash] = useState<StatusFilter | null>(null);
  const [cardFlashOpaque, setCardFlashOpaque] = useState(false);
  const cardFlashTimersRef = useRef<{ fade?: number; clear?: number }>({});

  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [previewReceipt, setPreviewReceipt] = useState<BillReceiptData | null>(null);
  const [previewReceiptLoading, setPreviewReceiptLoading] = useState(false);
  const [previewReceiptError, setPreviewReceiptError] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showGenerateBillModal, setShowGenerateBillModal] = useState(false);
  const [billReceipt, setBillReceipt] = useState<BillReceiptData | null>(null);
  const [billReceiptLoading, setBillReceiptLoading] = useState(false);
  const [billReceiptError, setBillReceiptError] = useState<string | null>(null);
  const [generatedBillNumber, setGeneratedBillNumber] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const selectStatusFromCard = useCallback((filter: StatusFilter) => {
    setStatusFilter(filter);
    const timers = cardFlashTimersRef.current;
    if (timers.fade) window.clearTimeout(timers.fade);
    if (timers.clear) window.clearTimeout(timers.clear);

    setCardFlash(filter);
    setCardFlashOpaque(true);
    timers.fade = window.setTimeout(() => setCardFlashOpaque(false), 40);
    timers.clear = window.setTimeout(() => {
      setCardFlash(null);
      setCardFlashOpaque(false);
    }, 3040);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
      const timers = cardFlashTimersRef.current;
      if (timers.fade) window.clearTimeout(timers.fade);
      if (timers.clear) window.clearTimeout(timers.clear);
    };
  }, []);

  useEffect(() => {
    if (!initialSelectedId) return;
    setSelectedId(initialSelectedId);
    setShowReviewModal(true);
    onInitialSelectedIdConsumed?.();
  }, [initialSelectedId, onInitialSelectedIdConsumed]);

  useEffect(() => {
    if (!initialStatusFilter) return;
    setStatusFilter(initialStatusFilter as StatusFilter);
    onInitialStatusFilterConsumed?.();
  }, [initialStatusFilter, onInitialStatusFilterConsumed]);

  const showToast = (type: 'success' | 'error', message: string) => {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    setToast({ type, message });
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3500);
  };

  const selectedReading = readings.find((r) => r.id === selectedId) ?? null;
  const actorId = user?.id ?? '';

  const stats = useMemo(() => {
    let assigned = 0;
    let pending = 0;
    let billed = 0;
    let rejected = 0;
    for (const r of readings) {
      if (r.status === 'assigned') assigned += 1;
      else if (r.status === 'pending_review') pending += 1;
      else if (r.status === 'billed') billed += 1;
      else if (r.status === 'rejected') rejected += 1;
    }
    return { assigned, pending, billed, rejected };
  }, [readings]);

  const filteredReadings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = readings.filter((r) => {
      const matchesSearch =
        q.length === 0 ||
        fullName(r.resident).toLowerCase().includes(q) ||
        (r.account?.account_number ?? '').toLowerCase().includes(q) ||
        (r.meter?.meter_number ?? '').toLowerCase().includes(q) ||
        (r.account?.sitio ?? '').toLowerCase().includes(q);
      const matchesStatus = matchesReadingStatus(r.status, statusFilter);
      return matchesSearch && matchesStatus;
    });

    // Pending Review always surfaces first; then newest assignment date.
    return [...filtered].sort((a, b) => {
      const aPending = a.status === 'pending_review' ? 0 : 1;
      const bPending = b.status === 'pending_review' ? 0 : 1;
      if (aPending !== bPending) return aPending - bPending;
      return new Date(b.assignment_date).getTime() - new Date(a.assignment_date).getTime();
    });
  }, [readings, searchQuery, statusFilter]);

  const loadPreviewReceipt = async (reading: MeterReading) => {
    if (reading.status !== 'pending_review' && reading.status !== 'approved') {
      setPreviewReceipt(null);
      setPreviewReceiptError(null);
      setPreviewReceiptLoading(false);
      return;
    }
    setPreviewReceipt(null);
    setPreviewReceiptError(null);
    setPreviewReceiptLoading(true);
    try {
      const receipt = await previewBillReceiptForReading(reading);
      setPreviewReceipt(receipt);
    } catch (err) {
      setPreviewReceiptError(
        err instanceof Error ? err.message : 'Failed to load receipt preview.'
      );
    } finally {
      setPreviewReceiptLoading(false);
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
      showToast('success', 'Reading approved. Use Issue Bill to create the resident bill.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to approve reading.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleIssueBill = async (reading: MeterReading) => {
    if (actionBusy) return;
    setActionBusy(true);
    setSelectedId(reading.id);
    closeReviewModal();
    setBillReceipt(null);
    setBillReceiptError(null);
    setGeneratedBillNumber(null);
    setBillReceiptLoading(true);
    setShowGenerateBillModal(true);

    try {
      const result = await generateBillForReading(reading.id);
      const billId = result.bill_id ?? null;
      setGeneratedBillNumber(result.bill_number ?? null);

      await markReadingBilled(reading.id);
      await refresh();

      if (!billId) {
        setBillReceiptError(
          result.message ?? 'A bill for this billing period already exists, but it could not be loaded.'
        );
        showToast(
          'success',
          result.message ?? 'A bill for this billing period already exists. Reading marked as billed.'
        );
        return;
      }

      const receipt = await getBillReceiptData(billId);
      setBillReceipt(receipt);
      showToast(
        'success',
        result.generated
          ? `Bill ${result.bill_number ?? ''} issued. It appears as Pending on the Bills page.`.trim()
          : result.message ?? 'Existing bill loaded. Reading marked as billed.'
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to issue the bill.';
      setBillReceiptError(message);
      showToast('error', message);
    } finally {
      setBillReceiptLoading(false);
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
    void loadPreviewReceipt(reading);
  };

  const closeReviewModal = () => {
    setShowReviewModal(false);
    setPreviewReceipt(null);
    setPreviewReceiptError(null);
    setPreviewReceiptLoading(false);
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

  const filterFieldStyles =
    'py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all';

  return (
    <>
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Meter Readings</h1>
            <p className="text-gray-600">
              Review meter reader submissions, approve readings, then issue bills for residents.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <button
              type="button"
              onClick={() => selectStatusFromCard('assigned')}
              className={`text-left bg-white rounded-xl p-6 border cursor-pointer hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 ${
                cardFlash === 'assigned'
                  ? cardFlashOpaque
                    ? 'border-primary-400 shadow-md transition-none'
                    : 'border-gray-200 shadow-none transition-[border-color,box-shadow] duration-[3000ms] ease-out'
                  : 'border-gray-200 hover:border-primary-300 transition-all duration-150'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">ASSIGNED</p>
              <h3 className="text-3xl font-bold text-gray-900">{stats.assigned}</h3>
            </button>
            <button
              type="button"
              onClick={() => selectStatusFromCard('pending_review')}
              className={`text-left bg-white rounded-xl p-6 border cursor-pointer hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 ${
                cardFlash === 'pending_review'
                  ? cardFlashOpaque
                    ? 'border-primary-400 shadow-md transition-none'
                    : 'border-gray-200 shadow-none transition-[border-color,box-shadow] duration-[3000ms] ease-out'
                  : 'border-gray-200 hover:border-primary-300 transition-all duration-150'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center">
                  <Gauge className="w-6 h-6 text-amber-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">PENDING REVIEW</p>
              <h3 className="text-3xl font-bold text-gray-900">{stats.pending}</h3>
            </button>
            <button
              type="button"
              onClick={() => selectStatusFromCard('billed')}
              className={`text-left bg-white rounded-xl p-6 border cursor-pointer hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 ${
                cardFlash === 'billed'
                  ? cardFlashOpaque
                    ? 'border-primary-400 shadow-md transition-none'
                    : 'border-gray-200 shadow-none transition-[border-color,box-shadow] duration-[3000ms] ease-out'
                  : 'border-gray-200 hover:border-primary-300 transition-all duration-150'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">BILLED</p>
              <h3 className="text-3xl font-bold text-gray-900">{stats.billed}</h3>
            </button>
            <button
              type="button"
              onClick={() => selectStatusFromCard('rejected')}
              className={`text-left bg-white rounded-xl p-6 border cursor-pointer hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 ${
                cardFlash === 'rejected'
                  ? cardFlashOpaque
                    ? 'border-primary-400 shadow-md transition-none'
                    : 'border-gray-200 shadow-none transition-[border-color,box-shadow] duration-[3000ms] ease-out'
                  : 'border-gray-200 hover:border-primary-300 transition-all duration-150'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">REJECTED</p>
              <h3 className="text-3xl font-bold text-gray-900">{stats.rejected}</h3>
            </button>
          </div>

          {/* Table Section */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by resident, account, meter, or sitio"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 w-96 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <StyledSelect
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className={filterFieldStyles}
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  {(Object.keys(METER_READING_STATUS_LABELS) as MeterReadingStatus[]).map((st) => (
                    <option key={st} value={st}>
                      {METER_READING_STATUS_LABELS[st]}
                    </option>
                  ))}
                </StyledSelect>
              </div>
            </div>

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
                  ) : filteredReadings.length === 0 ? (
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
                            ? 'Assignments made by staff will appear here.'
                            : 'Try adjusting your search or filters'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredReadings.map((reading) => (
                      <tr key={reading.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {fullName(reading.resident)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {reading.account?.account_number ?? '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {reading.meter?.meter_number ?? '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {fullName(reading.meter_reader) !== 'Unknown resident'
                            ? fullName(reading.meter_reader)
                            : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(reading.assignment_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatNumber(reading.consumption)} m³
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(reading.status)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => openReview(reading)}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-300 text-gray-700 hover:border-primary-300 hover:text-primary-700 transition-all"
                            >
                              <EyeIcon />
                              <span>Review</span>
                            </button>
                            {reading.status === 'approved' && (
                              <button
                                onClick={() => handleIssueBill(reading)}
                                disabled={actionBusy}
                                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-600 text-white hover:bg-primary-700 transition-all disabled:opacity-50"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Issue Bill</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {!loading && !error && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {filteredReadings.length} of {readings.length} readings
                  {refreshing && (
                    <Loader2 className="ml-2 inline w-3.5 h-3.5 text-primary-500 animate-spin" />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Reading Modal — reading details + receipt at bottom */}
      {showReviewModal && selectedReading && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeReviewModal();
          }}
        >
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Gauge className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Review Reading</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {fullName(selectedReading.resident)} ·{' '}
                    {selectedReading.account?.account_number ?? '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {getStatusBadge(selectedReading.status)}
                <button
                  onClick={closeReviewModal}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors group"
                >
                  <X className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                </button>
              </div>
            </div>

            <div className="px-8 py-6 space-y-6">
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

              {selectedReading.photo_url ? (
                <div className="overflow-hidden rounded-xl border border-gray-200">
                  <img
                    src={selectedReading.photo_url}
                    alt={`Meter ${selectedReading.meter?.meter_number ?? 'photo'}`}
                    className="max-h-80 w-full object-contain bg-gray-50"
                  />
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                  <Droplet className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No photo attached</p>
                </div>
              )}

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

              {selectedReading.status === 'rejected' && selectedReading.rejection_reason && (
                <div className="flex items-start space-x-3 p-4 bg-red-50 rounded-xl border border-red-100">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-800 mb-1">Rejection reason</p>
                    <p className="text-sm text-red-700">{selectedReading.rejection_reason}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[11px] text-gray-500 font-medium">Meter Reader</span>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">
                    {fullName(selectedReading.meter_reader) !== 'Unknown resident'
                      ? fullName(selectedReading.meter_reader)
                      : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-gray-500 font-medium">Reading Date</span>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">
                    {formatDate(selectedReading.reading_date)}
                  </p>
                </div>
              </div>

              {(selectedReading.status === 'pending_review' ||
                selectedReading.status === 'approved') && (
                <div className="border-t border-gray-200 pt-6 space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center">
                      <Receipt className="w-4 h-4 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Receipt Review</h3>
                      <p className="text-xs text-gray-500">
                        Preview charges before{' '}
                        {selectedReading.status === 'pending_review'
                          ? 'approving'
                          : 'issuing the bill'}
                        .
                      </p>
                    </div>
                  </div>
                  {previewReceiptLoading && (
                    <div className="flex items-center justify-center py-10 text-gray-500">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      <span className="text-sm">Loading receipt preview…</span>
                    </div>
                  )}
                  {!previewReceiptLoading && previewReceiptError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {previewReceiptError}
                    </div>
                  )}
                  {!previewReceiptLoading && !previewReceiptError && previewReceipt && (
                    <BillReceiptCard receipt={previewReceipt} />
                  )}
                </div>
              )}
            </div>

            {selectedReading.status === 'pending_review' && (
              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-8 py-4 flex items-center justify-end space-x-3 rounded-b-2xl">
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={actionBusy}
                  className="px-6 py-2.5 border border-red-300 text-red-700 rounded-xl hover:bg-red-50 transition-all text-sm font-medium disabled:opacity-50 inline-flex items-center space-x-2"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject</span>
                </button>
                <button
                  onClick={handleApprove}
                  disabled={actionBusy || previewReceiptLoading}
                  className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all text-sm font-medium shadow-sm disabled:opacity-50 inline-flex items-center space-x-2"
                >
                  {actionBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                  <CheckCircle className="w-4 h-4" />
                  <span>Approve</span>
                </button>
              </div>
            )}

            {selectedReading.status === 'approved' && (
              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-8 py-4 flex items-center justify-end space-x-3 rounded-b-2xl">
                <button
                  onClick={closeReviewModal}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-all text-sm font-medium"
                >
                  Close
                </button>
                <button
                  onClick={() => handleIssueBill(selectedReading)}
                  disabled={actionBusy}
                  className="px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all text-sm font-medium shadow-sm disabled:opacity-50 inline-flex items-center space-x-2"
                >
                  {actionBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                  <FileText className="w-4 h-4" />
                  <span>Issue Bill</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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

      <GenerateBillModal
        isOpen={showGenerateBillModal}
        onClose={() => {
          setShowGenerateBillModal(false);
          setBillReceipt(null);
          setBillReceiptError(null);
          setGeneratedBillNumber(null);
        }}
        receipt={billReceipt}
        loading={billReceiptLoading}
        error={billReceiptError}
        billNumber={generatedBillNumber}
      />

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[70] px-5 py-3.5 rounded-xl shadow-2xl text-sm font-medium text-white animate-slide-up ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
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
