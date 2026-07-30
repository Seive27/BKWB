import React, { useState } from 'react';
import { X, Download, AlertCircle, FileText } from 'lucide-react';

interface ExportAuditLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type DateRangeOption = 'current-session' | 'today' | 'last-7-days' | 'last-30-days' | 'custom';
type ExportFormat = 'pdf' | 'xlsx' | 'csv' | 'json';

interface LogCategory {
  id: string;
  label: string;
  checked: boolean;
}

const ExportAuditLogsModal: React.FC<ExportAuditLogsModalProps> = ({ isOpen, onClose }) => {
  const [dateRange, setDateRange] = useState<DateRangeOption>('last-30-days');
  const [startDate, setStartDate] = useState('2023-11-01');
  const [endDate, setEndDate] = useState('2023-11-30');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [categories, setCategories] = useState<LogCategory[]>([
    { id: 'login-auth', label: 'User Login & Authentication', checked: true },
    { id: 'user-mgmt', label: 'User Management Activities', checked: true },
    { id: 'resident-account', label: 'Resident Account Activities', checked: true },
    { id: 'billing', label: 'Billing Operations', checked: true },
    { id: 'payment', label: 'Payment Transactions', checked: true },
    { id: 'meter-reading', label: 'Meter Reading Activities', checked: true },
    { id: 'announcements', label: 'Announcements & Messages', checked: true },
    { id: 'system-config', label: 'System Configuration Changes', checked: true },
    { id: 'security', label: 'Security Events & Violations', checked: true },
    { id: 'audit-trail', label: 'Audit Trail Records', checked: true },
  ]);

  if (!isOpen) return null;

  const handleCategoryToggle = (id: string) => {
    setCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, checked: !cat.checked } : cat))
    );
  };

  const handleSelectAll = () => {
    const allChecked = categories.every((cat) => cat.checked);
    setCategories((prev) => prev.map((cat) => ({ ...cat, checked: !allChecked })));
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    // Simulate export process
    setTimeout(() => {
      setIsExporting(false);
      alert('Audit logs exported successfully.');
      onClose();
    }, 2000);
  };

  const getDateRangeLabel = () => {
    switch (dateRange) {
      case 'current-session':
        return 'Current Session';
      case 'today':
        return 'Today';
      case 'last-7-days':
        return 'Last 7 Days';
      case 'last-30-days':
        return 'Last 30 Days';
      case 'custom':
        return `${startDate} to ${endDate}`;
      default:
        return 'Last 30 Days';
    }
  };

  const selectedCategories = categories.filter((cat) => cat.checked).length;
  const estimatedRecords = 3491;
  const estimatedSize = '2.4 MB';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Export Audit Logs</h2>
            <p className="text-sm text-gray-600 mt-1">
              Select the audit records and export format for reporting, backup, or compliance purposes.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 ml-4"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Section 1: Date Range */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Audit Period
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRangeOption)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="current-session">Current Session</option>
              <option value="today">Today</option>
              <option value="last-7-days">Last 7 Days</option>
              <option value="last-30-days">Last 30 Days</option>
              <option value="custom">Custom Range</option>
            </select>

            {/* Custom Date Range */}
            {dateRange === 'custom' && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">
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
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">
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
            )}
          </div>

          {/* Section 2: Log Categories */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-gray-900">
                Include Log Types
              </label>
              <button
                onClick={handleSelectAll}
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                {categories.every((cat) => cat.checked) ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
              {categories.map((category) => (
                <label
                  key={category.id}
                  className="flex items-start space-x-2 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={category.checked}
                    onChange={() => handleCategoryToggle(category.id)}
                    className="w-4 h-4 mt-0.5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">
                    {category.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Section 3: Export Format */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              File Format
            </label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="pdf">PDF Report</option>
              <option value="xlsx">Excel Spreadsheet (.xlsx)</option>
              <option value="csv">CSV File</option>
              <option value="json">JSON</option>
            </select>
          </div>

          {/* Section 4: Export Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-900 mb-2">Export Summary</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Estimated Records:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {estimatedRecords.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Date Range:</span>
                    <span className="ml-2 font-semibold text-gray-900">{getDateRangeLabel()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Generated By:</span>
                    <span className="ml-2 font-semibold text-gray-900">Admin Quan</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Export Size:</span>
                    <span className="ml-2 font-semibold text-gray-900">~{estimatedSize}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Selected Categories:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {selectedCategories} of {categories.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Compliance Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold text-gray-900">Compliance Notice:</span>{' '}
                  Audit log exports may contain sensitive system information. Access should be restricted
                  to authorized personnel only.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 sticky bottom-0">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || selectedCategories === 0}
            className="flex items-center space-x-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Export Logs</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportAuditLogsModal;
