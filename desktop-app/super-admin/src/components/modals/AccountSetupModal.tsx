import React, { useEffect, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, User } from 'lucide-react';
import { PasswordStrengthHint } from '../ui/PasswordStrengthHint';
import { getPasswordValidationError } from '../../lib/password';
import { useAuth } from '../../hooks/useAuth';
import {
  changePassword,
  completeFirstLogin,
  sendRegisteredEmailOtp,
  verifyRegisteredEmailOtp,
} from '../../services/authService';

type SetupStep = 'otp' | 'password' | 'profile' | 'done';

const OTP_LENGTH = 6;

interface AccountSetupModalProps {
  onComplete: () => void;
  onSignOut: () => void;
}

/**
 * First login for an account registered with an email and temporary password.
 * Reuses the forgot-password OTP field, password hint, and profile fields.
 */
const AccountSetupModal: React.FC<AccountSetupModalProps> = ({ onComplete, onSignOut }) => {
  const { profile } = useAuth();
  const email = profile?.email ?? '';

  const [step, setStep] = useState<SetupStep>('otp');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [middleName, setMiddleName] = useState(profile?.middle_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    sendRegisteredEmailOtp().catch((err: unknown) => {
      if (cancelled) return;
      setError(err instanceof Error ? err.message : 'Could not send the verification code.');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (otp.trim().length < OTP_LENGTH) {
      setError(`Please enter the ${OTP_LENGTH}-digit code from your email.`);
      return;
    }
    setBusy(true);
    try {
      await verifyRegisteredEmailOtp(email, otp);
      setStep('password');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code.');
    } finally {
      setBusy(false);
    }
  };

  const handlePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const validationError = getPasswordValidationError(password);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await changePassword(password);
      setStep('profile');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setBusy(false);
    }
  };

  const handleProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await completeFirstLogin({ firstName, middleName, lastName, phone });
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your profile.');
    } finally {
      setBusy(false);
    }
  };

  const stepNumber = step === 'otp' ? 1 : step === 'password' ? 2 : 3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="px-8 pt-7 pb-6">
          {step === 'done' ? (
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">You're all set</h2>
              <p className="mt-2 text-sm text-gray-600 leading-6">
                Your email is verified and your new password is active.
              </p>
              <button
                type="button"
                onClick={onComplete}
                className="mt-6 w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg"
              >
                Continue
              </button>
            </div>
          ) : step === 'password' ? (
            <form onSubmit={handlePassword} className="space-y-4">
              <StepHeader
                step={stepNumber}
                title="Create your password"
                subtitle="This replaces the temporary password from your registration email."
              />
              <div>
                <label htmlFor="setup-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  New password
                </label>
                <div className="relative">
                  <input
                    id="setup-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    className="w-full pr-10 pl-4 py-2.5 border border-gray-300 rounded-lg text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <PasswordStrengthHint password={password} />
              </div>
              <div>
                <label htmlFor="setup-confirm" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Confirm password
                </label>
                <input
                  id="setup-confirm"
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  autoComplete="new-password"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <ErrorText message={error} />
              <PrimaryButton busy={busy} label="Continue" busyLabel="Saving..." />
            </form>
          ) : step === 'profile' ? (
            <form onSubmit={handleProfile} className="space-y-4">
              <StepHeader
                step={stepNumber}
                title="Review your information"
                subtitle="Confirm the details on your account. You can update them now."
                icon="user"
              />
              <p className="text-xs text-gray-500">
                Verified email: <span className="font-semibold text-gray-800">{email}</span>
              </p>
              <div className="grid grid-cols-1 gap-3">
                <Field label="First name" value={firstName} onChange={setFirstName} required />
                <Field label="Middle name" value={middleName} onChange={setMiddleName} />
                <Field label="Last name" value={lastName} onChange={setLastName} required />
                <Field
                  label="Contact number"
                  value={phone}
                  onChange={(value) => setPhone(value.replace(/[^0-9]/g, '').slice(0, 11))}
                  placeholder="09XXXXXXXXX"
                />
              </div>
              <ErrorText message={error} />
              <PrimaryButton busy={busy} label="Finish setup" busyLabel="Saving..." />
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <StepHeader
                step={stepNumber}
                title="Verify your email"
                subtitle={`We sent a verification code to ${email || 'your email'} to confirm this email.`}
              />
              <div>
                <label htmlFor="setup-otp" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Verification code
                </label>
                <input
                  autoFocus
                  id="setup-otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(event) =>
                    setOtp(event.target.value.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH))
                  }
                  placeholder={'•'.repeat(OTP_LENGTH)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-center text-lg font-bold tracking-[0.35em]"
                />
              </div>
              <ErrorText message={error} />
              <PrimaryButton
                busy={busy}
                label="Verify"
                busyLabel="Verifying..."
                disabled={otp.length < OTP_LENGTH}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setError('');
                  sendRegisteredEmailOtp().catch((err: unknown) => {
                    setError(err instanceof Error ? err.message : 'Could not resend the code.');
                  });
                }}
                className="w-full text-sm font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50"
              >
                Resend code
              </button>
            </form>
          )}

          {step !== 'done' && (
            <button
              type="button"
              onClick={onSignOut}
              className="mt-4 w-full text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Sign out instead
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

function StepHeader({
  step,
  title,
  subtitle,
  icon = 'key',
}: {
  step: number;
  title: string;
  subtitle: string;
  icon?: 'key' | 'user';
}) {
  return (
    <div className="flex items-start space-x-3">
      <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
        {icon === 'user' ? (
          <User className="w-5 h-5 text-primary-600" />
        ) : (
          <KeyRound className="w-5 h-5 text-primary-600" />
        )}
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-600">
          Step {step} of 3
        </p>
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        <p className="mt-0.5 text-xs text-gray-500 leading-5">{subtitle}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required ? ' *' : ''}
      </label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
      />
    </div>
  );
}

function ErrorText({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
      <p className="text-sm text-red-700 font-medium">{message}</p>
    </div>
  );
}

function PrimaryButton({
  busy,
  label,
  busyLabel,
  disabled,
}: {
  busy: boolean;
  label: string;
  busyLabel: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={busy || disabled}
      className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
    >
      {busy ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>{busyLabel}</span>
        </>
      ) : (
        <span>{label}</span>
      )}
    </button>
  );
}

export default AccountSetupModal;
