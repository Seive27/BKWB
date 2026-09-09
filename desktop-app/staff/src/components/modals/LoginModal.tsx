import React, { useState, useRef, useCallback, useEffect } from 'react';
import { LogIn, Loader2, Eye, EyeOff, KeyRound, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import logo from '../../assets/logo.jpg';
import { PasswordStrengthHint } from '../ui/PasswordStrengthHint';
import { getPasswordValidationError } from '../../lib/password';
import {
  cancelPasswordReset,
  completePasswordReset,
  resetPassword,
  verifyPasswordResetOtp,
} from '../../services/authService';

interface LoginModalProps {
  portalName: string;
  closing: boolean;
  onLogin: (email: string, password: string) => Promise<void>;
}

const LoginModal: React.FC<LoginModalProps> = ({ portalName, closing, onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  // Forgot-password flow state.
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const emailRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onLogin(email.trim().toLowerCase(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  }, [email, password, onLogin]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onMouseDown={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`BKWB ${portalName} Login`}
        className={`
          w-[450px] bg-white rounded-2xl shadow-2xl
          flex flex-col overflow-hidden
          transition-all duration-300 ease-out
          focus:outline-none
          ${closing ? 'opacity-0 scale-95 translate-y-2 pointer-events-none' : 'opacity-100 scale-100 translate-y-0'}
        `}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="px-10 pt-10 pb-2 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md ring-4 ring-primary-50 mb-3">
            <img src={logo} alt="BKWB Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight text-center">Barangay Kalunasan</h1>
          <h1 className="text-xl font-bold text-gray-900 leading-tight mb-2 text-center">Water Billing</h1>
          <div className="inline-block px-4 py-1 bg-primary-50 rounded-full">
            <p className="text-xs font-semibold text-primary-700">{portalName}</p>
          </div>
        </div>

        {mode === 'forgot' ? (
          <ForgotPasswordView initialEmail={email} onBack={() => setMode('login')} />
        ) : (
        <form onSubmit={handleSubmit} className="px-10 pt-6 pb-8 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
            <input
              ref={emailRef}
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              disabled={isSubmitting}
              autoComplete="email"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={isSubmitting}
                autoComplete="current-password"
                className="w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center space-x-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 animate-slide-down">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-sm hover:shadow-md"
          >
            {isSubmitting ? (
              <><Loader2 className="w-5 h-5 animate-spin" /><span>Signing in...</span></>
            ) : (
              <><LogIn className="w-5 h-5" /><span>Login</span></>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('forgot');
            }}
            className="w-full text-center text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors duration-200 py-0.5"
          >
            Forgot Password?
          </button>

          <p className="text-center text-xs text-gray-400 select-none pt-1">Version 1.0</p>
        </form>
        )}
      </div>
    </div>
  );
};

/**
 * Forgot-password card: email → OTP → new password.
 * Rendered in place of the login form when the user taps "Forgot Password?".
 */
function ForgotPasswordView({
  initialEmail,
  onBack,
}: {
  initialEmail: string;
  onBack: () => void;
}) {
  type ResetStep = 'email' | 'otp' | 'password' | 'done';
  const OTP_LENGTH = 6;

  const [step, setStep] = useState<ResetStep>('email');
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleBack = async () => {
    await cancelPasswordReset();
    onBack();
  };

  const sendCode = async (address: string) => {
    setBusy(true);
    try {
      await resetPassword(address.toLowerCase());
    } catch (err) {
      console.warn('[forgot-password] reset request failed:', err);
    } finally {
      setBusy(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }
    setStep('otp');
    await sendCode(trimmed);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const code = otp.trim();
    if (code.length < OTP_LENGTH) {
      setError(`Please enter the ${OTP_LENGTH}-digit code from your email.`);
      return;
    }
    setBusy(true);
    try {
      await verifyPasswordResetOtp(email.trim(), code);
      setStep('password');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code.');
    } finally {
      setBusy(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
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
      await completePasswordReset(password);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-10 pt-6 pb-8">
      {step === 'done' ? (
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Password updated</h2>
          <p className="mt-2 text-sm text-gray-600 leading-6">
            You can now sign in with your new password.
          </p>
          <button
            onClick={handleBack}
            className="mt-6 w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-all duration-200"
          >
            Back to Login
          </button>
        </div>
      ) : step === 'otp' ? (
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Enter verification code</h2>
              <p className="mt-0.5 text-xs text-gray-500 leading-5">
                If an account exists for <strong className="text-gray-700">{email.trim()}</strong>,
                a {OTP_LENGTH}-digit code was sent. Enter it below.
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="forgot-otp" className="block text-sm font-medium text-gray-700 mb-1.5">
              Verification code
            </label>
            <input
              autoFocus
              id="forgot-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH))}
              placeholder={'•'.repeat(OTP_LENGTH)}
              disabled={busy}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-center text-lg font-bold tracking-[0.35em] text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={busy || otp.length < OTP_LENGTH}
            className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-sm hover:shadow-md"
          >
            {busy ? (
              <><Loader2 className="w-5 h-5 animate-spin" /><span>Verifying...</span></>
            ) : (
              <span>Verify</span>
            )}
          </button>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => { setStep('email'); setOtp(''); setError(''); }}
              className="text-gray-500 hover:text-gray-700 font-medium"
            >
              Change email
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => sendCode(email.trim())}
              className="text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
            >
              Resend code
            </button>
          </div>
        </form>
      ) : step === 'password' ? (
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Set a new password</h2>
              <p className="mt-0.5 text-xs text-gray-500 leading-5">
                Choose a new password, then sign in with it.
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="forgot-new-password" className="block text-sm font-medium text-gray-700 mb-1.5">
              New password
            </label>
            <div className="relative">
              <input
                autoFocus
                id="forgot-new-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password"
                disabled={busy}
                autoComplete="new-password"
                className="w-full pr-10 pl-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <PasswordStrengthHint password={password} />
          </div>

          <div>
            <label htmlFor="forgot-confirm-password" className="block text-sm font-medium text-gray-700 mb-1.5">
              Confirm password
            </label>
            <input
              id="forgot-confirm-password"
              type={showPassword ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your password"
              disabled={busy}
              autoComplete="new-password"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-sm hover:shadow-md"
          >
            {busy ? (
              <><Loader2 className="w-5 h-5 animate-spin" /><span>Updating...</span></>
            ) : (
              <span>Update Password</span>
            )}
          </button>

          <button
            type="button"
            onClick={handleBack}
            className="w-full flex items-center justify-center space-x-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors duration-200 py-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Cancel</span>
          </button>
        </form>
      ) : (
        <form onSubmit={handleSend} className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Reset your password</h2>
              <p className="mt-0.5 text-xs text-gray-500 leading-5">
                Enter the email linked to your account and we&apos;ll send you a 6-digit code.
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                autoFocus
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your account email"
                disabled={busy}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-sm hover:shadow-md"
          >
            {busy ? (
              <><Loader2 className="w-5 h-5 animate-spin" /><span>Sending...</span></>
            ) : (
              <><Mail className="w-5 h-5" /><span>Send Code</span></>
            )}
          </button>

          <button
            type="button"
            onClick={handleBack}
            className="w-full flex items-center justify-center space-x-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors duration-200 py-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Login</span>
          </button>
        </form>
      )}
    </div>
  );
}

export default LoginModal;
