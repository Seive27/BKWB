import React, { useEffect, useState } from 'react';
import {
  User,
  Mail,
  Phone,
  Lock,
  Shield,
  Save,
  LogOut,
  Camera,
  X,
} from 'lucide-react';
import ProfileSummaryCard from '../components/ui/ProfileSummaryCard';
import LogoutModal from '../components/modals/LogoutModal';
import { useAuth } from '../hooks/useAuth';
import {
  updateOwnProfile,
  changeOwnPassword,
} from '../services/profileService';
import type { StaffProfile } from '../types';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Administrator',
  staff: 'Water Billing Staff',
  meter_reader: 'Meter Reader',
  resident: 'Resident',
};

const ProfileSettings: React.FC = () => {
  const { user, profile: authProfile, logout: authLogout } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Password fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Seed the form from the real logged-in profile.
  useEffect(() => {
    if (authProfile) {
      setFirstName(authProfile.first_name ?? '');
      setMiddleName(authProfile.middle_name ?? '');
      setLastName(authProfile.last_name ?? '');
      setPhone(authProfile.phone ?? '');
      setAvatarUrl(authProfile.avatar_url ?? '');
    }
  }, [authProfile]);

  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  const roleName = user?.role ?? authProfile?.role?.name ?? 'staff';
  const email = authProfile?.email ?? user?.email ?? '';

  const summaryProfile: StaffProfile = {
    id: user?.id ?? '',
    fullName: fullName || 'BKWB User',
    employeeId: ROLE_LABELS[roleName] ?? roleName,
    position: ROLE_LABELS[roleName] ?? roleName,
    office: 'Barangay Kalunasan Water Billing Office',
    email,
    mobileNumber: phone,
    address: '',
    profilePicture: avatarUrl || undefined,
    accountStatus: 'active',
    lastLogin: '—',
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await updateOwnProfile({
        firstName,
        middleName,
        lastName,
        phone,
        avatarUrl,
      });
      setMessage({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'New password must be at least 8 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }
    setSavingPassword(true);
    setMessage(null);
    try {
      await changeOwnPassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setMessage({ type: 'success', text: 'Password updated successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update password.' });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogoutConfirm = async () => {
    setShowLogoutModal(false);
    // Use the auth context so app state (user/profile/login screen) stays in sync.
    await authLogout();
  };

  const inputClass =
    'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile Settings</h1>
          <p className="text-gray-600">Manage your account information and security settings.</p>
        </div>

        {message && (
          <div
            className={`mb-6 border rounded-lg px-4 py-3 text-sm ${
              message.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Summary */}
          <div className="lg:col-span-1">
            <ProfileSummaryCard profile={summaryProfile} />
          </div>

          {/* Right Column - Settings Sections */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section 1 - Personal Information */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-6">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-medium text-gray-700 uppercase mb-2">First Name *</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 uppercase mb-2">Middle Name</label>
                  <input
                    type="text"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 uppercase mb-2">Last Name *</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 uppercase mb-2">Mobile Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={`${inputClass} pl-10`}
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 uppercase mb-2">
                    Profile Picture URL
                  </label>
                  <div className="relative">
                    <Camera className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="https://…/photo.jpg"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className={`${inputClass} pl-10`}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-medium text-gray-700 uppercase mb-2">Email Address (read only)</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      disabled
                      className={`${inputClass} pl-10 bg-gray-50 text-gray-500`}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 uppercase mb-2">Role (read only)</label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={ROLE_LABELS[roleName] ?? roleName}
                      disabled
                      className={`${inputClass} pl-10 bg-gray-50 text-gray-500`}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving…' : 'Save Changes'}</span>
                </button>
                <button
                  onClick={() => {
                    setMessage(null);
                    if (authProfile) {
                      setFirstName(authProfile.first_name ?? '');
                      setMiddleName(authProfile.middle_name ?? '');
                      setLastName(authProfile.last_name ?? '');
                      setPhone(authProfile.phone ?? '');
                      setAvatarUrl(authProfile.avatar_url ?? '');
                    }
                  }}
                  className="flex items-center space-x-2 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
              </div>
            </div>

            {/* Section 2 - Account Security */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-6">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                  <Lock className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Account Security</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-medium text-gray-700 uppercase mb-2">New Password</label>
                  <input
                    type="password"
                    placeholder="Enter new password (min 8 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 uppercase mb-2">Confirm Password</label>
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={handleUpdatePassword}
                  disabled={savingPassword}
                  className="flex items-center space-x-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  <Shield className="w-4 h-4" />
                  <span>{savingPassword ? 'Updating…' : 'Update Password'}</span>
                </button>
              </div>
            </div>

            {/* Section 3 - Session */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-6">
                <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                  <LogOut className="w-5 h-5 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Session</h3>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowLogoutModal(true)}
                  className="flex items-center space-x-2 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Logout Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogoutConfirm}
      />
    </div>
  );
};

export default ProfileSettings;
