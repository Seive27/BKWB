import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Analytics from './pages/Analytics';
import AuditLogs from './pages/AuditLogs';
import AuditLogsConsole from './pages/AuditLogsConsole';
import SystemSettings from './pages/SystemSettings';

function App() {
  const [activePage, setActivePage] = useState('dashboard');

  const renderContent = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'users':
        return <Users />;
      case 'analytics':
        return <Analytics />;
      case 'audit-logs':
        return <AuditLogs onNavigateToConsole={() => setActivePage('audit-logs-console')} />;
      case 'audit-logs-console':
        return <AuditLogsConsole onNavigateBack={() => setActivePage('audit-logs')} />;
      case 'system-settings':
        return <SystemSettings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar activePage={activePage} onPageChange={setActivePage} />
      {renderContent()}
    </div>
  );
}

export default App;
