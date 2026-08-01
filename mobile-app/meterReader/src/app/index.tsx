import { useState } from 'react';

import { type NavTab } from '@/components/NavBar/Navbar';
import Announcements from '@/screens/Announcements';
import Assigned from '@/screens/Assigned';
import Dashboard from '@/screens/Dashboard';
import History from '@/screens/History';
import Login from '@/screens/Login';
import Profile from '@/screens/Profile';

export default function HomeScreen() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [showAnnouncements, setShowAnnouncements] = useState(false);

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  if (showAnnouncements) {
    return <Announcements onBack={() => setShowAnnouncements(false)} />;
  }

  if (activeTab === 'dashboard') {
    return (
      <Dashboard
        activeTab={activeTab}
        onTabPress={setActiveTab}
        onOpenAnnouncements={() => setShowAnnouncements(true)}
      />
    );
  }

  if (activeTab === 'assigned') {
    return <Assigned activeTab={activeTab} onTabPress={setActiveTab} />;
  }

  if (activeTab === 'history') {
    return <History activeTab={activeTab} onTabPress={setActiveTab} />;
  }

  return <Profile activeTab={activeTab} onTabPress={setActiveTab} />;
}
