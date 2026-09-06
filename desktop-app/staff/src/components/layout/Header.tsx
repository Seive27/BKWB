import React from 'react';
import { Bell } from 'lucide-react';
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

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 h-16 flex items-center justify-between px-6 sticky top-0 z-20">
      {/* Left Section: status + date */}
      <div className="flex items-center space-x-3">
        <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-[11px] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>System Online</span>
        </div>
        <p className="hidden lg:block text-xs font-medium text-slate-400">{todayLabel}</p>
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Notifications Bell */}
        <button
          onClick={() => onNavigate?.('notifications')}
          className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 transition-colors"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          title="Notifications"
        >
          <Bell className="w-[18px] h-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-primary-600 text-white text-[9px] font-bold leading-none ring-2 ring-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* User Profile Pill */}
        <div className="flex items-center space-x-2.5 pl-2 border-l border-slate-200">
          <div className="w-9 h-9 bg-primary-700 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-xs ring-1 ring-inset ring-white/20">
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
