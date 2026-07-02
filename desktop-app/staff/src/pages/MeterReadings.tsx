import React, { useState } from 'react';
import {
  Plus,
  Search,
  Calendar,
  Filter,
  Eye,
  Edit,
  Trash2,
  Gauge,
  Droplet,
  AlertTriangle,
  TrendingUp,
  X,
  ChevronDown,
} from 'lucide-react';

interface MeterReadingRecord {
  id: string;
  residentName: string;
  accountNumber: string;
  meterId: string;
  previousReading: number;
  currentReading: number;
  consumption: number;
  status: 'normal' | 'high' | 'low';
  dateRecorded: string;
  initials: string;
}

const mockMeterReadings: MeterReadingRecord[] = [
  {
    id: '1',
    residentName: 'Ricardo Sanchez',
    accountNumber: 'KW-2024-0012',
    meterId: 'MTR-99812',
    previousReading: 1220,
    currentReading: 1240,
    consumption: 20,
    status: 'normal',
    dateRecorded: 'Oct 24, 2023',
    initials: 'RS',
  },
  {
    id: '2',
    residentName: 'Maria Alcarez',
    accountNumber: 'KW-2024-0456',
    meterId: 'MTR-88231',
    previousReading: 2450,
    currentReading: 2504,
    consumption: 54,
    status: 'high',
    dateRecorded: 'Oct 23, 2023',
    initials: 'MA',
  },
  {
    id: '3',
    residentName: 'John Doe',
    accountNumber: 'KW-2024-0089',
    meterId: 'MTR-77122',
    previousReading: 900,
    currentReading: 912,
    consumption: 12,
    status: 'low',
    dateRecorded: 'Oct 22, 2023',
    initials: 'JD',
  },
];

const MeterReadings: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('Oct 2023');
  const [currentPage, setCurrentPage] = useState(1);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return 'bg-green-100 text-green-700';
      case 'high':
        return 'bg-orange-100 text-orange-700';
      case 'low':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Meter Readings</h1>
            <p className="text-gray-600">
              Record and manage residents' water meter readings for billing computation.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Gauge className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-sm font-semibold text-green-600">+4.2%</span>
              </div>
              <p className="text-sm text-gray-600 mb-1">TOTAL READINGS THIS MONTH</p>
              <h3 className="text-3xl font-bold text-gray-900">1,205</h3>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Droplet className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">AVERAGE CONSUMPTION</p>
              <h3 className="text-3xl font-bold text-gray-900">
                18.5 <span className="text-lg text-gray-500">m³</span>
              </h3>
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
              <p className="text-sm text-gray-600 mb-1">HIGH USAGE ALERTS</p>
              <h3 className="text-3xl font-bold text-gray-900">12</h3>
            </div>
          </div>

          {/* Table Section */}
          <div className="bg-white rounded-xl border border-gray-200">
            {/* Table Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by resident, account, or meter ID"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 w-96 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>

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

                  <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <Filter className="w-5 h-5 text-gray-600" />
                  </button>

                  <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">Add Reading</span>
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
                      Account Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Meter ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Prev. Reading
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Curr. Reading
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Consumption
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Date Recorded
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {mockMeterReadings.map((reading) => (
                    <tr
                      key={reading.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-xs font-semibold text-blue-600">
                              {reading.initials}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {reading.residentName}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {reading.accountNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {reading.meterId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {reading.previousReading.toLocaleString()}{' '}
                        <span className="text-xs text-gray-400">m³</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {reading.currentReading.toLocaleString()}{' '}
                        <span className="text-xs text-gray-400">m³</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`text-sm font-semibold ${
                            reading.status === 'high'
                              ? 'text-orange-600'
                              : reading.status === 'low'
                              ? 'text-blue-600'
                              : 'text-gray-900'
                          }`}
                        >
                          {reading.consumption} m³
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            reading.status
                          )}`}
                        >
                          {getStatusText(reading.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {reading.dateRecorded}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors">
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
              <div className="text-sm text-gray-600">
                Showing 1 to 10 of 1,205 entries
              </div>
              <div className="flex items-center space-x-2">
                <button className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                  Previous
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
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Meter Reading Modal */}
      {showAddModal && (
        <AddMeterReadingModal onClose={() => setShowAddModal(false)} />
      )}
    </>
  );
};

// Add Meter Reading Modal Component
const AddMeterReadingModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [consumerId, setConsumerId] = useState('457');
  const [currentReading, setCurrentReading] = useState('0000.00');
  const [calculatedBill, setCalculatedBill] = useState(450);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl">
        {/* Modal Header */}
        <div className="border-b border-gray-200 px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Add New Meter Reading</h2>
            <p className="text-sm text-gray-600 mt-1">
              Enter the current water usage for billing calculation.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-8 py-6 space-y-6">
          {/* Row 1: Consumer ID and Meter ID */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 uppercase mb-2">
                Consumer ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={consumerId}
                  onChange={(e) => setConsumerId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 uppercase mb-2">
                Meter ID
              </label>
              <input
                type="text"
                value="WTR-9921"
                disabled
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-600"
              />
            </div>
          </div>

          {/* Row 2: Resident and Sitio */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 uppercase mb-2">
                Resident
              </label>
              <input
                type="text"
                value="John Doe"
                disabled
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 uppercase mb-2">
                Sitio
              </label>
              <input
                type="text"
                value="Lower Kalunasan"
                disabled
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-600"
              />
            </div>
          </div>

          {/* Row 3: Reading Date and Current Reading */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 uppercase mb-2">
                Reading Date
              </label>
              <input
                type="text"
                value="11/15/2023"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-primary-600 uppercase mb-2">
                Current Reading (M³)
              </label>
              <input
                type="text"
                value={currentReading}
                onChange={(e) => setCurrentReading(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-primary-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 font-medium"
                placeholder="0000.00"
              />
            </div>
          </div>

          {/* Bill Display */}
          <div>
            <label className="block text-xs font-medium text-gray-700 uppercase mb-2">
              Bill
            </label>
            <div className="bg-gray-50 px-4 py-3 rounded-lg">
              <span className="text-2xl font-bold text-primary-600">₱{calculatedBill}</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-8 py-4 flex items-center justify-end space-x-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button className="flex items-center space-x-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
              />
            </svg>
            <span>Save Reading</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MeterReadings;
