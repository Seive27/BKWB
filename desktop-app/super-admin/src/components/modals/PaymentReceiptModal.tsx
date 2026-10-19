import React from 'react';
import { CheckCircle, Loader2, X } from 'lucide-react';
import type { Bill, Payment } from '../../types';
import type { OfficialReceiptSnapshot } from '../../services/paymentService';

function formatPeso(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '₱0.00';
  return `₱${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPeriod(period: string): string {
  const m = period.match(/^(\d{4})-(\d{2})$/);
  if (!m) return period;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  if (isNaN(d.getTime())) return period;
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  gcash: 'GCash',
  maribank: 'Maribank',
  paymaya: 'Maya',
  maya: 'Maya',
  card: 'Card',
  grab_pay: 'GrabPay',
  bank: 'Bank transfer',
  online: 'Online payment',
};

function formatMethod(method: string | null | undefined): string {
  if (!method) return '—';
  return METHOD_LABELS[method.trim().toLowerCase()] ?? method.replace(/_/g, ' ');
}

/** Prefer the receipt stored on the payment; otherwise build one from the payment row. */
export function storedReceiptForBill(
  payments: Payment[],
  bill: Bill,
  residentName: string,
  accountNumber: string
): OfficialReceiptSnapshot | null {
  const rows = payments.filter((p) => {
    const status = p.status as string;
    return p.bill_id === bill.id && status !== 'cancelled' && status !== 'rejected';
  });
  const stored = rows.find((p) => p.receipt_snapshot);
  if (stored?.receipt_snapshot) return stored.receipt_snapshot;

  const payment = rows.find((p) => p.status === 'completed') ?? rows[0];
  if (!payment) return null;

  const reference =
    payment.paymongo_external_reference ||
    payment.paymongo_payment_id ||
    payment.reference_number ||
    payment.id.slice(0, 8).toUpperCase();

  return {
    totalPaid: Number(payment.amount) || 0,
    residentName,
    accountNumber: accountNumber || '—',
    referenceNumber: reference,
    paymentDate: payment.payment_date || payment.created_at,
    paymentMethod: payment.payment_method,
    bills: [
      {
        id: bill.id,
        billing_period: bill.billing_period,
        bill_number: bill.bill_number,
        amount: Number(payment.amount) || Number(bill.amount ?? bill.amount_due) || 0,
      },
    ],
  };
}

function Row({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div className="flex justify-between gap-3 py-2 border-b border-gray-100">
      <span className="text-xs uppercase text-gray-500">{label}</span>
      <span className={`text-sm font-semibold text-right ${emphasize ? 'text-primary-600' : 'text-gray-900'}`}>
        {value}
      </span>
    </div>
  );
}

const PaymentReceiptModal: React.FC<{
  bill: Bill;
  payments: Payment[];
  loading: boolean;
  residentName: string;
  accountNumber: string;
  onClose: () => void;
}> = ({ bill, payments, loading, residentName, accountNumber, onClose }) => {
  const receipt = loading ? null : storedReceiptForBill(payments, bill, residentName, accountNumber);

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="relative px-6 pt-6 pb-5 text-center border-b border-gray-100 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close payment receipt"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Official Receipt</h2>
          <p className="text-xs text-gray-500">Stored payment receipt</p>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading receipt…
            </div>
          ) : !receipt ? (
            <div className="py-8 text-center">
              <p className="text-sm font-medium text-gray-700">No payment receipt is stored for this bill.</p>
              <p className="text-xs text-gray-500 mt-1">
                {formatPeriod(bill.billing_period)} · {bill.bill_number}
              </p>
            </div>
          ) : (
            <>
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-center">
                <p className="text-xs text-emerald-700 font-semibold uppercase mb-1">Total Paid</p>
                <p className="text-3xl font-extrabold text-emerald-700">{formatPeso(receipt.totalPaid)}</p>
              </div>

              <div>
                <Row label="Resident" value={receipt.residentName || '—'} />
                <Row label="Account No." value={receipt.accountNumber || '—'} />
                <Row label="Official Receipt / Ref" value={receipt.referenceNumber || '—'} emphasize />
                <Row label="Date & Time" value={formatDateTime(receipt.paymentDate)} />
                <Row label="Payment Method" value={formatMethod(receipt.paymentMethod)} />
                {receipt.amountReceived != null && (
                  <Row label="Change Due" value={formatPeso(receipt.changeDue ?? 0)} />
                )}
              </div>

              {receipt.bills.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Bills Covered</p>
                  {receipt.bills.map((line) => (
                    <div key={line.id} className="flex items-center justify-between py-1.5 text-sm">
                      <span className="font-medium text-gray-700">
                        {formatPeriod(line.billing_period)}
                        <span className="text-xs text-gray-400"> ({line.bill_number})</span>
                      </span>
                      <span className="font-bold text-gray-900">{formatPeso(line.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="text-center pt-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Barangay Kalunasan Waterworks</p>
                <p className="text-[11px] text-gray-400">Official Electronic Receipt</p>
              </div>
            </>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold text-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentReceiptModal;
