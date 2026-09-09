import { useEffect, useState } from 'react';

import { type NavTab } from '@/components/NavBar/Navbar';
import { supabase } from '@/lib/supabase';
import { isPasswordResetPending } from '@/services/authService';
import Announcements from '@/screens/Announcements';
import Assigned from '@/screens/Assigned';
import Dashboard from '@/screens/Dashboard';
import History from '@/screens/History';
import Login from '@/screens/Login';
import Notifications from '@/screens/Notifications';
import Profile from '@/screens/Profile';
import Tickets from '@/screens/Tickets';

export default function HomeScreen() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Restore the persisted Supabase session on launch and keep the login state
  // in sync with the real session (sign-in, sign-out, token expiry) so screens
  // never report "You must be logged in" while the user is authenticated.
  // Skip PASSWORD_RECOVERY / in-progress reset so Forgot Password stays on Login.
  useEffect(() => {
    let cancelled = false;
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === 'PASSWORD_RECOVERY' || isPasswordResetPending()) {
        setSessionChecked(true);
        return;
      }
      setIsLoggedIn(!!session);
      setSessionChecked(true);
    });
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!cancelled) {
          if (isPasswordResetPending()) {
            setSessionChecked(true);
            return;
          }
          setIsLoggedIn(!!data.session);
          setSessionChecked(true);
        }
      })
      .catch(() => {
        if (!cancelled) setSessionChecked(true);
      });
    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Avoid flashing the login screen while the session is being restored.
  if (!sessionChecked) {
    return null;
  }

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  if (showAnnouncements) {
    return <Announcements onBack={() => setShowAnnouncements(false)} />;
  }

  if (showNotifications) {
    return <Notifications onBack={() => setShowNotifications(false)} />;
  }

  if (activeTab === 'dashboard') {
    return (
      <Dashboard
        activeTab={activeTab}
        onTabPress={setActiveTab}
        onOpenAnnouncements={() => setShowAnnouncements(true)}
        onOpenNotifications={() => setShowNotifications(true)}
      />
    );
  }

  if (activeTab === 'assigned') {
    return <Assigned activeTab={activeTab} onTabPress={setActiveTab} />;
  }

  if (activeTab === 'tickets') {
    return <Tickets activeTab={activeTab} onTabPress={setActiveTab} />;
  }

  if (activeTab === 'history') {
    return <History activeTab={activeTab} onTabPress={setActiveTab} />;
  }

  return <Profile activeTab={activeTab} onTabPress={setActiveTab} />;
}
