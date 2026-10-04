import React from 'react';
import { X, Receipt, Loader2 } from 'lucide-react';
import type { BillReceiptData } from '../../services/billService';
import BillReceiptCard from '../ui/BillReceiptCard';

interface GenerateBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: BillReceiptData | null;
  loading?: boolean;
  error?: string | null;
  billNumber?: string | null;
}

const GenerateBillModal: React.FC<GenerateBillModalProps> = ({
  isOpen,
  onClose,
  receipt,
  loading = false,
  error = null,
  billNumber = null,
}) => {
  if (!isOpen) return null;

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
                Bill Issued
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {billNumber
                  ? `Bill ${billNumber} is pending on the Bills page`
                  : 'Billing receipt for this reading'}
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
              <span className="text-sm">Issuing bill…</span>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && receipt && <BillReceiptCard receipt={receipt} />}
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-8 py-4 flex items-center justify-end rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all text-sm font-medium shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default GenerateBillModal;
