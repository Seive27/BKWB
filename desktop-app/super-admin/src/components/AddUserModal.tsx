import React, { useState } from 'react';
import { X, User, Mail, Lock, Eye, EyeOff, ChevronDown } from 'lucide-react';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userData: UserFormData) => void;
}

export interface UserFormData {
  fullName: string;
  emailAddress: string;
  role: string;
  temporaryPassword: string;
  requireMFA: boolean;
}

const AddUserModal: React.FC<AddUserModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<UserFormData>({
    fullName: '',
    emailAddress: '',
    role: '',
    temporaryPassword: '',
    requireMFA: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<UserFormData>>({});

  const roles = [
    'Super Admin',
    'Water Billing Staff',
    'Meter Reader',
    'Consumer',
  ];

  const validateForm = () => {
    const newErrors: Partial<UserFormData> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.emailAddress.trim()) {
      newErrors.emailAddress = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailAddress)) {
      newErrors.emailAddress = 'Invalid email format';
    }

    if (!formData.role) {
      newErrors.role = 'Role assignment is required';
    }

    if (!formData.temporaryPassword) {
      newErrors.temporaryPassword = 'Temporary password is required';
    } else if (formData.temporaryPassword.length < 12) {
      newErrors.temporaryPassword = 'Password must be at least 12 characters';
    } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.temporaryPassword)) {
      newErrors.temporaryPassword = 'Password must contain at least one symbol';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(formData);
      handleClose();
    }
  };

  const handleClose = () => {
    setFormData({
      fullName: '',
      emailAddress: '',
      role: '',
      temporaryPassword: '',
      requireMFA: false,
    });
    setErrors({});
    setShowPassword(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Add User</h2>
            <p className="text-xs text-gray-500 mt-1">
              Provision a new administrative account
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
        <div className="px-6 py-6 space-y-6">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-2">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="e.g. Sarah Connor"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                className={`w-full pl-10 pr-4 py-2.5 border ${
                  errors.fullName ? 'border-red-300' : 'border-gray-300'
                } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm`}
              />
            </div>
            {errors.fullName && (
              <p className="text-xs text-red-600 mt-1">{errors.fullName}</p>
            )}
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                placeholder="user@organization.com"
                value={formData.emailAddress}
                onChange={(e) =>
                  setFormData({ ...formData, emailAddress: e.target.value })
                }
                className={`w-full pl-10 pr-4 py-2.5 border ${
                  errors.emailAddress ? 'border-red-300' : 'border-gray-300'
                } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm`}
              />
            </div>
            {errors.emailAddress && (
              <p className="text-xs text-red-600 mt-1">{errors.emailAddress}</p>
            )}
          </div>

          {/* Role Assignment */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-2">
              Role Assignment
            </label>
            <div className="relative">
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className={`w-full px-4 py-2.5 border ${
                  errors.role ? 'border-red-300' : 'border-gray-300'
                } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm appearance-none bg-white`}
              >
                <option value="">Select a permission tier...</option>
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            {errors.role && (
              <p className="text-xs text-red-600 mt-1">{errors.role}</p>
            )}
          </div>

          {/* Temporary Password */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-2">
              Temporary Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={formData.temporaryPassword}
                onChange={(e) =>
                  setFormData({ ...formData, temporaryPassword: e.target.value })
                }
                className={`w-full pl-10 pr-10 py-2.5 border ${
                  errors.temporaryPassword ? 'border-red-300' : 'border-gray-300'
                } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Password must contain at least 12 characters and one symbol.
            </p>
            {errors.temporaryPassword && (
              <p className="text-xs text-red-600 mt-1">{errors.temporaryPassword}</p>
            )}
          </div>

          {/* MFA Checkbox */}
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="requireMFA"
              checked={formData.requireMFA}
              onChange={(e) =>
                setFormData({ ...formData, requireMFA: e.target.checked })
              }
              className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="requireMFA" className="text-sm text-gray-700 cursor-pointer">
              Require MFA on first login
            </label>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end space-x-3 rounded-b-2xl">
          <button
            onClick={handleClose}
            className="px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Create User
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddUserModal;
