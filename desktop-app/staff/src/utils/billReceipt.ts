import type { BillReceiptData } from '../services/billService';

/** Receipts packed per A4 bond paper (content-sized, with cut margins). */
export const RECEIPTS_PER_PAGE = 3;

/** '2026-05' -> '05-2026' (matches printed BKWB receipts). */
export function formatPeriodMMYYYY(period: string | null | undefined): string {
  if (!period) return '—';
  const m = period.match(/^(\d{4})-(\d{2})$/);
  if (m) return `${m[2]}-${m[1]}`;
  return period;
}

export function formatReceiptDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}-${dd}-${yyyy}`;
}

export function formatAmount(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatReading(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return String(Math.round(value));
}

/**
 * Print / PDF stylesheet.
 * Avoids border-collapse table borders (they render as strikethroughs in
 * WKWebView / html2canvas). Uses box-shadow rules and clear cell padding instead.
 */
export function billReceiptPrintStyles(options?: { multi?: boolean }): string {
  const multi = options?.multi ?? false;
  return `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11px;
    line-height: 1.35;
    color: #111;
    background: #fff;
    -webkit-font-smoothing: antialiased;
  }
  @page { size: A4; margin: 10mm; }
  .sheet {
    width: 190mm;
    min-height: 277mm;
    margin: 0 auto;
    padding: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    gap: 6mm;
    page-break-after: always;
    break-after: page;
  }
  .sheet:last-child { page-break-after: auto; break-after: auto; }
  .receipt-slot {
    flex: 0 0 auto;
    width: 100%;
    padding: 3mm 3mm 2mm;
    border: 1px dashed #aaa;
    background: #fff;
    overflow: visible;
  }
  .rate {
    text-align: right;
    margin: 0 0 3px;
    padding: 0;
    font-size: 10px;
    line-height: 1.3;
    color: #333;
  }
  .frame {
    border: 2px solid #111;
    padding: 8px 10px;
    background: #fff;
  }
  .header {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
  }
  .header-col { flex: 1; min-width: 0; }
  .row {
    display: flex;
    gap: 6px;
    margin: 0 0 3px;
    line-height: 1.35;
  }
  .label {
    font-weight: 700;
    min-width: ${multi ? '108px' : '120px'};
    flex-shrink: 0;
  }
  .value { min-width: 0; word-break: break-word; }
  .uppercase { text-transform: uppercase; }

  /* Table: no border-collapse — borders via box-shadow to avoid strikethroughs */
  table.receipt-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    margin-top: 4px;
    font-size: 10px;
    line-height: 1.35;
  }
  table.receipt-table th,
  table.receipt-table td {
    padding: 5px 6px;
    vertical-align: middle;
    background: #fff;
    border: none;
  }
  table.receipt-table thead th {
    text-align: left;
    font-weight: 700;
    box-shadow: inset 0 -2px 0 #111;
    padding-bottom: 6px;
  }
  table.receipt-table tbody td {
    box-shadow: inset 0 -1px 0 #ddd;
  }
  table.receipt-table tbody tr.total-row td {
    box-shadow: inset 0 2px 0 #111;
    border: none;
    padding-top: 8px;
    font-weight: 700;
  }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .total-label { text-align: right; }

  .cut-hint {
    text-align: center;
    font-size: 8px;
    color: #888;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin: 2.5mm 0 0;
    line-height: 1.2;
    border: none;
  }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
    .receipt-slot { break-inside: avoid; page-break-inside: avoid; }
  }
`;
}

/** Build the inner HTML for a single bill receipt. */
export function buildBillReceiptHtml(receipt: BillReceiptData): string {
  const lines = receipt.lines
    .map(
      (line) => `
      <tr>
        <td class="uppercase">${escapeHtml(line.accountName)}</td>
        <td>${escapeHtml(formatPeriodMMYYYY(line.billPeriod))}</td>
        <td>${escapeHtml(line.status)}</td>
        <td class="num">${escapeHtml(formatReading(line.previousReading))}</td>
        <td class="num">${escapeHtml(formatReading(line.currentReading))}</td>
        <td class="num">${escapeHtml(formatReading(line.consumption))}</td>
        <td class="num">${escapeHtml(formatAmount(line.amount))}</td>
      </tr>`
    )
    .join('');

  const lastPayment = receipt.lastPayment
    ? `${formatReceiptDate(receipt.lastPayment.date)} - ${formatReading(receipt.lastPayment.amount)}`
    : '—';

  return `
    <p class="rate">Water Rate = ${escapeHtml(formatAmount(receipt.waterRate))} / m³</p>
    <div class="frame">
      <div class="header">
        <div class="header-col">
          <div class="row"><span class="label">Cons Code:</span><span class="value">${escapeHtml(receipt.consCode)}</span></div>
          <div class="row"><span class="label">Name:</span><span class="value uppercase">${escapeHtml(receipt.residentName)}</span></div>
          <div class="row"><span class="label">Address:</span><span class="value uppercase">${escapeHtml(receipt.address)}</span></div>
        </div>
        <div class="header-col">
          <div class="row"><span class="label">Meter Serial No.:</span><span class="value">${escapeHtml(receipt.meterSerial)}</span></div>
          <div class="row"><span class="label">Prev. Bill Period:</span><span class="value">${escapeHtml(formatPeriodMMYYYY(receipt.prevBillPeriod))}</span></div>
          <div class="row"><span class="label">Prev. Consumption:</span><span class="value">${escapeHtml(formatReading(receipt.prevConsumption))}</span></div>
          <div class="row"><span class="label">Bill Period:</span><span class="value">${escapeHtml(formatPeriodMMYYYY(receipt.billPeriod))}</span></div>
          <div class="row"><span class="label">Due Date:</span><span class="value">${escapeHtml(formatReceiptDate(receipt.dueDate))}</span></div>
          <div class="row"><span class="label">Last Payment:</span><span class="value">${escapeHtml(lastPayment)}</span></div>
        </div>
      </div>
      <table class="receipt-table">
        <thead>
          <tr>
            <th>Account Name</th>
            <th>Bill Period</th>
            <th>Status</th>
            <th class="num">Prev Reading</th>
            <th class="num">Curr Reading</th>
            <th class="num">Consumption</th>
            <th class="num">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${lines}
          <tr class="total-row">
            <td colspan="6" class="total-label">Total Amount Due:</td>
            <td class="num">${escapeHtml(formatAmount(receipt.totalAmountDue))}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

/** Pack receipts into A4 sheets — content-sized slots with cut margins. */
export function buildMultiReceiptDocumentHtml(
  receipts: BillReceiptData[],
  title = 'Bill Receipts'
): string {
  const sheets: string[] = [];

  for (let i = 0; i < receipts.length; i += RECEIPTS_PER_PAGE) {
    const chunk = receipts.slice(i, i + RECEIPTS_PER_PAGE);
    const slots = chunk
      .map(
        (receipt) => `
        <div class="receipt-slot">
          ${buildBillReceiptHtml(receipt)}
          <div class="cut-hint">✂ cut here</div>
        </div>`
      )
      .join('');

    sheets.push(`<div class="sheet">${slots}</div>`);
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title>
<style>${billReceiptPrintStyles({ multi: true })}</style>
</head><body>${sheets.join('')}</body></html>`;
}

/**
 * Print via an iframe in the current window.
 * `window.open` is unreliable / blocked in Tauri WebView; iframe.print() works
 * and opens the native print dialog (with macOS preview pane).
 */
export function printHtmlDocument(html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById('bkwb-print-frame');
    if (existing) existing.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'bkwb-print-frame';
    iframe.setAttribute('title', 'Print');
    // Full-size so WebView paints the page for the system print preview.
    iframe.style.cssText =
      'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:99999;background:#fff;';
    document.body.appendChild(iframe);

    const win = iframe.contentWindow;
    const doc = iframe.contentDocument;
    if (!win || !doc) {
      iframe.remove();
      reject(new Error('Could not open print preview.'));
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    let cleaned = false;
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      window.setTimeout(() => iframe.remove(), 300);
    };

    win.addEventListener('afterprint', () => {
      cleanup();
      finish(() => resolve());
    });

    window.setTimeout(() => {
      try {
        win.focus();
        win.print();
        // Fallback if afterprint never fires (some WebViews).
        window.setTimeout(() => {
          cleanup();
          finish(() => resolve());
        }, 1500);
      } catch (err) {
        cleanup();
        finish(() => reject(err instanceof Error ? err : new Error('Print failed.')));
      }
    }, 350);
  });
}

/** @deprecated Prefer printHtmlDocument for Tauri. */
export function openPrintWindow(html: string, _title = 'Print'): Window | null {
  void printHtmlDocument(html);
  return null;
}

/**
 * Render multi-receipt HTML off-screen and save as a multi-page A4 PDF.
 */
export async function downloadReceiptsPdf(
  receipts: BillReceiptData[],
  filenamePrefix = 'bkwb-bill-receipts'
): Promise<void> {
  const html = buildMultiReceiptDocumentHtml(receipts, 'BKWB Bill Receipts');
  const iframe = document.createElement('iframe');
  iframe.style.cssText =
    'position:fixed;left:-10000px;top:0;width:210mm;min-height:297mm;border:0;opacity:0;pointer-events:none;';
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument;
    if (!doc) throw new Error('Could not prepare PDF document.');
    doc.open();
    doc.write(html);
    doc.close();

    await new Promise((r) => window.setTimeout(r, 500));

    const { default: html2canvas } = await import('html2canvas');
    const { default: jsPDF } = await import('jspdf');
    const sheetNodes = Array.from(doc.querySelectorAll<HTMLElement>('.sheet'));
    if (sheetNodes.length === 0) throw new Error('No receipts to export.');

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;

    for (let i = 0; i < sheetNodes.length; i += 1) {
      const canvas = await html2canvas(sheetNodes[i], {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const usableWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * usableWidth) / canvas.width;
      if (i > 0) pdf.addPage();
      pdf.addImage(
        imgData,
        'PNG',
        margin,
        margin,
        usableWidth,
        Math.min(imgHeight, pageHeight - margin * 2)
      );
    }

    const stamp = new Date().toISOString().slice(0, 10);
    pdf.save(`${filenamePrefix}-${stamp}.pdf`);
  } finally {
    document.body.removeChild(iframe);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
