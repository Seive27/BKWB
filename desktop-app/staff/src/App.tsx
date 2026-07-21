import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Residents from './pages/Residents';
import MeterReadings from './pages/MeterReadings';
import Bills from './pages/Bills';
import Payments from './pages/Payments';
import Announcements from './pages/Announcements';
import TicketManagement from './pages/Tickets';
import Reports from './pages/Reports';
import ProfileSettings from './pages/ProfileSettings';

function App() {
  const [activePage, setActivePage] = useState('dashboard');

  const renderContent = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />;
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
    <div className="flex h-screen overflow-hidden">
      <Sidebar activePage={activePage} onPageChange={setActivePage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        {renderContent()}
      </div>
    </div>
  );
}

export default App;
