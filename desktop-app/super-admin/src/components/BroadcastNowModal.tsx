import React, { useState } from 'react';
import { X, AlertTriangle, Smartphone, Mail, MessageSquare } from 'lucide-react';

interface BroadcastNowModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  dashboardBanner: boolean;
  inAppNotification: boolean;
  emailDispatch: boolean;
}

const BroadcastNowModal: React.FC<BroadcastNowModalProps> = ({
  isOpen,
  onClose,
  message,
  dashboardBanner,
  inAppNotification,
  emailDispatch,
}) => {
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  if (!isOpen) return null;

  // Calculate notification count
  const getNotificationCount = () => {
    let count = 0;
    if (dashboardBanner) count += 2482; // All users see banner
    if (inAppNotification) count += 2482;
    if (emailDispatch) count += 2482;
    return count;
  };

  const handleBroadcast = () => {
    setIsBroadcasting(true);

    // Simulate broadcast process
    setTimeout(() => {
      setIsBroadcasting(false);
      alert('Broadcast sent successfully!');
      onClose();
    }, 2000);
  };

  const notificationCount = getNotificationCount();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Broadcast Now</h2>
              <p className="text-sm text-gray-600 mt-0.5">
                Immediate Global Action Required
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Warning Message */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              Are you sure you want to broadcast this message immediately to all active
              dashboards and email channels? This action will trigger{' '}
              <span className="font-semibold text-gray-900">{notificationCount.toLocaleString()} notifications</span>{' '}
              and cannot be revoked once sent.
            </p>
          </div>

          {/* Message Preview */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">
              Message Preview
            </label>
            <div className="bg-gray-900 text-white rounded-lg p-4 border-l-4 border-red-500">
              <div className="flex items-start space-x-2">
                <span className="text-red-400 font-bold text-xs uppercase px-2 py-0.5 bg-red-900 rounded">
                  [URGENT]
                </span>
                <div className="flex-1">
                  <div className="font-semibold text-sm mb-1">
                    {message || 'Infrastructure Maintenance'}
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    {message ||
                      'A critical maintenance window has been scheduled for 23:00 UTC. System access will be intermittent during the upgrade period. Please save your work.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Channels */}
          <div className="grid grid-cols-3 gap-3">
            {/* UI Notifications */}
            <div
              className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 ${
                dashboardBanner
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-gray-50 opacity-50'
              }`}
            >
              <Smartphone className={`w-5 h-5 mb-2 ${dashboardBanner ? 'text-blue-600' : 'text-gray-400'}`} />
              <span className={`text-xs font-medium ${dashboardBanner ? 'text-blue-900' : 'text-gray-500'}`}>
                UI Notifications
              </span>
            </div>

            {/* Email Channels */}
            <div
              className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 ${
                emailDispatch
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 bg-gray-50 opacity-50'
              }`}
            >
              <Mail className={`w-5 h-5 mb-2 ${emailDispatch ? 'text-green-600' : 'text-gray-400'}`} />
              <span className={`text-xs font-medium ${emailDispatch ? 'text-green-900' : 'text-gray-500'}`}>
                Email Channels
              </span>
            </div>

            {/* SMS (Admins) */}
            <div
              className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 ${
                inAppNotification
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 bg-gray-50 opacity-50'
              }`}
            >
              <MessageSquare className={`w-5 h-5 mb-2 ${inAppNotification ? 'text-purple-600' : 'text-gray-400'}`} />
              <span className={`text-xs font-medium ${inAppNotification ? 'text-purple-900' : 'text-gray-500'}`}>
                SMS (Admins)
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={isBroadcasting}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleBroadcast}
            disabled={isBroadcasting || (!dashboardBanner && !inAppNotification && !emailDispatch)}
            className="flex items-center space-x-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isBroadcasting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Broadcasting...</span>
              </>
            ) : (
              <span>Confirm & Broadcast</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BroadcastNowModal;
