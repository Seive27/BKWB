import React, { useState } from 'react';
import { CheckCircle2, Copy, Check } from 'lucide-react';

/**
 * Post-creation credentials view for the Super Admin "Add User" flow.
 * Shown after a user is created successfully so the operator can record the
 * account details (especially the temporary password) before closing.
 * Mirrors the Staff app's Add Resident success screen. Role-agnostic — works
 * for resident, meter_reader, staff and super_admin accounts.
 */
export interface UserCreatedInfo {
  fullName: string;
  email: string;
  /** Display label, e.g. "Meter Reader" or "Staff". */
  role: string;
  /** The EXACT password that was sent to the create-user edge function. */
  password: string;
}

const UserCreatedView: React.FC<UserCreatedInfo & { onClose: () => void }> = ({
  fullName,
  email,
  role,
  password,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password);
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
        <h2 className="text-xl font-bold text-gray-900">User Created Successfully</h2>
        <p className="mt-1 text-sm text-gray-600">
          The account can now sign in with these credentials.
        </p>
      </div>

      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase">Full Name</p>
          <p className="text-sm font-semibold text-gray-900">{fullName}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase">Email</p>
          <p className="text-sm font-semibold text-gray-900 break-all">{email}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase">Role</p>
          <p className="text-sm font-semibold text-gray-900">{role}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase">Temporary Password</p>
          <div className="flex items-center justify-between gap-2">
            <code className="text-sm font-mono font-bold text-primary-700 break-all">
              {password}
            </code>
            <button
              onClick={handleCopy}
              className="shrink-0 flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-green-700">Password copied.</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Password</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
        <p className="text-xs text-amber-700 leading-5">
          Save this temporary password securely. It will not be shown again after closing this
          window.
        </p>
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

export default UserCreatedView;
