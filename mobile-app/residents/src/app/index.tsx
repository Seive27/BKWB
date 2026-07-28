import { useState } from 'react';

import { type NavTab } from '@/components/ui/Navbar';
import Announcements from '@/screens/Announcements';
import Bills from '@/screens/Bills';
import Dashboard from '@/screens/Dashboard';
import Login from '@/screens/Login';
import Profile from '@/screens/Profile';

export default function HomeScreen() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  if (activeTab === 'dashboard') {
    return <Dashboard activeTab={activeTab} onTabPress={setActiveTab} />;
  }

  if (activeTab === 'bills') {
    return <Bills activeTab={activeTab} onTabPress={setActiveTab} />;
  }

  if (activeTab === 'announcements') {
    return <Announcements activeTab={activeTab} onTabPress={setActiveTab} />;
  }

  return <Profile activeTab={activeTab} onTabPress={setActiveTab} />;
}
