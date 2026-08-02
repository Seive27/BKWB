import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Download,
  Radio,
  ChevronRight,
  RefreshCcw,
  Search,
  ShieldCheck,
  Inbox,
} from 'lucide-react';
import type { AuditLogEntry, AuditLogQueryOptions } from '../types';
import { AUDIT_MODULES } from '../types';
import { useAuditLogs } from '../hooks/useAuditLogs';
import { exportAuditLogsToCsv } from '../services/auditLogService';

interface AuditLogsProps {
  onNavigateToConsole: () => void;
}

function moduleLabel(module: string): string {
  const labels: Record<string, string> = {
    auth: 'Authentication',
    announcements: 'Announcements',
    tickets: 'Tickets',
    meter_readings: 'Meter Readings',
    residents: 'Residents',
    system_settings: 'System Settings',
  };
  return labels[module] ?? module;
}

function actionColor(action: string): string {
  const map: Record<string, string> = {
    login: 'bg-blue-50 text-blue-700 border-blue-200',
    logout: 'bg-gray-50 text-gray-700 border-gray-200',
    create: 'bg-green-50 text-green-700 border-green-200',
    update: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    delete: 'bg-red-50 text-red-700 border-red-200',
    assign: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    resolve: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    close: 'bg-slate-50 text-slate-700 border-slate-200',
    approved: 'bg-green-50 text-green-700 border-green-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    submitted: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    pending_review: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  };
  return map[action] ?? 'bg-gray-50 text-gray-700 border-gray-200';
}

/** Avatar initials for a log's actor. Safe against missing/empty names. */
function userInitials(user: AuditLogEntry['user'] | null | undefined): string {
  if (!user) return 'S';
  const first = (user.first_name ?? '').trim();
  const last = (user.last_name ?? '').trim();
  return (((first[0] ?? '') + (last[0] ?? '')).toUpperCase() || 'S');
}

/** Full display name for a log's actor. Safe against missing/empty names. */
function userName(user: AuditLogEntry['user'] | null | undefined): string {
  if (!user) return 'System';
  const name = [user.first_name, user.last_name].filter((n) => n && n.trim()).join(' ').trim();
  return name || 'Unknown User';
}

function formatTimestamp(iso: string): { date: string; time: string } {
  const date = new Date(iso);
  return {
    date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
  };
}

const AuditLogs: React.FC<AuditLogsProps> = ({ onNavigateToConsole }) => {
  const [module, setModule] = useState<string>('');
  const [action, setAction] = useState<string>('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const options = useMemo<AuditLogQueryOptions>(() => {
    const opts: AuditLogQueryOptions = {
      module: module || null,
      action: action || null,
      search: debouncedSearch || null,
      orderDirection,
      limit: 200,
    };
    if (fromDate) opts.from = new Date(fromDate).toISOString();
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      opts.to = end.toISOString();
    }
    return opts;
  }, [module, action, debouncedSearch, fromDate, toDate, orderDirection]);

  const { logs, loading, error, refresh } = useAuditLogs(options);

  // Debounce the search input to avoid a query per keystroke.
  const [searchTimer, setSearchTimer] = React.useState<number | null>(null);
  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimer !== null) window.clearTimeout(searchTimer);
    setSearchTimer(window.setTimeout(() => setDebouncedSearch(value.trim()), 350));
  };

  const clearFilters = () => {
    setModule('');
    setAction('');
    setSearch('');
    setDebouncedSearch('');
    setFromDate('');
    setToDate('');
  };

  const hasFilters = module || action || debouncedSearch || fromDate || toDate;

  const handleExport = () => {
    exportAuditLogsToCsv(logs, 'audit-logs-' + new Date().toISOString().slice(0, 10) + '.csv');
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
            <p className="text-sm text-gray-600 mt-1">
              Immutable record of all system activities, changes, and security events.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleExport}
              disabled={logs.length === 0}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm font-medium">Export CSV</span>
            </button>
            <button
              onClick={onNavigateToConsole}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Radio className="w-4 h-4" />
              <span className="text-sm font-medium">Live Monitoring</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search description..."
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Module */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Module</label>
            <select
              value={module}
              onChange={(e) => setModule(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Modules</option>
              {AUDIT_MODULES.map((m) => (
                <option key={m} value={m}>{moduleLabel(m)}</option>
              ))}
            </select>
          </div>

          {/* Action */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Action</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Actions</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="assign">Assign</option>
              <option value="resolve">Resolve</option>
              <option value="close">Close</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-2">From / To</label>
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-400">–</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={clearFilters}
            disabled={!hasFilters}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1 disabled:opacity-40"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            <span>Clear All Filters</span>
          </button>
          <button
            onClick={() => setOrderDirection(orderDirection === 'desc' ? 'asc' : 'desc')}
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center space-x-1"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Sort: {orderDirection === 'desc' ? 'Newest first' : 'Oldest first'}</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-8 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Module</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
                      <ShieldCheck className="w-7 h-7 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-900">Loading audit logs…</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Inbox className="w-7 h-7 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-900">No audit entries found</p>
                    <p className="text-xs text-gray-500 mt-1">Try adjusting your filters.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const ts = formatTimestamp(log.created_at);
                  const isExpanded = expandedId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{ts.date}</div>
                          <div className="text-xs text-gray-500">{ts.time}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                              {userInitials(log.user)}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {userName(log.user)}
                              </div>
                              <div className="text-xs text-gray-500">{log.role_name ?? ''}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{moduleLabel(log.module)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${actionColor(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-700">{log.description ?? '—'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : log.id)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <ChevronRight className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-gray-50">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">New Value</p>
                                <pre className="bg-gray-900 text-gray-100 text-xs rounded-lg p-3 overflow-auto max-h-48">
                                  {log.new_value ? JSON.stringify(log.new_value, null, 2) : '—'}
                                </pre>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Old Value</p>
                                <pre className="bg-gray-900 text-gray-100 text-xs rounded-lg p-3 overflow-auto max-h-48">
                                  {log.old_value ? JSON.stringify(log.old_value, null, 2) : '—'}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>

          <div className="bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing <span className="font-medium">{logs.length}</span> entries
            </div>
            <button
              onClick={refresh}
              className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
