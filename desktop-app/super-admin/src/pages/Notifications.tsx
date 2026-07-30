import React, { useState } from 'react';
import { Search, Bell, Megaphone, AlertTriangle, CheckCircle, X, Info, Wrench, Clock } from 'lucide-react';

interface Notification {
  id: string;
  type: 'announcement' | 'alert' | 'payment' | 'system' | 'message';
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  { id: '1', type: 'announcement', title: 'New Announcement Posted', description: 'Emergency Pipeline Repair - Zone 4 has been published.', timestamp: '2 hours ago', read: false },
  { id: '2', type: 'payment', title: 'Payment Received', description: 'A payment of ₱850.25 has been received from John Dela Cruz.', timestamp: '3 hours ago', read: false },
  { id: '3', type: 'alert', title: 'High Usage Alert', description: 'Consumer KW-2024-0456 (Maria Alcarez) has unusually high water consumption.', timestamp: '5 hours ago', read: false },
  { id: '4', type: 'message', title: 'New Message from Resident', description: 'Ricardo Sanchez sent a new inquiry about billing concerns.', timestamp: '1 day ago', read: true },
  { id: '5', type: 'system', title: 'System Maintenance Notice', description: 'Scheduled system maintenance will occur on Nov 15, 2023 from 2AM to 4AM.', timestamp: '2 days ago', read: true },
  { id: '6', type: 'announcement', title: 'Schedule Update', description: 'Quarterly system maintenance schedule has been updated for Zone 3.', timestamp: '3 days ago', read: true },
];

const typeConfig: Record<string, { icon: React.FC<{ className?: string }>; color: string }> = {
  announcement: { icon: Megaphone, color: 'bg-blue-50 text-blue-600' },
  alert: { icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
  payment: { icon: CheckCircle, color: 'bg-green-50 text-green-600' },
  system: { icon: Wrench, color: 'bg-orange-50 text-orange-600' },
  message: { icon: Info, color: 'bg-purple-50 text-purple-600' },
};

const Notifications: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState(mockNotifications);

  const filtered = notifications.filter((n) => {
    const matchFilter = filter === 'all' || (filter === 'unread' && !n.read);
    const matchSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchFilter && matchSearch;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleToggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Notifications</h1>
            <p className="text-gray-600">Stay updated with system events, announcements, and alerts.</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleMarkAllRead}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <CheckCircle className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">Mark All as Read</span>
            </button>
            <div className="flex items-center space-x-1 bg-white border border-gray-300 rounded-lg p-1">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  filter === 'all' ? 'bg-primary-100 text-primary-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  filter === 'unread' ? 'bg-primary-100 text-primary-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 uppercase mb-1">Total Notifications</p>
            <h3 className="text-3xl font-bold text-gray-900">{notifications.length}</h3>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 uppercase mb-1">Unread</p>
            <h3 className="text-3xl font-bold text-gray-900">{unreadCount}</h3>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 uppercase mb-1">Read</p>
            <h3 className="text-3xl font-bold text-gray-900">{notifications.length - unreadCount}</h3>
          </div>
        </div>

        {/* Notification List */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {filtered.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-7 h-7 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-900">No notifications found</p>
                <p className="text-xs text-gray-500 mt-1">
                  {filter === 'unread' ? 'You have no unread notifications' : 'Try adjusting your search'}
                </p>
              </div>
            ) : (
              filtered.map((notification) => {
                const config = typeConfig[notification.type];
                const Icon = config.icon;
                return (
                  <div
                    key={notification.id}
                    onClick={() => handleToggleRead(notification.id)}
                    className={`px-6 py-4 flex items-start space-x-4 cursor-pointer transition-all ${
                      !notification.read ? 'bg-primary-50/30 hover:bg-primary-50/60' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm ${!notification.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                          {notification.title}
                        </p>
                        {!notification.read && <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0"></span>}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{notification.description}</p>
                      <p className="text-xs text-gray-400 mt-1">{notification.timestamp}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleRead(notification.id); }}
                      className="p-1 text-gray-300 hover:text-gray-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
