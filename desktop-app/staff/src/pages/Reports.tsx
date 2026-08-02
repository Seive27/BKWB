import React, { useCallback, useEffect, useState } from 'react';
import {
  Users,
  Ticket,
  ClipboardList,
  Megaphone,
  Download,
  RefreshCcw,
  TrendingUp,
} from 'lucide-react';
import type { Ticket as TicketRecord, MeterReading as MeterReadingRecord } from '../types';
import { TICKET_STATUS_LABELS, METER_READING_STATUS_LABELS } from '../types';
import { useAnalytics } from '../hooks/useAnalytics';
import { getTickets } from '../services/ticketService';
import { getMeterReadings } from '../services/meterReadingService';

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  assigned: 'bg-purple-100 text-purple-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-700',
  pending_review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  billed: 'bg-indigo-100 text-indigo-700',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const v = r[h];
          return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
        })
        .join(',')
    ),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const Reports: React.FC = () => {
  const { data, loading, error, refresh } = useAnalytics(30);
  const [recentTickets, setRecentTickets] = useState<TicketRecord[]>([]);
  const [recentReadings, setRecentReadings] = useState<MeterReadingRecord[]>([]);
  const [listError, setListError] = useState<string | null>(null);

  const loadLists = useCallback(async () => {
    try {
      const [tickets, readings] = await Promise.all([
        getTickets({ limit: 10 }),
        getMeterReadings({ limit: 10 }),
      ]);
      setRecentTickets(tickets);
      setRecentReadings(readings);
      setListError(null);
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Failed to load recent activity.');
    }
  }, []);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  const summary = data?.summary;
  const totalTickets = summary
    ? summary.tickets.open + summary.tickets.assigned + summary.tickets.in_progress + summary.tickets.resolved + summary.tickets.closed
    : 0;
  const totalReadings = summary
    ? summary.readings.assigned + summary.readings.pending_review + summary.readings.approved + summary.readings.rejected + summary.readings.billed
    : 0;

  const handleExportTickets = () => {
    downloadCsv(
      'tickets-report.csv',
      recentTickets.map((t) => ({
        ticket_number: t.ticket_number,
        subject: t.subject,
        resident: t.resident ? t.resident.first_name + ' ' + t.resident.last_name : '',
        status: TICKET_STATUS_LABELS[t.status],
        priority: t.priority,
        created: formatDate(t.created_at),
      }))
    );
  };

  const handleExportReadings = () => {
    downloadCsv(
      'meter-readings-report.csv',
      recentReadings.map((r) => ({
        account: r.account?.account_number ?? '',
        resident: r.resident ? r.resident.first_name + ' ' + r.resident.last_name : '',
        status: METER_READING_STATUS_LABELS[r.status],
        reading_date: r.reading_date ? formatDate(r.reading_date) : '',
        consumption: r.consumption ?? '',
        created: formatDate(r.created_at),
      }))
    );
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Reports</h1>
            <p className="text-gray-600">Operational reports generated from live system data.</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                refresh();
                loadLists();
              }}
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCcw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleExportTickets}
              disabled={recentTickets.length === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm font-medium">Export CSV</span>
            </button>
          </div>
        </div>

        {error && <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}
        {listError && <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{listError}</div>}

        {loading && !data ? (
          <div className="py-20 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
              <TrendingUp className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900">Loading reports…</p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-3">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-xs text-gray-600 uppercase font-medium mb-1">Total Residents</p>
                <h3 className="text-2xl font-bold text-gray-900">{(summary?.totalResidents ?? 0).toLocaleString()}</h3>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center mb-3">
                  <Ticket className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-xs text-gray-600 uppercase font-medium mb-1">Total Tickets</p>
                <h3 className="text-2xl font-bold text-gray-900">{totalTickets.toLocaleString()}</h3>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="w-10 h-10 bg-cyan-50 rounded-lg flex items-center justify-center mb-3">
                  <ClipboardList className="w-5 h-5 text-cyan-600" />
                </div>
                <p className="text-xs text-gray-600 uppercase font-medium mb-1">Total Readings</p>
                <h3 className="text-2xl font-bold text-gray-900">{totalReadings.toLocaleString()}</h3>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center mb-3">
                  <Megaphone className="w-5 h-5 text-orange-600" />
                </div>
                <p className="text-xs text-gray-600 uppercase font-medium mb-1">Announcements</p>
                <h3 className="text-2xl font-bold text-gray-900">{(summary?.totalAnnouncements ?? 0).toLocaleString()}</h3>
              </div>
            </div>

            {/* Recent Tickets */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900">Recent Tickets</h3>
                <button onClick={handleExportTickets} className="text-sm text-blue-600 hover:text-blue-700 font-medium">Export →</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ticket</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Resident</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {recentTickets.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">No tickets found.</td>
                      </tr>
                    ) : (
                      recentTickets.map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-3">
                            <div className="text-sm font-medium text-gray-900">{t.ticket_number}</div>
                            <div className="text-xs text-gray-500">{t.subject}</div>
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-700">
                            {t.resident ? t.resident.first_name + ' ' + t.resident.last_name : '—'}
                          </td>
                          <td className="px-6 py-3">
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[t.status] ?? 'bg-gray-100 text-gray-700'}`}>
                              {TICKET_STATUS_LABELS[t.status]}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-700 capitalize">{t.priority}</td>
                          <td className="px-6 py-3 text-sm text-gray-500">{formatDate(t.created_at)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

     
            {/* Recent Readings */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900">Recent Meter Readings</h3>
                <button onClick={handleExportReadings} className="text-sm text-blue-600 hover:text-blue-700 font-medium">Export →</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Account</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Resident</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Consumption</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {recentReadings.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">No meter readings found.</td>
                      </tr>
                    ) : (
                      recentReadings.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-3 text-sm font-medium text-gray-900">{r.account?.account_number ?? '—'}</td>
                          <td className="px-6 py-3 text-sm text-gray-700">
                            {r.resident ? r.resident.first_name + ' ' + r.resident.last_name : '—'}
                          </td>
                          <td className="px-6 py-3">
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-700'}`}>
                              {METER_READING_STATUS_LABELS[r.status]}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-700">{r.consumption ?? '—'}</td>
                          <td className="px-6 py-3 text-sm text-gray-500">{formatDate(r.created_at)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Reports;
