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
    <aside className="w-60 h-screen flex flex-col flex-shrink-0 select-none z-30 bg-gradient-to-b from-[#082B25] via-[#0B352D] to-[#0E4436]">
      {/* Brand Section */}
      <div className="px-4 pt-5 pb-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img
            src={logo}
            alt="BKWB Logo"
            className="w-9 h-9 rounded-xl object-cover ring-2 ring-white/10"
          />
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-white tracking-tight leading-none">BKWB Utility</h1>
            <div className="flex items-center space-x-1.5 mt-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <p className="text-[10px] text-emerald-100/60 font-medium leading-none">Staff Portal</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto scrollbar-hide">
        <p className="px-2.5 pt-1 pb-2 text-[10px] font-bold text-emerald-100/40 uppercase tracking-[0.12em]">
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
                    ? 'bg-white/[0.08] text-white font-semibold ring-1 ring-inset ring-white/10'
                    : 'text-emerald-50/60 hover:bg-white/[0.05] hover:text-white'
                }
              `}
            >
              <div className="flex items-center space-x-2.5 truncate">
                <div
                  className={`p-1.5 rounded-md transition-colors ${
                    isActive
                      ? 'bg-emerald-400/90 text-[#07271F]'
                      : 'bg-white/[0.06] text-emerald-100/60 group-hover:text-white group-hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="truncate">{item.label}</span>
              </div>
              {item.id === 'notifications' && unreadCount > 0 ? (
                <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-emerald-400 text-[#07271F] text-[9px] font-bold leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              ) : isActive ? (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 mr-1" />
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* Bottom User / Settings Section */}
      <div className="p-2.5 border-t border-white/[0.07] space-y-0.5 bg-black/10">
        <button
          onClick={() => onPageChange('settings')}
          className={`
            w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-xs font-medium
            transition-colors duration-150 text-left
            ${
              activePage === 'settings'
                ? 'bg-white/[0.08] text-white font-semibold ring-1 ring-inset ring-white/10'
                : 'text-emerald-50/60 hover:bg-white/[0.05] hover:text-white'
            }
          `}
        >
          <div
            className={`p-1.5 rounded-md ${
              activePage === 'settings'
                ? 'bg-emerald-400/90 text-[#07271F]'
                : 'bg-white/[0.06] text-emerald-100/60'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
          </div>
          <span className="truncate flex-1">Profile Settings</span>
        </button>
        <button
          onClick={handleLogoutClick}
          className="w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-rose-300 hover:bg-rose-500/10 hover:text-rose-200 transition-colors duration-150 text-left"
        >
          <div className="p-1.5 rounded-md bg-rose-500/15 text-rose-300">
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
