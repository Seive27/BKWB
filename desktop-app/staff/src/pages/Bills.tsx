import React, { useState } from 'react';
import {
  Plus,
  Search,
  Calendar,
  Download,
  Eye,
  CheckCircle,
  Edit,
  Trash2,
  Receipt,
  DollarSign,
  Clock,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';

interface Bill {
  id: string;
  billingId: string;
  residentName: string;
  accountNumber: string;
  billingPeriod: string;
  consumption: number;
  amountDue: number;
  dueDate: string;
  status: 'paid' | 'unpaid' | 'overdue';
  initials: string;
}

const mockBills: Bill[] = [
  {
    id: '1',
    billingId: '#KW-2023-1001',
    residentName: 'John Dela Cruz',
    accountNumber: '891-4452-09',
    billingPeriod: 'Oct 01 - 31, 2023',
    consumption: 18.5,
    amountDue: 850.25,
    dueDate: 'Nov 15, 2023',
    status: 'paid',
    initials: 'JD',
  },
  {
    id: '2',
    billingId: '#KW-2023-1002',
    residentName: 'Maria Rivera',
    accountNumber: '891-8821-44',
    billingPeriod: 'Oct 01 - 31, 2023',
    consumption: 24.2,
    amountDue: 1120.5,
    dueDate: 'Nov 15, 2023',
    status: 'unpaid',
    initials: 'MR',
  },
  {
    id: '3',
    billingId: '#KW-2023-0945',
    residentName: 'Antonio Garcia',
    accountNumber: '891-3312-05',
    billingPeriod: 'Sep 01 - 30, 2023',
    consumption: 31.0,
    amountDue: 1450.0,
    dueDate: 'Oct 15, 2023',
    status: 'overdue',
    initials: 'AG',
  },
  {
    id: '4',
    billingId: '#KW-2023-1004',
    residentName: 'Sarah Lim',
    accountNumber: '891-5524-11',
    billingPeriod: 'Oct 01 - 31, 2023',
    consumption: 12.8,
    amountDue: 620.0,
    dueDate: 'Nov 15, 2023',
    status: 'paid',
    initials: 'SL',
  },
];

const Bills: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [consumerSearch, setConsumerSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('Oct 2023');

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
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Bills Management</h1>
          <p className="text-gray-600">
            Manage water bills, track payments, and monitor billing status of residents.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <Receipt className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 uppercase mb-1">Total Bills Generated</p>
            <h3 className="text-3xl font-bold text-gray-900">1,205</h3>
            <p className="text-xs text-gray-500 mt-1">Current billing period</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-sm font-semibold text-green-600">+12%</span>
            </div>
            <p className="text-xs text-gray-500 uppercase mb-1">Total Collected Revenue</p>
            <h3 className="text-3xl font-bold text-gray-900">₱142,500</h3>
            <p className="text-xs text-gray-500 mt-1">Collected this month</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-700 rounded">
                High
              </span>
            </div>
            <p className="text-xs text-gray-500 uppercase mb-1">Pending Payments</p>
            <h3 className="text-3xl font-bold text-gray-900">214</h3>
            <p className="text-xs text-gray-500 mt-1">Awaiting confirmation</p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded">
                Alert
              </span>
            </div>
            <p className="text-xs text-gray-500 uppercase mb-1">Overdue Accounts</p>
            <h3 className="text-3xl font-bold text-gray-900">72</h3>
            <p className="text-xs text-gray-500 mt-1">Requires immediate action</p>
          </div>
        </div>

        {/* Search and Actions Bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by Consumer Number, Resident Name, or Billing ID"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter Consumer Number"
                  value={consumerSearch}
                  onChange={(e) => setConsumerSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
              <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2">
                <Search className="w-4 h-4" />
                <span className="text-sm font-medium">Search</span>
              </button>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-xl border border-gray-200">
          {/* Table Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <span className="text-sm text-gray-700">Status: All</span>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                <div className="relative">
                  <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <span className="text-sm text-gray-700">Period: Oct 2023</span>
                    <Calendar className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <Download className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-700">Export</span>
                </button>
                <button className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">Generate Bills</span>
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
                    Billing ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Resident Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Account Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Billing Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Consumption (CU.M)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Amount Due
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Due Date
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
                {mockBills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {bill.billingId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-xs font-semibold text-blue-600">
                            {bill.initials}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {bill.residentName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {bill.accountNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {bill.billingPeriod}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {bill.consumption}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      ₱{bill.amountDue.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`text-sm ${
                          bill.status === 'overdue' ? 'text-red-600' : 'text-gray-600'
                        }`}
                      >
                        {bill.dueDate}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          bill.status
                        )}`}
                      >
                        {getStatusText(bill.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600 uppercase">
              Showing 1 to 10 of 1,208 entries
            </div>
            <div className="flex items-center space-x-2">
              <button className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                &lt;
              </button>
              <button className="px-3 py-1 text-sm bg-primary-600 text-white rounded">
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
                121
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

export default Bills;
