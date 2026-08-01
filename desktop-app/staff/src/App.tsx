import { useState } from 'react';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import AuthOverlay from './components/layout/AuthOverlay';
import LoginModal from './components/modals/LoginModal';
import Dashboard from './pages/Dashboard';
import Residents from './pages/Residents';
import MeterReadings from './pages/MeterReadings';
import Bills from './pages/Bills';
import Payments from './pages/Payments';
import Announcements from './pages/Announcements';
import TicketManagement from './pages/Tickets';
import Reports from './pages/Reports';
import ProfileSettings from './pages/ProfileSettings';

/** Inner app content - reads auth from context */
function AppContent() {
  const [activePage, setActivePage] = useState('dashboard');
  const { showLogin, isClosing, login, logout } = useAuth();

  const renderContent = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard onNavigate={setActivePage} />;
      case 'residents':
        return <Residents />;
      case 'meter-readings':
        return <MeterReadings />;
      case 'bills':
        return <Bills />;
      case 'payments':
        return <Payments />;
      case 'announcements':
        return <Announcements />;
      case 'ticket-management':
        return <TicketManagement />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <ProfileSettings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <>
      {/* Dashboard — always mounted, obscured by overlay when locked */}
      <div className="flex h-screen overflow-hidden">
        <Sidebar activePage={activePage} onPageChange={setActivePage} onLogout={logout} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
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
