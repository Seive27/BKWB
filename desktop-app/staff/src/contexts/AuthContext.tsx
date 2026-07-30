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
  getCurrentUser,
} from '../services/authService';
import type { AuthUser, Profile, Role } from '../types';

// ── Context Value ──

export interface AuthContextValue {
  /** True while checking for an existing session on startup */
  isLoading: boolean;
  /** Whether a user is currently authenticated */
  isAuthenticated: boolean;
  /** The authenticated user info (null if not authenticated) */
  user: AuthUser | null;
  /** The user's full profile from the profiles table */
  profile: Profile | null;
  /** Whether the login modal is currently shown */
  showLogin: boolean;
  /** Whether the close-animation is playing */
  isClosing: boolean;
  /** Attempt login — resolves on success, throws on failure */
  login: (email: string, password: string) => Promise<void>;
  /** Log the current user out and return to the login screen */
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──

interface AuthProviderProps {
  children: ReactNode;
  /** The only role name allowed by this desktop app.
   *  Staff app → 'staff', Super Admin app → 'super_admin' */
  allowedRole: Role['name'];
  /** Human-readable name shown in "Unauthorized access" messages */
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

  // ── Session restore on mount ──

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const existingUser = await getCurrentUser();
        if (cancelled) return;

        if (existingUser) {
          // Validate role matches the current app
          if (existingUser.role !== allowedRole) {
            // Session restored with wrong role — silently sign out
            await authLogout();
            if (!cancelled) {
              setIsLoading(false);
              setShowLogin(true);
            }
            return;
          }

          setUser(existingUser);
          setProfile(existingUser.profile);
          setIsAuthenticated(true);
          setShowLogin(false);
        }
      } catch {
        // Session invalid — show login
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [allowedRole]);

  // ── Login ──

  const login = useCallback(async (email: string, password: string) => {
    const authUser = await authLogin(email, password);

    // Validate role
    if (authUser.role !== allowedRole) {
      // Sign out immediately — wrong app
      await authLogout();
      throw new Error(
        `Unauthorized access. This application is for ${portalName} only. ` +
        'Please use the correct application for your role.'
      );
    }

    // Success — animate and show dashboard
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
      // Even if the network call fails, clear local state
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
