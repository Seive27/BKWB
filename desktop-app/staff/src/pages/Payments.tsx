import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  User,
  MapPin,
  Calendar as CalendarIcon,
  CheckCircle,
  Printer,
  Download,
  X,
  CreditCard,
  Smartphone,
  Building,
  Info,
  Check,
  Search,
  AlertCircle,
  RefreshCw,
  Clock,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { getResidents, getSitioOptions, type ResidentRecord } from '../services/residentService';
import { getBills } from '../services/billService';
import { recordMultiBillPayment } from '../services/paymentService';
import type { Bill, BillStatus, PaymentMethod } from '../types';

function formatPeso(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '₱0.00';
  return `₱${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatPeriod(period: string): string {
  const m = period.match(/^(\d{4})-(\d{2})$/);
  if (!m) return period;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  if (isNaN(d.getTime())) return period;
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getStatusBadge(status: BillStatus) {
  switch (status) {
    case 'paid':
      return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">PAID</span>;
    case 'overdue':
      return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700">OVERDUE</span>;
    case 'void':
      return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-500">VOID</span>;
    default:
      return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">UNPAID</span>;
  }
}

interface CompletedPaymentData {
  totalPaid: number;
  residentName: string;
  accountNumber: string;
  referenceNumber: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  bills: Bill[];
  amountReceived?: number;
  changeDue?: number;
}

const Payments: React.FC = () => {
  const [residents, setResidents] = useState<ResidentRecord[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [sitios, setSitios] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'overdue' | 'paid'>('unpaid');
  const [sitioFilter, setSitioFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');

  // Selected resident & bills
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null);
  const [selectedBillIds, setSelectedBillIds] = useState<string[]>([]);

  // Payment processing state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  // Modals
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [completedPayment, setCompletedPayment] = useState<CompletedPaymentData | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [resList, billList, sitioList] = await Promise.all([
        getResidents(),
        getBills().catch(() => [] as Bill[]),
        getSitioOptions().catch(() => [] as string[]),
      ]);
      setResidents(resList);
      setBills(billList);
      setSitios(sitioList);

      // Auto-select first resident if none selected
      if (!selectedResidentId && resList.length > 0) {
        setSelectedResidentId(resList[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing and resident data.');
    } finally {
      setLoading(false);
    }
  }, [selectedResidentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Distinct billing periods
  const billingPeriods = useMemo(() => {
    return [...new Set(bills.map((b) => b.billing_period))].sort().reverse();
  }, [bills]);

  // Filtered residents matching search and filters
  const filteredResidents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return residents.filter((r) => {
      if (sitioFilter && r.sitio !== sitioFilter) return false;
      if (!q) return true;
      const name = r.fullName.toLowerCase();
      const accountNo = (r.accountNumber ?? '').toLowerCase();
      const meterNo = (r.meterNumber ?? '').toLowerCase();
      const sitio = (r.sitio ?? '').toLowerCase();
      return name.includes(q) || accountNo.includes(q) || meterNo.includes(q) || sitio.includes(q);
    });
  }, [residents, searchQuery, sitioFilter]);

  // Selected resident record
  const selectedResident = useMemo(() => {
    return residents.find((r) => r.id === selectedResidentId) ?? filteredResidents[0] ?? null;
  }, [residents, selectedResidentId, filteredResidents]);

  // Bills belonging to selected resident
  const residentBills = useMemo(() => {
    if (!selectedResident) return [];
    return bills.filter(
      (b) =>
        b.resident_id === selectedResident.id ||
        (selectedResident.accountId && b.account_id === selectedResident.accountId)
    );
  }, [bills, selectedResident]);

  // Unpaid bills count for the resident
  const unpaidCount = useMemo(() => {
    return residentBills.filter((b) => b.status === 'pending' || b.status === 'overdue').length;
  }, [residentBills]);

  // Displayed bills based on table filters
  const displayedBills = useMemo(() => {
    return residentBills.filter((b) => {
      if (statusFilter === 'unpaid' && b.status !== 'pending' && b.status !== 'overdue') return false;
      if (statusFilter === 'overdue' && b.status !== 'overdue') return false;
      if (statusFilter === 'paid' && b.status !== 'paid') return false;
      if (periodFilter && b.billing_period !== periodFilter) return false;
      return true;
    });
  }, [residentBills, statusFilter, periodFilter]);

  // Auto-select unpaid bills when switching residents
  useEffect(() => {
    if (selectedResident) {
      const defaultUnpaidIds = residentBills
        .filter((b) => b.status === 'pending' || b.status === 'overdue')
        .map((b) => b.id);
      setSelectedBillIds(defaultUnpaidIds);
      setAmountReceived('');
      setReferenceNumber('');
      setNotes('');
      setProcessingError(null);
    }
  }, [selectedResidentId]);

  // Calculate totals
  const selectedBills = useMemo(() => {
    return residentBills.filter((b) => selectedBillIds.includes(b.id));
  }, [residentBills, selectedBillIds]);

  const totalSelectedAmount = useMemo(() => {
    return selectedBills.reduce((sum, b) => sum + Number(b.amount_due || 0), 0);
  }, [selectedBills]);

  // Auto-fill amount received when cash is selected and amount is empty
  const parsedAmountReceived = parseFloat(amountReceived) || 0;
  const changeDue = Math.max(0, parsedAmountReceived - totalSelectedAmount);

  // Latest payment date for selected resident
  const lastPaymentDate = useMemo(() => {
    const paidBills = residentBills.filter((b) => b.status === 'paid' && b.paid_at);
    if (paidBills.length === 0) return 'No previous payment';
    paidBills.sort((a, b) => new Date(b.paid_at!).getTime() - new Date(a.paid_at!).getTime());
    return formatDate(paidBills[0].paid_at);
  }, [residentBills]);

  // Next due date for selected resident
  const nextDueDate = useMemo(() => {
    const pendingWithDue = residentBills.filter((b) => (b.status === 'pending' || b.status === 'overdue') && b.due_date);
    if (pendingWithDue.length === 0) return 'No pending due';
    pendingWithDue.sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
    return formatDate(pendingWithDue[0].due_date);
  }, [residentBills]);

  // Toggle bill selection
  const handleToggleBill = (billId: string) => {
    setSelectedBillIds((prev) =>
      prev.includes(billId) ? prev.filter((id) => id !== billId) : [...prev, billId]
    );
  };

  // Toggle select all displayed bills
  const handleToggleSelectAll = () => {
    const selectableIds = displayedBills.filter((b) => b.status === 'pending' || b.status === 'overdue').map((b) => b.id);
    const allSelected = selectableIds.every((id) => selectedBillIds.includes(id));
    if (allSelected) {
      setSelectedBillIds((prev) => prev.filter((id) => !selectableIds.includes(id)));
    } else {
      setSelectedBillIds((prev) => [...new Set([...prev, ...selectableIds])]);
    }
  };

  const isAllSelected = useMemo(() => {
    const selectableIds = displayedBills.filter((b) => b.status === 'pending' || b.status === 'overdue').map((b) => b.id);
    return selectableIds.length > 0 && selectableIds.every((id) => selectedBillIds.includes(id));
  }, [displayedBills, selectedBillIds]);

  // Validation before opening confirm modal
  const handleProcessClick = () => {
    setProcessingError(null);
    if (selectedBillIds.length === 0) {
      setProcessingError('Please select at least one bill to process payment.');
      return;
    }
    if (paymentMethod === 'cash') {
      const received = parseFloat(amountReceived);
      if (isNaN(received) || received < totalSelectedAmount) {
        setProcessingError(`Amount received must be at least ${formatPeso(totalSelectedAmount)}.`);
        return;
      }
    }
    if ((paymentMethod === 'gcash' || paymentMethod === 'bank') && !referenceNumber.trim()) {
      setProcessingError('Please provide a reference/transaction number.');
      return;
    }
    setShowConfirmModal(true);
  };

  // Confirm and record payment
  const handleConfirmPayment = async () => {
    if (!selectedResident || !selectedResident.accountId) {
      setProcessingError('Resident account not found.');
      return;
    }
    setIsProcessing(true);
    setProcessingError(null);
    try {
      const res = await recordMultiBillPayment({
        billIds: selectedBillIds,
        accountId: selectedResident.accountId,
        residentId: selectedResident.id,
        totalAmount: totalSelectedAmount,
        paymentMethod,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        const receiptOR = `OR-${Date.now().toString().slice(-6)}`;
        setCompletedPayment({
          totalPaid: totalSelectedAmount,
          residentName: selectedResident.fullName,
          accountNumber: selectedResident.accountNumber ?? '—',
          referenceNumber: referenceNumber.trim() || receiptOR,
          paymentDate: new Date().toISOString(),
          paymentMethod,
          bills: selectedBills,
          amountReceived: paymentMethod === 'cash' ? parseFloat(amountReceived) || totalSelectedAmount : undefined,
          changeDue: paymentMethod === 'cash' ? changeDue : undefined,
        });

        setShowConfirmModal(false);
        setShowSuccessModal(true);
        setSelectedBillIds([]);
        setAmountReceived('');
        setReferenceNumber('');
        setNotes('');
        await loadData();
      }
    } catch (err) {
      setProcessingError(err instanceof Error ? err.message : 'Failed to record payment transaction.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedBillIds([]);
    setAmountReceived('');
    setReferenceNumber('');
    setNotes('');
    setProcessingError(null);
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Process Payment</h1>
              <p className="text-gray-600 text-sm">
                Find resident, manage billings, and record official payment transactions.
              </p>
            </div>
            <div className="flex items-center space-x-3 text-right">
              <button
                onClick={loadData}
                disabled={loading}
                className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors shadow-sm"
                title="Refresh bills and residents"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary-600' : ''}`} />
              </button>
              <div>
                <p className="text-xs text-gray-500 uppercase">Current Date</p>
                <p className="text-sm font-semibold text-gray-900">
                  {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <span className="text-sm font-medium">{error}</span>
              </div>
              <button onClick={loadData} className="underline text-sm font-semibold hover:text-red-800">
                Retry
              </button>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Resident Search Input */}
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search resident name, account no., meter no., or sitio..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Sitio Filter */}
              <div className="relative">
                <select
                  value={sitioFilter}
                  onChange={(e) => setSitioFilter(e.target.value)}
                  className="w-full appearance-none pl-3 pr-10 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  title="Filter by Sitio"
                >
                  <option value="">All Sitios</option>
                  {sitios.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full appearance-none pl-3 pr-10 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  title="Filter by payment status"
                >
                  <option value="unpaid">Pending / Unpaid Bills</option>
                  <option value="overdue">Overdue Bills</option>
                  <option value="paid">Paid Bills</option>
                  <option value="all">All Bills</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            {/* Resident Matches Selector */}
            {filteredResidents.length > 0 ? (
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                <span className="text-gray-500 font-medium whitespace-nowrap">Select Resident:</span>
                {filteredResidents.slice(0, 8).map((r) => {
                  const isSelected = selectedResident?.id === r.id;
                  const resUnpaid = bills.filter(
                    (b) => (b.resident_id === r.id || (r.accountId && b.account_id === r.accountId)) && (b.status === 'pending' || b.status === 'overdue')
                  ).length;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelectedResidentId(r.id)}
                      className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center space-x-1.5 ${
                        isSelected
                          ? 'bg-primary-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span>{r.fullName}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded ${isSelected ? 'bg-primary-700 text-white' : 'bg-gray-200 text-gray-600'}`}>
                        {r.accountNumber ?? 'No Acct'}
                      </span>
                      {resUnpaid > 0 && (
                        <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-yellow-300' : 'bg-red-500'}`} title={`${resUnpaid} unpaid bills`} />
                      )}
                    </button>
                  );
                })}
                {filteredResidents.length > 8 && (
                  <span className="text-gray-400 text-xs whitespace-nowrap">
                    +{filteredResidents.length - 8} more (refine search)
                  </span>
                )}
              </div>
            ) : (
              <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 text-center py-1">
                No residents found matching "{searchQuery}".
              </div>
            )}
          </div>

          {selectedResident ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Section - Resident Info & Unpaid Bills */}
              <div className="lg:col-span-2 space-y-6">
                {/* Resident Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center text-primary-700 font-bold text-lg">
                        {selectedResident.firstName[0] || ''}
                        {selectedResident.lastName[0] || ''}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">{selectedResident.fullName}</h2>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <span className="text-sm font-semibold text-primary-600">
                            {selectedResident.accountNumber || 'No Account Number'}
                          </span>
                          {selectedResident.meterNumber && (
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                              Meter: {selectedResident.meterNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 uppercase mb-0.5">Sitio</p>
                      <p className="text-base font-bold text-gray-900">{selectedResident.sitio || '—'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-1">Service Address</p>
                      <div className="flex items-start space-x-1.5">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-900 leading-snug">
                          {selectedResident.serviceAddress || 'No address provided'}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-1">Last Payment Date</p>
                      <div className="flex items-center space-x-1.5">
                        <CalendarIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <p className="text-sm text-gray-900 font-medium">{lastPaymentDate}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-1">Next Due Date</p>
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <p className="text-sm text-red-600 font-semibold">{nextDueDate}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Unpaid Bills Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-bold text-gray-900">Billing Statement Summary</h3>
                      <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-primary-50 text-primary-700">
                        {unpaidCount} Pending {unpaidCount === 1 ? 'Bill' : 'Bills'}
                      </span>
                    </div>

                    <div className="relative">
                      <select
                        value={periodFilter}
                        onChange={(e) => setPeriodFilter(e.target.value)}
                        className="appearance-none pl-2.5 pr-8 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        title="Filter period"
                      >
                        <option value="">All Periods</option>
                        {billingPeriods.map((p) => (
                          <option key={p} value={p}>
                            {formatPeriod(p)}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-5 py-3 text-left w-12">
                            <input
                              type="checkbox"
                              checked={isAllSelected}
                              onChange={handleToggleSelectAll}
                              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 cursor-pointer"
                              title="Select all"
                            />
                          </th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                            Billing Period
                          </th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                            Description / Consumption
                          </th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                            Amount Due
                          </th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {displayedBills.length > 0 ? (
                          displayedBills.map((b) => {
                            const isChecked = selectedBillIds.includes(b.id);
                            const isPayable = b.status === 'pending' || b.status === 'overdue';
                            return (
                              <tr
                                key={b.id}
                                onClick={() => isPayable && handleToggleBill(b.id)}
                                className={`transition-colors ${
                                  isPayable ? 'cursor-pointer hover:bg-gray-50' : 'bg-gray-50/50'
                                } ${isChecked ? 'bg-primary-50/40' : ''}`}
                              >
                                <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    disabled={!isPayable}
                                    onChange={() => handleToggleBill(b.id)}
                                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 cursor-pointer disabled:opacity-40"
                                  />
                                </td>
                                <td className="px-5 py-4">
                                  <div className="text-sm font-semibold text-gray-900">
                                    {formatPeriod(b.billing_period)}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {b.bill_number || 'Bill Pending'}
                                  </div>
                                </td>
                                <td className="px-5 py-4">
                                  <div className="text-sm text-gray-900">
                                    {b.consumption != null ? `${b.consumption} cu.m water consumption` : 'Water utility charges'}
                                  </div>
                                  {(b.extra_components ?? []).length > 0 && (
                                    <div className="text-xs text-gray-500">
                                      +{(b.extra_components ?? []).map((c) => c.category).join(', ')}
                                    </div>
                                  )}
                                </td>
                                <td className="px-5 py-4 text-sm font-bold text-gray-900">
                                  {formatPeso(b.amount_due)}
                                </td>
                                <td className="px-5 py-4">{getStatusBadge(b.status)}</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                              <Layers className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                              <p className="font-medium text-sm">No bills match the selected filter.</p>
                              <p className="text-xs text-gray-400 mt-1">
                                Change filter to "All Bills" to view full history.
                              </p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right Section - Payment Summary */}
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm sticky top-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-5">Payment Summary</h3>

                  {processingError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span>{processingError}</span>
                    </div>
                  )}

                  {/* Total Selected */}
                  <div className="mb-6 p-4 bg-primary-50 rounded-xl border border-primary-100">
                    <p className="text-xs font-semibold text-primary-700 uppercase mb-1">Total Selected ({selectedBills.length} {selectedBills.length === 1 ? 'bill' : 'bills'})</p>
                    <p className="text-3xl font-extrabold text-primary-700">{formatPeso(totalSelectedAmount)}</p>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="mb-5">
                    <p className="text-xs text-gray-600 uppercase font-semibold mb-2.5">Payment Method</p>
                    <div className="space-y-2">
                      <label
                        onClick={() => setPaymentMethod('cash')}
                        className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                          paymentMethod === 'cash'
                            ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500 text-primary-900'
                            : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === 'cash'}
                          onChange={() => setPaymentMethod('cash')}
                          className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                        />
                        <CreditCard className="w-5 h-5 text-primary-600 mx-3 flex-shrink-0" />
                        <div>
                          <span className="text-sm font-bold block">Cash</span>
                          <span className="text-xs text-gray-500">Over-the-counter payment</span>
                        </div>
                      </label>

                      <label
                        onClick={() => setPaymentMethod('gcash')}
                        className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                          paymentMethod === 'gcash'
                            ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500 text-primary-900'
                            : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === 'gcash'}
                          onChange={() => setPaymentMethod('gcash')}
                          className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                        />
                        <Smartphone className="w-5 h-5 text-blue-600 mx-3 flex-shrink-0" />
                        <div>
                          <span className="text-sm font-bold block">GCash</span>
                          <span className="text-xs text-gray-500">Mobile wallet reference</span>
                        </div>
                      </label>

                      <label
                        onClick={() => setPaymentMethod('bank')}
                        className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                          paymentMethod === 'bank'
                            ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500 text-primary-900'
                            : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === 'bank'}
                          onChange={() => setPaymentMethod('bank')}
                          className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                        />
                        <Building className="w-5 h-5 text-indigo-600 mx-3 flex-shrink-0" />
                        <div>
                          <span className="text-sm font-bold block">Bank Transfer</span>
                          <span className="text-xs text-gray-500">Bank deposit or online transfer</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Cash Inputs: Amount Received & Change Due */}
                  {paymentMethod === 'cash' ? (
                    <div className="mb-5 space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">
                          Amount Received
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">
                            ₱
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder={totalSelectedAmount.toFixed(2)}
                            value={amountReceived}
                            onChange={(e) => setAmountReceived(e.target.value)}
                            className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-semibold text-gray-900"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between py-2.5 px-3 bg-gray-50 rounded-lg border border-gray-200">
                        <span className="text-sm text-gray-600 font-medium">Change Due</span>
                        <span className="text-lg font-bold text-gray-900">{formatPeso(changeDue)}</span>
                      </div>
                    </div>
                  ) : (
                    /* GCash / Bank: Reference Number */
                    <div className="mb-5 space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">
                          {paymentMethod === 'gcash' ? 'GCash Reference No.' : 'Bank Transaction Reference'} *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 100293847291"
                          value={referenceNumber}
                          onChange={(e) => setReferenceNumber(e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium text-sm text-gray-900"
                        />
                      </div>
                    </div>
                  )}

                  {/* Optional Notes */}
                  <div className="mb-6">
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1.5">
                      Notes / Remarks (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Paid in full"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs"
                    />
                  </div>

                  {/* Actions */}
                  <button
                    onClick={handleProcessClick}
                    disabled={selectedBillIds.length === 0 || totalSelectedAmount <= 0 || isProcessing}
                    className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center space-x-2 font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>Process Payment ({formatPeso(totalSelectedAmount)})</span>
                  </button>

                  <div className="flex items-center space-x-2 mt-3">
                    <button
                      onClick={handleClearSelection}
                      className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-xs font-medium"
                    >
                      Clear Selection
                    </button>
                    <button
                      onClick={() => setSelectedBillIds([])}
                      className="flex-1 py-2 border border-gray-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-xs font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-gray-900 mb-1">No Resident Selected</h3>
              <p className="text-sm text-gray-500">Search and select a resident above to process payments.</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Payment Modal */}
      {showConfirmModal && selectedResident && (
        <ConfirmPaymentModal
          resident={selectedResident}
          selectedBills={selectedBills}
          totalAmount={totalSelectedAmount}
          paymentMethod={paymentMethod}
          amountReceived={parsedAmountReceived}
          changeDue={changeDue}
          referenceNumber={referenceNumber}
          isProcessing={isProcessing}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={handleConfirmPayment}
        />
      )}

      {/* Success Modal */}
      {showSuccessModal && completedPayment && (
        <PaymentSuccessModal
          payment={completedPayment}
          onClose={() => setShowSuccessModal(false)}
        />
      )}
    </>
  );
};

// Confirm Payment Modal
interface ConfirmPaymentModalProps {
  resident: ResidentRecord;
  selectedBills: Bill[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  amountReceived: number;
  changeDue: number;
  referenceNumber: string;
  isProcessing: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const ConfirmPaymentModal: React.FC<ConfirmPaymentModalProps> = ({
  resident,
  selectedBills,
  totalAmount,
  paymentMethod,
  amountReceived,
  changeDue,
  referenceNumber,
  isProcessing,
  onClose,
  onConfirm,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Confirm Payment</h2>
              <p className="text-xs text-gray-500">Official transaction confirmation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Resident Info */}
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex justify-between items-center text-sm">
            <div>
              <p className="text-xs text-gray-500 uppercase">Resident</p>
              <p className="font-bold text-gray-900">{resident.fullName}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase">Account Number</p>
              <p className="font-bold text-primary-600">{resident.accountNumber ?? '—'}</p>
            </div>
          </div>

          {/* Selected Bills List */}
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Selected Bills ({selectedBills.length})</p>
            <div className="border border-gray-200 rounded-xl divide-y divide-gray-100">
              {selectedBills.map((b) => (
                <div key={b.id} className="flex items-center justify-between p-3 text-sm">
                  <div>
                    <span className="font-semibold text-gray-900">{formatPeriod(b.billing_period)}</span>
                    <span className="text-xs text-gray-500 ml-2">({b.bill_number})</span>
                  </div>
                  <span className="font-bold text-gray-900">{formatPeso(b.amount_due)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Method & Total */}
          <div className="pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <span className="text-base font-semibold text-gray-700">Total Amount Due</span>
              <span className="text-2xl font-extrabold text-primary-600">{formatPeso(totalAmount)}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-sm">
              <div>
                <p className="text-xs text-gray-500 uppercase mb-0.5">Method</p>
                <p className="font-semibold text-gray-900 uppercase">{paymentMethod}</p>
              </div>
              <div>
                {paymentMethod === 'cash' ? (
                  <>
                    <p className="text-xs text-gray-500 uppercase mb-0.5">Cash Received / Change</p>
                    <p className="font-semibold text-gray-900">
                      {formatPeso(amountReceived)} (Change: {formatPeso(changeDue)})
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-gray-500 uppercase mb-0.5">Reference No.</p>
                    <p className="font-semibold text-gray-900">{referenceNumber || '—'}</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-900">
              Confirming this transaction will mark the selected bill(s) as paid and record the payment in the official ledger.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-200 flex items-center justify-end space-x-3 bg-gray-50">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className="flex items-center space-x-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-semibold shadow-sm disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Recording...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Confirm & Record</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Payment Success Modal
interface PaymentSuccessModalProps {
  payment: CompletedPaymentData;
  onClose: () => void;
}

const PaymentSuccessModal: React.FC<PaymentSuccessModalProps> = ({ payment, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const textContent = `
================================================
           KALUNASAN WATERWORKS SYSTEM
           Official Electronic Receipt
================================================
OR / Ref Number: ${payment.referenceNumber}
Date & Time:    ${new Date(payment.paymentDate).toLocaleString()}
Resident Name:  ${payment.residentName}
Account Number: ${payment.accountNumber}
Payment Method: ${payment.paymentMethod.toUpperCase()}

BILLS PAID:
${payment.bills.map((b) => `- ${b.billing_period} (${b.bill_number}): ${formatPeso(b.amount_due)}`).join('\n')}

------------------------------------------------
TOTAL PAID:     ${formatPeso(payment.totalPaid)}
${payment.amountReceived ? `Amount Received: ${formatPeso(payment.amountReceived)}\nChange Due:      ${formatPeso(payment.changeDue)}` : ''}
================================================
Thank you for your payment!
`;
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Receipt-${payment.referenceNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative p-6 text-center border-b border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Payment Successful</h2>
          <p className="text-xs text-gray-500">Transaction recorded in system</p>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          <div className="p-4 bg-green-50/70 border border-green-200 rounded-xl text-center">
            <p className="text-xs text-green-700 font-semibold uppercase mb-1">Total Paid</p>
            <p className="text-3xl font-extrabold text-green-700">{formatPeso(payment.totalPaid)}</p>
          </div>

          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500 text-xs uppercase">Resident</span>
              <span className="font-semibold text-gray-900">{payment.residentName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500 text-xs uppercase">Account No.</span>
              <span className="font-semibold text-gray-900">{payment.accountNumber}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500 text-xs uppercase">Official Receipt / Ref</span>
              <span className="font-semibold text-primary-600">{payment.referenceNumber}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500 text-xs uppercase">Date & Time</span>
              <span className="font-semibold text-gray-900">{new Date(payment.paymentDate).toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-500 text-xs uppercase">Payment Method</span>
              <span className="font-semibold text-gray-900 uppercase">{payment.paymentMethod}</span>
            </div>
            {payment.amountReceived != null && (
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500 text-xs uppercase">Change Due</span>
                <span className="font-semibold text-gray-900">{formatPeso(payment.changeDue)}</span>
              </div>
            )}
          </div>

          <div className="text-center pt-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Barangay Kalunasan Waterworks</p>
            <p className="text-[11px] text-gray-400">Official Electronic Receipt</p>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={handlePrint}
              className="w-full py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center space-x-2 font-semibold text-sm shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt</span>
            </button>
            <button
              onClick={handleDownload}
              className="w-full py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2 font-semibold text-sm"
            >
              <Download className="w-4 h-4" />
              <span>Download Receipt</span>
            </button>
            <button
              onClick={onClose}
              className="w-full py-2 text-xs text-gray-500 hover:text-gray-900 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payments;
