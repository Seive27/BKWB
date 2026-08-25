import React from 'react';
import {
  LayoutDashboard,
  Users,
  Gauge,
  Receipt,
  CreditCard,
  Megaphone,
  Ticket,
  MessageSquare,
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
        { id: 'notifications', label: 'Notifications', icon: MessageSquare },
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
    <div className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col">
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <img
            src={logo}
            alt="BKWB Logo"
            className="w-10 h-10 rounded-lg object-cover"
          />
          <div>
            <h1 className="text-lg font-bold text-gray-900">BKWB</h1>
            <p className="text-xs text-gray-500">{adminName}</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-4 overflow-y-auto scrollbar-hide">
        {menuGroups.map((group, gi) => (
          <div key={gi}>
            {group.title && (
              <p className="px-4 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
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
                      w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg
                      transition-all duration-200 text-left
                      ${
                        isActive
                          ? 'bg-primary-50 text-primary-600'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-medium truncate flex-1">{item.label}</span>
                    {item.id === 'notifications' && unreadCount > 0 && (
                      <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-semibold">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-gray-200 space-y-1">
        <button
          onClick={() => onPageChange('profile-settings')}
          className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200"
        >
          <UserCircle className="w-5 h-5" />
          <span className="text-sm font-medium">Profile Settings</span>
        </button>
        <button
          onClick={() => onLogout?.()}
          className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
