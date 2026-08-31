import React, { useMemo, useState } from 'react';
import {
  Users,
  Ticket,
  Megaphone,
  UserCheck,
  Download,
  RefreshCcw,
  TrendingUp,
  ClipboardList,
} from 'lucide-react';
import type { AnalyticsData, TrendPoint } from '../types';
import { useAnalytics } from '../hooks/useAnalytics';
import { TICKET_STATUS_LABELS, METER_READING_STATUS_LABELS } from '../types';
import type { TicketStatus, MeterReadingStatus } from '../types';

const PERIODS = [
  { days: 7, label: '7D' },
  { days: 30, label: '30D' },
  { days: 90, label: '90D' },
];

function LineChart({ data, color }: { data: TrendPoint[]; color: string }) {
  const width = 600;
  const height = 180;
  const max = Math.max(...data.map((d) => d.value), 1);
  const points = data.map((d, i) => ({
    x: (i / Math.max(data.length - 1, 1)) * width,
    y: height - (d.value / max) * (height - 20) - 10,
  }));
  const line = points.map((p, i) => (i === 0 ? 'M' : 'L') + p.x + ' ' + p.y).join(' ');
  const area = line + ' L' + width + ' ' + height + ' L0 ' + height + ' Z';
  const id = 'grad-' + color.replace('#', '');

  return (
    <svg viewBox={'0 0 ' + width + ' ' + height} preserveAspectRatio="none" className="w-full h-full">
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={'url(#' + id + ')'} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="white" stroke={color} strokeWidth="2">
          <title>{data[i].label + ': ' + data[i].value}</title>
        </circle>
      ))}
    </svg>
  );
}

function BarChart({ data, color }: { data: TrendPoint[]; color: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end justify-between gap-1 h-full">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
          <div
            className="w-full rounded-t"
            style={{
              height: Math.max((d.value / max) * 100, d.value > 0 ? 6 : 0) + '%',
              backgroundColor: color,
              opacity: 0.85,
            }}
            title={d.label + ': ' + d.value}
          ></div>
        </div>
      ))}
    </div>
  );
}

function TrendCard({
  title,
  subtitle,
  data,
  type,
  color,
}: {
  title: string;
  subtitle: string;
  data: TrendPoint[];
  type: 'line' | 'bar';
  color: string;
}) {
  const labels = data.length > 8 ? data.filter((_, i) => i % Math.ceil(data.length / 8) === 0).map((d) => d.label) : data.map((d) => d.label);
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="h-48">
        {type === 'line' ? <LineChart data={data} color={color} /> : <BarChart data={data} color={color} />}
      </div>
      <div className="flex justify-between mt-2">
        {labels.map((l, i) => (
          <span key={i} className="text-[10px] text-gray-400">{l}</span>
        ))}
      </div>
    </div>
  );
}

const TICKET_COLORS: Record<TicketStatus, string> = {
  open: '#3b82f6',
  acknowledged: '#0ea5e9',
  assigned: '#8b5cf6',
  scheduled: '#a855f7',
  in_progress: '#f59e0b',
  work_completed: '#14b8a6',
  resolved: '#10b981',
  closed: '#6b7280',
};

const READING_COLORS: Record<MeterReadingStatus, string> = {
  assigned: '#0ea5e9',
  pending_review: '#f59e0b',
  approved: '#10b981',
  rejected: '#ef4444',
  billed: '#8b5cf6',
};

function exportAnalyticsCsv(data: AnalyticsData) {
  const rows: string[][] = [
    ['Metric', 'Value'],
    ['Total Residents', String(data.summary.totalResidents)],
    ['Active Staff', String(data.summary.activeStaff)],
    ['Meter Readers', String(data.summary.totalMeterReaders)],
    ['Total Announcements', String(data.summary.totalAnnouncements)],
  ];
  (Object.keys(TICKET_STATUS_LABELS) as TicketStatus[]).forEach((s) => {
    rows.push(['Tickets - ' + TICKET_STATUS_LABELS[s], String(data.summary.tickets[s])]);
  });
  (Object.keys(METER_READING_STATUS_LABELS) as MeterReadingStatus[]).forEach((s) => {
    rows.push(['Readings - ' + METER_READING_STATUS_LABELS[s], String(data.summary.readings[s])]);
  });
  rows.push([]);
  rows.push(['Trend', 'Label', 'Value']);
  data.ticketTrends.forEach((p) => rows.push(['Ticket Trends', p.label, String(p.value)]));
  data.readingCompletionTrends.forEach((p) => rows.push(['Reading Submissions', p.label, String(p.value)]));
  data.announcementActivity.forEach((p) => rows.push(['Announcements', p.label, String(p.value)]));
  data.residentGrowth.forEach((p) => rows.push(['Resident Growth', p.label, String(p.value)]));

  const csv = rows.map((r) => r.map((c) => '"' + c.replace(/"/g, '""') + '"').join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'analytics-' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const Analytics: React.FC = () => {
  const [days, setDays] = useState(30);
  const { data, loading, error, refresh } = useAnalytics(days);

  const summary = data?.summary;
  const totalTickets = summary
    ? summary.tickets.open + summary.tickets.assigned + summary.tickets.in_progress + summary.tickets.resolved + summary.tickets.closed
    : 0;
  const totalReadings = summary
    ? summary.readings.assigned + summary.readings.pending_review + summary.readings.approved + summary.readings.rejected + summary.readings.billed
    : 0;

  const statCards = useMemo(() => {
    if (!summary) return [];
    return [
      { label: 'Total Residents', value: summary.totalResidents, icon: Users, color: 'bg-blue-50 text-blue-600' },
      { label: 'Active Staff', value: summary.activeStaff, icon: UserCheck, color: 'bg-green-50 text-green-600' },
      { label: 'Open Tickets', value: summary.tickets.open, icon: Ticket, color: 'bg-purple-50 text-purple-600' },
      { label: 'Assigned Readings', value: summary.readings.assigned, icon: ClipboardList, color: 'bg-cyan-50 text-cyan-600' },
      { label: 'Total Announcements', value: summary.totalAnnouncements, icon: Megaphone, color: 'bg-orange-50 text-orange-600' },
    ];
  }, [summary]);

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
            <p className="text-sm text-gray-600">Live operational analytics from current system data.</p>
          </div>
          <div className="flex items-center space-x-2">
            {PERIODS.map((p) => (
              <button
                key={p.days}
                onClick={() => setDays(p.days)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  days === p.days ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={refresh}
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCcw className="w-4 h-4" />
            </button>
            {data && (
              <button
                onClick={() => exportAnalyticsCsv(data)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ml-2"
              >
                <Download className="w-4 h-4" />
                <span className="text-sm font-medium">Export</span>
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
        )}

        {loading && !data ? (
          <div className="py-20 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
              <TrendingUp className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900">Loading analytics…</p>
          </div>
        ) : data && summary ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
              {statCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${card.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <p className="text-xs text-gray-600 uppercase font-medium mb-1">{card.label}</p>
                    <h3 className="text-3xl font-bold text-gray-900">{card.value.toLocaleString()}</h3>
                  </div>
                );
              })}
            </div>

            {/* Status Breakdowns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-gray-900">Tickets by Status</h3>
                  <span className="text-xs text-gray-500">{totalTickets} total</span>
                </div>
                <div className="space-y-3">
                  {(Object.keys(TICKET_STATUS_LABELS) as TicketStatus[]).map((s) => {
                    const count = summary.tickets[s];
                    const pct = totalTickets > 0 ? Math.round((count / totalTickets) * 100) : 0;
                    return (
                      <div key={s} className="flex items-center space-x-3">
                        <span className="w-24 text-sm text-gray-700">{TICKET_STATUS_LABELS[s]}</span>
                        <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: pct + '%', backgroundColor: TICKET_COLORS[s] }}></div>
                        </div>
                        <span className="w-8 text-sm font-semibold text-gray-900 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-gray-900">Meter Readings by Status</h3>
                  <span className="text-xs text-gray-500">{totalReadings} total</span>
                </div>
                <div className="space-y-3">
                  {(Object.keys(METER_READING_STATUS_LABELS) as MeterReadingStatus[]).map((s) => {
                    const count = summary.readings[s];
                    const pct = totalReadings > 0 ? Math.round((count / totalReadings) * 100) : 0;
                    return (
                      <div key={s} className="flex items-center space-x-3">
                        <span className="w-28 text-sm text-gray-700">{METER_READING_STATUS_LABELS[s]}</span>
                        <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: pct + '%', backgroundColor: READING_COLORS[s] }}></div>
                        </div>
                        <span className="w-8 text-sm font-semibold text-gray-900 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <TrendCard title="Ticket Trends" subtitle={'Tickets created per day (last ' + days + ' days)'} data={data.ticketTrends} type="line" color="#3b82f6" />
              <TrendCard title="Reading Completion" subtitle={'Readings submitted per day (last ' + days + ' days)'} data={data.readingCompletionTrends} type="bar" color="#10b981" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <TrendCard title="Announcement Activity" subtitle={'Announcements published per day (last ' + days + ' days)'} data={data.announcementActivity} type="bar" color="#f59e0b" />
              <TrendCard title="Resident Growth" subtitle={'Cumulative residents (last ' + Math.max(days, 90) + ' days)'} data={data.residentGrowth} type="line" color="#8b5cf6" />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default Analytics;
