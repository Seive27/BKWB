import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Gauge,
  Receipt,
  CreditCard,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import type { Bill, MeterReading } from '../../types';
import { METER_READING_STATUS_LABELS } from '../../types';
import { getAccountReadings } from '../../services/meterReadingService';
import { getBills } from '../../services/billService';

type OverviewTab = 'billing' | 'meter' | 'payments';

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value.length === 10 ? value + 'T00:00:00' : value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatPeso(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `₱${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPeriod(period: string): string {
  const m = period.match(/^(\d{4})-(\d{2})$/);
  if (!m) return period;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  if (isNaN(d.getTime())) return period;
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getBillBadge(status: string): string {
  switch (status) {
    case 'paid':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    case 'overdue':
      return 'bg-rose-50 text-rose-700 border border-rose-200';
    case 'void':
      return 'bg-gray-100 text-gray-500 border border-gray-200';
    default:
      return 'bg-amber-50 text-amber-700 border border-amber-200';
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

function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function residentName(bill: Bill): string {
  if (!bill.resident) return 'Unknown resident';
  return `${bill.resident.first_name} ${bill.resident.last_name}`.trim() || 'Unknown resident';
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

const TABS: { key: OverviewTab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: 'billing', label: 'Billing Information', icon: Receipt },
  { key: 'meter', label: 'Meter Information', icon: Gauge },
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

const BillOverviewModal: React.FC<{
  bill: Bill;
  onClose: () => void;
}> = ({ bill, onClose }) => {
  const [tab, setTab] = useState<OverviewTab>('billing');
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [accountBills, setAccountBills] = useState<Bill[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const name = residentName(bill);
  const meterNumber = bill.account?.meter?.meter_number ?? null;
  const statusBadge = getBillBadge(bill.status);

  useEffect(() => {
    let cancelled = false;
    setLoadingData(true);
    setDataError(null);

    const tasks: Promise<void>[] = [
      getBills({ accountId: bill.account_id })
        .then((rows) => {
          if (!cancelled) setAccountBills(rows);
        })
        .catch(() => {
          if (!cancelled) setAccountBills([bill]);
        }),
    ];

    if (bill.account_id) {
      tasks.push(
        getAccountReadings(bill.account_id)
          .then((rows) => {
            if (!cancelled) setReadings(rows);
          })
          .catch((err: unknown) => {
            throw err instanceof Error ? err : new Error('Failed to load reading history.');
          })
      );
    }

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
  }, [bill, bill.account_id]);

  const outstandingBalance = useMemo(
    () =>
      accountBills
        .filter((b) => b.status === 'pending' || b.status === 'overdue')
        .reduce((sum, b) => sum + Number(b.amount_due ?? 0), 0),
    [accountBills]
  );

  const latestReading = readings[0] ?? null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl border border-gray-200 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-5 flex items-start justify-between flex-shrink-0 bg-white">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0 border border-primary-200">
              <span className="text-sm font-bold text-primary-700">{initialsOf(name)}</span>
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-lg font-bold text-gray-900 leading-tight">{name}</h2>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusBadge}`}>
                  {statusLabel(bill.status)}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                Account No:{' '}
                <span className="font-semibold text-gray-700">
                  {bill.account?.account_number ?? 'No service account'}
                </span>
                {meterNumber ? ` • Meter: ${meterNumber}` : ''}
                {bill.account?.sitio ? ` • Sitio ${bill.account.sitio}` : ''}
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
          {tab === 'billing' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3.5">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase mb-1">Amount Due</p>
                  <p className="text-xl font-bold text-gray-900">{formatPeso(bill.amount_due)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatPeriod(bill.billing_period)}
                    {bill.due_date ? ` · Due ${formatDate(bill.due_date)}` : ''}
                  </p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3.5">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase mb-1">Outstanding Balance</p>
                  {outstandingBalance > 0 ? (
                    <p className="text-xl font-bold text-rose-600">{formatPeso(outstandingBalance)}</p>
                  ) : (
                    <p className="text-xs font-semibold text-emerald-600 mt-1">
                      {accountBills.some((b) => b.status === 'paid') ? 'Fully Settled' : '₱0.00 Outstanding'}
                    </p>
                  )}
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 bg-white">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100 flex items-center space-x-2">
                  <Receipt className="w-4 h-4 text-primary-600" />
                  <span>Billing Information</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                  <InfoField label="Bill Number" value={bill.bill_number} />
                  <InfoField label="Billing Period" value={formatPeriod(bill.billing_period)} />
                  <InfoField
                    label="Status"
                    value={
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${statusBadge}`}>
                        {statusLabel(bill.status)}
                      </span>
                    }
                  />
                  <InfoField label="Due Date" value={formatDate(bill.due_date)} />
                  <InfoField label="Date Issued" value={formatDate(bill.created_at)} />
                  <InfoField
                    label="Payment Date"
                    value={bill.paid_at ? formatDate(bill.paid_at) : <span className="text-gray-400 italic">Not paid</span>}
                  />
                  <InfoField label="Account / Consumer Code" value={bill.account?.account_number ?? '—'} />
                  <InfoField label="Sitio" value={bill.account?.sitio ?? '—'} />
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 bg-white">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 pb-2 border-b border-gray-100 flex items-center space-x-2">
                  <Gauge className="w-4 h-4 text-primary-600" />
                  <span>Charges Breakdown</span>
                </h3>
                <div className="divide-y divide-gray-100">
                  <div className="flex justify-between py-2.5 text-sm">
                    <span className="text-gray-500">Previous Reading</span>
                    <span className="text-gray-900 font-medium">
                      {bill.previous_reading != null ? `${bill.previous_reading.toLocaleString()} m³` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2.5 text-sm">
                    <span className="text-gray-500">Current Reading</span>
                    <span className="text-gray-900 font-medium">
                      {bill.current_reading != null ? `${bill.current_reading.toLocaleString()} m³` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2.5 text-sm">
                    <span className="text-gray-500">Consumption</span>
                    <span className="text-gray-900 font-medium">
                      {bill.consumption != null ? `${bill.consumption.toLocaleString()} m³` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2.5 text-sm">
                    <span className="text-gray-500">Water Rate (per m³)</span>
                    <span className="text-gray-900 font-medium">{formatPeso(bill.water_rate)}</span>
                  </div>
                  {(bill.extra_components ?? []).map((c, i) => (
                    <div key={`${c.category}-${i}`} className="flex justify-between py-2.5 text-sm">
                      <span className="text-gray-500">{c.category}</span>
                      <span className="text-gray-900 font-medium">{formatPeso(c.price)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-3 bg-primary-50 -mx-4 px-4 rounded-b-lg mt-1">
                    <span className="text-sm font-semibold text-primary-800">Amount Due</span>
                    <span className="text-base font-bold text-primary-800">{formatPeso(bill.amount_due)}</span>
                  </div>
                </div>
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
              ) : !bill.account_id ? (
                <div className="py-12 text-center">
                  <AlertCircle className="w-7 h-7 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs font-medium text-gray-500">This bill has no service account linked.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-[11px] font-semibold text-gray-500 uppercase mb-1">Meter Serial</p>
                      <p className="text-base font-bold text-gray-900">{meterNumber ?? '—'}</p>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-[11px] font-semibold text-gray-500 uppercase mb-1">Previous Reading</p>
                      <p className="text-base font-bold text-gray-900">
                        {bill.previous_reading ?? latestReading?.previous_reading ?? '—'}
                      </p>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-[11px] font-semibold text-gray-500 uppercase mb-1">Current Reading</p>
                      {bill.current_reading != null || latestReading?.current_reading != null ? (
                        <p className="text-base font-bold text-gray-900">
                          {bill.current_reading ?? latestReading?.current_reading}
                        </p>
                      ) : (
                        <p className="text-xs italic text-gray-400 mt-0.5">Awaiting reading</p>
                      )}
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-[11px] font-semibold text-gray-500 uppercase mb-1">Consumption</p>
                      {bill.consumption != null || latestReading?.consumption != null ? (
                        <p className="text-base font-bold text-primary-700">
                          {(bill.consumption ?? latestReading?.consumption)?.toLocaleString()} m³
                        </p>
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
                                <td className="px-3.5 py-2.5 text-gray-900 font-medium">
                                  {r.consumption != null ? `${r.consumption} m³` : '—'}
                                </td>
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

          {tab === 'payments' && (
            <div className="space-y-4">
              {loadingData ? (
                <div className="flex items-center justify-center space-x-2 text-gray-400 py-12">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-xs font-medium">Loading payment history…</span>
                </div>
              ) : accountBills.some((b) => b.paid_at) ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3.5 py-2 text-xs font-semibold text-gray-600 uppercase">Payment Date</th>
                        <th className="px-3.5 py-2 text-xs font-semibold text-gray-600 uppercase">Bill Period</th>
                        <th className="px-3.5 py-2 text-xs font-semibold text-gray-600 uppercase">Amount Paid</th>
                        <th className="px-3.5 py-2 text-xs font-semibold text-gray-600 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {accountBills
                        .filter((b) => b.paid_at)
                        .map((b) => (
                          <tr key={b.id} className="hover:bg-gray-50">
                            <td className="px-3.5 py-2.5 text-gray-600">{formatDate(b.paid_at)}</td>
                            <td className="px-3.5 py-2.5 text-gray-900 font-medium">
                              {formatPeriod(b.billing_period)}
                              <span className="block text-[10px] text-gray-400 font-mono">{b.bill_number}</span>
                            </td>
                            <td className="px-3.5 py-2.5 font-bold text-gray-900">{formatPeso(b.amount_due)}</td>
                            <td className="px-3.5 py-2.5">
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Paid</span>
                              </span>
                            </td>
                          </tr>
                        ))}
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
  );
};

export default BillOverviewModal;
