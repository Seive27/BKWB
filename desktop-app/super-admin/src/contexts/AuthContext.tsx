import React, {
  createContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from 'react';
import {
  login as authLogin,
  logout as authLogout,
} from '../services/authService';
import type { AuthUser, Profile, Role } from '../types';

export interface AuthContextValue {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  profile: Profile | null;
  showLogin: boolean;
  isClosing: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
  allowedRole: Role['name'];
  portalName: string;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  allowedRole,
  portalName,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showLogin, setShowLogin] = useState(true);
  const [isClosing, setIsClosing] = useState(false);

  // ── Mount behavior ──
  // Desktop apps always require an explicit login on launch. The persisted
  // Supabase session is intentionally NOT auto-restored so the operator is
  // always presented with the login screen when the app starts.
  useEffect(() => {
    setShowLogin(true);
    setIsLoading(false);
  }, []);

  // ── Login ──

  const login = useCallback(async (email: string, password: string) => {
    const authUser = await authLogin(email, password);

    if (authUser.role !== allowedRole) {
      await authLogout();
      throw new Error(
        `Unauthorized access. This application is for ${portalName} only. ` +
        'Please use the correct application for your role.'
      );
    }

    setUser(authUser);
    setProfile(authUser.profile);
    setIsClosing(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    setIsAuthenticated(true);
    setShowLogin(false);
    setIsClosing(false);
  }, [allowedRole, portalName]);

  // ── Logout ──

  const logout = useCallback(async () => {
    try {
      await authLogout();
    } catch {
      // Clear local state even on network error
    }
    setIsAuthenticated(false);
    setUser(null);
    setProfile(null);
    setShowLogin(true);
    setIsClosing(false);
  }, []);

  // ── Memoised context value ──

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      isAuthenticated,
      user,
      profile,
      showLogin,
      isClosing,
      login,
      logout,
    }),
    [isLoading, isAuthenticated, user, profile, showLogin, isClosing, login, logout],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
