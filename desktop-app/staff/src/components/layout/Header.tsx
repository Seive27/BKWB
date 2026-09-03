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
    <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 h-14 flex items-center justify-between px-6 sticky top-0 z-20">
      {/* Global Search Bar */}
      <div className="flex-1 max-w-lg">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
          <input
            type="text"
            placeholder="Search residents, bills, meter serials, tickets..."
            className="w-full pl-9 pr-14 py-1.5 bg-slate-50/80 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-white border border-slate-200 rounded shadow-2xs">
              Ctrl+K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* System Status Pill */}
        <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-[11px] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>System Online</span>
        </div>

        {/* Notifications Bell */}
        <button
          onClick={() => onNavigate?.('notifications')}
          className="relative p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-blue-600 text-white text-[9px] font-bold leading-none ring-2 ring-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* User Profile Pill */}
        <div className="flex items-center space-x-2.5 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-xs">
            {initials}
          </div>
          <div className="hidden sm:block text-left leading-tight">
            <p className="text-xs font-semibold text-slate-800 leading-none">{fullName}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">{roleLabel}</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
