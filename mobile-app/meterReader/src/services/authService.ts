import { supabase } from '@/lib/supabase';

export interface AuthUser {
  id: string;
  email: string | null;
  role: string;
}

async function getUserProfile(userId: string, email?: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, role:roles(*)')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.warn('[mobile-auth] profile lookup failed:', error.message);
    return null;
  }

  if (data) {
    return data as { role: { name: string }; is_active: boolean; email: string };
  }

  if (email) {
    const { data: emailData, error: emailError } = await supabase
      .from('profiles')
      .select('*, role:roles(*)')
      .eq('email', email)
      .maybeSingle();

    if (emailError) {
      console.warn('[mobile-auth] email profile lookup failed:', emailError.message);
      return null;
    }

    return emailData as { role: { name: string }; is_active: boolean; email: string } | null;
  }

  return null;
}

export async function login(username: string, password: string): Promise<AuthUser> {
  const email = username.trim().toLowerCase();
  if (!email.includes('@')) {
    throw new Error('Please log in with your email address.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message || 'Login failed. Please try again.');
  }

  if (!data.user) {
    throw new Error('Authentication failed.');
  }

  const profile = await getUserProfile(data.user.id, email);
  if (!profile) {
    throw new Error('Profile not found. Please contact support.');
  }

  if (!profile.is_active) {
    throw new Error('Your account is deactivated. Please contact support.');
  }

  if (profile.role?.name !== 'meter_reader') {
    throw new Error('Unauthorized: this app is for Meter Reader access only.');
  }

  return {
    id: data.user.id,
    email: data.user.email ?? null,
    role: profile.role.name,
  };
}
