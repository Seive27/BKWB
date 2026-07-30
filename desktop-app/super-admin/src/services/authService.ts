import { supabase } from '../lib/supabase';
import type { Profile, AuthUser, Role } from '../types';

// ── Error Handling ──

export function getAuthErrorMessage(error: {
  message: string;
  status?: number;
  code?: string;
}): string {
  const msg = error.message?.toLowerCase() ?? '';
  const code = error?.code ?? '';

  if (
    msg.includes('relation') ||
    msg.includes('does not exist') ||
    code === '42P01'
  ) {
    return 'The application database has not been set up yet. Please run the SQL migration to create the required tables.';
  }

  if (msg.includes('invalid login credentials')) {
    return 'Invalid email or password. Please try again.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Please confirm your email address before logging in.';
  }
  if (msg.includes('user already registered')) {
    return 'An account with this email already exists.';
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Network unavailable. Please check your connection and try again.';
  }
  if (msg.includes('session') || msg.includes('expired')) {
    return 'Your session has expired. Please log in again.';
  }
  if (msg.includes('rate limit')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }

  return error.message || 'An unexpected error occurred. Please try again.';
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: AuthUser;
}

// ── Profile Helpers ──

async function getUserProfile(userId: string, email?: string): Promise<Profile | null> {
  // ── Attempt 1: Join query by userId ──
  const { data: joinData, error: joinError } = await supabase
    .from('profiles')
    .select('*, role:roles(*)')
    .eq('id', userId)
    .maybeSingle();

  if (joinData && !joinError) {
    return joinData as unknown as Profile;
  }

  if (joinError) {
    console.warn('[auth] Join query by userId failed:', joinError.message);
  }

  // ── Helper: fetch profile + role separately by a given column ──
  async function findByColumn(column: string, value: string): Promise<Profile | null> {
    const { data: pData, error: pError } = await supabase
      .from('profiles')
      .select('*')
      .eq(column, value)
      .maybeSingle();

    if (pError || !pData) {
      if (pError) console.warn(`[auth] Profile query by ${column} failed:`, pError.message);
      return null;
    }

    const { data: rData, error: rError } = await supabase
      .from('roles')
      .select('*')
      .eq('id', pData.role_id)
      .maybeSingle();

    if (rError || !rData) {
      console.warn('[auth] Role lookup failed:', rError?.message ?? 'No matching role');
      return null;
    }

    return { ...pData, role: rData } as unknown as Profile;
  }

  // ── Attempt 2: Separate queries by userId ──
  const result = await findByColumn('id', userId);
  if (result) return result;

  // ── Attempt 3: Separate queries by email (in case profile UUID != auth user UUID) ──
  if (email) {
    console.warn('[auth] Trying profile lookup by email:', email);
    return findByColumn('email', email);
  }

  return null;
}

// ── Auth Functions ──

export async function login(email: string, password: string): Promise<AuthUser> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(getAuthErrorMessage(error));
  }

  if (!data.user) {
    throw new Error('Authentication succeeded but no user data returned.');
  }

  const profile = await getUserProfile(data.user.id, email);
  if (!profile) {
    await supabase.auth.signOut();
    throw new Error('Profile record not found. Please contact your administrator.');
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();
    throw new Error('Your account has been deactivated. Please contact your administrator.');
  }

  return {
    id: profile.id,
    email: profile.email,
    role: profile.role.name as Role['name'],
    profile,
  };
}

export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(getAuthErrorMessage(error));
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.user) return null;

  const userId = sessionData.session.user.id;
  const userEmail = sessionData.session.user.email;
  const profile = await getUserProfile(userId, userEmail);
  if (!profile || !profile.is_active) return null;

  return {
    id: profile.id,
    email: profile.email,
    role: profile.role.name as Role['name'],
    profile,
  };
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.user) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    return getUserProfile(user.id, user.email ?? undefined);
  }
  const userEmail = sessionData.session.user.email;
  return getUserProfile(sessionData.session.user.id, userEmail);
}

export async function refreshSession(): Promise<void> {
  const { error } = await supabase.auth.refreshSession();
  if (error) {
    throw new Error(getAuthErrorMessage(error));
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

export async function resetPassword(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: undefined,
  });
  if (error) {
    throw new Error(getAuthErrorMessage(error));
  }
}

export async function changePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (error) {
    throw new Error(getAuthErrorMessage(error));
  }
}
