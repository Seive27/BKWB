import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MapPin,
  RefreshCw,
  AlertCircle,
  UserCheck,
  UserX,
  ChevronDown,
  Search,
  Check,
  X,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { SITIO_OPTIONS } from '../constants';
import type { MeterReaderOption } from '../types';
import {
  assignSitio,
  getAssignableReaders,
  getSitioAssignments,
  getKnownSitios,
  reassignSitio,
  unassignSitio,
  type SitioAssignment,
} from '../services/sitioAssignmentService';

function readerName(row: SitioAssignment): string {
  if (!row.reader) return 'Unknown reader';
  return `${row.reader.first_name} ${row.reader.last_name}`.trim();
}

const SitioAssignments: React.FC = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<SitioAssignment[]>([]);
  const [sitios, setSitios] = useState<string[]>(SITIO_OPTIONS as unknown as string[]);
  const [readers, setReaders] = useState<MeterReaderOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Assign dialog state
  const [assignSitioName, setAssignSitioName] = useState<string | null>(null);
  const [selectedReaderId, setSelectedReaderId] = useState('');
  const [saving, setSaving] = useState(false);

  // Reassignment confirmation state (explicit per requirements)
  const [reassignTarget, setReassignTarget] = useState<SitioAssignment | null>(null);
  const [reassignReaderId, setReassignReaderId] = useState('');
  // Unassign confirmation
  const [unassignTarget, setUnassignTarget] = useState<SitioAssignment | null>(null);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 5000);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rows, readerRows, sitioList] = await Promise.all([
        getSitioAssignments(),
        getAssignableReaders(),
        getKnownSitios().catch(() => [] as string[]),
      ]);
      setAssignments(rows);
      setReaders(readerRows);
      if (sitioList.length > 0) setSitios(sitioList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sitio assignments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const bySitio = useMemo(() => {
    const map = new Map<string, SitioAssignment>();
    for (const row of assignments) map.set(row.sitio, row);
    return map;
  }, [assignments]);

  const filteredSitios = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sitios;
    return sitios.filter(
      (s) =>
        s.toLowerCase().includes(q) ||
        (bySitio.get(s) ? readerName(bySitio.get(s)!).toLowerCase().includes(q) : false)
    );
  }, [sitios, searchQuery, bySitio]);

  const assignedCount = assignments.length;

  const handleAssign = async () => {
    if (!assignSitioName || !selectedReaderId || !user) return;
    setSaving(true);
    setError(null);
    try {
      await assignSitio(assignSitioName, selectedReaderId, user.id);
      showToast('success', `${assignSitioName} assigned successfully.`);
      setAssignSitioName(null);
      setSelectedReaderId('');
      await load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to assign the sitio.');
    } finally {
      setSaving(false);
    }
  };

  const handleReassign = async () => {
    if (!reassignTarget || !reassignReaderId || !user) return;
    setSaving(true);
    try {
      await reassignSitio(reassignTarget.sitio, reassignReaderId, user.id);
      showToast(
        'success',
        `${reassignTarget.sitio} moved to a different meter reader.`
      );
      setReassignTarget(null);
      setReassignReaderId('');
      await load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to reassign the sitio.');
    } finally {
      setSaving(false);
    }
  };

  const handleUnassign = async () => {
    if (!unassignTarget) return;
    setSaving(true);
    try {
      await unassignSitio(unassignTarget.sitio);
      showToast('success', `${unassignTarget.sitio} is now unassigned.`);
      setUnassignTarget(null);
      await load();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to remove the assignment.');
    } finally {
      setSaving(false);
    }
  };

  const openAssignDialog = (sitio: string) => {
    setAssignSitioName(sitio);
    setSelectedReaderId('');
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Sitio Assignments</h1>
            <p className="text-gray-600">
              Assign meter readers to sitios. A sitio can only have one assigned meter
              reader; reassigning an occupied sitio requires confirmation.
            </p>
          </div>

          {toast && (
            <div
              className={`mb-6 rounded-lg px-4 py-3 text-sm ${
                toast.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}
            >
              {toast.message}
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-center justify-between">
              <span>{error}</span>
              <button onClick={load} className="underline hover:text-red-800">Retry</button>
            </div>
          )}

          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">SITIOS ASSIGNED</p>
              <h3 className="text-3xl font-bold text-gray-900">
                {assignedCount}
                <span className="text-lg font-medium text-gray-400"> / {sitios.length}</span>
              </h3>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">ACTIVE METER READERS</p>
              <h3 className="text-3xl font-bold text-gray-900">{readers.length}</h3>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by sitio or meter reader"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Sitio</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Assigned Meter Reader</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <div className="flex items-center justify-center space-x-2 text-gray-400">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Loading sitios…</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredSitios.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No sitios match your search.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredSitios.map((sitio) => {
                      const row = bySitio.get(sitio);
                      const isAssigned = !!row;
                      return (
                        <tr key={sitio} className={!isAssigned ? 'bg-gray-50/60' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                              <span className={`text-sm ${isAssigned ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                                {sitio}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {row ? readerName(row) : '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                isAssigned
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {isAssigned ? 'Assigned' : 'Unassigned'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            {isAssigned ? (
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => {
                                    setReassignTarget(row!);
                                    setReassignReaderId('');
                                  }}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>Reassign</span>
                                </button>
                                <button
                                  onClick={() => setUnassignTarget(row!)}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                  <span>Remove</span>
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => openAssignDialog(sitio)}
                                className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Assign Reader</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Assign dialog */}
      {assignSitioName && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="border-b border-gray-200 px-6 py-5 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Assign Meter Reader</h3>
                <p className="text-sm text-gray-500 mt-0.5">{assignSitioName}</p>
              </div>
              <button
                onClick={() => setAssignSitioName(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 uppercase mb-2">
                  Meter Reader *
                </label>
                <div className="relative">
                  <select
                    value={selectedReaderId}
                    onChange={(e) => setSelectedReaderId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white appearance-none pr-10 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select a meter reader</option>
                    {readers.map((r) => (
                      <option key={r.id} value={r.id}>
                        {`${r.first_name} ${r.last_name}`.trim()}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>
                {readers.length === 0 && (
                  <p className="mt-2 text-xs text-amber-600">
                    No active meter readers yet. Create one under Add User first.
                  </p>
                )}
              </div>
              <p className="text-xs text-gray-400">
                The reader will see this sitio and its consumers in their mobile app. Consumers
                outside their assigned sitios remain hidden from them.
              </p>
            </div>
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
              <button
                onClick={() => setAssignSitioName(null)}
                className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={saving || !selectedReaderId}
                className="px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Assigning…' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reassignment confirmation */}
      {reassignTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="border-b border-gray-200 px-6 py-5">
              <h3 className="text-lg font-bold text-gray-900">Reassign Sitio</h3>
              <p className="text-sm text-gray-600 mt-1">
                <span className="font-semibold">{reassignTarget.sitio}</span> is currently
                assigned to <span className="font-semibold">{readerName(reassignTarget)}</span>.
                Reassigning replaces that coverage area.
              </p>
            </div>
            <div className="px-6 py-5">
              <label className="block text-xs font-medium text-gray-700 uppercase mb-2">
                New Meter Reader *
              </label>
              <div className="relative">
                <select
                  value={reassignReaderId}
                  onChange={(e) => setReassignReaderId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white appearance-none pr-10 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select a meter reader</option>
                  {readers
                    .filter((r) => r.id !== reassignTarget.meter_reader_id)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {`${r.first_name} ${r.last_name}`.trim()}
                      </option>
                    ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
              <button
                onClick={() => setReassignTarget(null)}
                className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReassign}
                disabled={saving || !reassignReaderId}
                className="inline-flex items-center space-x-2 px-5 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{saving ? 'Reassigning…' : 'Confirm Reassignment'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unassign confirmation */}
      {unassignTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="px-6 py-6">
              <h3 className="text-lg font-bold text-gray-900">Remove Assignment</h3>
              <p className="text-sm text-gray-600 mt-2">
                Remove <span className="font-semibold">{readerName(unassignTarget)}</span> from{' '}
                <span className="font-semibold">{unassignTarget.sitio}</span>? The sitio becomes
                unassigned and the reader loses visibility of its consumers.
              </p>
            </div>
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
              <button
                onClick={() => setUnassignTarget(null)}
                className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUnassign}
                disabled={saving}
                className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SitioAssignments;
