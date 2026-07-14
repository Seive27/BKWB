import React, { useState } from 'react';
import {
  Users,
  AlertTriangle,
  CheckCircle,
  Shield,
  Lock,
  Database,
  ExternalLink,
} from 'lucide-react';
import {
  mockDashboardStats,
  mockActivityLogs,
  mockGlobalSettings,
  mockUserActivityData,
} from '../data/mockData';

const Dashboard: React.FC = () => {
  const [stats] = useState(mockDashboardStats);
  const [activityLogs] = useState(mockActivityLogs);
  const [globalSettings] = useState(mockGlobalSettings);
  const [userActivityData] = useState(mockUserActivityData);
  const [activityView, setActivityView] = useState<'daily' | 'weekly'>('daily');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-700';
      case 'modified':
        return 'bg-blue-100 text-blue-700';
      case 'denied':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getUserTypeIcon = (userType: string) => {
    switch (userType) {
      case 'SA':
        return <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded">SA</span>;
      case 'EXT':
        return <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded">EXT</span>;
      default:
        return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded">USER</span>;
    }
  };

  const getSettingIcon = (icon: string) => {
    switch (icon) {
      case 'shield':
        return <Shield className="w-5 h-5 text-blue-600" />;
      case 'lock':
        return <Lock className="w-5 h-5 text-blue-600" />;
      case 'database':
        return <Database className="w-5 h-5 text-blue-600" />;
      default:
        return <CheckCircle className="w-5 h-5 text-blue-600" />;
    }
  };

  // Calculate max value for chart scaling
  const maxValue = Math.max(...userActivityData.map((d) => d.value));

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Super Admin Dashboard</h1>
          <div className="flex items-center space-x-2 text-sm">
            <div className="flex items-center space-x-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-gray-600">All systems operational</span>
            </div>
            <span className="text-gray-400">•</span>
            <span className="text-gray-500">Last check: 2 mins ago</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Total Users Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-sm text-gray-600 uppercase font-medium">Total Users</span>
                </div>
                <h2 className="text-4xl font-bold text-gray-900">{stats.totalUsers.toLocaleString()}</h2>
                <div className="flex items-center space-x-4 mt-3">
                  <div>
                    <p className="text-xs text-gray-500">Active</p>
                    <p className="text-sm font-semibold text-green-600">
                      {stats.activeUsers.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Pending</p>
                    <p className="text-sm font-semibold text-gray-600">
                      {stats.pendingUsers.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Security Alerts Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <span className="text-sm text-gray-600 uppercase font-medium">Security Alerts</span>
                </div>
                <h2 className="text-4xl font-bold text-gray-900">{stats.securityAlerts.toString().padStart(2, '0')}</h2>
                <p className="text-sm text-red-600 mt-3 font-medium">
                  High priority alerts require action
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* User Activity Trends Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-semibold text-gray-900">User Activity Trends</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setActivityView('daily')}
                  className={`px-3 py-1 text-xs font-medium rounded ${
                    activityView === 'daily'
                      ? 'bg-blue-100 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  DAILY
                </button>
                <button
                  onClick={() => setActivityView('weekly')}
                  className={`px-3 py-1 text-xs font-medium rounded ${
                    activityView === 'weekly'
                      ? 'bg-blue-100 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  WEEKLY
                </button>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="h-64 flex items-end justify-between space-x-3">
              {userActivityData.map((data, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full relative" style={{ height: '200px' }}>
                    <div
                      className="absolute bottom-0 w-full bg-blue-500 rounded-t-lg transition-all duration-300 hover:bg-blue-600"
                      style={{ height: `${(data.value / maxValue) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500 mt-2">{data.day}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              System data events aggregated (Last 7 Days)
            </p>
          </div>

          {/* Global Settings Status */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-semibold text-gray-900">Global Settings Status</h3>
            </div>

            <div className="space-y-4">
              {globalSettings.map((setting) => (
                <div
                  key={setting.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      {getSettingIcon(setting.icon)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{setting.name}</p>
                      <p className="text-xs text-gray-500">{setting.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {setting.status === 'enabled' && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full uppercase">
                        Enabled
                      </span>
                    )}
                    {setting.status === 'aes-256' && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                        AES-256
                      </span>
                    )}
                    {setting.status === 'ok' && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                        100% OK
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button className="w-full mt-6 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
              Configure All Settings
            </button>
          </div>
        </div>

        {/* Recent Activity Log */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">Recent Activity Log</h3>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1">
              <span>VIEW ALL LOGS</span>
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {activityLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {log.timestamp}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getUserTypeIcon(log.userType)}
                        <span className="text-sm text-gray-900">{log.user}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.action}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full uppercase ${getStatusColor(
                          log.status
                        )}`}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
