import { supabase } from '../lib/supabase';
import { BILL_STATUS_LABELS, METER_READING_STATUS_LABELS, TICKET_CATEGORY_LABELS, TICKET_PRIORITY_LABELS, TICKET_STATUS_LABELS } from '../types';

/**
 * Reporting engine (Phase J). Reports are generated from live BKWB tables
 * only — nothing is invented. New categories can be added by appending to
 * REPORT_CATEGORIES with a fetcher; the UI renders whatever a fetcher
 * returns, so client-required metrics can be configured later.
 */

export type PeriodKind = 'monthly' | 'quarterly' | 'yearly';

export interface ReportPeriod {
  kind: PeriodKind;
  year: number;
  /** 1-12, required for monthly */
  month?: number;
  /** 1-4, required for quarterly */
  quarter?: number;
}

export type ReportCategory =
  | 'residents'
  | 'meter_readings'
  | 'consumption'
  | 'bills'
  | 'payments'
  | 'tickets';

export const REPORT_CATEGORIES: {
  id: ReportCategory;
  label: string;
  description: string;
}[] = [
  { id: 'residents', label: 'Residents', description: 'Registered residents and service accounts.' },
  { id: 'meter_readings', label: 'Meter Readings', description: 'Reading assignments and submissions.' },
  { id: 'consumption', label: 'Water Consumption', description: 'Approved consumption by sitio and account.' },
  { id: 'bills', label: 'Bills', description: 'Generated bills and their status.' },
  { id: 'payments', label: 'Payments', description: 'Collected payments (from bills marked paid).' },
  { id: 'tickets', label: 'Tickets', description: 'Consumer concerns and resolution progress.' },
];

export interface ReportColumn {
  key: string;
  label: string;
}

export interface ReportResult {
  category: ReportCategory;
  title: string;
  periodLabel: string;
  generatedAt: string;
  columns: ReportColumn[];
  rows: Record<string, string | number>[];
  summary: { label: string; value: string }[];
}

// ─── Period helpers ───

export function getPeriodRange(period: ReportPeriod): { startIso: string; endIso: string; label: string } {
  const { kind, year, month, quarter } = period;
  if (kind === 'monthly') {
    const m = month ?? 1;
    const start = new Date(Date.UTC(year, m - 1, 1));
    const end = new Date(Date.UTC(year, m, 1));
    return {
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      label: start.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
    };
  }
  if (kind === 'quarterly') {
    const q = quarter ?? 1;
    const startMonth = (q - 1) * 3;
    const start = new Date(Date.UTC(year, startMonth, 1));
    const end = new Date(Date.UTC(year, startMonth + 3, 1));
    return {
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      label: `Q${q} ${year}`,
    };
  }
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));
  return { startIso: start.toISOString(), endIso: end.toISOString(), label: `Year ${year}` };
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function peso(n: number): string {
  return `₱${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function person(p?: { first_name: string; last_name: string } | null): string {
  return p ? `${p.first_name} ${p.last_name}`.trim() : '—';
}

// ─── Fetchers ───

async function residentsReport(range: { startIso: string; endIso: string }): Promise<ReportResult> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'first_name, middle_name, last_name, created_at, is_active, role:roles!inner(name), accounts:resident_accounts(account_number, sitio, connection_status)'
    )
    .eq('role.name', 'resident')
    .gte('created_at', range.startIso)
    .lt('created_at', range.endIso)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  type Row = {
    first_name: string;
    middle_name: string | null;
    last_name: string;
    created_at: string;
    is_active: boolean;
    accounts?: { account_number: string; sitio: string | null; connection_status: string }[];
  };

  const rows = ((data ?? []) as unknown as Row[]).map((r) => ({
    resident: `${r.last_name}, ${r.first_name}${r.middle_name ? ` ${r.middle_name}` : ''}`.trim(),
    account_number: r.accounts?.[0]?.account_number ?? '—',
    sitio: r.accounts?.[0]?.sitio ?? '—',
    connection_status: r.accounts?.[0]?.connection_status ?? '—',
    login_enabled: r.is_active ? 'Yes' : 'No',
    registered: fmtDate(r.created_at),
  }));

  const activeCount = rows.filter((r) => r.connection_status === 'active').length;

  return {
    category: 'residents',
    title: 'Residents Report',
    periodLabel: '',
    generatedAt: new Date().toISOString(),
    columns: [
      { key: 'resident', label: 'Resident' },
      { key: 'account_number', label: 'Account No.' },
      { key: 'sitio', label: 'Sitio' },
      { key: 'connection_status', label: 'Status' },
      { key: 'login_enabled', label: 'Login Enabled' },
      { key: 'registered', label: 'Registered' },
    ],
    rows,
    summary: [
      { label: 'New residents in period', value: String(rows.length) },
      { label: 'Active accounts', value: String(activeCount) },
      { label: 'Other statuses', value: String(rows.length - activeCount) },
    ],
  };
}

async function readingsReport(range: { startIso: string; endIso: string }): Promise<ReportResult> {
  const { data, error } = await supabase
    .from('meter_readings')
    .select(
      'assignment_date, reading_date, previous_reading, current_reading, consumption, status, account:resident_accounts!meter_readings_account_id_fkey(account_number, sitio), resident:profiles!meter_readings_resident_id_fkey(first_name, last_name), reader:profiles!meter_readings_meter_reader_id_fkey(first_name, last_name)'
    )
    .is('deleted_at', null)
    .gte('assignment_date', range.startIso.slice(0, 10))
    .lte('assignment_date', range.endIso.slice(0, 10))
    .order('assignment_date', { ascending: false });

  if (error) throw new Error(error.message);

  type Row = {
    assignment_date: string;
    reading_date: string | null;
    previous_reading: number;
    current_reading: number | null;
    consumption: number | null;
    status: keyof typeof METER_READING_STATUS_LABELS;
    account?: { account_number: string; sitio: string | null } | null;
    resident?: { first_name: string; last_name: string } | null;
    reader?: { first_name: string; last_name: string } | null;
  };

  const mapped = ((data ?? []) as unknown as Row[]).map((r) => ({
    account: r.account?.account_number ?? '—',
    sitio: r.account?.sitio ?? '—',
    resident: person(r.resident),
    meter_reader: person(r.reader),
    assigned: fmtDate(r.assignment_date),
    read_on: r.reading_date ? fmtDate(r.reading_date) : 'Not yet',
    previous_reading: r.previous_reading,
    current_reading: r.current_reading ?? '—',
    consumption: r.consumption ?? '—',
    status: METER_READING_STATUS_LABELS[r.status] ?? r.status,
  }));

  const submitted = mapped.filter((r) => r.read_on !== 'Not yet').length;

  return {
    category: 'meter_readings',
    title: 'Meter Readings Report',
    periodLabel: '',
    generatedAt: new Date().toISOString(),
    columns: [
      { key: 'account', label: 'Account' },
      { key: 'sitio', label: 'Sitio' },
      { key: 'resident', label: 'Resident' },
      { key: 'meter_reader', label: 'Meter Reader' },
      { key: 'assigned', label: 'Assigned' },
      { key: 'read_on', label: 'Read On' },
      { key: 'previous_reading', label: 'Previous' },
      { key: 'current_reading', label: 'Current' },
      { key: 'consumption', label: 'Cu.m' },
      { key: 'status', label: 'Status' },
    ],
    rows: mapped,
    summary: [
      { label: 'Assignments in period', value: String(mapped.length) },
      { label: 'Submitted readings', value: String(submitted) },
      { label: 'Awaiting submission', value: String(mapped.length - submitted) },
    ],
  };
}

async function consumptionReport(range: { startIso: string; endIso: string }): Promise<ReportResult> {
  const { data, error } = await supabase
    .from('meter_readings')
    .select(
      'consumption, account:resident_accounts!meter_readings_account_id_fkey(account_number, sitio)'
    )
    .is('deleted_at', null)
    .in('status', ['approved', 'billed'])
    .not('consumption', 'is', null)
    .gte('assignment_date', range.startIso.slice(0, 10))
    .lte('assignment_date', range.endIso.slice(0, 10));

  if (error) throw new Error(error.message);

  type Row = {
    consumption: number | null;
    account?: { account_number: string; sitio: string | null } | null;
  };

  // Aggregate per sitio.
  const bySitio = new Map<string, { total: number; count: number; max: number }>();
  for (const r of (data ?? []) as unknown as Row[]) {
    const sitio = r.account?.sitio?.trim() || 'Unassigned';
    const c = Number(r.consumption ?? 0);
    const agg = bySitio.get(sitio) ?? { total: 0, count: 0, max: 0 };
    agg.total += c;
    agg.count += 1;
    agg.max = Math.max(agg.max, c);
    bySitio.set(sitio, agg);
  }

  const rows = [...bySitio.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([sitio, agg]) => ({
      sitio,
      approved_readings: agg.count,
      total_consumption: Math.round(agg.total * 100) / 100,
      average_per_consumer: agg.count > 0 ? Math.round((agg.total / agg.count) * 100) / 100 : 0,
      highest_single: agg.max,
    }));

  const grandTotal = rows.reduce((s, r) => s + Number(r.total_consumption), 0);

  return {
    category: 'consumption',
    title: 'Water Consumption Report',
    periodLabel: '',
    generatedAt: new Date().toISOString(),
    columns: [
      { key: 'sitio', label: 'Sitio' },
      { key: 'approved_readings', label: 'Approved Readings' },
      { key: 'total_consumption', label: 'Total Cu.m' },
      { key: 'average_per_consumer', label: 'Avg Cu.m / Consumer' },
      { key: 'highest_single', label: 'Highest Single Cu.m' },
    ],
    rows,
    summary: [
      { label: 'Total consumption', value: `${Math.round(grandTotal * 100) / 100} cu.m` },
      { label: 'Sitios covered', value: String(rows.length) },
    ],
  };
}

async function billsReport(range: { startIso: string; endIso: string }): Promise<ReportResult> {
  const { data, error } = await supabase
    .from('bills')
    .select(
      'bill_number, billing_period, amount_due, consumption, status, due_date, created_at, account:resident_accounts!bills_account_id_fkey(account_number, sitio), resident:profiles!bills_resident_id_fkey(first_name, last_name)'
    )
    .is('deleted_at', null)
    .gte('created_at', range.startIso)
    .lt('created_at', range.endIso)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  type Row = {
    bill_number: string;
    billing_period: string;
    amount_due: number;
    consumption: number | null;
    status: keyof typeof BILL_STATUS_LABELS;
    due_date: string | null;
    created_at: string;
    account?: { account_number: string; sitio: string | null } | null;
    resident?: { first_name: string; last_name: string } | null;
  };

  const rows = ((data ?? []) as unknown as Row[]).map((b) => ({
    bill_number: b.bill_number,
    account: b.account?.account_number ?? '—',
    sitio: b.account?.sitio ?? '—',
    resident: person(b.resident),
    billing_period: b.billing_period,
    consumption: b.consumption ?? '—',
    amount_due: peso(Number(b.amount_due)),
    status: BILL_STATUS_LABELS[b.status] ?? b.status,
    due_date: b.due_date ? fmtDate(b.due_date) : '—',
  }));

  const totalDue = ((data ?? []) as unknown as Row[]).reduce((s, b) => s + Number(b.amount_due ?? 0), 0);

  return {
    category: 'bills',
    title: 'Bills Report',
    periodLabel: '',
    generatedAt: new Date().toISOString(),
    columns: [
      { key: 'bill_number', label: 'Bill No.' },
      { key: 'account', label: 'Account' },
      { key: 'sitio', label: 'Sitio' },
      { key: 'resident', label: 'Resident' },
      { key: 'billing_period', label: 'Billing Period' },
      { key: 'consumption', label: 'Cu.m' },
      { key: 'amount_due', label: 'Amount Due' },
      { key: 'status', label: 'Status' },
      { key: 'due_date', label: 'Due Date' },
    ],
    rows,
    summary: [
      { label: 'Bills generated', value: String(rows.length) },
      { label: 'Total billed amount', value: peso(totalDue) },
    ],
  };
}

async function paymentsReport(range: { startIso: string; endIso: string }): Promise<ReportResult> {
  const { data, error } = await supabase
    .from('bills')
    .select(
      'bill_number, billing_period, amount_due, paid_at, account:resident_accounts!bills_account_id_fkey(account_number, sitio), resident:profiles!bills_resident_id_fkey(first_name, last_name)'
    )
    .is('deleted_at', null)
    .eq('status', 'paid')
    .gte('paid_at', range.startIso)
    .lt('paid_at', range.endIso)
    .order('paid_at', { ascending: false });

  if (error) throw new Error(error.message);

  type Row = {
    bill_number: string;
    billing_period: string;
    amount_due: number;
    paid_at: string;
    account?: { account_number: string; sitio: string | null } | null;
    resident?: { first_name: string; last_name: string } | null;
  };

  const rows = ((data ?? []) as unknown as Row[]).map((b) => ({
    bill_number: b.bill_number,
    account: b.account?.account_number ?? '—',
    sitio: b.account?.sitio ?? '—',
    resident: person(b.resident),
    billing_period: b.billing_period,
    amount_paid: peso(Number(b.amount_due)),
    paid_on: fmtDate(b.paid_at),
  }));

  const collected = ((data ?? []) as unknown as Row[]).reduce((s, b) => s + Number(b.amount_due ?? 0), 0);

  return {
    category: 'payments',
    title: 'Payments Report',
    periodLabel: '',
    generatedAt: new Date().toISOString(),
    columns: [
      { key: 'bill_number', label: 'Bill No.' },
      { key: 'account', label: 'Account' },
      { key: 'sitio', label: 'Sitio' },
      { key: 'resident', label: 'Resident' },
      { key: 'billing_period', label: 'Billing Period' },
      { key: 'amount_paid', label: 'Amount Paid' },
      { key: 'paid_on', label: 'Paid On' },
    ],
    rows,
    summary: [
      { label: 'Payments collected', value: String(rows.length) },
      { label: 'Total collected', value: peso(collected) },
      {
        label: 'Note',
        value: 'Derived from bills marked as paid; dedicated payment records are not yet recorded.',
      },
    ],
  };
}

async function ticketsReport(range: { startIso: string; endIso: string }): Promise<ReportResult> {
  const { data, error } = await supabase
    .from('tickets')
    .select(
      'ticket_number, subject, category, priority, status, created_at, resolved_at, resident:profiles!tickets_resident_id_fkey(first_name, last_name)'
    )
    .is('deleted_at', null)
    .gte('created_at', range.startIso)
    .lt('created_at', range.endIso)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  type Row = {
    ticket_number: string;
    subject: string;
    category: keyof typeof TICKET_CATEGORY_LABELS;
    priority: keyof typeof TICKET_PRIORITY_LABELS;
    status: keyof typeof TICKET_STATUS_LABELS;
    created_at: string;
    resolved_at: string | null;
    resident?: { first_name: string; last_name: string } | null;
  };

  const rows = ((data ?? []) as unknown as Row[]).map((t) => ({
    ticket_number: t.ticket_number,
    subject: t.subject,
    resident: person(t.resident),
    category: TICKET_CATEGORY_LABELS[t.category] ?? t.category,
    priority: TICKET_PRIORITY_LABELS[t.priority] ?? t.priority,
    status: TICKET_STATUS_LABELS[t.status] ?? t.status,
    created: fmtDate(t.created_at),
    resolved: t.resolved_at ? fmtDate(t.resolved_at) : '—',
  }));

  const resolved = ((data ?? []) as unknown as Row[]).filter((t) => t.resolved_at).length;

  return {
    category: 'tickets',
    title: 'Tickets Report',
    periodLabel: '',
    generatedAt: new Date().toISOString(),
    columns: [
      { key: 'ticket_number', label: 'Ticket No.' },
      { key: 'subject', label: 'Subject' },
      { key: 'resident', label: 'Resident' },
      { key: 'category', label: 'Category' },
      { key: 'priority', label: 'Priority' },
      { key: 'status', label: 'Status' },
      { key: 'created', label: 'Created' },
      { key: 'resolved', label: 'Resolved' },
    ],
    rows,
    summary: [
      { label: 'Tickets in period', value: String(rows.length) },
      { label: 'Resolved', value: String(resolved) },
      { label: 'Still open', value: String(rows.length - resolved) },
    ],
  };
}

/** Generate any registered report for a period. */
export async function getReport(
  category: ReportCategory,
  period: ReportPeriod
): Promise<ReportResult> {
  const range = getPeriodRange(period);
  let result: ReportResult;
  switch (category) {
    case 'residents':
      result = await residentsReport(range);
      break;
    case 'meter_readings':
      result = await readingsReport(range);
      break;
    case 'consumption':
      result = await consumptionReport(range);
      break;
    case 'bills':
      result = await billsReport(range);
      break;
    case 'payments':
      result = await paymentsReport(range);
      break;
    case 'tickets':
      result = await ticketsReport(range);
      break;
    default:
      throw new Error('Unknown report.');
  }
  return { ...result, periodLabel: range.label };
}

// ─── Exports ───

function csvEscape(v: unknown): string {
  return `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
}

/** Download the report as CSV. */
export function exportReportCsv(result: ReportResult, filenamePrefix: string): void {
  const header = result.columns.map((c) => csvEscape(c.label)).join(',');
  const lines = result.rows.map((row) =>
    result.columns.map((c) => csvEscape(row[c.key])).join(',')
  );
  const meta = [`"${result.title} — ${result.periodLabel}"`, `"Generated ${fmtDate(result.generatedAt)}"`, ''];
  const csv = [...meta, header, ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filenamePrefix}-${result.periodLabel.replace(/\s+/g, '-').toLowerCase()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export the report as PDF through the browser print dialog (the print
 * target can be saved as PDF). Works without extra dependencies; in Tauri
 * the webview print dialog is used when available.
 */
export function exportReportPdf(result: ReportResult): void {
  const esc = (v: unknown) =>
    String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const head = result.columns.map((c) => `<th>${esc(c.label)}</th>`).join('');
  const body = result.rows
    .map((row) => `<tr>${result.columns.map((c) => `<td>${esc(row[c.key])}</td>`).join('')}</tr>`)
    .join('');
  const summaryHtml = result.summary
    .map((s) => `<div class="chip"><strong>${esc(s.label)}:</strong> ${esc(s.value)}</div>`)
    .join('');

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(result.title)}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 32px; color: #111827; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .meta { color: #6b7280; font-size: 12px; margin-bottom: 16px; }
  .chips { margin-bottom: 16px; }
  .chip { display: inline-block; border: 1px solid #e5e7eb; border-radius: 8px; padding: 4px 10px; margin: 0 8px 8px 0; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #f3f4f6; text-align: left; padding: 6px 8px; border: 1px solid #e5e7eb; text-transform: uppercase; letter-spacing: 0.03em; }
  td { padding: 5px 8px; border: 1px solid #e5e7eb; }
  tr:nth-child(even) td { background: #fafafa; }
</style>
</head>
<body onload="window.print()">
  <h1>${esc(result.title)}</h1>
  <div class="meta">Period: ${esc(result.periodLabel || 'All time')} · Generated ${esc(fmtDate(result.generatedAt))}</div>
  <div class="chips">${summaryHtml}</div>
  <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (!w) {
    alert('Allow pop-ups to export the PDF, or use Export CSV instead.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
