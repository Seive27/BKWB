import { useEffect, useState } from 'react';

import { type NavTab } from '@/components/ui/Navbar';
import { supabase } from '@/lib/supabase';
import { isPasswordResetPending } from '@/services/authService';
import AccountSetup from '@/screens/AccountSetup';
import Announcements from '@/screens/Announcements';
import Bills from '@/screens/Bills';
import ChatBot from '@/screens/ChatBot';
import Dashboard, { type DashboardDeepLink } from '@/screens/Dashboard';
import Login from '@/screens/Login';
import Profile from '@/screens/Profile';
import type { LunasNavigateScreen } from '@/types/chatbot';

export default function HomeScreen() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  // Mandatory first-login gate: migrated residents sign in with their
  // Account Number + temporary password, then must finish Account Setup
  // (email verification + new password + profile) before the dashboard.
  const [needsSetup, setNeedsSetup] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [showChatBot, setShowChatBot] = useState(false);
  const [dashboardDeepLink, setDashboardDeepLink] = useState<DashboardDeepLink>(null);

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

  const handleLunasNavigate = (screen: LunasNavigateScreen) => {
    setShowChatBot(false);
    switch (screen) {
      case 'Bills':
        setActiveTab('bills');
        break;
      case 'Announcements':
        setActiveTab('announcements');
        break;
      case 'Tickets':
        setActiveTab('dashboard');
        setDashboardDeepLink('tickets');
        break;
      case 'CreateTicket':
        setActiveTab('dashboard');
        setDashboardDeepLink('createTicket');
        break;
      case 'WaterSchedule':
        setActiveTab('dashboard');
        setDashboardDeepLink('waterSchedule');
        break;
      default:
        setActiveTab('dashboard');
    }
  };

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
    return (
      <ChatBot
        onBack={() => setShowChatBot(false)}
        onNavigate={handleLunasNavigate}
      />
    );
  }

  if (activeTab === 'dashboard') {
    return (
      <Dashboard
        activeTab={activeTab}
        onTabPress={setActiveTab}
        onOpenChatBot={() => setShowChatBot(true)}
        deepLink={dashboardDeepLink}
        onDeepLinkConsumed={() => setDashboardDeepLink(null)}
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
