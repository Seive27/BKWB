import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Gauge,
  Receipt,
  CreditCard,
  Megaphone,
  TicketCheck,
  BarChart3,
  Settings,
  LogOut,
  Bell,
} from 'lucide-react';
import logo from '../../assets/logo.jpg';
import LogoutModal from '../modals/LogoutModal';
import { useNotifications } from '../../hooks/useNotifications';

interface SidebarProps {
  activePage: string;
  onPageChange: (page: string) => void;
  onLogout?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, onPageChange, onLogout }) => {
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Live unread notification count for the sidebar badge.
  const { unreadCount } = useNotifications({ limit: 50 });

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = () => {
    setShowLogoutModal(false);
    if (onLogout) {
      onLogout();
    }
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'residents', label: 'Residents', icon: Users },
    { id: 'meter-readings', label: 'Meter Readings', icon: Gauge },
    { id: 'bills', label: 'Bills', icon: Receipt },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'ticket-management', label: 'Ticket Management', icon: TicketCheck },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ];

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
            <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-none">BKWB Utility</h1>
            <div className="flex items-center space-x-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <p className="text-[10px] text-slate-400 font-medium leading-none">Staff Portal</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto scrollbar-hide">
        <p className="px-2.5 pt-1 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Operations
        </p>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`
                group w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium
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
      </nav>

      {/* Bottom User / Settings Section */}
      <div className="p-2.5 border-t border-slate-100 space-y-0.5 bg-slate-50/50">
        <button
          onClick={() => onPageChange('settings')}
          className={`
            w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-xs font-medium
            transition-colors duration-150 text-left
            ${
              activePage === 'settings'
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
            }
          `}
        >
          <div className="p-1 rounded-md bg-slate-200/60 text-slate-500">
            <Settings className="w-3.5 h-3.5" />
          </div>
          <span className="truncate flex-1">Profile Settings</span>
        </button>
        <button
          onClick={handleLogoutClick}
          className="w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50/80 transition-colors duration-150 text-left"
        >
          <div className="p-1 rounded-md bg-rose-100/60 text-rose-600">
            <LogOut className="w-3.5 h-3.5" />
          </div>
          <span className="truncate">Sign Out</span>
        </button>
      </div>

      {/* Logout Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={handleLogoutCancel}
        onConfirm={handleLogoutConfirm}
      />
    </aside>
  );
};

export default Sidebar;
