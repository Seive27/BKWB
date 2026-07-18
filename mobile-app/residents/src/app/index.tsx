import { useState } from 'react';

import { type NavTab } from '@/components/ui/Navbar';
import Announcements from '@/screens/Announcements';
import Bills from '@/screens/Bills';
import Dashboard from '@/screens/Dashboard';
import Profile from '@/screens/Profile';

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

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
