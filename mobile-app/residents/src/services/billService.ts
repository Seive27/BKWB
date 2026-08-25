import { supabase } from '@/lib/supabase';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

/** Mirrors the Supabase `bills` row (+ joined account info) for one resident. */
export interface ResidentBill {
  id: string;
  bill_number: string;
  account_id: string;
  resident_id: string;
  billing_period: string;
  period_start: string | null;
  period_end: string | null;
  previous_reading: number | null;
  current_reading: number | null;
  consumption: number | null;
  water_rate: number;
  extra_components: { id?: string; category: string; price: number }[] | null;
  amount_due: number;
  status: 'pending' | 'paid' | 'overdue' | 'void';
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
  account?: {
    id: string;
    account_number: string;
    service_address?: string | null;
    sitio: string | null;
    meter?: { meter_number: string } | null;
  } | null;
  resident?: {
    id: string;
    first_name: string;
    middle_name?: string | null;
    last_name: string;
  } | null;
}

export interface BillReceiptLine {
  accountName: string;
  billPeriod: string;
  previousReading: number | null;
  currentReading: number | null;
  consumption: number | null;
  amount: number;
}

/** Receipt payload matching the barangay printed bill layout. */
export interface BillReceiptData {
  bill: ResidentBill;
  consCode: string;
  residentName: string;
  address: string;
  meterSerial: string;
  prevBillPeriod: string | null;
  prevConsumption: number | null;
  billPeriod: string;
  dueDate: string | null;
  lastPayment: { date: string; amount: number } | null;
  waterRate: number;
  lines: BillReceiptLine[];
  totalAmountDue: number;
}

const BILL_SELECT =
  '*, account:resident_accounts!bills_account_id_fkey(id, account_number, service_address, sitio, meter:meters(meter_number)), resident:profiles!bills_resident_id_fkey(id, first_name, middle_name, last_name)';

/**
 * Fetch the signed-in resident's bills (RLS limits rows to their own
 * resident_id). Newest billing period first.
 */
export async function getMyBills(): Promise<ResidentBill[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error('You must be logged in to view your bills.');
  }

  const { data, error } = await supabase
    .from('bills')
    .select(BILL_SELECT)
    .eq('resident_id', session.user.id)
    .is('deleted_at', null)
    .order('billing_period', { ascending: false });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('does not exist') || msg.includes('relation')) {
      console.warn('[bills] table not available:', error.message);
      return [];
    }
    throw new Error(error.message || 'Failed to load your bills.');
  }

  return ((data ?? []) as unknown as ResidentBill[]).map((row) => ({
    ...row,
    extra_components: Array.isArray(row.extra_components) ? row.extra_components : [],
    account: row.account ?? null,
    resident: row.resident ?? null,
  }));
}

/** '2026-05' -> 'May 2026'. */
export function formatPeriod(period: string): string {
  const m = period.match(/^(\d{4})-(\d{2})$/);
  if (!m) return period;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  if (isNaN(d.getTime())) return period;
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** '2026-05' -> '05-2026' (printed receipt style). */
export function formatPeriodMMYYYY(period: string | null | undefined): string {
  if (!period) return '—';
  const m = period.match(/^(\d{4})-(\d{2})$/);
  if (m) return `${m[2]}-${m[1]}`;
  return period;
}

export function formatPeso(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `₱${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatBillDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
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

function previousPeriod(period: string): string | null {
  const m = period.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  let year = Number(m[1]);
  let month = Number(m[2]) - 1;
  if (month < 1) {
    month = 12;
    year -= 1;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

function formatResidentName(resident: ResidentBill['resident']): string {
  if (!resident) return '—';
  const first = [resident.first_name, resident.middle_name].filter(Boolean).join(' ').trim();
  const last = resident.last_name?.trim() ?? '';
  if (last && first) return `${last.toUpperCase()}, ${first.toUpperCase()}`;
  return (last || first || '—').toUpperCase();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Build receipt data for one bill. Includes unpaid sibling periods for the
 * same account so the PDF matches the multi-line barangay statement layout.
 */
export async function getBillReceiptData(bill: ResidentBill): Promise<BillReceiptData> {
  const { data: unpaidRows } = await supabase
    .from('bills')
    .select(BILL_SELECT)
    .eq('account_id', bill.account_id)
    .in('status', ['pending', 'overdue'])
    .is('deleted_at', null)
    .order('billing_period', { ascending: false });

  const unpaid = ((unpaidRows ?? []) as unknown as ResidentBill[]).map((row) => ({
    ...row,
    extra_components: Array.isArray(row.extra_components) ? row.extra_components : [],
  }));

  const lineBills: ResidentBill[] =
    unpaid.length > 0 ? unpaid : [bill];
  if (!lineBills.some((b) => b.id === bill.id)) {
    lineBills.unshift(bill);
  }

  const lines: BillReceiptLine[] = [];
  for (const b of lineBills) {
    const waterAmount = Math.max(
      0,
      Number(b.amount_due) -
        (b.extra_components ?? []).reduce((sum, c) => sum + (Number(c.price) || 0), 0)
    );
    lines.push({
      accountName: 'WATER FEE',
      billPeriod: b.billing_period,
      previousReading: b.previous_reading,
      currentReading: b.current_reading,
      consumption: b.consumption,
      amount: waterAmount,
    });
    for (const c of b.extra_components ?? []) {
      if (!c.category?.trim()) continue;
      lines.push({
        accountName: c.category.trim().toUpperCase(),
        billPeriod: b.billing_period,
        previousReading: null,
        currentReading: null,
        consumption: null,
        amount: Number(c.price) || 0,
      });
    }
  }

  const totalAmountDue = lineBills.reduce((sum, b) => sum + (Number(b.amount_due) || 0), 0);

  let lastPayment: BillReceiptData['lastPayment'] = null;
  const { data: paymentRows } = await supabase
    .from('payments')
    .select('payment_date, amount, status')
    .eq('account_id', bill.account_id)
    .eq('status', 'completed')
    .is('deleted_at', null)
    .order('payment_date', { ascending: false })
    .limit(1);

  if (paymentRows && paymentRows.length > 0) {
    const p = paymentRows[0] as { payment_date: string; amount: number };
    lastPayment = { date: p.payment_date, amount: Number(p.amount) || 0 };
  }

  const account = bill.account;
  const addressParts = [account?.service_address, account?.sitio].filter(Boolean);
  const address = addressParts.length > 0 ? addressParts.join(', ').toUpperCase() : '—';

  return {
    bill,
    consCode: account?.account_number ?? '—',
    residentName: formatResidentName(bill.resident),
    address,
    meterSerial: account?.meter?.meter_number ?? '—',
    prevBillPeriod: previousPeriod(bill.billing_period),
    prevConsumption: bill.previous_reading,
    billPeriod: bill.billing_period,
    dueDate: bill.due_date,
    lastPayment,
    waterRate: Number(bill.water_rate) || 0,
    lines,
    totalAmountDue,
  };
}

/** HTML matching the barangay printed billing receipt. */
export function buildBillReceiptHtml(receipt: BillReceiptData): string {
  const rows = receipt.lines
    .map(
      (line) => `
      <tr>
        <td>${escapeHtml(line.accountName)}</td>
        <td>${escapeHtml(formatPeriodMMYYYY(line.billPeriod))}</td>
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

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #111; margin: 24px; }
    .rate { text-align: right; margin-bottom: 8px; font-size: 11px; }
    .frame { border: 2px solid #111; padding: 16px 18px; }
    .header { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 16px; }
    .header-col { flex: 1; }
    .row { display: flex; gap: 8px; margin-bottom: 4px; }
    .label { font-weight: 700; min-width: 130px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { padding: 4px 6px; border-bottom: 1px solid #ddd; text-align: left; }
    th { font-size: 11px; border-bottom: 2px solid #111; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .total-row td { border-top: 2px solid #111; border-bottom: none; padding-top: 10px; font-weight: 700; }
  </style>
</head>
<body>
  <p class="rate">Water Rate = ${escapeHtml(formatAmount(receipt.waterRate))} / m³</p>
  <div class="frame">
    <div class="header">
      <div class="header-col">
        <div class="row"><span class="label">Cons Code:</span><span>${escapeHtml(receipt.consCode)}</span></div>
        <div class="row"><span class="label">Name:</span><span>${escapeHtml(receipt.residentName)}</span></div>
        <div class="row"><span class="label">Address:</span><span>${escapeHtml(receipt.address)}</span></div>
      </div>
      <div class="header-col">
        <div class="row"><span class="label">Meter Serial No.:</span><span>${escapeHtml(receipt.meterSerial)}</span></div>
        <div class="row"><span class="label">Prev. Bill Period:</span><span>${escapeHtml(formatPeriodMMYYYY(receipt.prevBillPeriod))}</span></div>
        <div class="row"><span class="label">Prev. Consumption:</span><span>${escapeHtml(formatReading(receipt.prevConsumption))}</span></div>
        <div class="row"><span class="label">Bill Period:</span><span>${escapeHtml(formatPeriodMMYYYY(receipt.billPeriod))}</span></div>
        <div class="row"><span class="label">Due Date:</span><span>${escapeHtml(formatReceiptDate(receipt.dueDate))}</span></div>
        <div class="row"><span class="label">Last Payment:</span><span>${escapeHtml(lastPayment)}</span></div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Account Name</th>
          <th>Bill Period</th>
          <th class="num">Prev Reading</th>
          <th class="num">Curr Reading</th>
          <th class="num">Consumption</th>
          <th class="num">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="total-row">
          <td colspan="5" style="text-align:right;">Total Amount Due:</td>
          <td class="num">${escapeHtml(formatAmount(receipt.totalAmountDue))}</td>
        </tr>
      </tbody>
    </table>
  </div>
</body>
</html>`;
}

/**
 * Generate a PDF of the barangay-style bill receipt and open the system share sheet
 * so the resident can save / download it.
 */
export async function downloadBillPdf(bill: ResidentBill): Promise<void> {
  const receipt = await getBillReceiptData(bill);
  const html = buildBillReceiptHtml(receipt);
  const file = await Print.printToFileAsync({ html });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device.');
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: `Bill ${bill.bill_number}`,
  });
}
