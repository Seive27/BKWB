import { useEffect, useState } from 'react';

import type { ReadingFilter } from '@/components/assigned/FilterTabs';
import { type NavTab } from '@/components/NavBar/Navbar';
import { supabase } from '@/lib/supabase';
import {
  currentSessionAllowed,
  getCurrentProfile,
  isLoginGatePending,
  isPasswordResetPending,
  signOut,
} from '@/services/authService';
import AccountSetup from '@/screens/AccountSetup';
import Announcements from '@/screens/Announcements';
import Assigned from '@/screens/Assigned';
import Dashboard from '@/screens/Dashboard';
import History from '@/screens/History';
import Login from '@/screens/Login';
import Notifications from '@/screens/Notifications';
import Profile from '@/screens/Profile';
import Tickets from '@/screens/Tickets';
import type { NotificationDestination } from '@/utils/notificationNavigation';

export default function HomeScreen() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [onboardingKnown, setOnboardingKnown] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [historyFilter, setHistoryFilter] = useState<ReadingFilter>('all');
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleTabPress = (tab: NavTab) => {
    if (tab === 'history') setHistoryFilter('all');
    setActiveTab(tab);
  };

  const openHistory = (filter: ReadingFilter) => {
    setHistoryFilter(filter);
    setActiveTab('history');
  };

  // Restore the persisted Supabase session on launch and keep the login state
  // in sync with the real session (sign-in, sign-out, token expiry) so screens
  // never report "You must be logged in" while the user is authenticated.
  // Skip PASSWORD_RECOVERY / in-progress reset so Forgot Password stays on Login.
  // A session is ignored until login() finishes its role check, and a restored
  // session for another role is signed out before the app opens.
  useEffect(() => {
    let cancelled = false;

    const applySession = (session: { user: { id: string } } | null) => {
      if (cancelled) return;
      if (isPasswordResetPending() || isLoginGatePending()) {
        setSessionChecked(true);
        return;
      }
      if (!session) {
        setIsLoggedIn(false);
        setSessionChecked(true);
        return;
      }
      // Defer so this does not call Supabase inside the auth callback lock.
      setTimeout(() => {
        if (cancelled || isLoginGatePending()) {
          if (!cancelled) setSessionChecked(true);
          return;
        }
        void currentSessionAllowed().then(async (allowed) => {
          if (cancelled || isLoginGatePending()) return;
          if (allowed === false) {
            await signOut().catch(() => {});
            if (!cancelled) {
              setIsLoggedIn(false);
              setSessionChecked(true);
            }
            return;
          }
          if (!cancelled) {
            setIsLoggedIn(true);
            setSessionChecked(true);
          }
        });
      }, 0);
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === 'PASSWORD_RECOVERY' || isPasswordResetPending() || isLoginGatePending()) {
        setSessionChecked(true);
        return;
      }
      applySession(session);
    });
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!cancelled) applySession(data.session);
      })
      .catch(() => {
        if (!cancelled) setSessionChecked(true);
      });
    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      setOnboardingKnown(false);
      setNeedsSetup(false);
      return;
    }
    if (onboardingKnown) return;
    let cancelled = false;
    getCurrentProfile()
      .then((profile) => {
        if (cancelled) return;
        setNeedsSetup(!!profile?.needs_onboarding);
        setOnboardingKnown(true);
      })
      .catch(() => {
        if (!cancelled) setOnboardingKnown(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, onboardingKnown]);

  const handleNotificationNavigate = (destination: NotificationDestination) => {
    if (!destination) return;
    setShowNotifications(false);
    if (destination.kind === 'announcements') {
      setShowAnnouncements(true);
      return;
    }
    if (destination.kind === 'tab') {
      setShowAnnouncements(false);
      if (destination.tab === 'history') setHistoryFilter('all');
      setActiveTab(destination.tab);
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
          setOnboardingKnown(true);
          setIsLoggedIn(true);
        }}
      />
    );
  }

  if (!onboardingKnown) {
    return null;
  }

  if (needsSetup) {
    return <AccountSetup onSetupComplete={() => setNeedsSetup(false)} />;
  }

  if (showAnnouncements) {
    return <Announcements onBack={() => setShowAnnouncements(false)} />;
  }

  if (showNotifications) {
    return (
      <Notifications
        onBack={() => setShowNotifications(false)}
        onOpenRelated={handleNotificationNavigate}
      />
    );
  }

  if (activeTab === 'dashboard') {
    return (
      <Dashboard
        activeTab={activeTab}
        onTabPress={handleTabPress}
        onOpenAnnouncements={() => setShowAnnouncements(true)}
        onOpenNotifications={() => setShowNotifications(true)}
        onOpenAssigned={() => handleTabPress('assigned')}
        onOpenHistory={openHistory}
      />
    );
  }

  if (activeTab === 'assigned') {
    return <Assigned activeTab={activeTab} onTabPress={handleTabPress} />;
  }

  if (activeTab === 'tickets') {
    return <Tickets activeTab={activeTab} onTabPress={handleTabPress} />;
  }

  if (activeTab === 'history') {
    return (
      <History
        activeTab={activeTab}
        onTabPress={handleTabPress}
        initialFilter={historyFilter}
      />
    );
  }

  return <Profile activeTab={activeTab} onTabPress={handleTabPress} />;
}
