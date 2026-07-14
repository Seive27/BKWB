import React, { useState } from 'react';
import { Shield, Key, Radio, Plus, Edit } from 'lucide-react';
import BroadcastNowModal from '../components/BroadcastNowModal';

interface Role {
  id: string;
  name: string;
  users: number;
  scope: 'GLOBAL' | 'REGIONAL' | 'READ-ONLY';
  color: string;
}

const SystemSettings: React.FC = () => {
  const [isMfaEnabled, setIsMfaEnabled] = useState(true);
  const [isEncryptionEnabled, setIsEncryptionEnabled] = useState(true);
  const [minPasswordLength, setMinPasswordLength] = useState('12-characters');
  const [expirationCycle, setExpirationCycle] = useState('90-days');
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  
  // System Broadcast Settings
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [dashboardBanner, setDashboardBanner] = useState(true);
  const [inAppNotification, setInAppNotification] = useState(false);
  const [emailDispatch, setEmailDispatch] = useState(false);

  // Roles & Permissions
  const [roles, setRoles] = useState<Role[]>([
    { id: '1', name: 'Super Admin', users: 12, scope: 'GLOBAL', color: 'blue' },
    { id: '2', name: 'System Editor', users: 45, scope: 'REGIONAL', color: 'green' },
    { id: '3', name: 'Audit Only', users: 8, scope: 'READ-ONLY', color: 'orange' },
  ]);

  const getScopeColor = (scope: string) => {
    switch (scope) {
      case 'GLOBAL':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'REGIONAL':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'READ-ONLY':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getRoleDotColor = (color: string) => {
    switch (color) {
      case 'blue':
        return 'bg-blue-500';
      case 'green':
        return 'bg-green-500';
      case 'orange':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage global configurations, security protocols, and administrative controls.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Discard Changes
            </button>
            <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              Save Configuration
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-8 py-6">
        <div className="grid grid-cols-2 gap-6 max-w-7xl">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Security Settings Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Shield className="w-4 h-4 text-blue-600" />
                  </div>
                  <h2 className="text-base font-semibold text-gray-900">Security Settings</h2>
                </div>
                <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded">
                  SECURE
                </span>
              </div>

              <div className="p-6 space-y-6">
                {/* Multi-Factor Authentication */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-900 mb-1">
                      Multi-Factor Authentication (MFA)
                    </div>
                    <div className="text-xs text-gray-600">
                      Enforce MFA for all administrative accounts during login.
                    </div>
                  </div>
                  <button
                    onClick={() => setIsMfaEnabled(!isMfaEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isMfaEnabled ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isMfaEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Data Encryption at Rest */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div>
                    <div className="text-sm font-semibold text-gray-900 mb-1">
                      Data Encryption at Rest
                    </div>
                    <div className="text-xs text-gray-600">
                      AES-256 bit encryption for all database volumes.
                    </div>
                  </div>
                  <span className="flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>
                    Enabled
                  </span>
                </div>

                {/* Password Policy */}
                <div className="pt-4 border-t border-gray-100">
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-3">
                    Password Policy
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-2">
                        Minimum Length
                      </label>
                      <select
                        value={minPasswordLength}
                        onChange={(e) => setMinPasswordLength(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="8-characters">8 Characters</option>
                        <option value="10-characters">10 Characters</option>
                        <option value="12-characters">12 Characters</option>
                        <option value="16-characters">16 Characters</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-2">
                        Expiration Cycle
                      </label>
                      <select
                        value={expirationCycle}
                        onChange={(e) => setExpirationCycle(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="30-days">30 Days</option>
                        <option value="60-days">60 Days</option>
                        <option value="90-days">90 Days</option>
                        <option value="never">Never</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Roles & Permissions Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                    <Key className="w-4 h-4 text-purple-600" />
                  </div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Roles & Permissions (RBAC)
                  </h2>
                </div>
                <button className="flex items-center space-x-1 text-sm font-medium text-blue-600 hover:text-blue-700">
                  <Plus className="w-4 h-4" />
                  <span>New Role</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                        Role Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                        Users
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                        Scope
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {roles.map((role) => (
                      <tr key={role.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <span className={`w-2 h-2 rounded-full ${getRoleDotColor(role.color)}`}></span>
                            <span className="text-sm font-medium text-gray-900">{role.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-700">{role.users} Users</span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium border rounded ${getScopeColor(
                              role.scope
                            )}`}
                          >
                            {role.scope}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button className="p-1 text-gray-400 hover:text-gray-600">
                            <Edit className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* System Broadcast Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                    <Radio className="w-4 h-4 text-orange-600" />
                  </div>
                  <h2 className="text-base font-semibold text-gray-900">System Broadcast</h2>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Global Announcement */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">
                    Global Announcement
                  </label>
                  <textarea
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="Type a message to show on all user dashboards..."
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                {/* Channels */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-3">
                    Channels
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dashboardBanner}
                        onChange={(e) => setDashboardBanner(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Dashboard Banner</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={inAppNotification}
                        onChange={(e) => setInAppNotification(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">In-App Notification</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailDispatch}
                        onChange={(e) => setEmailDispatch(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Email Dispatch</span>
                    </label>
                  </div>
                </div>

                {/* Broadcast Button */}
                <button
                  onClick={() => setIsBroadcastModalOpen(true)}
                  className="w-full py-3 text-sm font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors mt-4"
                >
                  Broadcast Now
                </button>
              </div>
            </div>

            {/* Live Audit Feed */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <h2 className="text-base font-semibold text-gray-900">LIVE AUDIT FEED</h2>
                  </div>
                </div>
                <button className="text-xs font-medium text-blue-600 hover:text-blue-700">
                  Cloud Stream Active
                </button>
              </div>

              <div className="p-6">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3 text-xs text-gray-600">
                    <span className="text-gray-400">14:32:11</span>
                    <span>User "admin_quan" modified system settings</span>
                  </div>
                  <div className="flex items-start space-x-3 text-xs text-gray-600">
                    <span className="text-gray-400">14:31:45</span>
                    <span>Security policy updated: MFA enabled</span>
                  </div>
                  <div className="flex items-start space-x-3 text-xs text-gray-600">
                    <span className="text-gray-400">14:30:22</span>
                    <span>New role created: "System Editor"</span>
                  </div>
                  <div className="flex items-start space-x-3 text-xs text-gray-600">
                    <span className="text-gray-400">14:29:18</span>
                    <span>Broadcast sent to 2,482 users</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Broadcast Now Modal */}
      <BroadcastNowModal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        message={broadcastMessage}
        dashboardBanner={dashboardBanner}
        inAppNotification={inAppNotification}
        emailDispatch={emailDispatch}
      />
    </div>
  );
};

export default SystemSettings;
