import React from 'react';
import {
  LayoutDashboard,
  Users,
  Gauge,
  Receipt,
  CreditCard,
  Megaphone,
  Ticket,
  Bell,
  BarChart3,
  FileText,
  Settings,
  UserCircle,
  LogOut,
  BarChart as ChartIcon,
} from 'lucide-react';
import logo from '../../assets/logo.jpg';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';

interface SidebarProps {
  activePage: string;
  onPageChange: (page: string) => void;
  onLogout?: () => void;
}

interface MenuGroup {
  title?: string;
  items: { id: string; label: string; icon: React.FC<{ className?: string }> }[];
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, onPageChange, onLogout }) => {
  // Live unread notification count for the sidebar badge.
  const { unreadCount } = useNotifications({ limit: 50 });

  // Logged-in admin from the auth context.
  const { user, profile } = useAuth();
  const firstName = profile?.first_name ?? user?.profile?.first_name ?? '';
  const lastName = profile?.last_name ?? user?.profile?.last_name ?? '';
  const adminName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'Super Admin';

  const menuGroups: MenuGroup[] = [
    {
      title: 'Overview',
      items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }],
    },
    {
      title: 'Operations',
      items: [
        { id: 'residents', label: 'Residents', icon: Users },
        { id: 'meter-readings', label: 'Meter Readings', icon: Gauge },
        { id: 'bills', label: 'Bills', icon: Receipt },
        { id: 'payments', label: 'Payments', icon: CreditCard },
        { id: 'announcements', label: 'Announcements', icon: Megaphone },
        { id: 'ticket-management', label: 'Ticketing System', icon: Ticket },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'reports', label: 'Reports', icon: BarChart3 },
      ],
    },
    {
      title: 'Administration',
      items: [
        { id: 'users', label: 'User Management', icon: UserCircle },
        { id: 'analytics', label: 'Analytics', icon: ChartIcon },
        { id: 'audit-logs', label: 'Audit Logs', icon: FileText },
        { id: 'system-settings', label: 'System Settings', icon: Settings },
      ],
    },
  ];

  const isItemActive = (itemId: string) => {
    if (itemId === 'audit-logs') {
      return activePage === 'audit-logs' || activePage === 'audit-logs-console';
    }
    return activePage === itemId;
  };

  return (
    <aside className="w-60 bg-white border-r border-slate-200/80 h-screen flex flex-col flex-shrink-0 select-none z-30">
      {/* Brand Section */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <img
            src={logo}
            alt="BKWB Logo"
            className="w-8 h-8 rounded-lg object-cover border border-slate-200 shadow-2xs"
          />
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-none">BKWB Admin</h1>
            <div className="flex items-center space-x-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
              <p className="text-[10px] text-slate-400 font-medium truncate leading-none">{adminName}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-2.5 py-3 space-y-2.5 overflow-y-auto scrollbar-hide">
        {menuGroups.map((group, gi) => (
          <div key={gi}>
            {group.title && (
              <p className="px-2.5 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {group.title}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = isItemActive(item.id);

                return (
                  <button
                    key={item.id}
                    onClick={() => onPageChange(item.id)}
                    className={`
                      group w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium
                      transition-all duration-150 text-left
                      ${
                        isActive
                          ? 'bg-blue-50/80 text-blue-700 font-semibold shadow-2xs ring-1 ring-blue-500/20'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }
                    `}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <div
                        className={`p-1.5 rounded-md transition-colors ${
                          isActive ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-500 group-hover:text-slate-800 group-hover:bg-slate-200/60'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.id === 'notifications' && unreadCount > 0 ? (
                      <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-blue-600 text-white text-[9px] font-bold leading-none">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    ) : isActive ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mr-1" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="p-2.5 border-t border-slate-100 space-y-0.5 bg-slate-50/50">
        <button
          onClick={() => onPageChange('profile-settings')}
          className={`
            w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-xs font-medium
            transition-colors duration-150 text-left
            ${
              activePage === 'profile-settings'
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
            }
          `}
        >
          <div className="p-1 rounded-md bg-slate-200/60 text-slate-500">
            <UserCircle className="w-3.5 h-3.5" />
          </div>
          <span className="truncate flex-1">Profile Settings</span>
        </button>
        <button
          onClick={() => onLogout?.()}
          className="w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50/80 transition-colors duration-150 text-left"
        >
          <div className="p-1 rounded-md bg-rose-100/60 text-rose-600">
            <LogOut className="w-3.5 h-3.5" />
          </div>
          <span className="truncate">Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
