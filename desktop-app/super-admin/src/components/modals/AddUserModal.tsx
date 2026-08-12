import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import { generateTemporaryPassword, validatePhone } from '../../services/residentService';
import { getPasswordValidationError } from '../../lib/password';
import UserCreatedView, { type UserCreatedInfo } from './UserCreatedView';
import { PasswordStrengthHint } from '../ui/PasswordStrengthHint';

export type { UserCreatedInfo };

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userData: UserFormData) => void;
  /** When true, the Create button shows a spinner and ignores clicks. */
  submitting?: boolean;
  /** Non-field error from the create-user edge function — shown in the form. */
  error?: string | null;
  /** When set, the modal switches to the post-creation credentials view. */
  createdUser?: UserCreatedInfo | null;
}

/** Fresh form state — used for the initial render and when the modal reopens. */
const EMPTY_FORM: UserFormData = {
  firstName: '',
  middleName: '',
  lastName: '',
  dateOfBirth: '',
  cellNumber: '',
  emailAddress: '',
  role: '',
  password: '',
};

export interface UserFormData {
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  cellNumber: string;
  emailAddress: string;
  role: string;
  password: string;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Mask typed digits into YYYY-MM-DD as the user types. */
function formatIsoDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function parseIsoDate(value: string): { y: number; m: number; d: number } | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return { y, m, d };
}

function toIsoDate(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Capitalize the first letter of each word (e.g. "juan dela cruz" → "Juan Dela Cruz"). */
function capitalizeName(value: string): string {
  return value.replace(/(^|\s)(\S)/g, (_match, space: string, char: string) => space + char.toUpperCase());
}

/** Defined outside the modal so React keeps the same component identity across re-renders
 *  (defining it inside caused inputs to remount and lose focus after each keystroke). */
const InputField = ({
  label,
  value,
  onChange,
  placeholder,
  icon: Icon,
  error,
  required,
  disabled,
  type = 'text',
  autoCapitalize,
  autoCorrect,
  autoComplete,
  spellCheck,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: React.FC<{ className?: string }>;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  type?: string;
  autoCapitalize?: 'none' | 'off' | 'sentences' | 'words' | 'characters';
  autoCorrect?: 'on' | 'off';
  autoComplete?: string;
  spellCheck?: boolean;
}) => (
  <div>
    <label className="block text-xs font-semibold text-gray-700 uppercase mb-2">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
      {!required && <span className="text-gray-400 font-normal lowercase"> (optional)</span>}
    </label>
    <div className="relative">
      {Icon && (
        <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        autoComplete={autoComplete}
        spellCheck={spellCheck}
        className={`w-full ${Icon ? 'pl-10' : 'px-4'} pr-4 py-2.5 border ${
          error ? 'border-red-300' : 'border-gray-300'
        } rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm disabled:bg-gray-50 disabled:text-gray-500`}
      />
    </div>
    {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
  </div>
);

/** Typable YYYY-MM-DD field with a large month/year calendar dropdown. */
const DateOfBirthField = ({
  value,
  onChange,
  error,
  maxIso,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  maxIso: string;
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const parsed = parseIsoDate(value);
  const maxParsed = parseIsoDate(maxIso) ?? {
    y: new Date().getFullYear(),
    m: new Date().getMonth() + 1,
    d: new Date().getDate(),
  };

  const [viewYear, setViewYear] = useState(parsed?.y ?? maxParsed.y - 18);
  const [viewMonth, setViewMonth] = useState(parsed?.m ?? maxParsed.m);

  useEffect(() => {
    if (!open) return;
    if (parsed) {
      setViewYear(parsed.y);
      setViewMonth(parsed.m);
    }
  }, [open, parsed?.y, parsed?.m]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = maxParsed.y; y >= 1900; y -= 1) list.push(y);
    return list;
  }, [maxParsed.y]);

  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth - 1, 1).getDay();

  const isAfterMax = (y: number, m: number, d: number) =>
    y > maxParsed.y ||
    (y === maxParsed.y && m > maxParsed.m) ||
    (y === maxParsed.y && m === maxParsed.m && d > maxParsed.d);

  const selectDay = (day: number) => {
    if (isAfterMax(viewYear, viewMonth, day)) return;
    onChange(toIsoDate(viewYear, viewMonth, day));
    setOpen(false);
  };

  const shiftMonth = (delta: number) => {
    const date = new Date(viewYear, viewMonth - 1 + delta, 1);
    const nextY = date.getFullYear();
    const nextM = date.getMonth() + 1;
    if (nextY < 1900 || nextY > maxParsed.y) return;
    if (nextY === maxParsed.y && nextM > maxParsed.m) return;
    setViewYear(nextY);
    setViewMonth(nextM);
  };

  return (
    <div ref={rootRef}>
      <label className="block text-xs font-semibold text-gray-700 uppercase mb-2">
        Date of Birth <span className="text-red-500 ml-0.5">*</span>
      </label>
      <div className="relative">
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          inputMode="numeric"
          placeholder="YYYY-MM-DD"
          value={value}
          onChange={(e) => onChange(formatIsoDateInput(e.target.value))}
          className={`w-full pl-10 pr-12 py-2.5 border ${
            error ? 'border-red-300' : 'border-gray-300'
          } rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm font-mono tracking-wide`}
        />
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
          title="Open calendar"
          aria-label="Open calendar"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && (
        <div className="mt-2 w-full rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
          <div className="mb-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <select
              value={viewMonth}
              onChange={(e) => setViewMonth(Number(e.target.value))}
              className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {MONTH_NAMES.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={viewYear}
              onChange={(e) => setViewYear(Number(e.target.value))}
              className="w-[7rem] rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              aria-label="Next month"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: firstWeekday }).map((_, index) => (
              <div key={`empty-${index}`} className="h-11" />
            ))}
            {Array.from({ length: daysInMonth }, (_, index) => {
              const day = index + 1;
              const iso = toIsoDate(viewYear, viewMonth, day);
              const selected = value === iso;
              const disabled = isAfterMax(viewYear, viewMonth, day);
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={disabled}
                  onClick={() => selectDay(day)}
                  className={`h-11 rounded-lg text-sm font-medium transition-colors ${
                    selected
                      ? 'bg-primary-600 text-white'
                      : disabled
                        ? 'cursor-not-allowed text-gray-300'
                        : 'text-gray-700 hover:bg-primary-50 hover:text-primary-700'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <p className="mt-3 text-center text-xs text-gray-400">Format: YYYY-MM-DD</p>
        </div>
      )}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
};

const AddUserModal: React.FC<AddUserModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  submitting = false,
  error,
  createdUser,
}) => {
  const [formData, setFormData] = useState<UserFormData>(EMPTY_FORM);

  const [showPassword, setShowPassword] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof UserFormData, string>>>({});

  // Reset the form every time the modal opens so credentials from a
  // previously created user never linger in the inputs.
  useEffect(() => {
    if (isOpen) {
      setFormData(EMPTY_FORM);
      setErrors({});
      setShowPassword(false);
      setPasswordCopied(false);
    }
  }, [isOpen]);

  const roles = ['Resident', 'Meter Reader', 'Staff', 'Super Admin'];
  const isAutoGeneratedRole = formData.role === 'Resident' || formData.role === 'Meter Reader';
  const isManualRole = formData.role === 'Staff' || formData.role === 'Super Admin';
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Auto-generate temporary password for Resident/Meter Reader.
  // Format (professor requirement): LastNameFirstNameMMDDYYYY, e.g. DelaCruzJuan05122003.
  const autoPassword = useMemo(() => {
    if (!isAutoGeneratedRole || !formData.lastName || !formData.dateOfBirth) return '';
    try {
      return generateTemporaryPassword(formData.firstName, formData.lastName, formData.dateOfBirth);
    } catch {
      return '';
    }
  }, [formData.firstName, formData.lastName, formData.dateOfBirth, isAutoGeneratedRole]);

  // Generate password for Staff/Super Admin (meets strength requirements)
  const handleGeneratePassword = useCallback(() => {
    const base = (formData.lastName || 'User').replace(/\s+/g, '');
    const titled = base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
    const orgSuffix = formData.emailAddress.includes('@bkwb.com') ? 'Bkwb' : 'Org';
    const year = new Date().getFullYear();
    const randomDigits = Math.floor(10 + Math.random() * 89).toString();
    const generated = `${titled}_${orgSuffix}${year}${randomDigits}!`;
    setFormData((prev) => ({ ...prev, password: generated }));
  }, [formData.lastName, formData.emailAddress]);

  const handleCopyPassword = () => {
    const pwd = isAutoGeneratedRole ? autoPassword : formData.password;
    if (pwd) {
      navigator.clipboard.writeText(pwd);
      setPasswordCopied(true);
      setTimeout(() => setPasswordCopied(false), 2000);
    }
  };

  const validateForm = () => {
    const newErrors: Partial<Record<keyof UserFormData, string>> = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.dateOfBirth.trim()) newErrors.dateOfBirth = 'Date of birth is required';
    else if (!parseIsoDate(formData.dateOfBirth.trim()))
      newErrors.dateOfBirth = 'Enter a complete date in YYYY-MM-DD format';
    else if (formData.dateOfBirth.trim() > todayIso)
      newErrors.dateOfBirth = 'Date of birth cannot be in the future';
    const phoneError = validatePhone(formData.cellNumber);
    if (phoneError) newErrors.cellNumber = phoneError;
    if (!formData.emailAddress.trim()) newErrors.emailAddress = 'Email address is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailAddress))
      newErrors.emailAddress = 'Invalid email format';
    if (!formData.role) newErrors.role = 'Role assignment is required';
    if (isAutoGeneratedRole && !autoPassword)
      newErrors.dateOfBirth = 'Date of birth is required to generate the temporary password';
    if (isManualRole && !formData.password.trim())
      newErrors.password = 'Password is required for this role';
    else if (isManualRole && formData.password.trim()) {
      const strengthError = getPasswordValidationError(formData.password.trim());
      if (strengthError) newErrors.password = strengthError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (submitting) return;
    if (validateForm()) {
      onSubmit({
        ...formData,
        firstName: capitalizeName(formData.firstName.trim()),
        middleName: capitalizeName(formData.middleName.trim()),
        lastName: capitalizeName(formData.lastName.trim()),
        emailAddress: formData.emailAddress.trim(),
        // date input already yields YYYY-MM-DD for the DB
        dateOfBirth: formData.dateOfBirth.trim(),
        // Trim so the displayed/returned value matches exactly what the edge
        // function uses (it trims body.password too). Auto-generated passwords
        // never contain whitespace, so this only affects manual entry.
        password: (isAutoGeneratedRole ? autoPassword : formData.password).trim(),
      });
      // Keep the modal open — the parent drives the outcome: success shows
      // the credentials view, failure shows the error inside this form.
    }
  };

  const handleClose = () => {
    setFormData(EMPTY_FORM);
    setErrors({});
    setShowPassword(false);
    setPasswordCopied(false);
    onClose();
  };

  if (!isOpen) return null;

  // Post-creation: show the credentials view instead of the form.
  if (createdUser) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <UserCreatedView
          fullName={createdUser.fullName}
          email={createdUser.email}
          role={createdUser.role}
          password={createdUser.password}
          onClose={onClose}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Create User</h2>
            <p className="text-xs text-gray-500 mt-1">
              Register a new user account in the system
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-6 space-y-5">
          {/* Personal Information Section */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-7 h-7 bg-primary-50 rounded-lg flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-primary-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">Personal Information</h3>
            </div>

            <div className="space-y-4">
              <InputField
                label="First Name"
                value={formData.firstName}
                onChange={(v) => setFormData((prev) => ({ ...prev, firstName: capitalizeName(v) }))}
                placeholder="e.g. Juan"
                icon={User}
                error={errors.firstName}
                required
                autoCapitalize="words"
                autoComplete="given-name"
              />

              <InputField
                label="Middle Name"
                value={formData.middleName}
                onChange={(v) => setFormData((prev) => ({ ...prev, middleName: capitalizeName(v) }))}
                placeholder="e.g. Reyes"
                autoCapitalize="words"
                autoComplete="additional-name"
              />

              <InputField
                label="Last Name"
                value={formData.lastName}
                onChange={(v) => setFormData((prev) => ({ ...prev, lastName: capitalizeName(v) }))}
                placeholder="e.g. Dela Cruz"
                icon={User}
                error={errors.lastName}
                required
                autoCapitalize="words"
                autoComplete="family-name"
              />

              <DateOfBirthField
                value={formData.dateOfBirth}
                onChange={(v) => setFormData((prev) => ({ ...prev, dateOfBirth: v }))}
                error={errors.dateOfBirth}
                maxIso={todayIso}
              />

              <div>
                <InputField
                  label="Cell Number"
                  value={formData.cellNumber}
                  onChange={(v) =>
                    setFormData((prev) => ({
                      ...prev,
                      cellNumber: v.replace(/\D/g, '').slice(0, 11),
                    }))
                  }
                  placeholder="09171234567"
                  icon={Phone}
                  error={errors.cellNumber}
                  required
                />
                {!errors.cellNumber && (
                  <p className="text-xs text-gray-400 mt-1">
                    Must be 11 digits starting with 09 (e.g. 09171234567).
                  </p>
                )}
              </div>

              <InputField
                label="Email Address"
                type="email"
                value={formData.emailAddress}
                onChange={(v) => setFormData((prev) => ({ ...prev, emailAddress: v }))}
                placeholder={isManualRole ? 'user@bkwb.com' : 'user@email.com'}
                icon={Mail}
                error={errors.emailAddress}
                required
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="email"
                spellCheck={false}
              />
            </div>
          </div>

          {/* Role Assignment Section */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-2">
              Role Assignment <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, role: e.target.value, password: '' }))
                }
                className={`w-full px-4 py-2.5 border ${
                  errors.role ? 'border-red-300' : 'border-gray-300'
                } rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm appearance-none bg-white`}
              >
                <option value="">Select a role...</option>
                {roles.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            {errors.role && <p className="text-xs text-red-600 mt-1">{errors.role}</p>}
          </div>

          {/* Password Section */}
          {formData.role && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center space-x-2 mb-3">
                <Key className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-700">
                  {isAutoGeneratedRole ? 'Auto-Generated Password' : 'Set Password'}
                </h3>
              </div>

              {isAutoGeneratedRole && (
                <>
                  <div className="bg-white border border-gray-200 rounded-lg p-3 mb-2">
                    <div className="flex items-center justify-between">
                      <code className="text-sm font-mono font-bold text-primary-700">
                        {autoPassword || (
                          <span className="text-gray-400 italic">
                            Fill in last name and date of birth
                          </span>
                        )}
                      </code>
                      {autoPassword && (
                        <button
                          onClick={handleCopyPassword}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-all"
                          title="Copy password"
                        >
                          {passwordCopied ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start space-x-2 text-xs text-gray-500">
                    <div className="w-1 h-1 bg-gray-400 rounded-full mt-1.5 flex-shrink-0" />
                    <p>
                      Temporary password format: <strong>LastNameFirstNameMMDDYYYY</strong>
                      (e.g. DelaCruzJuan05122003)
                    </p>
                  </div>
                  <div className="mt-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-700">
                      <strong>Note:</strong> This temporary password will be provided to the user
                      and should be changed after their first login.
                    </p>
                  </div>
                </>
              )}

              {isManualRole && (
                <>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter a strong password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, password: e.target.value }))
                      }
                      className={`w-full px-4 pr-24 py-2.5 border ${
                        errors.password ? 'border-red-300' : 'border-gray-300'
                      } rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm`}
                    />
                    <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex items-center space-x-0.5">
                      <button
                        type="button"
                        onClick={handleGeneratePassword}
                        className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        tabIndex={-1}
                        title="Generate password"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyPassword}
                        className="p-1.5 text-gray-400 hover:text-primary-600 rounded transition-colors"
                        tabIndex={-1}
                        title="Copy password"
                      >
                        {passwordCopied ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
                  <PasswordStrengthHint password={formData.password} />
                  <p className="text-xs text-gray-500 mt-2">
                    Use organization credentials (e.g., <strong>@bkwb.com</strong>).
                    Click <RefreshCw className="w-3 h-3 inline-block" /> to auto-generate.
                  </p>
                </>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end space-x-3 rounded-b-2xl">
          <button
            onClick={handleClose}
            className="px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating…' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddUserModal;
