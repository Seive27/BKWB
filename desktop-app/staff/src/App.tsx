import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Residents from './pages/Residents';
import MeterReadings from './pages/MeterReadings';
import Bills from './pages/Bills';
import Payments from './pages/Payments';
import Announcements from './pages/Announcements';

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
      case 'messages':
        return (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Messages Page</h2>
              <p className="text-gray-600">Coming soon...</p>
            </div>
          </div>
        );
      case 'reports':
        return (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Reports Page</h2>
              <p className="text-gray-600">Coming soon...</p>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Settings</h2>
              <p className="text-gray-600">Coming soon...</p>
            </div>
          </div>
        );
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
