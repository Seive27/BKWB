import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  User,
  Gauge,
  Receipt,
  CreditCard,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import type { MeterReading } from '../../types';
import { METER_READING_STATUS_LABELS } from '../../types';
import { getAccountReadings } from '../../services/meterReadingService';
import { getBillsByResident } from '../../services/billService';
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

function getStatusBadge(status: ResidentRecord['connectionStatus']): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-700';
    case 'inactive':
      return 'bg-gray-100 text-gray-700';
    case 'disconnected':
      return 'bg-red-100 text-red-700';
    case 'applicant':
      return 'bg-amber-100 text-amber-700';
    default:
      return 'bg-gray-100 text-gray-700';
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
      return 'bg-blue-100 text-blue-700';
    case 'pending_review':
      return 'bg-yellow-100 text-yellow-700';
    case 'approved':
    case 'billed':
      return 'bg-green-100 text-green-700';
    case 'rejected':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getBillBadge(status: string): string {
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
  { key: 'billing', label: 'Billing', icon: Receipt },
  { key: 'payments', label: 'Payments', icon: CreditCard },
];

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase mb-1">{label}</p>
      <div className="text-sm text-gray-900">{value}</div>
    </div>
  );
}

const ResidentOverviewModal: React.FC<{
  resident: ResidentRecord;
  onClose: () => void;
}> = ({ resident, onClose }) => {
  const [tab, setTab] = useState<OverviewTab>('information');
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [bills, setBills] = useState<Awaited<ReturnType<typeof getBillsByResident>>>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingData(true);
    setDataError(null);

    const tasks: Promise<void>[] = [];
    if (resident.accountId) {
      tasks.push(
        getAccountReadings(resident.accountId)
          .then((rows) => {
            if (!cancelled) setReadings(rows);
          })
          .catch((err: unknown) => {
            throw err instanceof Error ? err : new Error('Failed to load reading history.');
          })
      );
    }
    tasks.push(
      getBillsByResident(resident.id)
        .then((rows) => {
          if (!cancelled) setBills(rows);
        })
        .catch(() => {
          // Bills table may not exist yet on this backend — treat as no bills.
          if (!cancelled) setBills([]);
        })
    );

    Promise.all(tasks)
      .catch((err: unknown) => {
        if (!cancelled) {
          setDataError(err instanceof Error ? err.message : 'Failed to load details.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingData(false);
      });

    return () => {
      cancelled = true;
    };
  }, [resident.id, resident.accountId]);

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

  /** Latest bill = newest billing period (list arrives newest first). */
  const currentBill = bills.length > 0 ? bills[0] : null;

  const outstandingBalance = useMemo(
    () =>
      bills
        .filter((b) => b.status === 'pending' || b.status === 'overdue')
        .reduce((sum, b) => sum + Number(b.amount_due ?? 0), 0),
    [bills]
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 px-8 py-6 flex items-start justify-between flex-shrink-0">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-blue-600">
                {`${resident.firstName.charAt(0)}${resident.lastName.charAt(0)}`.toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{resident.fullName}</h2>
              <div className="flex items-center space-x-3 mt-1">
                <span className="text-sm text-gray-500">
                  {resident.accountNumber ? `Cons Code ${resident.accountNumber}` : 'No service account'}
                </span>
                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${getStatusBadge(resident.connectionStatus)}`}>
                  {getStatusText(resident.connectionStatus)}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-8 flex-shrink-0">
          <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  tab === key
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label.replace(' Information', '')}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {tab === 'information' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-4">Personal Details</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <InfoRow label="Full Name" value={resident.fullName} />
                  <InfoRow
                    label="Middle Name"
                    value={resident.middleName?.trim() || '—'}
                  />
                  <InfoRow
                    label="Email"
                    value={
                      resident.email ? (
                        resident.email
                      ) : (
                        <span className="text-gray-400 italic">Not provided</span>
                      )
                    }
                  />
                  <InfoRow
                    label="Contact Number"
                    value={
                      resident.phone ?? <span className="text-gray-400 italic">Not authorized / not provided</span>
                    }
                  />
                  <InfoRow
                    label="Date of Birth"
                    value={
                      resident.dateOfBirth ? (
                        formatDate(resident.dateOfBirth)
                      ) : (
                        <span className="text-gray-400 italic">Not authorized</span>
                      )
                    }
                  />
                  <InfoRow label="Registered" value={formatDate(resident.createdAt)} />
                </div>
              </div>

              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-4">Service Account</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <InfoRow label="Account / Cons Code" value={resident.accountNumber ?? '—'} />
                  <InfoRow
                    label="Meter Number"
                    value={
                      resident.meterNumber ?? (
                        <span className="text-gray-400 italic">
                          No meter yet (normal for applicants)
                        </span>
                      )
                    }
                  />
                  <InfoRow label="Sitio" value={resident.sitio ?? '—'} />
                  <InfoRow
                    label="Connection Status"
                    value={
                      <span className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full ${getStatusBadge(resident.connectionStatus)}`}>
                        {getStatusText(resident.connectionStatus)}
                      </span>
                    }
                  />
                  <InfoRow
                    label="Service Address"
                    value={
                      resident.serviceAddress ? (
                        resident.serviceAddress
                      ) : (
                        <span className="text-gray-400 italic">Not authorized</span>
                      )
                    }
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
                Fields marked “not authorized” were not released by the Barangay for this record.
                They are left blank instead of guessed.
              </div>
            </div>
          )}

          {tab === 'meter' && (
            <div className="space-y-6">
              {dataError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{dataError}</div>
              )}
              {loadingData ? (
                <div className="flex items-center justify-center space-x-2 text-gray-400 py-10">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading meter information…</span>
                </div>
              ) : !resident.accountId ? (
                <div className="py-10 text-center">
                  <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">This resident has no service account yet.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <p className="text-xs text-gray-500 uppercase mb-1">Previous Period</p>
                      <p className="text-lg font-bold text-gray-900">
                        {resident.previousReadingDate
                          ? formatPeriod(resident.previousReadingDate.slice(0, 7))
                          : '—'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(resident.previousReadingDate)}</p>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <p className="text-xs text-gray-500 uppercase mb-1">Previous Reading</p>
                      <p className="text-lg font-bold text-gray-900">{resident.previousReading ?? '—'}</p>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <p className="text-xs text-gray-500 uppercase mb-1">Current Reading</p>
                      {resident.currentReading !== null ? (
                        <p className="text-lg font-bold text-gray-900">{resident.currentReading}</p>
                      ) : (
                        <p className="text-sm italic text-gray-400 mt-1">Not yet recorded</p>
                      )}
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <p className="text-xs text-gray-500 uppercase mb-1">Consumption</p>
                      {consumption !== null ? (
                        <p className="text-lg font-bold text-primary-600">{consumption.toLocaleString()} cu.m</p>
                      ) : (
                        <p className="text-sm italic text-gray-400 mt-1">Pending readings</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-3">Meter Reading History</h3>
                    {readings.length === 0 ? (
                      <div className="py-8 text-center border border-dashed border-gray-200 rounded-xl">
                        <AlertCircle className="w-7 h-7 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">
                          No meter readings recorded yet through the reading workflow.
                        </p>
                      </div>
                    ) : (
                      <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Assigned</th>
                              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Read On</th>
                              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Previous</th>
                              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Current</th>
                              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Cu.m</th>
                              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {readings.map((r) => (
                              <tr key={r.id}>
                                <td className="px-4 py-2.5 text-sm text-gray-600">{formatDate(r.assignment_date)}</td>
                                <td className="px-4 py-2.5 text-sm text-gray-600">{formatDate(r.reading_date)}</td>
                                <td className="px-4 py-2.5 text-sm text-gray-600">{r.previous_reading}</td>
                                <td className="px-4 py-2.5 text-sm text-gray-900">
                                  {r.current_reading ?? <span className="italic text-gray-400">Awaiting</span>}
                                </td>
                                <td className="px-4 py-2.5 text-sm text-gray-900">{r.consumption ?? '—'}</td>
                                <td className="px-4 py-2.5">
                                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getReadingBadge(r.status)}`}>
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
            <div className="space-y-6">
              {!loadingData && bills.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase mb-1">Current Bill</p>
                    {currentBill ? (
                      <>
                        <p className="text-lg font-bold text-gray-900">{formatPeso(currentBill.amount_due)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatPeriod(currentBill.billing_period)}
                          {currentBill.due_date ? ` · due ${formatDate(currentBill.due_date)}` : ''}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm italic text-gray-400 mt-1">No bills yet</p>
                    )}
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase mb-1">Outstanding Balance</p>
                    {outstandingBalance > 0 ? (
                      <p className="text-lg font-bold text-red-600">{formatPeso(outstandingBalance)}</p>
                    ) : (
                      <p className="text-sm italic text-gray-400 mt-1">
                        {bills.some((b) => b.status === 'paid') ? 'Fully settled' : 'Nothing outstanding'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {loadingData ? (
                <div className="flex items-center justify-center space-x-2 text-gray-400 py-10">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading billing information…</span>
                </div>
              ) : bills.length === 0 ? (
                <div className="py-10 text-center">
                  <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No bills recorded yet.</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Bills appear here automatically once a meter reading for this account is approved.
                  </p>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Billing Period</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Consumption</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Amount Due</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Due Date</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {bills.map((b) => (
                        <tr key={b.id}>
                          <td className="px-4 py-2.5 text-sm text-gray-900">
                            {formatPeriod(b.billing_period)}
                            <span className="block text-xs text-gray-400">{b.bill_number}</span>
                          </td>
                          <td className="px-4 py-2.5 text-sm text-gray-600">
                            {b.consumption != null ? `${b.consumption} m³` : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-sm font-semibold text-gray-900">{formatPeso(b.amount_due)}</td>
                          <td className="px-4 py-2.5 text-sm text-gray-600">{formatDate(b.due_date)}</td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getBillBadge(b.status)}`}>
                              {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
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
              {bills.length > 0 && bills.some((b) => b.paid_at) ? (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Payment Date</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Bill</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Amount Paid</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {bills
                        .filter((b) => b.paid_at)
                        .map((b) => (
                          <tr key={b.id}>
                            <td className="px-4 py-2.5 text-sm text-gray-600">{formatDate(b.paid_at)}</td>
                            <td className="px-4 py-2.5 text-sm text-gray-900">
                              {formatPeriod(b.billing_period)}
                              <span className="block text-xs text-gray-400">{b.bill_number}</span>
                            </td>
                            <td className="px-4 py-2.5 text-sm font-semibold text-gray-900">{formatPeso(b.amount_due)}</td>
                            <td className="px-4 py-2.5">
                              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                                Paid
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-10 text-center">
                  <CreditCard className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No payments recorded yet.</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Payment recording has not been enabled for this system yet — nothing has been invented here.
                    When a bill is marked as paid it will appear in this history.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResidentOverviewModal;
