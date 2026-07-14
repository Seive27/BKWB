import React, { useState } from 'react';
import {
  Wallet,
  Receipt,
  Clock,
  AlertCircle,
  Download,
  MoreVertical,
  TrendingUp,
  FileText,
  Table as TableIcon,
  Printer,
} from 'lucide-react';

interface ReportEntry {
  id: string;
  residentName: string;
  accountNo: string;
  billingPeriod: string;
  consumption: number;
  amountPaid: number;
  status: 'paid' | 'unpaid' | 'overdue';
}

const mockReportData: ReportEntry[] = [
  {
    id: '1',
    residentName: 'Elena Rodriguez',
    accountNo: 'ACC-2024-0891',
    billingPeriod: 'Oct 2023',
    consumption: 24.5,
    amountPaid: 1245.0,
    status: 'paid',
  },
  {
    id: '2',
    residentName: 'Mark Anthony Simpson',
    accountNo: 'ACC-2023-0118',
    billingPeriod: 'Oct 2023',
    consumption: 32.2,
    amountPaid: 1820.5,
    status: 'unpaid',
  },
  {
    id: '3',
    residentName: 'Maria Clara Santos',
    accountNo: 'ACC-2023-0985',
    billingPeriod: 'Oct 2023',
    consumption: 18.9,
    amountPaid: 850.25,
    status: 'overdue',
  },
  {
    id: '4',
    residentName: 'Roberto de Leon',
    accountNo: 'ACC-2024-0547',
    billingPeriod: 'Oct 2023',
    consumption: 29.8,
    amountPaid: 1540.0,
    status: 'paid',
  },
];

const Reports: React.FC = () => {
  const [periodFilter, setPeriodFilter] = useState('Monthly');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-700';
      case 'unpaid':
        return 'bg-yellow-100 text-yellow-700';
      case 'overdue':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    return status.toUpperCase();
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
          <p className="text-gray-600">
            Monitor system performance, billing trends, and water usage through visual reports.
          </p>
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {/* Period Tabs */}
              <button
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  periodFilter === 'Monthly'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
                onClick={() => setPeriodFilter('Monthly')}
              >
                Monthly
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  periodFilter === 'Quarterly'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
                onClick={() => setPeriodFilter('Quarterly')}
              >
                Quarterly
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  periodFilter === 'Yearly'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
                onClick={() => setPeriodFilter('Yearly')}
              >
                Yearly
              </button>

              <div className="w-px h-6 bg-gray-300 mx-2"></div>

              {/* Additional Filters */}
              <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                All Residents
              </button>
              <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                Specific Area
              </button>
              <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                Status
              </button>
            </div>

            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Download className="w-4 h-4" />
              <span className="text-sm font-medium">Generate Report</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Total Revenue Collected */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex items-center space-x-1 text-green-600">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-semibold">+12%</span>
              </div>
            </div>
            <p className="text-xs text-gray-600 uppercase font-medium mb-1">
              Total Revenue Collected
            </p>
            <h3 className="text-2xl font-bold text-gray-900">₱142,500</h3>
          </div>

          {/* Total Bills Generated */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
                <Receipt className="w-5 h-5 text-gray-600" />
              </div>
            </div>
            <p className="text-xs text-gray-600 uppercase font-medium mb-1">
              Total Bills Generated
            </p>
            <h3 className="text-2xl font-bold text-gray-900">1,205</h3>
          </div>

          {/* Pending Payments */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
            </div>
            <p className="text-xs text-gray-600 uppercase font-medium mb-1">
              Pending Payments
            </p>
            <h3 className="text-2xl font-bold text-gray-900">214</h3>
          </div>

          {/* Overdue Accounts */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
            </div>
            <p className="text-xs text-gray-600 uppercase font-medium mb-1">
              Overdue Accounts
            </p>
            <h3 className="text-2xl font-bold text-gray-900">72</h3>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Trend Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-semibold text-gray-900">Revenue Trend</h3>
              <span className="text-xs text-gray-500">Last 6 Months</span>
            </div>
            <div className="relative h-64">
              {/* Simple Line Chart Visualization */}
              <svg className="w-full h-full" viewBox="0 0 600 200" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="revenueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Area under curve */}
                <path
                  d="M 0 180 L 0 160 Q 100 140 120 120 Q 180 90 240 100 Q 300 80 360 60 Q 420 45 480 70 Q 540 90 600 110 L 600 180 Z"
                  fill="url(#revenueGradient)"
                />
                {/* Line */}
                <path
                  d="M 0 160 Q 100 140 120 120 Q 180 90 240 100 Q 300 80 360 60 Q 420 45 480 70 Q 540 90 600 110"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
              {/* X-axis labels */}
              <div className="flex justify-between mt-2">
                <span className="text-xs text-gray-500">MAY</span>
                <span className="text-xs text-gray-500">JUN</span>
                <span className="text-xs text-gray-500">JUL</span>
                <span className="text-xs text-gray-500">AUG</span>
                <span className="text-xs text-gray-500">SEP</span>
                <span className="text-xs text-gray-500">OCT</span>
              </div>
            </div>
          </div>

          {/* Billing Status Donut Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-semibold text-gray-900">Billing Status</h3>
            </div>
            <div className="flex items-center justify-center">
              <div className="relative w-48 h-48">
                {/* Donut Chart using SVG */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Paid - 84% (Blue) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="20"
                    strokeDasharray="210 263"
                    strokeLinecap="round"
                  />
                  {/* Unpaid - 11% (Yellow) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="20"
                    strokeDasharray="29 263"
                    strokeDashoffset="-210"
                    strokeLinecap="round"
                  />
                  {/* Overdue - 5% (Red) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="20"
                    strokeDasharray="13 263"
                    strokeDashoffset="-239"
                    strokeLinecap="round"
                  />
                </svg>
                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-gray-900">1,205</span>
                  <span className="text-xs text-gray-500">TOTAL BILLS</span>
                </div>
              </div>
            </div>
            {/* Legend */}
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                  <span className="text-sm text-gray-700">Paid</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">84%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">Unpaid</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">11%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">Overdue</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">5%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Water Consumption Trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-semibold text-gray-900">
              Water Consumption Trend (cu.m)
            </h3>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View Details →
            </button>
          </div>
          <div className="h-64">
            {/* Bar Chart */}
            <div className="flex items-end justify-between h-full space-x-2">
              <div className="flex flex-col items-center flex-1">
                <div className="w-full bg-gray-100 rounded-t h-3/5"></div>
                <span className="text-xs text-gray-500 mt-2">W1</span>
              </div>
              <div className="flex flex-col items-center flex-1">
                <div className="w-full bg-blue-600 rounded-t h-full"></div>
                <span className="text-xs text-gray-500 mt-2">W2</span>
              </div>
              <div className="flex flex-col items-center flex-1">
                <div className="w-full bg-gray-100 rounded-t h-2/5"></div>
                <span className="text-xs text-gray-500 mt-2">W3</span>
              </div>
              <div className="flex flex-col items-center flex-1">
                <div className="w-full bg-gray-100 rounded-t h-3/5"></div>
                <span className="text-xs text-gray-500 mt-2">W4</span>
              </div>
              <div className="flex flex-col items-center flex-1">
                <div className="w-full bg-blue-600 rounded-t h-4/5"></div>
                <span className="text-xs text-gray-500 mt-2">W5</span>
              </div>
              <div className="flex flex-col items-center flex-1">
                <div className="w-full bg-gray-100 rounded-t h-1/2"></div>
                <span className="text-xs text-gray-500 mt-2">W6</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Reports Table */}
        <div className="bg-white rounded-xl border border-gray-200">
          {/* Table Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-gray-600" />
                <h3 className="text-base font-semibold text-gray-900">Detailed Reports</h3>
              </div>

              <div className="flex items-center space-x-3">
                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search reports..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-4 pr-4 py-2 w-64 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Export Buttons */}
                <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <FileText className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-700">PDF</span>
                </button>
                <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <TableIcon className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-700">Excel</span>
                </button>
                <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <Printer className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-700">Print</span>
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Resident Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Billing Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Consumption (cu.m)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Amount Paid
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {mockReportData.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">
                          {entry.residentName}
                        </span>
                        <span className="text-xs text-gray-500">{entry.accountNo}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {entry.billingPeriod}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.consumption}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">
                      ₱{entry.amountPaid.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          entry.status
                        )}`}
                      >
                        {getStatusText(entry.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">Showing 1 to 4 of 1,205 entries</div>
            <div className="flex items-center space-x-2">
              <button className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                &lt;
              </button>
              <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded">
                1
              </button>
              <button className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                2
              </button>
              <button className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                3
              </button>
              <span className="px-2 text-gray-500">...</span>
              <button className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                42
              </button>
              <button className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                &gt;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
