import React, { useEffect, useState } from 'react';
import {
  Users,
  AlertTriangle,
  CheckCircle,
  Ticket,
  Database,
  RefreshCcw,
  ExternalLink,
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
        return 'bg-green-100 text-green-700';
      case 'logout':
        return 'bg-blue-100 text-blue-700';
      case 'create':
        return 'bg-purple-100 text-purple-700';
      case 'delete':
        return 'bg-red-100 text-red-700';
      case 'update':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-gray-100 text-gray-700';
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
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Super Admin Dashboard</h1>
            <div className="flex items-center space-x-2 text-sm">
              <div className="flex items-center space-x-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-gray-600">All systems operational</span>
              </div>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500">Live data from the current database</span>
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
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCcw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>

        {(error || sectionError) && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error ?? sectionError}
          </div>
        )}

        {loading && !data ? (
          <div className="py-20 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
              <Database className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900">Loading dashboard…</p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <span className="text-sm text-gray-600 uppercase font-medium">Total Users</span>
                    </div>
                    <h2 className="text-4xl font-bold text-gray-900">{totalUsers.toLocaleString()}</h2>
                    <div className="flex items-center space-x-4 mt-3">
                      <div>
                        <p className="text-xs text-gray-500">Residents</p>
                        <p className="text-sm font-semibold text-blue-600">{summary?.totalResidents.toLocaleString() ?? 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Staff + Admins</p>
                        <p className="text-sm font-semibold text-gray-600">{activeStaff.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Meter Readers</p>
                        <p className="text-sm font-semibold text-gray-600">{summary?.totalMeterReaders.toLocaleString() ?? 0}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      </div>
                      <span className="text-sm text-gray-600 uppercase font-medium">Open Tickets</span>
                    </div>
                    <h2 className="text-4xl font-bold text-gray-900">{openTickets.toString().padStart(2, '0')}</h2>
                    <p className="text-sm text-red-600 mt-3 font-medium">
                      {totalTickets.toLocaleString()} total tickets in the system
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                        <Ticket className="w-5 h-5 text-purple-600" />
                      </div>
                      <span className="text-sm text-gray-600 uppercase font-medium">Assigned Readings</span>
                    </div>
                    <h2 className="text-4xl font-bold text-gray-900">{pendingReadings.toLocaleString()}</h2>
                    <div className="flex items-center space-x-4 mt-3">
                      <div>
                        <p className="text-xs text-gray-500">Approved</p>
                        <p className="text-sm font-semibold text-green-600">{summary?.readings.approved.toLocaleString() ?? 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Rejected</p>
                        <p className="text-sm font-semibold text-red-600">{summary?.readings.rejected.toLocaleString() ?? 0}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <span className="text-sm text-gray-600 uppercase font-medium">Announcements</span>
                    </div>
                    <h2 className="text-4xl font-bold text-gray-900">{summary?.totalAnnouncements.toLocaleString() ?? 0}</h2>
                    <p className="text-sm text-gray-500 mt-3 font-medium">Published announcements</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* User Activity Trends (from audit logs) */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-base font-semibold text-gray-900">System Activity Trends</h3>
                  <span className="text-xs text-gray-500">Audit events (last 7 days)</span>
                </div>

                <div className="h-64 flex items-end justify-between space-x-3">
                  {activityByDay.map((dataPoint, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div className="w-full relative" style={{ height: '200px' }}>
                        <div
                          className="absolute bottom-0 w-full bg-blue-500 rounded-t-lg transition-all duration-300 hover:bg-blue-600"
                          style={{ height: `${(dataPoint.value / maxActivity) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500 mt-2">{dataPoint.label}</span>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-gray-500 text-center mt-4">
                  {recentLogs.length === 0
                    ? 'No audit events recorded yet.'
                    : `Based on the ${recentLogs.length} most recent audit events.`}
                </p>
              </div>

              {/* Global Settings Status (real system_settings) */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-base font-semibold text-gray-900">System Settings Status</h3>
                  <span className="text-xs text-gray-500">{settings.length} settings</span>
                </div>

                <div className="space-y-4">
                  {settings.length === 0 ? (
                    <div className="text-center py-10">
                      <Database className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">No system settings configured yet.</p>
                    </div>
                  ) : (
                    settings.slice(0, 6).map((setting) => {
                      const meta = getSettingMeta(setting);
                      return (
                        <div key={setting.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                              <Database className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900 capitalize">{meta.name}</p>
                              <p className="text-xs text-gray-500">{meta.description}</p>
                            </div>
                          </div>
                          <span
                            className={`px-3 py-1 text-xs font-semibold rounded-full uppercase ${
                              meta.isConfigured ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
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
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900">Recent Activity Log</h3>
                <button
                  onClick={() => onNavigate?.('audit-logs')}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
                >
                  <span>VIEW ALL LOGS</span>
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Timestamp</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Module</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {recentLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <p className="text-sm text-gray-500">No audit events recorded yet.</p>
                        </td>
                      </tr>
                    ) : (
                      recentLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatTimestamp(log.created_at)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-900">
                                {log.user ? `${log.user.first_name} ${log.user.last_name}` : 'System'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {log.description ?? log.action}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">{log.module}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full uppercase ${getStatusColor(log.action)}`}>
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
