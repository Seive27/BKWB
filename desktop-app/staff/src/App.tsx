import { useState } from 'react';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import AuthOverlay from './components/layout/AuthOverlay';
import SessionTimeout from './components/ui/SessionTimeout';
import LoginModal from './components/modals/LoginModal';
import Dashboard from './pages/Dashboard';
import Residents from './pages/Residents';
import MeterReadings from './pages/MeterReadings';
import Bills from './pages/Bills';
import Payments from './pages/Payments';
import Announcements from './pages/Announcements';
import TicketManagement from './pages/Tickets';
import Notifications from './pages/Notifications';
import Reports from './pages/Reports';
import ProfileSettings from './pages/ProfileSettings';
import type { AppNotification } from './types';
import { resolveNotificationDestination } from './utils/notificationNavigation';

/** Inner app content - reads auth from context */
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
          <TicketManagement
            initialSelectedId={focusSelectedId}
            onInitialSelectedIdConsumed={clearFocusSelectedId}
          />
        );
      case 'notifications':
        return <Notifications onNavigateToRelated={handleNotificationNavigate} />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <ProfileSettings />;
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

      {/* Full-window backdrop that blocks interaction */}
      <AuthOverlay visible={showLogin} fading={isClosing} />

      {/* Login card centered above the overlay */}
      {showLogin && (
        <LoginModal
          portalName="Staff Portal"
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
    <AuthProvider allowedRole="staff" portalName="Staff Portal">
      <AppContent />
    </AuthProvider>
  );
}

export default App;
