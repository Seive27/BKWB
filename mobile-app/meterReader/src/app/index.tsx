import { useState } from 'react';

import { type NavTab } from '@/components/NavBar/Navbar';
import Assigned from '@/screens/Assigned';
import Dashboard from '@/screens/Dashboard';
import History from '@/screens/History';
import Profile from '@/screens/Profile';

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  if (activeTab === 'dashboard') {
    return <Dashboard activeTab={activeTab} onTabPress={setActiveTab} />;
  }

  if (activeTab === 'assigned') {
    return <Assigned activeTab={activeTab} onTabPress={setActiveTab} />;
  }

  if (activeTab === 'history') {
    return <History activeTab={activeTab} onTabPress={setActiveTab} />;
  }

  return <Profile activeTab={activeTab} onTabPress={setActiveTab} />;
}
