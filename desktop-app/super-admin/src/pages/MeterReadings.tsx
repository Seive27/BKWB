import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Gauge,
  Droplet,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  FileText,
} from 'lucide-react';
import { useMeterReadings } from '../hooks/useMeterReadings';
import {
  MeterReadingStatus,
  METER_READING_STATUS_LABELS,
} from '../types';

type StatusFilter = 'all' | MeterReadingStatus;

const statusStyles: Record<MeterReadingStatus, { bg: string; text: string; dot: string }> = {
  assigned: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  pending_review: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  approved: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  billed: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
};

function fullName(person?: { first_name: string; last_name: string } | null): string {
  if (!person) return 'Unknown resident';
  return `${person.first_name} ${person.last_name}`.trim();
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatNumber(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('en-US');
}

const MeterReadings: React.FC = () => {
  const { readings, loading, refreshing, error, refresh } = useMeterReadings();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const stats = useMemo(() => {
    let assigned = 0;
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    for (const r of readings) {
      if (r.status === 'assigned') assigned += 1;
      else if (r.status === 'pending_review') pending += 1;
      else if (r.status === 'approved') approved += 1;
      else if (r.status === 'rejected') rejected += 1;
    }
    return { assigned, pending, approved, rejected };
  }, [readings]);

  const filteredReadings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return readings.filter((r) => {
      const matchesSearch =
        q.length === 0 ||
        fullName(r.resident).toLowerCase().includes(q) ||
        (r.account?.account_number ?? '').toLowerCase().includes(q) ||
        (r.meter?.meter_number ?? '').toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [readings, searchQuery, statusFilter]);

  // Keep the search/filter changes responsive.
  useEffect(() => {}, [statusFilter, searchQuery]);

  const getStatusBadge = (status: MeterReadingStatus) => {
    const s = statusStyles[status];
    return (
      <span
        className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        <span>{METER_READING_STATUS_LABELS[status]}</span>
      </span>
    );
  };

  const selectStyles =
    'px-3 py-2 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white text-gray-700';

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Meter Readings</h1>
          <p className="text-gray-600">
            Read-only monitoring of the meter reading workflow across all accounts.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">ASSIGNED</p>
            <h3 className="text-3xl font-bold text-gray-900">{stats.assigned}</h3>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center">
                <Gauge className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">PENDING REVIEW</p>
            <h3 className="text-3xl font-bold text-gray-900">{stats.pending}</h3>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">APPROVED</p>
            <h3 className="text-3xl font-bold text-gray-900">{stats.approved}</h3>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">REJECTED</p>
            <h3 className="text-3xl font-bold text-gray-900">{stats.rejected}</h3>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-xl border border-gray-200">
          {/* Table Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by resident, account, or meter"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-96 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className={selectStyles}
              >
                <option value="all">All Statuses</option>
                {(Object.keys(METER_READING_STATUS_LABELS) as MeterReadingStatus[]).map((st) => (
                  <option key={st} value={st}>
                    {METER_READING_STATUS_LABELS[st]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Resident
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Meter
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Meter Reader
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Assigned
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Consumption
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`sk-${i}`} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="h-3 bg-gray-200 rounded w-32" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-3 bg-gray-200 rounded w-20" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-3 bg-gray-200 rounded w-20" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-3 bg-gray-200 rounded w-24" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-3 bg-gray-200 rounded w-24" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-3 bg-gray-200 rounded w-14" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded-full w-20" />
                      </td>
                    </tr>
                  ))
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-6 h-6 text-red-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">
                        Couldn't load meter readings
                      </h3>
                      <p className="text-xs text-gray-500 mb-4">{error}</p>
                      <button
                        onClick={() => refresh()}
                        className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all text-sm font-medium"
                      >
                        <Loader2 className="w-4 h-4" />
                        <span>Try Again</span>
                      </button>
                    </td>
                  </tr>
                ) : filteredReadings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-6 h-6 text-gray-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">
                        {readings.length === 0 ? 'No meter readings yet' : 'No matching readings'}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {readings.length === 0
                          ? 'Assignments made by staff will appear here.'
                          : 'Try adjusting your search or filters'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredReadings.map((reading) => (
                    <tr key={reading.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {fullName(reading.resident)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {reading.account?.account_number ?? '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {reading.meter?.meter_number ?? '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {fullName(reading.meter_reader) || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(reading.assignment_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatNumber(reading.consumption)} m³
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(reading.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          {!loading && !error && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {filteredReadings.length} of {readings.length} readings
                {refreshing && (
                  <Loader2 className="ml-2 inline w-3.5 h-3.5 text-primary-500 animate-spin" />
                )}
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <Droplet className="w-4 h-4" />
                <span>Read-only view</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MeterReadings;
