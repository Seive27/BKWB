import React, { useState } from 'react';
import {
  Users,
  Activity,
  Gauge,
  TrendingDown,
  Download,
  MoreVertical,
  FileText,
  Table,
  FileSpreadsheet,
  CheckCircle,
} from 'lucide-react';
import ExportReportModal from '../components/ExportReportModal';

interface ExportFile {
  id: string;
  name: string;
  type: 'pdf' | 'csv' | 'xlsx';
  exportedDate: string;
  size: string;
}

const mockExportFiles: ExportFile[] = [
  {
    id: '1',
    name: 'Q3_System_Usage.pdf',
    type: 'pdf',
    exportedDate: 'Exported 3 months ago, 4.6 MB',
    size: '4.6 MB',
  },
  {
    id: '2',
    name: 'User_Growth_Weekly.csv',
    type: 'csv',
    exportedDate: 'Exported 2 weeks ago',
    size: '234 KB',
  },
  {
    id: '3',
    name: 'Security_Audit_Log.xlsx',
    type: 'xlsx',
    exportedDate: 'Exported Yesterday, 11 MB',
    size: '11 MB',
  },
];

const Analytics: React.FC = () => {
  const [timeFilter, setTimeFilter] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Mock data for stats
  const totalUsers = 24592;
  const totalUsersGrowth = 12.5;
  const activeUsers = 8103;
  const activeUsersGrowth = 4.2;
  const systemUsage = 68.4;
  const errorRate = 0.14;
  const errorRateChange = -0.6;

  // Mock data for user activity chart (7 days)
  const userActivityData = {
    sessions: [120, 135, 125, 180, 165, 145, 190],
    signups: [45, 52, 48, 65, 58, 52, 68],
    days: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
  };

  // Mock data for system latency (24 hours)
  const latencyData = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    latency: Math.random() * 100 + 50 + (i === 12 ? 150 : 0), // Spike at hour 12
  }));

  const maxLatency = Math.max(...latencyData.map((d) => d.latency));

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-500" />;
      case 'csv':
        return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
      case 'xlsx':
        return <Table className="w-5 h-5 text-blue-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Analytics Overview</h1>
            <p className="text-sm text-gray-600">
              Real-time performance metrics and system health monitoring.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setTimeFilter('daily')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                timeFilter === 'daily'
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setTimeFilter('weekly')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                timeFilter === 'weekly'
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setTimeFilter('monthly')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                timeFilter === 'monthly'
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Monthly
            </button>
            <button 
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ml-2"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm font-medium">Export</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Total Users */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex items-center space-x-1 text-green-600">
                <span className="text-xs font-semibold">+{totalUsersGrowth}%</span>
              </div>
            </div>
            <p className="text-xs text-gray-600 uppercase font-medium mb-1">Total Users</p>
            <h3 className="text-3xl font-bold text-gray-900">
              {totalUsers.toLocaleString()}
            </h3>
          </div>

          {/* Active Users */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex items-center space-x-1 text-green-600">
                <span className="text-xs font-semibold">+{activeUsersGrowth}%</span>
              </div>
            </div>
            <p className="text-xs text-gray-600 uppercase font-medium mb-1">Active Users</p>
            <h3 className="text-3xl font-bold text-gray-900">{activeUsers.toLocaleString()}</h3>
          </div>

          {/* System Usage */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
                <Gauge className="w-5 h-5 text-gray-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">Stable</span>
            </div>
            <p className="text-xs text-gray-600 uppercase font-medium mb-1">System Usage</p>
            <h3 className="text-3xl font-bold text-gray-900">{systemUsage}%</h3>
          </div>

          {/* Error Rate */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex items-center space-x-1 text-green-600">
                <span className="text-xs font-semibold">{errorRateChange}%</span>
              </div>
            </div>
            <p className="text-xs text-gray-600 uppercase font-medium mb-1">Error Rate</p>
            <h3 className="text-3xl font-bold text-gray-900">{errorRate}%</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* User Activity Over Time Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  User Activity Over Time
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Daily unique sessions and registrations
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-xs text-gray-600">Sessions</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
                  <span className="text-xs text-gray-600">Signups</span>
                </div>
              </div>
            </div>

            {/* Line Chart */}
            <div className="h-64 relative">
              <svg className="w-full h-full" viewBox="0 0 700 200">
                {/* Sessions line (blue) */}
                <path
                  d={`M ${userActivityData.sessions
                    .map(
                      (val, idx) =>
                        `${(idx / (userActivityData.sessions.length - 1)) * 700},${
                          180 - (val / 200) * 160
                        }`
                    )
                    .join(' L ')}`}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Signups line (cyan) */}
                <path
                  d={`M ${userActivityData.signups
                    .map(
                      (val, idx) =>
                        `${(idx / (userActivityData.signups.length - 1)) * 700},${
                          180 - (val / 200) * 160
                        }`
                    )
                    .join(' L ')}`}
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              {/* X-axis labels */}
              <div className="flex justify-between mt-2 px-2">
                {userActivityData.days.map((day, idx) => (
                  <span key={idx} className="text-xs text-gray-500">
                    {day}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Exports */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-semibold text-gray-900">Recent Exports</h3>
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View All
              </button>
            </div>

            <div className="space-y-4">
              {mockExportFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    {getFileIcon(file.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{file.exportedDate}</p>
                  </div>
                  <button className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0">
                    <MoreVertical className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* System Latency Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-gray-900">System Latency (ms)</h3>
              <p className="text-xs text-gray-500 mt-1">LAST 24 HOURS</p>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-600 font-medium">
                All systems normal
              </span>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="h-48 flex items-end space-x-1">
            {latencyData.map((data, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center">
                <div
                  className={`w-full rounded-t ${
                    data.latency > 150 ? 'bg-blue-600' : 'bg-blue-200'
                  } transition-all duration-300`}
                  style={{ height: `${(data.latency / maxLatency) * 100}%` }}
                ></div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end space-x-4 mt-4 text-xs text-gray-500">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-200 rounded"></div>
              <span>Normal</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-600 rounded"></div>
              <span>Peak</span>
            </div>
          </div>
        </div>
      </div>

      {/* Export Report Modal */}
      <ExportReportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
};

export default Analytics;
