import React, { useRef } from 'react';
import { X, Printer, Receipt, Loader2 } from 'lucide-react';
import type { BillReceiptData } from '../../services/billService';

interface GenerateBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: BillReceiptData | null;
  loading?: boolean;
  error?: string | null;
  billNumber?: string | null;
}

/** '2026-05' -> '05-2026' (matches printed BKWB receipts). */
function formatPeriodMMYYYY(period: string | null | undefined): string {
  if (!period) return '—';
  const m = period.match(/^(\d{4})-(\d{2})$/);
  if (m) return `${m[2]}-${m[1]}`;
  return period;
}

function formatReceiptDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}-${dd}-${yyyy}`;
}

function formatAmount(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatReading(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return String(Math.round(value));
}

const GenerateBillModal: React.FC<GenerateBillModalProps> = ({
  isOpen,
  onClose,
  receipt,
  loading = false,
  error = null,
  billNumber = null,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    const node = printRef.current;
    if (!node) return;

    const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
    if (!win) return;

    win.document.write(`<!DOCTYPE html><html><head><title>Bill ${billNumber ?? ''}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #111; margin: 24px; }
  .rate { text-align: right; margin-bottom: 8px; font-size: 11px; }
  .frame { border: 2px solid #111; padding: 16px 18px; }
  .header { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 16px; }
  .header-col { flex: 1; }
  .row { display: flex; gap: 8px; margin-bottom: 4px; }
  .label { font-weight: 700; min-width: 120px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { padding: 4px 6px; border-bottom: 1px solid #ddd; }
  th { text-align: left; font-size: 11px; border-bottom: 2px solid #111; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .total-row td { border-top: 2px solid #111; border-bottom: none; padding-top: 10px; font-weight: 700; }
</style></head><body>${node.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="generate-bill-title"
    >
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
              <Receipt className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 id="generate-bill-title" className="text-xl font-bold text-gray-900">
                Generate Bill
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {billNumber
                  ? `Bill ${billNumber} ready to print`
                  : 'Billing receipt for this approved reading'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors group"
          >
            <X className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
          </button>
        </div>

        <div className="px-8 py-6">
          {loading && (
            <div className="flex items-center justify-center py-16 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span className="text-sm">Generating bill receipt…</span>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && receipt && (
            <div ref={printRef}>
              <p className="rate text-right text-xs text-gray-600 mb-2">
                Water Rate = {formatAmount(receipt.waterRate)} / m³
              </p>

              <div className="frame border-2 border-gray-900 rounded-sm px-5 py-4 text-[13px] text-gray-900 font-sans">
                <div className="header flex flex-col sm:flex-row sm:justify-between gap-4 mb-5">
                  <div className="header-col space-y-1 min-w-0">
                    <div className="row flex gap-2">
                      <span className="label font-bold w-28 shrink-0">Cons Code:</span>
                      <span>{receipt.consCode}</span>
                    </div>
                    <div className="row flex gap-2">
                      <span className="label font-bold w-28 shrink-0">Name:</span>
                      <span className="uppercase break-words">{receipt.residentName}</span>
                    </div>
                    <div className="row flex gap-2">
                      <span className="label font-bold w-28 shrink-0">Address:</span>
                      <span className="uppercase break-words">{receipt.address}</span>
                    </div>
                  </div>

                  <div className="header-col space-y-1 sm:text-left sm:min-w-[240px]">
                    <div className="row flex gap-2">
                      <span className="label font-bold w-36 shrink-0">Meter Serial No.:</span>
                      <span>{receipt.meterSerial}</span>
                    </div>
                    <div className="row flex gap-2">
                      <span className="label font-bold w-36 shrink-0">Prev. Bill Period:</span>
                      <span>{formatPeriodMMYYYY(receipt.prevBillPeriod)}</span>
                    </div>
                    <div className="row flex gap-2">
                      <span className="label font-bold w-36 shrink-0">Prev. Consumption:</span>
                      <span>{formatReading(receipt.prevConsumption)}</span>
                    </div>
                    <div className="row flex gap-2">
                      <span className="label font-bold w-36 shrink-0">Bill Period:</span>
                      <span>{formatPeriodMMYYYY(receipt.billPeriod)}</span>
                    </div>
                    <div className="row flex gap-2">
                      <span className="label font-bold w-36 shrink-0">Due Date:</span>
                      <span>{formatReceiptDate(receipt.dueDate)}</span>
                    </div>
                    <div className="row flex gap-2">
                      <span className="label font-bold w-36 shrink-0">Last Payment:</span>
                      <span>
                        {receipt.lastPayment
                          ? `${formatReceiptDate(receipt.lastPayment.date)} - ${formatReading(receipt.lastPayment.amount)}`
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[13px]">
                    <thead>
                      <tr className="border-b-2 border-gray-900">
                        <th className="text-left py-2 pr-2 font-bold">Account Name</th>
                        <th className="text-left py-2 px-2 font-bold">Bill Period</th>
                        <th className="num text-right py-2 px-2 font-bold">Prev Reading</th>
                        <th className="num text-right py-2 px-2 font-bold">Curr Reading</th>
                        <th className="num text-right py-2 px-2 font-bold">Consumption</th>
                        <th className="num text-right py-2 pl-2 font-bold">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receipt.lines.map((line, idx) => (
                        <tr key={`${line.accountName}-${line.billPeriod}-${idx}`} className="border-b border-gray-200">
                          <td className="py-1.5 pr-2 uppercase">{line.accountName}</td>
                          <td className="py-1.5 px-2">{formatPeriodMMYYYY(line.billPeriod)}</td>
                          <td className="num text-right py-1.5 px-2 tabular-nums">
                            {formatReading(line.previousReading)}
                          </td>
                          <td className="num text-right py-1.5 px-2 tabular-nums">
                            {formatReading(line.currentReading)}
                          </td>
                          <td className="num text-right py-1.5 px-2 tabular-nums">
                            {formatReading(line.consumption)}
                          </td>
                          <td className="num text-right py-1.5 pl-2 tabular-nums">
                            {formatAmount(line.amount)}
                          </td>
                        </tr>
                      ))}
                      <tr className="total-row">
                        <td colSpan={5} className="text-right pt-3 font-bold">
                          Total Amount Due:
                        </td>
                        <td className="num text-right pt-3 font-bold tabular-nums border-t-2 border-gray-900">
                          {formatAmount(receipt.totalAmountDue)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-8 py-4 flex items-center justify-end space-x-3 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-all text-sm font-medium"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={loading || !receipt}
            className="px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all text-sm font-medium shadow-sm disabled:opacity-50 inline-flex items-center space-x-2"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GenerateBillModal;
