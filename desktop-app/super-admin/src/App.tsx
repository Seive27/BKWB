import { useState } from 'react';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import SessionTimeout from './components/ui/SessionTimeout';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import AuthOverlay from './components/layout/AuthOverlay';
import LoginModal from './components/modals/LoginModal';

// Staff Feature Pages
import Dashboard from './pages/Dashboard';
import Residents from './pages/Residents';
import MeterReadings from './pages/MeterReadings';
import Bills from './pages/Bills';
import Payments from './pages/Payments';
import Announcements from './pages/Announcements';
import Tickets from './pages/Tickets';
import Notifications from './pages/Notifications';
import Reports from './pages/Reports';
import ProfileSettings from './pages/ProfileSettings';

// Admin Feature Pages
import Users from './pages/Users';
import Analytics from './pages/Analytics';
import AuditLogs from './pages/AuditLogs';
import AuditLogsConsole from './pages/AuditLogsConsole';
import SystemSettings from './pages/SystemSettings';
import type { AppNotification } from './types';
import { resolveNotificationDestination } from './utils/notificationNavigation';

function AppContent() {
  const [activePage, setActivePage] = useState('dashboard');
  const [focusSelectedId, setFocusSelectedId] = useState<string | null>(null);
  const { showLogin, isClosing, isAuthenticated, login, logout } = useAuth();

  const handlePageChange = (page: string) => {
    setFocusSelectedId(null);
    setActivePage(page);
  };

  const handleNotificationNavigate = (notification: AppNotification) => {
    const destination = resolveNotificationDestination(notification);
    if (!destination) return;
    setFocusSelectedId(destination.selectedId ?? null);
    setActivePage(destination.page);
  };

  const clearFocusSelectedId = () => setFocusSelectedId(null);

  const renderContent = () => {
    switch (activePage) {
      // Staff Feature Pages
      case 'dashboard':
        return <Dashboard onNavigate={handlePageChange} />;
      case 'residents':
        return <Residents />;
      case 'meter-readings':
        return (
          <MeterReadings
            initialSelectedId={focusSelectedId}
            onInitialSelectedIdConsumed={clearFocusSelectedId}
          />
        );
      case 'bills':
        return <Bills />;
      case 'payments':
        return <Payments />;
      case 'announcements':
        return (
          <Announcements
            initialSelectedId={focusSelectedId}
            onInitialSelectedIdConsumed={clearFocusSelectedId}
          />
        );
      case 'ticket-management':
        return (
          <Tickets
            initialSelectedId={focusSelectedId}
            onInitialSelectedIdConsumed={clearFocusSelectedId}
          />
        );
      case 'notifications':
        return <Notifications onNavigateToRelated={handleNotificationNavigate} />;
      case 'reports':
        return <Reports />;
      case 'profile-settings':
        return <ProfileSettings />;
      // Admin Feature Pages
      case 'users':
        return <Users />;
      case 'analytics':
        return <Analytics />;
      case 'audit-logs':
        return <AuditLogs onNavigateToConsole={() => handlePageChange('audit-logs-console')} />;
      case 'audit-logs-console':
        return <AuditLogsConsole onNavigateBack={() => handlePageChange('audit-logs')} />;
      case 'system-settings':
        return <SystemSettings />;
      default:
        return <Dashboard onNavigate={handlePageChange} />;
    }
  };

  const lockBackdrop = showLogin && !isClosing;

  return (
    <>
      {/* Blur the shell itself — Tauri/WKWebView often ignores backdrop-filter */}
      <div
        className={`
          flex h-screen overflow-hidden
          transition-[filter] duration-300 ease-out
          ${lockBackdrop ? 'blur-md' : 'blur-none'}
        `}
        aria-hidden={lockBackdrop}
      >
        <Sidebar activePage={activePage} onPageChange={handlePageChange} onLogout={logout} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onNavigate={handlePageChange} />
          {renderContent()}
        </div>
      </div>

      <AuthOverlay visible={showLogin} fading={isClosing} />

      {showLogin && (
        <LoginModal
          portalName="Super Admin Portal"
          closing={isClosing}
          onLogin={login}
        />
      )}

      {/* Idle session watchdog — signs out after inactivity */}
      {isAuthenticated && <SessionTimeout onExpire={logout} />}
    </>
  );
}

function App() {
  return (
    <AuthProvider allowedRole="super_admin" portalName="Super Admin Portal">
      <AppContent />
    </AuthProvider>
  );
}

export default App;
