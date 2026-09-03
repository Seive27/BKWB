import React, { useState } from 'react';
import { Search } from 'lucide-react';
import {
  MeterReading,
  MeterReadingStatus,
  METER_READING_STATUS_LABELS,
} from '../../types';

interface MeterReadingsTableProps {
  readings: MeterReading[];
}

function fullName(person?: { first_name: string; last_name: string } | null): string {
  if (!person) return 'Unknown resident';
  return `${person.first_name} ${person.last_name}`.trim();
}

function formatNumber(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('en-US');
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const statusStyles: Record<MeterReadingStatus, { bg: string; text: string; border: string }> = {
  assigned: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  pending_review: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  rejected: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  billed: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
};

const MeterReadingsTable: React.FC<MeterReadingsTableProps> = ({ readings }) => {
  const [query, setQuery] = useState('');

  const filtered = readings.filter((r) => {
    if (!query) return true;
    const q = query.toLowerCase();
    const name = fullName(r.resident).toLowerCase();
    const meter = (r.meter?.meter_number ?? '').toLowerCase();
    return name.includes(q) || meter.includes(q);
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Recent Meter Readings</h2>
          <p className="text-[11px] text-slate-500">Live operational stream of latest readings</p>
        </div>
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter readings..."
            className="w-full pl-8 pr-3 py-1 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50/80 border-b border-slate-200/80 sticky top-0">
            <tr>
              <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Resident
              </th>
              <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Meter No.
              </th>
              <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Consumption
              </th>
              <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Assigned
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-xs text-slate-400">
                  {query ? 'No readings match your search.' : 'No meter readings recorded yet.'}
                </td>
              </tr>
            ) : (
              filtered.map((reading) => {
                const s = statusStyles[reading.status];
                return (
                  <tr key={reading.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-semibold text-slate-900">
                        {fullName(reading.resident)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                      {reading.meter?.meter_number ?? '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-semibold text-slate-800">
                      {formatNumber(reading.consumption)} m³
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full border ${s.bg} ${s.text} ${s.border}`}
                      >
                        {METER_READING_STATUS_LABELS[reading.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                      {formatDate(reading.assignment_date)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MeterReadingsTable;
