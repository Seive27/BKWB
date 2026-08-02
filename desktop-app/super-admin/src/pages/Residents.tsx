import React, { useCallback, useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Download,
  Users,
  UserCheck,
  AlertTriangle,
  X,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import {
  getResidents,
  getResidentStats,
  createResident,
  type ResidentRecord,
} from '../services/residentService';

interface AddResidentForm {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  accountNumber: string;
  serviceAddress: string;
  meterNumber: string;
}

const EMPTY_FORM: AddResidentForm = {
  firstName: '',
  middleName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  accountNumber: '',
  serviceAddress: '',
  meterNumber: '',
};

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function getStatusBadge(status: string | null) {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-700';
    case 'inactive':
      return 'bg-gray-100 text-gray-700';
    case 'disconnected':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getStatusText(status: string | null) {
  switch (status) {
    case 'active':
      return 'Active';
    case 'disconnected':
      return 'Disconnected';
    default:
      return 'Inactive';
  }
}

const AddResidentModal: React.FC<{
  onClose: () => void;
  onCreated: () => void;
}> = ({ onClose, onCreated }) => {
  const [form, setForm] = useState<AddResidentForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof AddResidentForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setError(null);
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      setError('First name, last name and email are required.');
      return;
    }
    if (form.password.trim() && form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setSaving(true);
    try {
      await createResident({
        email: form.email,
        password:
          form.password.trim() ||
          `${form.lastName.trim().toLowerCase()}_bkwb${new Date().getFullYear()}`,
        firstName: form.firstName,
        middleName: form.middleName,
        lastName: form.lastName,
        phone: form.phone,
        accountNumber: form.accountNumber,
        serviceAddress: form.serviceAddress,
        meterNumber: form.meterNumber,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create resident.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Add New Resident</h2>
            <p className="text-sm text-gray-600 mt-1">
              Register a new consumer to Kalunasan Waters system
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-8 py-6 space-y-6">
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-4">Personal Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 uppercase mb-2">First Name *</label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => set('firstName', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 uppercase mb-2">Middle Name</label>
                <input
                  type="text"
                  value={form.middleName}
                  onChange={(e) => set('middleName', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 uppercase mb-2">Last Name *</label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => set('lastName', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 uppercase mb-2">Contact Number</label>
                <input
                  type="text"
                  placeholder="+63 960 000 0000"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 uppercase mb-2">Email Address *</label>
                <input
                  type="email"
                  placeholder="resident@email.com"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 uppercase mb-2">
                  Temporary Password <span className="text-gray-400 normal-case">(min 8 chars)</span>
                </label>
                <input
                  type="text"
                  placeholder="Leave blank to auto-generate"
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-4">Service Account</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 uppercase mb-2">Consumer Code</label>
                <input
                  type="text"
                  placeholder="ACC-0001"
                  value={form.accountNumber}
                  onChange={(e) => set('accountNumber', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 uppercase mb-2">Meter Serial Number</label>
                <input
                  type="text"
                  placeholder="MTR-0001"
                  value={form.meterNumber}
                  onChange={(e) => set('meterNumber', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 uppercase mb-2">Service Address</label>
                <input
                  type="text"
                  placeholder="House No., Street, Purok, Barangay"
                  value={form.serviceAddress}
                  onChange={(e) => set('serviceAddress', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-8 py-4 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Save Resident'}
          </button>
        </div>
      </div>
    </div>
  );
};

const Residents: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [residents, setResidents] = useState<ResidentRecord[]>([]);
  const [stats, setStats] = useState({ totalResidents: 0, activeAccounts: 0, inactiveAccounts: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [residentData, statData] = await Promise.all([getResidents(), getResidentStats()]);
      setResidents(residentData);
      setStats(statData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load residents.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredResidents = residents.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      r.fullName.toLowerCase().includes(q) ||
      (r.accountNumber ?? '').toLowerCase().includes(q) ||
      (r.meterNumber ?? '').toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q)
    );
  });

  const handleExport = () => {
    if (filteredResidents.length === 0) return;
    const header = ['Name', 'Email', 'Phone', 'Account No.', 'Meter ID', 'Address', 'Status', 'Created'];
    const rows = filteredResidents.map((r) => [
      r.fullName,
      r.email,
      r.phone ?? '',
      r.accountNumber ?? '',
      r.meterNumber ?? '',
      r.serviceAddress ?? '',
      getStatusText(r.connectionStatus),
      new Date(r.createdAt).toLocaleDateString(),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'residents.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Residents</h1>
            <p className="text-gray-600">Manage registered residents and their water service accounts.</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">TOTAL RESIDENTS</p>
                  <h3 className="text-3xl font-bold text-gray-900">{stats.totalResidents.toLocaleString()}</h3>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">ACTIVE ACCOUNTS</p>
                  <h3 className="text-3xl font-bold text-gray-900">{stats.activeAccounts.toLocaleString()}</h3>
                </div>
                <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">INACTIVE / DISCONNECTED</p>
                  <h3 className="text-3xl font-bold text-gray-900">{stats.inactiveAccounts.toLocaleString()}</h3>
                </div>
                <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Table Section */}
          <div className="bg-white rounded-xl border border-gray-200">
            {/* Table Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name, account, or meter ID"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 w-80 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={load}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    title="Refresh"
                  >
                    <RefreshCw className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={handleExport}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    title="Export CSV"
                  >
                    <Download className="w-5 h-5 text-gray-600" />
                  </button>

                  <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">Add Resident</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Resident Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Account No.</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Meter ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Address</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="flex items-center justify-center space-x-2 text-gray-400">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Loading residents…</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredResidents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No residents found.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredResidents.map((resident) => (
                      <tr key={resident.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                              <span className="text-xs font-semibold text-blue-600">
                                {getInitials(resident.firstName, resident.lastName)}
                              </span>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-900">{resident.fullName}</span>
                              <p className="text-xs text-gray-500">{resident.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {resident.accountNumber ?? '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {resident.meterNumber ?? '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {resident.serviceAddress ?? '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadge(resident.connectionStatus)}`}>
                            {getStatusText(resident.connectionStatus)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {filteredResidents.length} of {stats.totalResidents.toLocaleString()} residents
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Resident Modal */}
      {showAddModal && (
        <AddResidentModal
          onClose={() => setShowAddModal(false)}
          onCreated={load}
        />
      )}
    </>
  );
};

export default Residents;
