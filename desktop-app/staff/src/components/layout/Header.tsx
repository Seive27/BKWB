import React from 'react';
import { Search, Bell } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';

interface HeaderProps {
  /** Navigate to another page (used by the bell → Notifications). */
  onNavigate?: (page: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onNavigate }) => {
  // Logged-in staff member from the auth context.
  const { user, profile } = useAuth();
  const { unreadCount } = useNotifications({ limit: 50 });

  const firstName = profile?.first_name ?? user?.profile?.first_name ?? '';
  const lastName = profile?.last_name ?? user?.profile?.last_name ?? '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'Staff';
  const initials = ((firstName[0] ?? '') + (lastName[0] ?? '')).toUpperCase() || 'ST';
  const roleLabel =
    user?.role === 'super_admin' ? 'Super Admin' : user?.role === 'staff' ? 'Water Billing Staff' : 'Staff';

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6">
      {/* Search Bar */}
      <div className="flex-1 max-w-2xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search residents, bills, or records..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-6">
        {/* Notifications */}
        <button
          onClick={() => onNavigate?.('notifications')}
          className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold leading-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* User Profile */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-semibold">{initials}</span>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-900">{fullName}</p>
            <p className="text-xs text-gray-500">{roleLabel}</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
