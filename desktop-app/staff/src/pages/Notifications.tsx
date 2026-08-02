import React, { useMemo, useRef, useState } from 'react';
import {
  Search,
  Bell,
  CheckCircle,
  X,
  Megaphone,
  Ticket,
  UserCheck,
  RefreshCw,
  ClipboardList,
  XCircle,
  Receipt,
  CreditCard,
  Wrench,
  AlertTriangle,
  Inbox,
} from 'lucide-react';
import type { NotificationType } from '../types';
import { NOTIFICATION_TYPE_LABELS } from '../types';
import { useNotifications } from '../hooks/useNotifications';
import { useAuth } from '../hooks/useAuth';
import {
  markNotificationRead,
  markAllNotificationsRead,
  softDeleteNotification,
} from '../services/notificationService';

const typeConfig: Record<
  NotificationType,
  { icon: React.FC<{ className?: string }>; color: string }
> = {
  announcement: { icon: Megaphone, color: 'bg-blue-50 text-blue-600' },
  ticket_created: { icon: Ticket, color: 'bg-purple-50 text-purple-600' },
  ticket_assigned: { icon: UserCheck, color: 'bg-indigo-50 text-indigo-600' },
  ticket_status: { icon: RefreshCw, color: 'bg-orange-50 text-orange-600' },
  ticket_resolved: { icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600' },
  reading_assigned: { icon: ClipboardList, color: 'bg-cyan-50 text-cyan-600' },
  reading_approved: { icon: CheckCircle, color: 'bg-green-50 text-green-600' },
  reading_rejected: { icon: XCircle, color: 'bg-red-50 text-red-600' },
  billing: { icon: Receipt, color: 'bg-yellow-50 text-yellow-600' },
  payment: { icon: CreditCard, color: 'bg-emerald-50 text-emerald-600' },
  system: { icon: Wrench, color: 'bg-gray-50 text-gray-600' },
};

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return minutes + 'm ago';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + 'h ago';
  const days = Math.floor(hours / 24);
  if (days < 7) return days + 'd ago';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const Notifications: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mineOnly, setMineOnly] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const { notifications, unreadCount, loading, error, refresh } = useNotifications({
    mineOnly: isSuperAdmin ? mineOnly : true,
  });

  const showToast = (type: 'success' | 'error', message: string) => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast({ type, message });
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3500);
  };

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      const matchFilter = filter === 'all' || (filter === 'unread' && !n.is_read);
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        NOTIFICATION_TYPE_LABELS[n.type].toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }, [notifications, filter, searchQuery]);

  const handleToggleRead = async (id: string) => {
    setBusyId(id);
    try {
      await markNotificationRead(id);
      await refresh();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update notification.');
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      await refresh();
      showToast('success', 'All notifications marked as read.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update notifications.');
    }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    try {
      await softDeleteNotification(id);
      await refresh();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to remove notification.');
    } finally {
      setBusyId(null);
    }
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
            {isSuperAdmin && (
              <div className="flex items-center space-x-1 bg-white border border-gray-300 rounded-lg p-1">
                <button
                  onClick={() => setMineOnly(true)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${mineOnly ? 'bg-primary-100 text-primary-600' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Mine
                </button>
                <button
                  onClick={() => setMineOnly(false)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${!mineOnly ? 'bg-primary-100 text-primary-600' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  All Users
                </button>
              </div>
            )}
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
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === 'all' ? 'bg-primary-100 text-primary-600' : 'text-gray-600 hover:text-gray-900'}`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === 'unread' ? 'bg-primary-100 text-primary-600' : 'text-gray-600 hover:text-gray-900'}`}
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
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
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

        {/* Error state */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

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
            {loading && notifications.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
                  <Bell className="w-7 h-7 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-900">Loading notifications…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Inbox className="w-7 h-7 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-900">No notifications found</p>
                <p className="text-xs text-gray-500 mt-1">
                  {filter === 'unread' ? 'You have no unread notifications' : 'Try adjusting your search'}
                </p>
              </div>
            ) : (
              filtered.map((notification) => {
                const config = typeConfig[notification.type] ?? typeConfig.system;
                const Icon = config.icon;
                const isBusy = busyId === notification.id;
                return (
                  <div
                    key={notification.id}
                    onClick={() => !notification.is_read && handleToggleRead(notification.id)}
                    className={`px-6 py-4 flex items-start space-x-4 cursor-pointer transition-all ${!notification.is_read ? 'bg-primary-50/30 hover:bg-primary-50/60' : 'hover:bg-gray-50'}`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm ${!notification.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                          {notification.title}
                        </p>
                        {!notification.is_read && <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0"></span>}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notification.message}</p>
                      <div className="mt-1.5 flex items-center space-x-3">
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                          {NOTIFICATION_TYPE_LABELS[notification.type]}
                        </span>
                        {!mineOnly && notification.recipient && (
                          <span className="text-xs text-gray-400">
                            → {notification.recipient.first_name} {notification.recipient.last_name}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">{formatRelativeTime(notification.created_at)}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(notification.id);
                      }}
                      disabled={isBusy}
                      className="p-1 text-gray-300 hover:text-gray-500 transition-colors disabled:opacity-50"
                      aria-label="Dismiss notification"
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

      {toast && (
        <div className={`fixed bottom-6 right-6 flex items-center space-x-2 px-4 py-3 rounded-lg shadow-lg text-white text-sm ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default Notifications;
