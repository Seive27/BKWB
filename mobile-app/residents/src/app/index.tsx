import { useEffect, useState } from 'react';

import { type NavTab } from '@/components/ui/Navbar';
import { supabase } from '@/lib/supabase';
import AccountSetup from '@/screens/AccountSetup';
import Announcements from '@/screens/Announcements';
import Bills from '@/screens/Bills';
import ChatBot from '@/screens/ChatBot';
import Dashboard from '@/screens/Dashboard';
import Login from '@/screens/Login';
import Profile from '@/screens/Profile';

export default function HomeScreen() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  // Mandatory first-login gate: migrated residents sign in with their
  // Account Number + temporary password, then must finish Account Setup
  // (email verification + new password + profile) before the dashboard.
  const [needsSetup, setNeedsSetup] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [showChatBot, setShowChatBot] = useState(false);

  // Restore the persisted Supabase session on launch and keep the login state
  // in sync with the real session (sign-in, sign-out, token expiry) so screens
  // never report "You must be logged in" while the user is authenticated.
  useEffect(() => {
    let cancelled = false;
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setIsLoggedIn(!!session);
      setSessionChecked(true);
    });
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!cancelled) {
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
    return (
      <Login
        onLogin={(needsOnboarding) => {
          setNeedsSetup(needsOnboarding);
          setIsLoggedIn(true);
        }}
      />
    );
  }

  // A session exists but setup was never completed (e.g. the app was killed
  // mid-setup): re-check the live profile so the gate stays mandatory.
  if (isLoggedIn && needsSetup) {
    return <AccountSetup onSetupComplete={() => setNeedsSetup(false)} />;
  }

  if (showChatBot) {
    return <ChatBot onBack={() => setShowChatBot(false)} />;
  }

  if (activeTab === 'dashboard') {
    return (
      <Dashboard
        activeTab={activeTab}
        onTabPress={setActiveTab}
        onOpenChatBot={() => setShowChatBot(true)}
      />
    );
  }

  if (activeTab === 'bills') {
    return (
      <Bills
        activeTab={activeTab}
        onTabPress={setActiveTab}
        onOpenChatBot={() => setShowChatBot(true)}
      />
    );
  }

  if (activeTab === 'announcements') {
    return (
      <Announcements
        activeTab={activeTab}
        onTabPress={setActiveTab}
        onOpenChatBot={() => setShowChatBot(true)}
      />
    );
  }

  return (
    <Profile
      activeTab={activeTab}
      onTabPress={setActiveTab}
      onOpenChatBot={() => setShowChatBot(true)}
    />
  );
}
