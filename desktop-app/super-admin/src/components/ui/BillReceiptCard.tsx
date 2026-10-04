import React from 'react';
import type { BillReceiptData } from '../../services/billService';
import {
  formatAmount,
  formatPeriodMMYYYY,
  formatReading,
  formatReceiptDate,
} from '../../utils/billReceipt';

interface BillReceiptCardProps {
  receipt: BillReceiptData;
}

/** Printed-style billing receipt used in Issue Bill and Receipt Review. */
const BillReceiptCard: React.FC<BillReceiptCardProps> = ({ receipt }) => {
  return (
    <div>
      <p className="text-right text-xs text-gray-600 mb-2">
        Water Rate = {formatAmount(receipt.waterRate)} / m³
      </p>

      <div className="border-2 border-gray-900 rounded-sm px-5 py-4 text-[13px] text-gray-900 font-sans">
        <div className="flex flex-col sm:flex-row sm:justify-between gap-4 mb-5">
          <div className="space-y-1 min-w-0">
            <div className="flex gap-2">
              <span className="font-bold w-28 shrink-0">Cons Code:</span>
              <span>{receipt.consCode}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold w-28 shrink-0">Name:</span>
              <span className="uppercase break-words">{receipt.residentName}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold w-28 shrink-0">Address:</span>
              <span className="uppercase break-words">{receipt.address}</span>
            </div>
          </div>

          <div className="space-y-1 sm:min-w-[240px]">
            <div className="flex gap-2">
              <span className="font-bold w-36 shrink-0">Meter Serial No.:</span>
              <span>{receipt.meterSerial}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold w-36 shrink-0">Prev. Bill Period:</span>
              <span>{formatPeriodMMYYYY(receipt.prevBillPeriod)}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold w-36 shrink-0">Prev. Consumption:</span>
              <span>{formatReading(receipt.prevConsumption)}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold w-36 shrink-0">Bill Period:</span>
              <span>{formatPeriodMMYYYY(receipt.billPeriod)}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold w-36 shrink-0">Due Date:</span>
              <span>{formatReceiptDate(receipt.dueDate)}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold w-36 shrink-0">Last Payment:</span>
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
                <th className="text-left py-2 px-2 font-bold">Status</th>
                <th className="text-right py-2 px-2 font-bold">Prev Reading</th>
                <th className="text-right py-2 px-2 font-bold">Curr Reading</th>
                <th className="text-right py-2 px-2 font-bold">Consumption</th>
                <th className="text-right py-2 pl-2 font-bold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {receipt.lines.map((line, idx) => (
                <tr key={`${line.accountName}-${line.billPeriod}-${idx}`} className="border-b border-gray-200">
                  <td className="py-1.5 pr-2 uppercase">{line.accountName}</td>
                  <td className="py-1.5 px-2">{formatPeriodMMYYYY(line.billPeriod)}</td>
                  <td className="py-1.5 px-2">{line.status}</td>
                  <td className="text-right py-1.5 px-2 tabular-nums">
                    {formatReading(line.previousReading)}
                  </td>
                  <td className="text-right py-1.5 px-2 tabular-nums">
                    {formatReading(line.currentReading)}
                  </td>
                  <td className="text-right py-1.5 px-2 tabular-nums">
                    {formatReading(line.consumption)}
                  </td>
                  <td className="text-right py-1.5 pl-2 tabular-nums">
                    {formatAmount(line.amount)}
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={6} className="text-right pt-3 font-bold">
                  Total Amount Due:
                </td>
                <td className="text-right pt-3 font-bold tabular-nums border-t-2 border-gray-900">
                  {formatAmount(receipt.totalAmountDue)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BillReceiptCard;
