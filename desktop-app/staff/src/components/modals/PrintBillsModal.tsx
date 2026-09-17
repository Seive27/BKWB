import React, { useEffect, useMemo, useState } from 'react';
import { Download, Loader2, Printer, Receipt, X } from 'lucide-react';
import { getBillReceiptData, type BillReceiptData } from '../../services/billService';
import {
  RECEIPTS_PER_PAGE,
  buildBillReceiptHtml,
  buildMultiReceiptDocumentHtml,
  downloadReceiptsPdf,
  printHtmlDocument,
} from '../../utils/billReceipt';

interface PrintBillsModalProps {
  isOpen: boolean;
  billIds: string[];
  onClose: () => void;
}

type View = 'actions' | 'preview';

/**
 * After Generate Bills confirm:
 * 1) Compact actions dialog (Download / Print Preview)
 * 2) In-app preview → Print opens the system print dialog (Tauri-safe iframe)
 */
const PrintBillsModal: React.FC<PrintBillsModalProps> = ({ isOpen, billIds, onClose }) => {
  const [receipts, setReceipts] = useState<BillReceiptData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [view, setView] = useState<View>('actions');

  useEffect(() => {
    if (!isOpen || billIds.length === 0) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setReceipts([]);
    setView('actions');

    Promise.all(billIds.map((id) => getBillReceiptData(id)))
      .then((data) => {
        if (!cancelled) setReceipts(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load bill receipts.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, billIds]);

  const pages = useMemo(() => {
    const chunks: BillReceiptData[][] = [];
    for (let i = 0; i < receipts.length; i += RECEIPTS_PER_PAGE) {
      chunks.push(receipts.slice(i, i + RECEIPTS_PER_PAGE));
    }
    return chunks;
  }, [receipts]);

  if (!isOpen) return null;

  const handleDownloadPdf = async () => {
    if (receipts.length === 0 || downloading) return;
    setDownloading(true);
    setError(null);
    try {
      await downloadReceiptsPdf(receipts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download PDF.');
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenPreview = () => {
    if (receipts.length === 0) return;
    setView('preview');
  };

  const handlePrint = async () => {
    if (receipts.length === 0 || printing) return;
    setPrinting(true);
    setError(null);
    try {
      await printHtmlDocument(buildMultiReceiptDocumentHtml(receipts, 'BKWB Bill Receipts'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open print dialog.');
    } finally {
      setPrinting(false);
    }
  };

  const pageCount = Math.max(1, Math.ceil(receipts.length / RECEIPTS_PER_PAGE));

  // ── In-app print preview (full receipt layout) ──
  if (view === 'preview') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-black/60">
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-900">Print Preview</h2>
            <p className="text-xs text-gray-500 truncate">
              {receipts.length} receipt{receipts.length === 1 ? '' : 's'} · {RECEIPTS_PER_PAGE} per A4 ·{' '}
              {pageCount} page{pageCount === 1 ? '' : 's'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setView('actions')}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-800 rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-sm font-medium"
            >
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-800 rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-sm font-medium disabled:opacity-40"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>Download as PDF</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={printing}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm text-sm font-medium disabled:opacity-40"
            >
              {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 hover:bg-gray-100 rounded-lg"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {error && (
          <div className="flex-shrink-0 bg-red-50 border-b border-red-200 px-4 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-auto bg-gray-300 p-4">
          <style>{`
            .bkwb-preview-host .rate { text-align: right; margin: 0 0 3px; font-size: 10px; color: #333; }
            .bkwb-preview-host .frame { border: 2px solid #111; padding: 8px 10px; background: #fff; }
            .bkwb-preview-host .header { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
            .bkwb-preview-host .header-col { flex: 1; min-width: 0; }
            .bkwb-preview-host .row { display: flex; gap: 6px; margin: 0 0 3px; line-height: 1.35; font-size: 11px; }
            .bkwb-preview-host .label { font-weight: 700; min-width: 108px; flex-shrink: 0; }
            .bkwb-preview-host .value { min-width: 0; word-break: break-word; }
            .bkwb-preview-host .uppercase { text-transform: uppercase; }
            .bkwb-preview-host table.receipt-table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 4px; font-size: 10px; }
            .bkwb-preview-host table.receipt-table th,
            .bkwb-preview-host table.receipt-table td { padding: 5px 6px; vertical-align: middle; border: none; background: #fff; }
            .bkwb-preview-host table.receipt-table thead th { text-align: left; font-weight: 700; box-shadow: inset 0 -2px 0 #111; }
            .bkwb-preview-host table.receipt-table tbody td { box-shadow: inset 0 -1px 0 #ddd; }
            .bkwb-preview-host table.receipt-table tbody tr.total-row td { box-shadow: inset 0 2px 0 #111; padding-top: 8px; font-weight: 700; }
            .bkwb-preview-host .num { text-align: right; font-variant-numeric: tabular-nums; }
            .bkwb-preview-host .total-label { text-align: right; }
            .bkwb-preview-host .cut-hint { text-align: center; font-size: 8px; color: #888; letter-spacing: 0.06em; text-transform: uppercase; margin: 8px 0 0; }
          `}</style>
          <div className="bkwb-preview-host mx-auto space-y-6" style={{ width: '210mm' }}>
            {pages.map((pageReceipts, pageIndex) => (
              <div
                key={`page-${pageIndex}`}
                className="bg-white shadow-lg mx-auto"
                style={{ width: '210mm', minHeight: '297mm', padding: '10mm' }}
              >
                <div className="flex flex-col gap-4">
                  {pageReceipts.map((receipt) => (
                    <div
                      key={receipt.bill.id}
                      className="border border-dashed border-gray-400 p-2"
                      dangerouslySetInnerHTML={{
                        __html:
                          buildBillReceiptHtml(receipt) +
                          '<div class="cut-hint">✂ cut here</div>',
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Actions dialog ──
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="generated-bills-title"
    >
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Receipt className="w-5 h-5 text-primary-600" />
            </div>
            <div className="min-w-0">
              <h2 id="generated-bills-title" className="text-lg font-bold text-gray-900">
                Generated Bills
              </h2>
              <p className="text-sm text-gray-500 truncate">
                {loading
                  ? 'Preparing receipts…'
                  : receipts.length > 0
                    ? `${receipts.length} receipt${receipts.length === 1 ? '' : 's'} ready · ${RECEIPTS_PER_PAGE} per A4 page`
                    : 'No receipts loaded'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">Loading bill receipts…</span>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && receipts.length > 0 && (
            <>
              <p className="text-sm text-gray-600 leading-relaxed">
                {RECEIPTS_PER_PAGE} receipts per A4 with cut margins. Open preview to print, or
                download a PDF.
              </p>
              <ul className="max-h-48 overflow-y-auto divide-y divide-gray-100 rounded-xl border border-gray-200 text-sm">
                {receipts.map((r) => (
                  <li key={r.bill.id} className="px-4 py-2.5 flex justify-between gap-3">
                    <span className="font-medium text-gray-900 truncate">{r.bill.bill_number}</span>
                    <span className="text-gray-500 truncate">{r.residentName}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-800 rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-sm font-medium"
          >
            <span>Close</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={loading || receipts.length === 0 || downloading}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-800 rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-sm font-medium disabled:opacity-40"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>{downloading ? 'Preparing…' : 'Download as PDF'}</span>
          </button>
          <button
            type="button"
            onClick={handleOpenPreview}
            disabled={loading || receipts.length === 0}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm text-sm font-medium disabled:opacity-40"
          >
            <Printer className="w-4 h-4" />
            <span>Print Preview</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintBillsModal;
