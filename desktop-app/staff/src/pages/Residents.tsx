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
  UserPlus,
  MoreVertical,
  Eye,
} from 'lucide-react';
import {
  getResidents,
  createResident,
  updateResident,
  issueResidentLogin,
  setResidentStatus,
  getSitioOptions,
  generateTemporaryPassword,
  validatePhone,
  type ResidentRecord,
} from '../services/residentService';
import { SITIO_OPTIONS } from '../constants';
import ResidentOverviewModal from '../components/modals/ResidentOverviewModal';
import { useAuth } from '../hooks/useAuth';

const PAGE_SIZE = 10;

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
  previousReading: string;
  currentReading: string;
  previousReadingDate: string;
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
  previousReading: '',
  currentReading: '',
  previousReadingDate: '',
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
    case 'applicant':
      return 'bg-amber-100 text-amber-700';
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
    case 'applicant':
      return 'Applicant';
    default:
      return 'Inactive';
  }
}

const AddResidentModal: React.FC<{
  onClose: () => void;
  onCreated: () => void;
  sitioOptions: string[];
}> = ({ onClose, onCreated, sitioOptions }) => {
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
                    {(sitioOptions.length > 0 ? sitioOptions : SITIO_OPTIONS).map((sitio) => (
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
  sitioOptions: string[];
}> = ({ resident, onClose, onSaved, sitioOptions }) => {
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
    previousReading: resident.previousReading !== null ? String(resident.previousReading) : '',
    currentReading: resident.currentReading !== null ? String(resident.currentReading) : '',
    previousReadingDate: (resident.previousReadingDate ?? '').slice(0, 10),
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
        previousReading: form.previousReading.trim() === '' ? null : Number(form.previousReading),
        currentReading: form.currentReading.trim() === '' ? null : Number(form.currentReading),
        previousReadingDate: form.previousReadingDate || null,
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
            <h3 className="text-base font-semibold text-gray-900 mb-4">Latest Meter Readings</h3>
            <p className="text-xs text-gray-500 mb-4">
              Latest readings from the masterlist. Leave Current Reading blank when the latest reading has
              not been recorded yet — it stays blank and is never converted to zero.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 uppercase mb-2">Previous Period</label>
                <input
                  type="date"
                  value={form.previousReadingDate}
                  onChange={(e) => set('previousReadingDate', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 uppercase mb-2">Previous Reading</label>
                <input
                  type="number"
                  min={0}
                  placeholder="e.g. 1617"
                  value={form.previousReading}
                  onChange={(e) => set('previousReading', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 uppercase mb-2">Current / Latest Reading</label>
                <input
                  type="number"
                  min={0}
                  placeholder="Leave blank if not yet recorded"
                  value={form.currentReading}
                  onChange={(e) => set('currentReading', e.target.value)}
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-gray-400">Blank current reading = valid active consumer awaiting a meter reading.</p>
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
                    {(sitioOptions.length > 0 ? sitioOptions : SITIO_OPTIONS).map((sitio) => (
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
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [sitioFilter, setSitioFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sitioOptions, setSitioOptions] = useState<string[]>([]);
  const [residents, setResidents] = useState<ResidentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingResident, setEditingResident] = useState<ResidentRecord | null>(null);
  const [viewingResident, setViewingResident] = useState<ResidentRecord | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [issuingLoginId, setIssuingLoginId] = useState<string | null>(null);
  const [issuedCredentials, setIssuedCredentials] = useState<{
    accountNumber: string;
    temporaryPassword: string;
    generatedFrom: 'dob' | 'random';
    profileIsActive: boolean;
  } | null>(null);

  // Staff hold write permissions on residents (RLS is_staff()); other roles
  // viewing this page get read-only access.
  const canManageResidents = user?.role === 'staff';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [residentData, sitioData] = await Promise.all([
        getResidents(),
        getSitioOptions().catch(() => [] as string[]),
      ]);
      setResidents(residentData);
      if (sitioData.length > 0) setSitioOptions(sitioData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load residents.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Close any open row menu when clicking elsewhere.
  useEffect(() => {
    if (!openMenuId) return;
    const close = () => setOpenMenuId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openMenuId]);

  // Reset pagination whenever search/filters change.
  useEffect(() => {
    setPage(1);
  }, [searchQuery, sitioFilter, statusFilter]);

  const stats = useMemo(
    () => ({
      totalResidents: residents.length,
      activeAccounts: residents.filter((r) => r.connectionStatus === 'active').length,
      inactiveAccounts: residents.filter((r) => r.connectionStatus !== 'active').length,
    }),
    [residents]
  );

  const filteredResidents = useMemo(
    () =>
      residents.filter((r) => {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          r.fullName.toLowerCase().includes(q) ||
          (r.accountNumber ?? '').toLowerCase().includes(q) ||
          (r.meterNumber ?? '').toLowerCase().includes(q) ||
          (r.sitio ?? '').toLowerCase().includes(q) ||
          (r.email ?? '').toLowerCase().includes(q);
        const matchesSitio = sitioFilter === '' || (r.sitio ?? '') === sitioFilter;
        const matchesStatus = statusFilter === '' || r.connectionStatus === statusFilter;
        return matchesSearch && matchesSitio && matchesStatus;
      }),
    [residents, searchQuery, sitioFilter, statusFilter]
  );

  const totalPages = Math.max(1, Math.ceil(filteredResidents.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredResidents.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleStatusChange = async (
    resident: ResidentRecord,
    status: 'active' | 'inactive' | 'applicant'
  ) => {
    if (resident.connectionStatus === status) return;
    setActioningId(resident.id);
    setOpenMenuId(null);
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
    const header = ['Name', 'Email', 'Phone', 'Account No.', 'Meter ID', 'Address', 'Sitio', 'Previous Period', 'Previous Reading', 'Current Reading', 'Status', 'Created'];
    const rows = filteredResidents.map((r) => [
      r.fullName,
      r.email,
      r.phone ?? '',
      r.accountNumber ?? '',
      r.meterNumber ?? '',
      r.serviceAddress ?? '',
      r.sitio ?? '',
      r.previousReadingDate ?? '',
      r.previousReading !== null ? String(r.previousReading) : '',
      r.currentReading !== null ? String(r.currentReading) : '',
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

  /** Login credentials can be issued while a record has no real contact */
  /** email yet (masterlist imports), or still uses the internal handle. */
  const canIssueLogin = (r: ResidentRecord): boolean =>
    canManageResidents &&
    !!r.accountNumber &&
    (!r.email || /^acc-[a-z0-9-]+@example\.com$/i.test(r.email));

  const handleIssueLogin = async (resident: ResidentRecord) => {
    if (!resident.accountNumber) return;
    setOpenMenuId(null);
    setIssuingLoginId(resident.id);
    setError(null);
    try {
      const result = await issueResidentLogin(resident.accountNumber);
      setIssuedCredentials({
        accountNumber: resident.accountNumber,
        temporaryPassword: result.temporary_password,
        generatedFrom: result.generated_from,
        profileIsActive: result.profile_is_active,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to issue login credentials.');
    } finally {
      setIssuingLoginId(null);
    }
  };

  /** Valid actions for one resident, based on status + permissions. */
  const getMenuItems = (resident: ResidentRecord) => {
    const items: { label: string; icon: React.FC<{ className?: string }>; danger?: boolean; onClick: () => void; disabled?: boolean }[] = [
      {
        label: 'View Details',
        icon: Eye,
        onClick: () => {
          setOpenMenuId(null);
          setViewingResident(resident);
        },
      },
    ];
    if (!canManageResidents) return items;

    items.push({
      label: 'Edit',
      icon: Pencil,
      onClick: () => {
        setOpenMenuId(null);
        setEditingResident(resident);
      },
    });
    if (canIssueLogin(resident)) {
      items.push({
        label: issuingLoginId === resident.id ? 'Issuing…' : 'Issue Login',
        icon: KeyRound,
        onClick: () => handleIssueLogin(resident),
        disabled: issuingLoginId === resident.id,
      });
    }
    if (resident.connectionStatus !== 'active') {
      items.push({
        label: 'Activate',
        icon: UserCheck,
        onClick: () => handleStatusChange(resident, 'active'),
        disabled: actioningId === resident.id,
      });
    }
    if (resident.connectionStatus === 'active') {
      items.push({
        label: 'Deactivate',
        icon: UserX,
        danger: true,
        onClick: () => handleStatusChange(resident, 'inactive'),
        disabled: actioningId === resident.id,
      });
    }
    if (resident.connectionStatus !== 'applicant') {
      items.push({
        label: 'Mark as Applicant',
        icon: UserPlus,
        onClick: () => handleStatusChange(resident, 'applicant'),
        disabled: actioningId === resident.id,
      });
    }
    return items;
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
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name, account, or meter ID"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 w-72 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <select
                    value={sitioFilter}
                    onChange={(e) => setSitioFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    title="Filter by sitio">
                    <option value="">All Sitios</option>
                    {(sitioOptions.length > 0 ? sitioOptions : SITIO_OPTIONS).map((sitio) => (
                      <option key={sitio} value={sitio}>{sitio}</option>
                    ))}
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    title="Filter by status">
                    <option value="">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="applicant">Applicant</option>
                    <option value="disconnected">Disconnected</option>
                  </select>
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
                    disabled={filteredResidents.length === 0}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40"
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

            {/* Table (compact: resident, account, meter, sitio, current reading, status, actions) */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Resident</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Account No.</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Meter No.</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Sitio</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Current Reading</th>
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
                  ) : pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">
                          {residents.length === 0 ? 'No residents found.' : 'No residents match your search or filters.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((resident) => {
                      const menuItems = getMenuItems(resident);
                      return (
                        <tr
                          key={resident.id}
                          onClick={() => setViewingResident(resident)}
                          className="hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          <td className="px-6 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                                <span className="text-xs font-semibold text-blue-600">
                                  {getInitials(resident.firstName, resident.lastName)}
                                </span>
                              </div>
                              <div>
                                <span className="text-sm font-medium text-gray-900">{resident.fullName}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                            {resident.accountNumber ?? '—'}
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                            {resident.meterNumber ?? '—'}
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                            {resident.sitio ?? '—'}
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                            {resident.currentReading !== null ? (
                              resident.currentReading
                            ) : (
                              <span className="text-gray-400 italic">Not yet recorded</span>
                            )}
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap">
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadge(resident.connectionStatus)}`}>
                              {getStatusText(resident.connectionStatus)}
                            </span>
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="relative inline-block">
                              <button
                                onClick={() => setOpenMenuId(openMenuId === resident.id ? null : resident.id)}
                                disabled={actioningId === resident.id}
                                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40"
                                title="Actions"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                              {openMenuId === resident.id && (
                                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                                  {menuItems.map((item) => (
                                    <button
                                      key={item.label}
                                      onClick={item.onClick}
                                      disabled={item.disabled}
                                      className={`w-full flex items-center space-x-2 px-3 py-2 text-sm text-left transition-colors disabled:opacity-40 ${
                                        item.danger
                                          ? 'text-red-600 hover:bg-red-50'
                                          : 'text-gray-700 hover:bg-gray-50'
                                      }`}
                                    >
                                      <item.icon className="w-4 h-4" />
                                      <span>{item.label}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600 uppercase">
                Showing{' '}
                {filteredResidents.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}
                {' '}to{' '}
                {Math.min(safePage * PAGE_SIZE, filteredResidents.length)}
                {' '}of {filteredResidents.length} residents
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage(Math.max(1, safePage - 1))}
                  disabled={safePage <= 1}
                  className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                  disabled={safePage >= totalPages}
                  className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAddModal && (
        <AddResidentModal onClose={() => setShowAddModal(false)} onCreated={load} sitioOptions={sitioOptions} />
      )}
      {editingResident && (
        <EditResidentModal
          resident={editingResident}
          onClose={() => setEditingResident(null)}
          onSaved={load}
          sitioOptions={sitioOptions}
        />
      )}
      {viewingResident && (
        <ResidentOverviewModal resident={viewingResident} onClose={() => setViewingResident(null)} />
      )}
      {issuedCredentials && (
        <IssuedCredentialsModal
          accountNumber={issuedCredentials.accountNumber}
          temporaryPassword={issuedCredentials.temporaryPassword}
          generatedFrom={issuedCredentials.generatedFrom}
          profileIsActive={issuedCredentials.profileIsActive}
          onClose={() => setIssuedCredentials(null)}
        />
      )}
    </>
  );
};
// Shown once after issuing first-time login credentials so staff can hand
// them to the resident securely.
const IssuedCredentialsModal: React.FC<{
  accountNumber: string;
  temporaryPassword: string;
  generatedFrom: 'dob' | 'random';
  profileIsActive: boolean;
  onClose: () => void;
}> = ({ accountNumber, temporaryPassword, generatedFrom, profileIsActive, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — the password stays visible for manual copy
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="border-b border-gray-200 px-8 py-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Login Credentials Issued</h2>
            <p className="text-sm text-gray-600 mt-1">
              Share these with the resident. The password is shown only once.
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="px-8 py-6 space-y-4">
          {!profileIsActive && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm">
              This resident's profile is deactivated. Activate the account from the Actions menu,
              otherwise signing in will be refused.
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 uppercase mb-2">Account Number</label>
            <div className="w-full px-4 py-2 border border-gray-200 bg-gray-50 rounded-lg font-mono text-sm text-gray-900">
              {accountNumber}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 uppercase mb-2">Temporary Password</label>
            <div className="flex items-center space-x-2">
              <div className="flex-1 px-4 py-2 border border-gray-200 bg-gray-50 rounded-lg font-mono text-sm text-gray-900 break-all">
                {temporaryPassword}
              </div>
              <button
                onClick={handleCopy}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title="Copy password"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-600" />
                )}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              {generatedFrom === 'dob'
                ? 'Generated from the resident\'s date of birth (LastNameFirstNameMMDDYYYY).'
                : 'Randomly generated because no date of birth is on record.'}
              {' '}The resident signs in with their Account Number + this password, then can update their profile.
            </p>
          </div>
        </div>

        <div className="bg-gray-50 border-t border-gray-200 px-8 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default Residents;


