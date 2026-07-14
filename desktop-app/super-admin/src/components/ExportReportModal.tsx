import React, { useState } from 'react';
import { X, FileText, Table, FileSpreadsheet, Download } from 'lucide-react';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FileFormat = 'pdf' | 'csv' | 'excel';
type DateRange = 'current-month' | 'last-month' | 'last-3-months' | 'last-6-months' | 'custom';

interface ExportModule {
  id: string;
  label: string;
  checked: boolean;
}

const ExportReportModal: React.FC<ExportReportModalProps> = ({ isOpen, onClose }) => {
  const [selectedFormat, setSelectedFormat] = useState<FileFormat>('pdf');
  const [dateRange, setDateRange] = useState<DateRange>('current-month');
  const [startDate, setStartDate] = useState('2023-11-01');
  const [endDate, setEndDate] = useState('2023-11-30');
  const [modules, setModules] = useState<ExportModule[]>([
    { id: 'overview', label: 'Overview Analytics', checked: true },
    { id: 'system-health', label: 'System Health', checked: false },
    { id: 'security', label: 'Security Alerts', checked: false },
    { id: 'user-access', label: 'User Access Logs', checked: true },
    { id: 'audit', label: 'Audit History', checked: true },
    { id: 'storage', label: 'Storage Metrics', checked: false },
  ]);

  if (!isOpen) return null;

  const handleModuleToggle = (id: string) => {
    setModules((prev) =>
      prev.map((module) =>
        module.id === id ? { ...module, checked: !module.checked } : module
      )
    );
  };

  const handleExport = () => {
    // Here you would implement the actual export functionality
    console.log('Exporting report...', {
      format: selectedFormat,
      dateRange,
      startDate,
      endDate,
      modules: modules.filter((m) => m.checked),
    });
    onClose();
  };

  const getDateRangeLabel = () => {
    switch (dateRange) {
      case 'current-month':
        return 'Current Month (Nov 1 - Nov 30)';
      case 'last-month':
        return 'Last Month';
      case 'last-3-months':
        return 'Last 3 Months';
      case 'last-6-months':
        return 'Last 6 Months';
      case 'custom':
        return 'Custom Range';
      default:
        return 'Current Month (Nov 1 - Nov 30)';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Export Report</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* File Format Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-3">
              Select File Format
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setSelectedFormat('pdf')}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                  selectedFormat === 'pdf'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <FileText
                  className={`w-6 h-6 mb-2 ${
                    selectedFormat === 'pdf' ? 'text-blue-600' : 'text-gray-400'
                  }`}
                />
                <span
                  className={`text-sm font-medium ${
                    selectedFormat === 'pdf' ? 'text-blue-600' : 'text-gray-700'
                  }`}
                >
                  PDF
                </span>
              </button>

              <button
                onClick={() => setSelectedFormat('csv')}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                  selectedFormat === 'csv'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <Table
                  className={`w-6 h-6 mb-2 ${
                    selectedFormat === 'csv' ? 'text-blue-600' : 'text-gray-400'
                  }`}
                />
                <span
                  className={`text-sm font-medium ${
                    selectedFormat === 'csv' ? 'text-blue-600' : 'text-gray-700'
                  }`}
                >
                  CSV
                </span>
              </button>

              <button
                onClick={() => setSelectedFormat('excel')}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                  selectedFormat === 'excel'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <FileSpreadsheet
                  className={`w-6 h-6 mb-2 ${
                    selectedFormat === 'excel' ? 'text-blue-600' : 'text-gray-400'
                  }`}
                />
                <span
                  className={`text-sm font-medium ${
                    selectedFormat === 'excel' ? 'text-blue-600' : 'text-gray-700'
                  }`}
                >
                  Excel
                </span>
              </button>
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-3">
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="current-month">Current Month (Nov 1 - Nov 30)</option>
              <option value="last-month">Last Month</option>
              <option value="last-3-months">Last 3 Months</option>
              <option value="last-6-months">Last 6 Months</option>
              <option value="custom">Custom Range</option>
            </select>

            {/* Date Inputs */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1.5">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase mb-1.5">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Modules to Include */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-3">
              Modules to Include
            </label>
            <div className="grid grid-cols-2 gap-3">
              {modules.map((module) => (
                <label
                  key={module.id}
                  className="flex items-center space-x-2 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={module.checked}
                    onChange={() => handleModuleToggle(module.id)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">
                    {module.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download Report</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportReportModal;
