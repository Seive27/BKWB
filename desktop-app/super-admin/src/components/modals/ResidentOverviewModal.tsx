import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X,
  User,
  Gauge,
  Receipt,
  CreditCard,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import type { Bill, MeterReading } from '../../types';
import { METER_READING_STATUS_LABELS } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { queryErrorMessage } from '../../lib/queryError';
import { queryKeys } from '../../lib/queryKeys';
import { getAccountReadings } from '../../services/meterReadingService';
import { getBillsByResident } from '../../services/billService';
import { getPaymentsByResident } from '../../services/paymentService';
import PaymentReceiptModal from './PaymentReceiptModal';
import type { ResidentRecord } from '../../services/residentService';

type OverviewTab = 'information' | 'meter' | 'billing' | 'payments';

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value.length === 10 ? value + 'T00:00:00' : value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatPeso(value: number): string {
  return `₱${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getStatusBadge(status: ResidentRecord['connectionStatus']): { bg: string; text: string } {
  switch (status) {
    case 'active':
      return { bg: 'bg-emerald-50 border border-emerald-200', text: 'text-emerald-700' };
    case 'inactive':
      return { bg: 'bg-gray-100 border border-gray-200', text: 'text-gray-700' };
    case 'disconnected':
      return { bg: 'bg-rose-50 border border-rose-200', text: 'text-rose-700' };
    case 'applicant':
      return { bg: 'bg-amber-50 border border-amber-200', text: 'text-amber-700' };
    default:
      return { bg: 'bg-gray-100 border border-gray-200', text: 'text-gray-700' };
  }
}

function getStatusText(status: ResidentRecord['connectionStatus']): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'inactive':
      return 'Inactive';
    case 'disconnected':
      return 'Disconnected';
    case 'applicant':
      return 'Applicant';
    default:
      return 'Unknown';
  }
}

function getReadingBadge(status: MeterReading['status']): string {
  switch (status) {
    case 'assigned':
      return 'bg-blue-50 text-blue-700 border border-blue-200';
    case 'pending_review':
      return 'bg-amber-50 text-amber-700 border border-amber-200';
    case 'approved':
    case 'billed':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    case 'rejected':
      return 'bg-rose-50 text-rose-700 border border-rose-200';
    default:
      return 'bg-gray-50 text-gray-700 border border-gray-200';
  }
}

function getBillBadge(status: string): string {
  switch (status) {
    case 'paid':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    case 'overdue':
      return 'bg-rose-50 text-rose-700 border border-rose-200';
    case 'void':
      return 'bg-gray-100 text-gray-500 border border-gray-200';
    case 'partially_paid':
      return 'bg-sky-50 text-sky-700 border border-sky-200';
    case 'carried_forward':
      return 'bg-slate-100 text-slate-500 border border-slate-200';
    default:
      return 'bg-amber-50 text-amber-700 border border-amber-200';
  }
}

/** '2026-05' -> 'May 2026'. */
function formatPeriod(period: string): string {
  const m = period.match(/^(\d{4})-(\d{2})$/);
  if (!m) return period;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  if (isNaN(d.getTime())) return period;
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

const TABS: { key: OverviewTab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: 'information', label: 'Resident Information', icon: User },
  { key: 'meter', label: 'Meter Information', icon: Gauge },
  { key: 'billing', label: 'Billing History', icon: Receipt },
  { key: 'payments', label: 'Payment History', icon: CreditCard },
];

function InfoField({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="py-2.5">
      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <div className="text-sm font-medium text-gray-900">{value}</div>
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

const ResidentOverviewModal: React.FC<{
  resident: ResidentRecord;
  onClose: () => void;
}> = ({ resident, onClose }) => {
  const { isAuthenticated } = useAuth();
  const [tab, setTab] = useState<OverviewTab>('information');
  const [receiptBill, setReceiptBill] = useState<Bill | null>(null);
  const readingsQuery = useQuery({
    queryKey: queryKeys.meterReadings.byAccount(resident.accountId ?? ''),
    queryFn: () => getAccountReadings(resident.accountId ?? ''),
    enabled: isAuthenticated && !!resident.accountId,
  });
  const billsQuery = useQuery({
    queryKey: queryKeys.bills.byResident(resident.id),
    queryFn: () => getBillsByResident(resident.id).catch(() => []),
    enabled: isAuthenticated,
  });
  const paymentsQuery = useQuery({
    queryKey: [...queryKeys.payments.all, 'resident', resident.id] as const,
    queryFn: () => getPaymentsByResident(resident.id).catch(() => []),
    enabled: isAuthenticated && tab === 'payments',
  });
  const readings = readingsQuery.data ?? [];
  const bills = billsQuery.data ?? [];
  const loadingData = readingsQuery.isLoading || billsQuery.isLoading;
  const dataError = queryErrorMessage(readingsQuery.error, 'Failed to load details.');

  const consumption = useMemo(() => {
    if (
      resident.currentReading !== null &&
      resident.previousReading !== null &&
      Number.isFinite(resident.currentReading) &&
      Number.isFinite(resident.previousReading)
    ) {
      return Math.max(0, resident.currentReading - resident.previousReading);
    }
    return null;
  }, [resident.currentReading, resident.previousReading]);

  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const paymentHistory = useMemo(
    () =>
      (paymentsQuery.data ?? []).filter((payment) => {
        const status = String(payment.status);
        return status !== 'cancelled' && status !== 'rejected' && status !== 'refunded';
      }),
    [paymentsQuery.data]
  );
  /** Newest period until a row is clicked. */
  const selectedBill = bills.find((b) => b.id === selectedBillId) ?? bills[0] ?? null;

  const statusBadge = getStatusBadge(resident.connectionStatus);

  useEffect(() => {
    setReceiptBill(null);
  }, [resident.id]);

  return (
    <>
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl border border-gray-200 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-5 flex items-start justify-between flex-shrink-0 bg-white">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0 border border-primary-200">
              <span className="text-sm font-bold text-primary-700">
                {`${resident.firstName.charAt(0)}${resident.lastName.charAt(0)}`.toUpperCase()}
              </span>
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-lg font-bold text-gray-900 leading-tight">{resident.fullName}</h2>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
                  {getStatusText(resident.connectionStatus)}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                Account No: <span className="font-semibold text-gray-700">{resident.accountNumber ?? 'No service account'}</span>
                {resident.meterNumber ? ` • Meter: ${resident.meterNumber}` : ''}
                {resident.sitio ? ` • Sitio ${resident.sitio}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
            aria-label="Close overview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6 bg-gray-50/50 flex-shrink-0">
          <div className="flex space-x-2 overflow-x-auto scrollbar-hide">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center space-x-2 px-3.5 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  tab === key
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${tab === key ? 'text-primary-600' : 'text-gray-400'}`} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {tab === 'information' && (
            <div className="space-y-6">
              {/* Resident Personal Information */}
              <div className="border border-gray-200 rounded-lg p-4 bg-white">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100 flex items-center space-x-2">
                  <User className="w-4 h-4 text-primary-600" />
                  <span>Resident Information</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                  <InfoField label="Full Name" value={resident.fullName} />
                  <InfoField label="Middle Name" value={resident.middleName?.trim() || '—'} />
                  <InfoField
                    label="Email Address"
                    value={
                      resident.email ? (
                        resident.email
                      ) : (
                        <span className="text-gray-400 italic">Not provided</span>
                      )
                    }
                  />
                  <InfoField
                    label="Contact Number"
                    value={
                      resident.phone ?? <span className="text-gray-400 italic">Not authorized / not provided</span>
                    }
                  />
                  <InfoField
                    label="Date of Birth"
                    value={
                      resident.dateOfBirth ? (
                        formatDate(resident.dateOfBirth)
                      ) : (
                        <span className="text-gray-400 italic">Not authorized</span>
                      )
                    }
                  />
                  <InfoField label="Registration Date" value={formatDate(resident.createdAt)} />
                </div>
              </div>

              {/* Service Account Details */}
              <div className="border border-gray-200 rounded-lg p-4 bg-white">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100 flex items-center space-x-2">
                  <Gauge className="w-4 h-4 text-primary-600" />
                  <span>Service Account Details</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                  <InfoField label="Account / Consumer Code" value={resident.accountNumber ?? '—'} />
                  <InfoField
                    label="Meter Serial Number"
                    value={
                      resident.meterNumber ?? (
                        <span className="text-gray-400 italic">No meter assigned</span>
                      )
                    }
                  />
                  <InfoField label="Sitio" value={resident.sitio ?? '—'} />
                  <InfoField
                    label="Connection Status"
                    value={
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
                        {getStatusText(resident.connectionStatus)}
                      </span>
                    }
                  />
                  <div className="md:col-span-2">
                    <InfoField
                      label="Service Address"
                      value={
                        resident.serviceAddress ? (
                          resident.serviceAddress
                        ) : (
                          <span className="text-gray-400 italic">Not authorized / not provided</span>
                        )
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-xs text-gray-500">
                Fields marked “not authorized” were omitted by the Barangay masterlist and left blank to preserve data accuracy.
              </div>
            </div>
          )}

          {tab === 'meter' && (
            <div className="space-y-5">
              {dataError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-xs">{dataError}</div>
              )}
              {loadingData ? (
                <div className="flex items-center justify-center space-x-2 text-gray-400 py-12">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-xs font-medium">Loading meter information…</span>
                </div>
              ) : !resident.accountId ? (
                <div className="py-12 text-center">
                  <AlertCircle className="w-7 h-7 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs font-medium text-gray-500">This resident has no service account registered.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-[11px] font-semibold text-gray-500 uppercase mb-1">Previous Period</p>
                      <p className="text-base font-bold text-gray-900">
                        {resident.previousReadingDate
                          ? formatPeriod(resident.previousReadingDate.slice(0, 7))
                          : '—'}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{formatDate(resident.previousReadingDate)}</p>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-[11px] font-semibold text-gray-500 uppercase mb-1">Previous Reading</p>
                      <p className="text-base font-bold text-gray-900">{resident.previousReading ?? '—'}</p>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-[11px] font-semibold text-gray-500 uppercase mb-1">Current Reading</p>
                      {resident.currentReading !== null ? (
                        <p className="text-base font-bold text-gray-900">{resident.currentReading}</p>
                      ) : (
                        <p className="text-xs italic text-gray-400 mt-0.5">Awaiting reading</p>
                      )}
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-[11px] font-semibold text-gray-500 uppercase mb-1">Consumption</p>
                      {consumption !== null ? (
                        <p className="text-base font-bold text-primary-700">{consumption.toLocaleString()} m³</p>
                      ) : (
                        <p className="text-xs italic text-gray-400 mt-0.5">Pending</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Meter Reading History</h3>
                    {readings.length === 0 ? (
                      <div className="py-8 text-center border border-dashed border-gray-200 rounded-lg">
                        <AlertCircle className="w-6 h-6 text-gray-300 mx-auto mb-1.5" />
                        <p className="text-xs text-gray-500">
                          No meter readings recorded yet through the reading workflow.
                        </p>
                      </div>
                    ) : (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-left">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-3.5 py-2 text-xs font-semibold text-gray-600 uppercase">Assigned</th>
                              <th className="px-3.5 py-2 text-xs font-semibold text-gray-600 uppercase">Read On</th>
                              <th className="px-3.5 py-2 text-xs font-semibold text-gray-600 uppercase">Previous</th>
                              <th className="px-3.5 py-2 text-xs font-semibold text-gray-600 uppercase">Current</th>
                              <th className="px-3.5 py-2 text-xs font-semibold text-gray-600 uppercase">Consumption</th>
                              <th className="px-3.5 py-2 text-xs font-semibold text-gray-600 uppercase">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-xs">
                            {readings.map((r) => (
                              <tr key={r.id} className="hover:bg-gray-50">
                                <td className="px-3.5 py-2.5 text-gray-600">{formatDate(r.assignment_date)}</td>
                                <td className="px-3.5 py-2.5 text-gray-600">{formatDate(r.reading_date)}</td>
                                <td className="px-3.5 py-2.5 text-gray-600">{r.previous_reading}</td>
                                <td className="px-3.5 py-2.5 text-gray-900 font-medium">
                                  {r.current_reading ?? <span className="italic text-gray-400">Awaiting</span>}
                                </td>
                                <td className="px-3.5 py-2.5 text-gray-900 font-medium">{r.consumption != null ? `${r.consumption} m³` : '—'}</td>
                                <td className="px-3.5 py-2.5">
                                  <span className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full ${getReadingBadge(r.status)}`}>
                                    {METER_READING_STATUS_LABELS[r.status]}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'billing' && (
            <div className="space-y-5">
              {!loadingData && bills.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3.5">
                    <p className="text-[11px] font-semibold text-gray-500 uppercase mb-1">Current Bill</p>
                    {selectedBill ? (
                      <>
                        <p className="text-xl font-bold text-gray-900">{formatPeso(selectedBill.amount ?? selectedBill.amount_due)}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatPeriod(selectedBill.billing_period)}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs italic text-gray-400 mt-1">No bills yet</p>
                    )}
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3.5">
                    <p className="text-[11px] font-semibold text-gray-500 uppercase mb-1">Total Outstanding Balance</p>
                    {selectedBill && Number(selectedBill.amount_due) > 0 ? (
                      <p className="text-xl font-bold text-rose-600">{formatPeso(selectedBill.amount_due)}</p>
                    ) : (
                      <p className="text-xl font-bold text-emerald-600">{formatPeso(0)}</p>
                    )}
                  </div>
                </div>
              )}

              {loadingData ? (
                <div className="flex items-center justify-center space-x-2 text-gray-400 py-12">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-xs font-medium">Loading billing information…</span>
                </div>
              ) : bills.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-gray-200 rounded-lg">
                  <Receipt className="w-7 h-7 text-gray-300 mx-auto mb-1.5" />
                  <p className="text-xs font-medium text-gray-500">No bills generated yet.</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Bills appear here automatically once a meter reading for this account is approved.
                  </p>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3.5 py-2 text-xs font-semibold text-gray-600 uppercase">Billing Period</th>
                        <th className="px-3.5 py-2 text-xs font-semibold text-gray-600 uppercase">Consumption</th>
                        <th className="px-3.5 py-2 text-xs font-semibold text-gray-600 uppercase">Bill Amount</th>
                        <th className="px-3.5 py-2 text-xs font-semibold text-gray-600 uppercase">Amount Due</th>
                        <th className="px-3.5 py-2 text-xs font-semibold text-gray-600 uppercase">Due Date</th>
                        <th className="px-3.5 py-2 text-xs font-semibold text-gray-600 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {bills.map((b) => (
                        <tr
                          key={b.id}
                          onClick={() => setSelectedBillId(b.id)}
                          className={`cursor-pointer ${b.id === selectedBill?.id ? 'bg-primary-50' : 'hover:bg-gray-50'}`}
                        >
                          <td className="px-3.5 py-2.5 text-gray-900 font-medium">
                            {formatPeriod(b.billing_period)}
                            <span className="block text-[10px] text-gray-400 font-mono">{b.bill_number}</span>
                          </td>
                          <td className="px-3.5 py-2.5 text-gray-600">
                            {b.consumption != null ? `${b.consumption} m³` : '—'}
                          </td>
                          <td className="px-3.5 py-2.5 font-bold text-gray-900">{formatPeso(b.amount ?? b.amount_due)}</td>
                          <td className="px-3.5 py-2.5 font-semibold text-gray-700">{formatPeso(b.amount_due)}</td>
                          <td className="px-3.5 py-2.5 text-gray-600">{formatDate(b.due_date)}</td>
                          <td className="px-3.5 py-2.5">
                            <span className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full ${getBillBadge(b.status)}`}>
                              {b.status === 'partially_paid'
                                ? 'Partially Paid'
                                : b.status === 'carried_forward'
                                  ? 'Carried Forward'
                                  : b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'payments' && (
            <div className="space-y-4">
              {billsQuery.isLoading || paymentsQuery.isLoading ? (
                <div className="flex items-center justify-center space-x-2 text-gray-400 py-12">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-xs font-medium">Loading payment history…</span>
                </div>
              ) : paymentHistory.length > 0 ? (
                <div className="border border-gray-200 rounded-lg overflow-x-auto">
                  <p className="px-3.5 py-2 text-[11px] text-gray-500 bg-white border-b border-gray-100">
                    Click a payment to view the stored receipt. Partial payments stay listed while a balance remains.
                  </p>
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3.5 py-2 text-xs font-semibold text-gray-600 uppercase">Payment Date</th>
                        <th className="px-3.5 py-2 text-xs font-semibold text-gray-600 uppercase">Bill Period</th>
                        <th className="px-3.5 py-2 text-xs font-semibold text-gray-600 uppercase">Consumption</th>
                        <th className="px-3.5 py-2 text-xs font-semibold text-gray-600 uppercase">Amount Paid</th>
                        <th className="px-3.5 py-2 text-xs font-semibold text-gray-600 uppercase">Amount Due</th>
                        <th className="px-3.5 py-2 text-xs font-semibold text-gray-600 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {paymentHistory.map((payment) => {
                        const linked = bills.find((b) => b.id === payment.bill_id);
                        const period = linked?.billing_period ?? payment.bill?.billing_period ?? '';
                        const billNumber = linked?.bill_number ?? payment.bill?.bill_number ?? '';
                        const billStatus = linked?.status ?? payment.bill?.status;
                        const partial = billStatus === 'partially_paid';
                        const amountDue = Number(linked?.amount_due ?? payment.bill?.amount_due ?? 0);
                        return (
                          <tr
                            key={payment.id}
                            className={`hover:bg-emerald-50/60 ${linked ? 'cursor-pointer' : ''}`}
                            onClick={() => {
                              if (linked) setReceiptBill(linked);
                            }}
                          >
                            <td className="px-3.5 py-2.5 text-gray-600">{formatDate(payment.payment_date)}</td>
                            <td className="px-3.5 py-2.5 text-gray-900 font-medium">
                              {period ? formatPeriod(period) : '—'}
                              {billNumber ? (
                                <span className="block text-[10px] text-gray-400 font-mono">{billNumber}</span>
                              ) : null}
                            </td>
                            <td className="px-3.5 py-2.5 text-gray-600">
                              {linked?.consumption != null ? `${linked.consumption} m³` : '—'}
                            </td>
                            <td className="px-3.5 py-2.5 font-bold text-gray-900">
                              {formatPeso(Number(payment.amount) || 0)}
                            </td>
                            <td className="px-3.5 py-2.5 font-semibold text-gray-700">
                              {formatPeso(amountDue)}
                            </td>
                            <td className="px-3.5 py-2.5">
                              <span
                                className={`inline-flex items-center space-x-1 px-2 py-0.5 text-[11px] font-semibold rounded-full border ${
                                  partial
                                    ? 'bg-sky-50 text-sky-700 border-sky-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                {!partial ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : null}
                                <span>{partial ? 'Partially Paid' : 'Paid'}</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center border border-dashed border-gray-200 rounded-lg">
                  <CreditCard className="w-7 h-7 text-gray-300 mx-auto mb-1.5" />
                  <p className="text-xs font-medium text-gray-500">No payment transactions recorded yet.</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Payments recorded in the system will automatically appear in this transaction ledger.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-3.5 bg-gray-50/70 flex items-center justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-100 transition-colors shadow-xs"
          >
            Close Overview
          </button>
        </div>
      </div>
    </div>
    {receiptBill && (
      <PaymentReceiptModal
        bill={receiptBill}
        payments={paymentsQuery.data ?? []}
        loading={paymentsQuery.isFetching && paymentsQuery.data === undefined}
        residentName={resident.fullName}
        accountNumber={resident.accountNumber ?? ''}
        onClose={() => setReceiptBill(null)}
      />
    )}
    </>
  );
};

export default ResidentOverviewModal;
