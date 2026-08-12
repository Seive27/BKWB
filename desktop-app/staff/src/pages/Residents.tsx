import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Copy,
  Check,
  CheckCircle2,
  KeyRound,
  ChevronDown,
  Pencil,
  UserX,
} from 'lucide-react';
import {
  getResidents,
  getResidentStats,
  createResident,
  updateResident,
  setResidentStatus,
  generateTemporaryPassword,
  validatePhone,
  type ResidentRecord,
} from '../services/residentService';
import { SITIO_OPTIONS } from '../constants';

interface AddResidentForm {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  serviceAddress: string;
  sitio: string;
  meterNumber: string;
}

const EMPTY_FORM: AddResidentForm = {
  firstName: '',
  middleName: '',
  lastName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  serviceAddress: '',
  sitio: '',
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
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof AddResidentForm, string>>>({});
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [created, setCreated] = useState<{
    email: string;
    temporaryPassword: string;
    accountNumber: string | null;
  } | null>(null);

  const set = (key: keyof AddResidentForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  // Auto-generated temporary password, shown before saving so staff can copy it.
  const generatedPassword = useMemo(() => {
    if (!form.lastName.trim() || !form.dateOfBirth) return '';
    try {
      return generateTemporaryPassword(form.firstName, form.lastName, form.dateOfBirth);
    } catch {
      return '';
    }
  }, [form.firstName, form.lastName, form.dateOfBirth]);

  const handleCopyPassword = async () => {
    if (!generatedPassword) return;
    try {
      await navigator.clipboard.writeText(generatedPassword);
      setPasswordCopied(true);
      setTimeout(() => setPasswordCopied(false), 2000);
    } catch {
      setError('Unable to copy. Please select the password manually.');
    }
  };

  const handleSave = async () => {
    setError(null);
    const errors: Partial<Record<keyof AddResidentForm, string>> = {};
    if (!form.firstName.trim()) errors.firstName = 'First name is required.';
    if (!form.lastName.trim()) errors.lastName = 'Last name is required.';
    if (!form.email.trim()) errors.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      errors.email = 'Enter a valid email address.';
    if (!form.dateOfBirth) errors.dateOfBirth = 'Date of birth is required (used for the temporary password).';
    const phoneError = validatePhone(form.phone);
    if (phoneError) errors.phone = phoneError;
    if (!form.sitio.trim()) errors.sitio = 'Sitio is required.';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      const result = await createResident({
        email: form.email.trim().toLowerCase(),
        firstName: form.firstName,
        middleName: form.middleName,
        lastName: form.lastName,
        phone: form.phone.trim(),
        dateOfBirth: form.dateOfBirth,
        serviceAddress: form.serviceAddress,
        sitio: form.sitio || undefined,
        meterNumber: form.meterNumber,
      });
      // Show the credentials once so staff can record them before closing.
      setCreated({
        email: form.email.trim().toLowerCase(),
        temporaryPassword: result.temporary_password ?? generatedPassword,
        accountNumber: result.account_number,
      });
      onCreated();
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
      {created ? (
        <SuccessView
          email={created.email}
          temporaryPassword={created.temporaryPassword}
          accountNumber={created.accountNumber}
          onClose={onClose}
        />
      ) : (
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
                  className={`${inputClass} ${fieldErrors.firstName ? 'border-red-400' : ''}`}
                />
                {fieldErrors.firstName && <p className="mt-1 text-xs text-red-500">{fieldErrors.firstName}</p>}
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
                  className={`${inputClass} ${fieldErrors.lastName ? 'border-red-400' : ''}`}
                />
                {fieldErrors.lastName && <p className="mt-1 text-xs text-red-500">{fieldErrors.lastName}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 uppercase mb-2">Contact Number *</label>
                <input
                  type="text"
                  placeholder="09171234567"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value.replace(/\D/g, ''))}
                  maxLength={11}
                  className={`${inputClass} ${fieldErrors.phone ? 'border-red-400' : ''}`}
                />
                {fieldErrors.phone ? (
                  <p className="mt-1 text-xs text-red-500">{fieldErrors.phone}</p>
                ) : (
                  <p className="mt-1 text-xs text-gray-400">Must start with 09 and be exactly 11 digits.</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 uppercase mb-2">Email Address *</label>
                <input
                  type="email"
                  placeholder="resident@email.com"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  className={`${inputClass} ${fieldErrors.email ? 'border-red-400' : ''}`}
                />
                {fieldErrors.email && <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 uppercase mb-2">Date of Birth *</label>
                <input
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  value={form.dateOfBirth}
                  onChange={(e) => set('dateOfBirth', e.target.value)}
                  className={`${inputClass} ${fieldErrors.dateOfBirth ? 'border-red-400' : ''}`}
                />
                {fieldErrors.dateOfBirth ? (
                  <p className="mt-1 text-xs text-red-500">{fieldErrors.dateOfBirth}</p>
                ) : (
                  <p className="mt-1 text-xs text-gray-400">Used to generate the temporary password.</p>
                )}
              </div>
              <div className="col-span-2">
                <div className="flex items-center space-x-2 mb-2">
                  <KeyRound className="w-4 h-4 text-primary-600" />
                  <label className="block text-xs font-medium text-gray-700 uppercase">
                    Temporary Password <span className="text-gray-400 normal-case">(auto-generated)</span>
                  </label>
                </div>
                <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                  <code className="text-sm font-mono font-bold text-primary-700">
                    {generatedPassword || (
                      <span className="text-gray-400 italic font-normal">
                        Enter last name and date of birth to generate
                      </span>
                    )}
                  </code>
                  {generatedPassword && (
                    <button
                      onClick={handleCopyPassword}
                      className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                      title="Copy password"
                    >
                      {passwordCopied ? (
                        <><Check className="w-3.5 h-3.5 text-green-600" /><span className="text-green-700">Copied</span></>
                      ) : (
                        <><Copy className="w-3.5 h-3.5" /><span>Copy</span></>
                      )}
                    </button>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-gray-500">
                  Format: <strong>LastNameFirstNameMMDDYYYY</strong> (e.g. DelaCruzJuan05122003).
                  This is emailed to the resident; they can change it after first login.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-4">Service Account</h3>
            <div className="grid grid-cols-2 gap-4">
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
              <div>
                <label className="block text-xs font-medium text-gray-700 uppercase mb-2">Account Number</label>
                <input
                  type="text"
                  placeholder="Auto-generated (ACC-####)"
                  disabled
                  className={`${inputClass} bg-gray-50 text-gray-500`}
                />
                <p className="mt-1 text-xs text-gray-400">Auto-generated when the resident is saved.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 uppercase mb-2">Sitio *</label>
                <div className="relative">
                  <select
                    value={form.sitio}
                    onChange={(e) => set('sitio', e.target.value)}
                    className={`${inputClass} appearance-none bg-white text-gray-900 pr-10 ${fieldErrors.sitio ? 'border-red-400' : ''}`}
                  >
                    <option value="">Select a sitio</option>
                    {SITIO_OPTIONS.map((sitio) => (
                      <option key={sitio} value={sitio}>
                        {sitio}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>
                {fieldErrors.sitio ? (
                  <p className="mt-1 text-xs text-red-500">{fieldErrors.sitio}</p>
                ) : form.sitio ? (
                  <p className="mt-1 text-xs text-gray-500">Selected: <span className="font-medium text-gray-700">{form.sitio}</span></p>
                ) : (
                  <p className="mt-1 text-xs text-gray-400">Used to assign meter readings by coverage area.</p>
                )}
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 uppercase mb-2">Service Address</label>
                <input
                  type="text"
                  placeholder="House No., Street, Barangay"
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
      )}
    </div>
  );
};

/**
 * Shown after a resident is created successfully — the staff member records
 * the temporary password (and account number) before closing the modal.
 */
const SuccessView: React.FC<{
  email: string;
  temporaryPassword: string;
  accountNumber: string | null;
  onClose: () => void;
}> = ({ email, temporaryPassword, accountNumber, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable in some webviews — ignore.
    }
  };

  return (
    <div className="bg-white rounded-2xl w-full max-w-md p-8">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Resident account created</h2>
        <p className="mt-1 text-sm text-gray-600">
          The resident can now sign in to the Residents mobile app with these credentials.
        </p>
      </div>

      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase">Email</p>
          <p className="text-sm font-semibold text-gray-900">{email}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase">Temporary Password</p>
          <div className="flex items-center justify-between gap-2">
            <code className="text-sm font-mono font-bold text-primary-700 break-all">
              {temporaryPassword}
            </code>
            <button
              onClick={handleCopy}
              className="shrink-0 flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
            >
              {copied ? (
                <><Check className="w-3.5 h-3.5 text-green-600" /><span className="text-green-700">Copied</span></>
              ) : (
                <><Copy className="w-3.5 h-3.5" /><span>Copy</span></>
              )}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Resident should change this after their first login.
          </p>
        </div>
        {accountNumber && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase">Account Number</p>
            <p className="text-sm font-semibold text-gray-900">{accountNumber}</p>
          </div>
        )}
      </div>

      <button
        onClick={onClose}
        className="mt-6 w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-all duration-200"
      >
        Done
      </button>
    </div>
  );
};

const EditResidentModal: React.FC<{
  resident: ResidentRecord;
  onClose: () => void;
  onSaved: () => void;
}> = ({ resident, onClose, onSaved }) => {
  const [form, setForm] = useState<AddResidentForm>({
    firstName: resident.firstName,
    middleName: resident.middleName ?? '',
    lastName: resident.lastName,
    email: resident.email,
    phone: resident.phone ?? '',
    dateOfBirth: (resident.dateOfBirth ?? '').slice(0, 10),
    serviceAddress: resident.serviceAddress ?? '',
    sitio: resident.sitio ?? '',
    meterNumber: resident.meterNumber ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof AddResidentForm, string>>>({});

  const set = (key: keyof AddResidentForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSave = async () => {
    setError(null);
    const errors: Partial<Record<keyof AddResidentForm, string>> = {};
    if (!form.firstName.trim()) errors.firstName = 'First name is required.';
    if (!form.lastName.trim()) errors.lastName = 'Last name is required.';
    const phoneError = validatePhone(form.phone);
    if (phoneError) errors.phone = phoneError;
    if (!form.sitio.trim()) errors.sitio = 'Sitio is required.';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      await updateResident(resident, {
        firstName: form.firstName,
        middleName: form.middleName,
        lastName: form.lastName,
        phone: form.phone.trim(),
        dateOfBirth: form.dateOfBirth,
        serviceAddress: form.serviceAddress,
        sitio: form.sitio,
        meterNumber: form.meterNumber,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update resident.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Edit Resident</h2>
            <p className="text-sm text-gray-600 mt-1">
              Update personal and service account information
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

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
                  className={`${inputClass} ${fieldErrors.firstName ? 'border-red-400' : ''}`}
                />
                {fieldErrors.firstName && <p className="mt-1 text-xs text-red-500">{fieldErrors.firstName}</p>}
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
                  className={`${inputClass} ${fieldErrors.lastName ? 'border-red-400' : ''}`}
                />
                {fieldErrors.lastName && <p className="mt-1 text-xs text-red-500">{fieldErrors.lastName}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 uppercase mb-2">Contact Number *</label>
                <input
                  type="text"
                  placeholder="09171234567"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value.replace(/\D/g, ''))}
                  maxLength={11}
                  className={`${inputClass} ${fieldErrors.phone ? 'border-red-400' : ''}`}
                />
                {fieldErrors.phone ? (
                  <p className="mt-1 text-xs text-red-500">{fieldErrors.phone}</p>
                ) : (
                  <p className="mt-1 text-xs text-gray-400">Must start with 09 and be exactly 11 digits.</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 uppercase mb-2">Email Address</label>
                <input
                  type="email"
                  value={form.email}
                  disabled
                  className={`${inputClass} bg-gray-50 text-gray-500`}
                />
                <p className="mt-1 text-xs text-gray-400">Email cannot be changed after the account is created.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 uppercase mb-2">Date of Birth</label>
                <input
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  value={form.dateOfBirth}
                  onChange={(e) => set('dateOfBirth', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-4">Service Account</h3>
            <div className="grid grid-cols-2 gap-4">
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
              <div>
                <label className="block text-xs font-medium text-gray-700 uppercase mb-2">Account Number</label>
                <input
                  type="text"
                  value={resident.accountNumber ?? '—'}
                  disabled
                  className={`${inputClass} bg-gray-50 text-gray-500`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 uppercase mb-2">Sitio *</label>
                <div className="relative">
                  <select
                    value={form.sitio}
                    onChange={(e) => set('sitio', e.target.value)}
                    className={`${inputClass} appearance-none bg-white text-gray-900 pr-10 ${fieldErrors.sitio ? 'border-red-400' : ''}`}
                  >
                    <option value="">Select a sitio</option>
                    {SITIO_OPTIONS.map((sitio) => (
                      <option key={sitio} value={sitio}>
                        {sitio}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>
                {fieldErrors.sitio && <p className="mt-1 text-xs text-red-500">{fieldErrors.sitio}</p>}
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 uppercase mb-2">Service Address</label>
                <input
                  type="text"
                  placeholder="House No., Street, Barangay"
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
            {saving ? 'Saving…' : 'Save Changes'}
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
  const [editingResident, setEditingResident] = useState<ResidentRecord | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

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
      (r.sitio ?? '').toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q)
    );
  });

  const handleStatusChange = async (
    resident: ResidentRecord,
    status: 'active' | 'inactive'
  ) => {
    if (resident.connectionStatus === status) return;
    setActioningId(resident.id);
    setError(null);
    try {
      await setResidentStatus(resident, status);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update resident status.');
    } finally {
      setActioningId(null);
    }
  };

  const handleExport = () => {
    if (filteredResidents.length === 0) return;
    const header = ['Name', 'Email', 'Phone', 'Account No.', 'Meter ID', 'Address', 'Sitio', 'Status', 'Created'];
    const rows = filteredResidents.map((r) => [
      r.fullName,
      r.email,
      r.phone ?? '',
      r.accountNumber ?? '',
      r.meterNumber ?? '',
      r.serviceAddress ?? '',
      r.sitio ?? '',
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
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Sitio</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="flex items-center justify-center space-x-2 text-gray-400">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Loading residents…</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredResidents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {resident.sitio ?? '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadge(resident.connectionStatus)}`}>
                            {getStatusText(resident.connectionStatus)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => setEditingResident(resident)}
                              disabled={actioningId === resident.id}
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleStatusChange(resident, 'active')}
                              disabled={
                                actioningId === resident.id ||
                                resident.connectionStatus === 'active'
                              }
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              title="Activate"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>{actioningId === resident.id ? '…' : 'Activate'}</span>
                            </button>
                            <button
                              onClick={() => handleStatusChange(resident, 'inactive')}
                              disabled={
                                actioningId === resident.id ||
                                resident.connectionStatus === 'inactive'
                              }
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              title="Deactivate"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              <span>{actioningId === resident.id ? '…' : 'Deactivate'}</span>
                            </button>
                          </div>
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

      {editingResident && (
        <EditResidentModal
          resident={editingResident}
          onClose={() => setEditingResident(null)}
          onSaved={load}
        />
      )}
    </>
  );
};

export default Residents;
