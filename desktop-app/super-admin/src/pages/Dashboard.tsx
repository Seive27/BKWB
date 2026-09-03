import React, { useEffect, useState } from 'react';
import {
  Users,
  AlertTriangle,
  CheckCircle,
  Ticket,
  Database,
  RefreshCcw,
  ExternalLink,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import { useAnalytics } from '../hooks/useAnalytics';
import { getAuditLogs } from '../services/auditLogService';
import { getSystemSettings } from '../services/systemSettingsService';
import type { AuditLogEntry, SystemSetting } from '../types';

interface DashboardProps {
  /** Optional navigation callback, e.g. jump to the audit logs page. */
  onNavigate?: (route: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { data, loading, error, refresh } = useAnalytics(7);
  const [recentLogs, setRecentLogs] = useState<AuditLogEntry[]>([]);
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [sectionError, setSectionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getAuditLogs({ limit: 8 }), getSystemSettings()])
      .then(([logs, settingsData]) => {
        if (cancelled) return;
        setRecentLogs(logs);
        setSettings(settingsData);
      })
      .catch((err) => {
        if (!cancelled) {
          setSectionError(err instanceof Error ? err.message : 'Failed to load dashboard data.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = data?.summary;
  const totalUsers = summary
    ? summary.totalResidents + summary.totalStaff + summary.totalMeterReaders
    : 0;
  const totalTickets = summary
    ? summary.tickets.open + summary.tickets.assigned + summary.tickets.in_progress + summary.tickets.resolved + summary.tickets.closed
    : 0;
  const openTickets = summary?.tickets.open ?? 0;
  const activeStaff = summary?.activeStaff ?? 0;
  const pendingReadings = summary
    ? summary.readings.assigned + summary.readings.pending_review
    : 0;

  // User activity trend: audit log entries per day (last 7 days).
  const activityByDay = (() => {
    const days: { key: string; label: string; value: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      days.push({
        key: d.toDateString(),
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        value: 0,
      });
    }
    recentLogs.forEach((log) => {
      const dayKey = new Date(log.created_at).toDateString();
      const target = days.find((d) => d.key === dayKey);
      if (target) target.value += 1;
    });
    return days;
  })();

  const maxActivity = Math.max(...activityByDay.map((d) => d.value), 1);

  const getSettingMeta = (setting: SystemSetting) => {
    const value = setting.value as string | number | boolean;
    return {
      name: setting.label ?? setting.key.replace(/_/g, ' '),
      description: setting.description ?? setting.category,
      display: String(value),
      isConfigured: value !== '' && value !== null && value !== undefined,
    };
  };

  const getStatusColor = (action: string) => {
    switch (action) {
      case 'login':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'logout':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'create':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'delete':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'update':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusText = (log: AuditLogEntry) => {
    return log.action.charAt(0).toUpperCase() + log.action.slice(1);
  };

  const formatTimestamp = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/50">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Super Admin Console</h1>
            <div className="flex items-center space-x-2 text-xs text-slate-500 mt-1">
              <div className="flex items-center space-x-1.5 text-emerald-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>All subsystems operational</span>
              </div>
              <span>•</span>
              <span>Live production telemetry</span>
            </div>
          </div>
          <button
            onClick={() => {
              refresh();
              Promise.all([getAuditLogs({ limit: 8 }), getSystemSettings()])
                .then(([logs, settingsData]) => {
                  setRecentLogs(logs);
                  setSettings(settingsData);
                })
                .catch(() => {});
            }}
            className="inline-flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors self-start sm:self-auto"
          >
            <RefreshCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Sync Data</span>
          </button>
        </div>

        {(error || sectionError) && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg px-4 py-2.5 text-xs">
            {error ?? sectionError}
          </div>
        )}

        {loading && !data ? (
          <div className="py-20 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
              <Database className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-xs font-semibold text-slate-700">Loading system metrics…</p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Accounts</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <h2 className="text-2xl font-bold text-slate-900">{totalUsers.toLocaleString()}</h2>
                  <span className="text-[10px] text-slate-400 font-medium">All User Roles</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-center">
                  <div>
                    <p className="text-[10px] text-slate-400">Residents</p>
                    <p className="text-xs font-bold text-blue-600">{summary?.totalResidents.toLocaleString() ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Staff</p>
                    <p className="text-xs font-bold text-slate-700">{activeStaff.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Readers</p>
                    <p className="text-xs font-bold text-slate-700">{summary?.totalMeterReaders.toLocaleString() ?? 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Open Tickets</span>
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <h2 className="text-2xl font-bold text-slate-900">{openTickets.toString().padStart(2, '0')}</h2>
                  <span className="text-[10px] text-rose-600 font-semibold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200/60">
                    Needs Action
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-100">
                  {totalTickets.toLocaleString()} total lifecycle requests
                </p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pending Readings</span>
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Ticket className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <h2 className="text-2xl font-bold text-slate-900">{pendingReadings.toLocaleString()}</h2>
                  <span className="text-[10px] text-purple-600 font-semibold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200/60">
                    Review Queue
                  </span>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs">
                  <span className="text-slate-400 text-[11px]">Approved: <strong className="text-emerald-600">{summary?.readings.approved.toLocaleString() ?? 0}</strong></span>
                  <span className="text-slate-400 text-[11px]">Rejected: <strong className="text-rose-600">{summary?.readings.rejected.toLocaleString() ?? 0}</strong></span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Bulletins</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <h2 className="text-2xl font-bold text-slate-900">{summary?.totalAnnouncements.toLocaleString() ?? 0}</h2>
                  <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                    Active
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-100">
                  Published public service advisories
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* User Activity Trends (from audit logs) */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">System Activity Trends</h3>
                    <p className="text-[11px] text-slate-500">Audit logs recorded over the last 7 days</p>
                  </div>
                  <Activity className="w-4 h-4 text-slate-400" />
                </div>

                <div className="h-44 flex items-end justify-between gap-2 pt-2">
                  {activityByDay.map((dataPoint, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center h-full justify-end group">
                      <div className="w-full max-w-[32px] bg-slate-100 rounded-t-md h-full flex items-end overflow-hidden">
                        <div
                          className="w-full bg-blue-600 group-hover:bg-blue-700 transition-all rounded-t-md"
                          style={{ height: `${Math.max((dataPoint.value / maxActivity) * 100, 4)}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 mt-2">{dataPoint.label}</span>
                    </div>
                  ))}
                </div>

                <p className="text-[10px] text-slate-400 text-center mt-3 pt-2 border-t border-slate-100">
                  {recentLogs.length === 0
                    ? 'No audit events recorded yet.'
                    : `Aggregated from ${recentLogs.length} recent system audit events.`}
                </p>
              </div>

              {/* Global Settings Status (real system_settings) */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">System Settings Status</h3>
                    <p className="text-[11px] text-slate-500">Configured runtime parameters ({settings.length})</p>
                  </div>
                  <ShieldCheck className="w-4 h-4 text-slate-400" />
                </div>

                <div className="space-y-2">
                  {settings.length === 0 ? (
                    <div className="text-center py-8">
                      <Database className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-500">No system settings configured yet.</p>
                    </div>
                  ) : (
                    settings.slice(0, 5).map((setting) => {
                      const meta = getSettingMeta(setting);
                      return (
                        <div key={setting.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="flex items-center space-x-2.5 truncate">
                            <div className="w-7 h-7 bg-white rounded-md border border-slate-200/80 flex items-center justify-center shrink-0">
                              <Database className="w-3.5 h-3.5 text-blue-600" />
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-semibold text-slate-800 capitalize truncate">{meta.name}</p>
                              <p className="text-[10px] text-slate-400 truncate">{meta.description}</p>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border uppercase shrink-0 ${
                              meta.isConfigured ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            {meta.isConfigured ? 'Configured' : 'Not set'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Recent Activity Log (real audit_logs) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Recent Activity Log</h3>
                  <p className="text-[11px] text-slate-500">Immutable audit ledger events</p>
                </div>
                <button
                  onClick={() => onNavigate?.('audit-logs')}
                  className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <span>VIEW ALL LOGS</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/80 border-b border-slate-200/80">
                    <tr>
                      <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Timestamp</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">User</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Module</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {recentLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-xs text-slate-400">
                          No audit events recorded yet.
                        </td>
                      </tr>
                    ) : (
                      recentLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-slate-500">{formatTimestamp(log.created_at)}</td>
                          <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900">
                            {log.user ? `${log.user.first_name} ${log.user.last_name}` : 'System'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-slate-800">
                            {log.description ?? log.action}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-slate-500 capitalize">{log.module}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full border uppercase ${getStatusColor(log.action)}`}>
                              {getStatusText(log)}
                            </span>
                          </td>
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

export default Dashboard;
