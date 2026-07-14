import React, { useState } from 'react';
import {
  Calendar,
  Download,
  Radio,
  ChevronRight,
  RefreshCcw,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface AuditLog {
  id: string;
  timestamp: string;
  date: string;
  time: string;
  userEntity: {
    name: string;
    email: string;
    avatar: string;
  };
  action: {
    type: string;
    icon: 'password' | 'user' | 'login' | 'archive';
    description: string;
  };
  status: 'success' | 'denied' | 'pending';
  origin: {
    ip: string;
    device: string;
    browser: string;
  };
}

interface AuditLogsProps {
  onNavigateToConsole: () => void;
}

const AuditLogs: React.FC<AuditLogsProps> = ({ onNavigateToConsole }) => {
  const [dateRange, setDateRange] = useState('Oct 24 - Oct 31, 2023');
  const [userFocus, setUserFocus] = useState('all-administrators');
  const [actionType, setActionType] = useState('security-access');
  const [deviceId, setDeviceId] = useState('global-network');
  const [currentPage, setCurrentPage] = useState(1);

  // Mock audit logs data
  const auditLogs: AuditLog[] = [
    {
      id: '1',
      timestamp: 'Oct 31, 2023',
      date: 'Oct 31, 2023',
      time: '14:23:16 UTC',
      userEntity: {
        name: 'Jordan Dax',
        email: 'j.dax@wateroffice.io',
        avatar: 'JD',
      },
      action: {
        type: 'System Root Password Change',
        icon: 'password',
        description: 'System Root Password Change',
      },
      status: 'success',
      origin: {
        ip: '192.168.1.44',
        device: 'macOS',
        browser: 'Chrome 118',
      },
    },
    {
      id: '2',
      timestamp: 'Oct 31, 2023',
      date: 'Oct 31, 2023',
      time: '12:15:03 UTC',
      userEntity: {
        name: 'Mila Sonic',
        email: 'm.sonic@superoff.io',
        avatar: 'MS',
      },
      action: {
        type: 'Updated User Permissions',
        icon: 'user',
        description: 'Updated User Permissions',
      },
      status: 'success',
      origin: {
        ip: '45.22.112.9',
        device: 'Linux',
        browser: 'Firefox 115',
      },
    },
    {
      id: '3',
      timestamp: 'Oct 31, 2023',
      date: 'Oct 31, 2023',
      time: '11:42:49 UTC',
      userEntity: {
        name: 'Unknown Entity',
        email: 'Failed Authentication',
        avatar: 'UE',
      },
      action: {
        type: 'SSH Login Attempt',
        icon: 'login',
        description: 'SSH Login Attempt',
      },
      status: 'denied',
      origin: {
        ip: '112.5.88.201',
        device: 'Terminal',
        browser: 'CLI/704',
      },
    },
    {
      id: '4',
      timestamp: 'Oct 31, 2023',
      date: 'Oct 31, 2023',
      time: '08:11:22 UTC',
      userEntity: {
        name: 'Alex Helles',
        email: 'a.helles@core-lit.io',
        avatar: 'AH',
      },
      action: {
        type: 'Archived Audit Logs (2023)',
        icon: 'archive',
        description: 'Archived Audit Logs (2023)',
      },
      status: 'success',
      origin: {
        ip: '88.19.0.211',
        device: 'Windows',
        browser: 'Edge 117',
      },
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'denied':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getActionIcon = (iconType: string) => {
    switch (iconType) {
      case 'password':
        return (
          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-red-600" />
          </div>
        );
      case 'user':
        return (
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <CheckCircle className="w-4 h-4 text-blue-600" />
          </div>
        );
      case 'login':
        return (
          <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
            <XCircle className="w-4 h-4 text-orange-600" />
          </div>
        );
      case 'archive':
        return (
          <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
            <CheckCircle className="w-4 h-4 text-purple-600" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-gray-600" />
          </div>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
            <p className="text-sm text-gray-600 mt-1">
              Immutable record of all administrative activities and security events.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
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
        <div className="grid grid-cols-4 gap-4">
          {/* Date Range */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-2">
              Date Range
            </label>
            <div className="relative">
              <input
                type="text"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg bg-blue-50 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Calendar className="absolute right-3 top-2.5 w-4 h-4 text-blue-600" />
            </div>
          </div>

          {/* User Focus */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-2">
              User Focus
            </label>
            <select
              value={userFocus}
              onChange={(e) => setUserFocus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all-administrators">All Administrators</option>
              <option value="super-admin">Super Admin</option>
              <option value="staff">Staff</option>
              <option value="meter-readers">Meter Readers</option>
            </select>
          </div>

          {/* Action Type */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-2">
              Action Type
            </label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="security-access">Security & Access</option>
              <option value="user-management">User Management</option>
              <option value="system-changes">System Changes</option>
              <option value="data-operations">Data Operations</option>
            </select>
          </div>

          {/* Device/IP */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-2">
              Device/IP
            </label>
            <div className="relative">
              <select
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="global-network">Global Network</option>
                <option value="local-network">Local Network</option>
                <option value="external">External</option>
              </select>
              <RefreshCcw className="absolute right-3 top-2.5 w-4 h-4 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Clear All Filters Button */}
        <div className="mt-4 flex justify-end">
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1">
            <RefreshCcw className="w-3.5 h-3.5" />
            <span>Clear All Filters</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-8 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  User Entity
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Origin (IP/Device)
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  {/* Timestamp */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {log.date}
                        </div>
                        <div className="text-xs text-gray-500">{log.time}</div>
                      </div>
                    </div>
                  </td>

                  {/* User Entity */}
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                        {log.userEntity.avatar}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {log.userEntity.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {log.userEntity.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Action */}
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      {getActionIcon(log.action.icon)}
                      <span className="text-sm text-gray-900">
                        {log.action.description}
                      </span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                        log.status
                      )}`}
                    >
                      {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                    </span>
                  </td>

                  {/* Origin */}
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {log.origin.ip}
                      </div>
                      <div className="text-xs text-gray-500">
                        {log.origin.device} • {log.origin.browser}
                      </div>
                    </div>
                  </td>

                  {/* Details */}
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button className="text-blue-600 hover:text-blue-700">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="bg-white border-t border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing <span className="font-medium">1 to 25</span> of{' '}
                <span className="font-medium">1,248 entries</span>
              </div>
              <div className="flex items-center space-x-2">
                <button className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50">
                  ‹
                </button>
                <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded">
                  1
                </button>
                <button className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded">
                  2
                </button>
                <button className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded">
                  3
                </button>
                <span className="px-2 text-sm text-gray-500">...</span>
                <button className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded">
                  50
                </button>
                <button className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700">
                  ›
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
