import { getPasswordValidationError } from '@/lib/password';
import { supabase } from '@/lib/supabase';
import { RESET_REDIRECT_URL } from '@/lib/env';

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

/**
 * Internal login handle for masterlist residents activated through the
 * `resident-login` edge function. MUST stay in sync with that function:
 * the resident types their Account Number and the app rebuilds the same
 * handle (acc-<cons code>@example.com). The handle is not secret, but it
 * is useless without the temporary password issued by the barangay office.
 */
export function looksLikeAccountNumber(username: string): boolean {
  const trimmed = username.trim();
  return /^[A-Za-z0-9-]+$/.test(trimmed) && /\d/.test(trimmed);
}

export function loginHandleForAccount(accountNumber: string): string {
  const sanitized = accountNumber.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  return `acc-${sanitized}@example.com`;
}

export async function login(username: string, password: string): Promise<AuthUser> {
  const trimmedUsername = username.trim();

  // Residents may sign in with their email address OR their Account Number /
  // Cons Code (+ password). An identifier alone never grants access —
  // Supabase Auth still requires the correct password.
  const email = trimmedUsername.includes('@')
    ? trimmedUsername.toLowerCase()
    : loginHandleForAccount(trimmedUsername);

  if (!trimmedUsername) {
    throw new Error('Please enter your email address or Account Number.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const rawMessage = error.message || '';
    if (/invalid login credentials/i.test(rawMessage) && !trimmedUsername.includes('@')) {
      throw new Error(
        'Account not found or not activated yet. Get your temporary password at the barangay office.',
      );
    }
    throw new Error(rawMessage || 'Login failed. Please try again.');
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

  if (profile.role?.name !== 'resident') {
    throw new Error('Unauthorized: this app is for Resident access only.');
  }

  return {
    id: data.user.id,
    email: data.user.email ?? null,
    role: profile.role.name,
  };
}

/** The current user's full profile row (with role + account info). */
export interface FullProfile {
  id: string;
  email: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  role_name: string;
  /** Primary resident account (resident_accounts), if any. */
  account_number: string | null;
  service_address: string | null;
  sitio: string | null;
}

export async function getCurrentProfile(): Promise<FullProfile | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, email, first_name, middle_name, last_name, phone, avatar_url, is_active, role:roles(name), accounts:resident_accounts(account_number, service_address, sitio)'
    )
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.warn('[mobile-auth] profile load failed:', error.message);
    return null;
  }
  if (!data) return null;

  const row = data as unknown as {
    id: string;
    email: string;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    phone: string | null;
    avatar_url: string | null;
    is_active: boolean;
    role?: { name: string } | null;
    accounts?: { account_number: string; service_address: string | null; sitio: string | null }[] | null;
  };
  const account = row.accounts?.[0] ?? null;
  return {
    id: row.id,
    email: row.email,
    first_name: row.first_name,
    middle_name: row.middle_name,
    last_name: row.last_name,
    phone: row.phone,
    avatar_url: row.avatar_url,
    is_active: row.is_active,
    role_name: row.role?.name ?? 'resident',
    account_number: account?.account_number ?? null,
    service_address: account?.service_address ?? null,
    sitio: account?.sitio ?? null,
  };
}

/** Update editable profile fields (names, phone, avatar). */
export async function updateProfile(input: {
  first_name?: string;
  middle_name?: string | null;
  last_name?: string;
  phone?: string | null;
  avatar_url?: string | null;
}): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error('You must be logged in to update your profile.');

  const patch: Record<string, string | null> = {};
  if (input.first_name !== undefined) patch.first_name = input.first_name.trim();
  if (input.middle_name !== undefined) patch.middle_name = input.middle_name?.trim() || null;
  if (input.last_name !== undefined) patch.last_name = input.last_name.trim();
  if (input.phone !== undefined) patch.phone = input.phone?.trim() || null;
  if (input.avatar_url !== undefined) patch.avatar_url = input.avatar_url?.trim() || null;

  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) throw new Error(error.message || 'Failed to update profile.');
}

/** Upload a local image as the user's avatar and return its public URL. */
export async function uploadAvatar(localUri: string): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error('You must be logged in to update your profile picture.');

  const response = await fetch(localUri);
  if (!response.ok) throw new Error('Could not read the selected image.');
  const arrayBuffer = await response.arrayBuffer();

  const extMatch = localUri.split('?')[0]?.match(/\.(\w+)$/);
  const ext = (extMatch?.[1] ?? 'jpg').toLowerCase();
  const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const path = `${userId}/avatar.${ext === 'jpeg' ? 'jpg' : ext}`;

  const { error: uploadError } = await supabase.storage.from('avatars').upload(path, arrayBuffer, {
    upsert: true,
    contentType,
  });
  if (uploadError) throw new Error(uploadError.message || 'Failed to upload profile picture.');

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const publicUrl = `${data.publicUrl}?t=${Date.now()}`;
  await updateProfile({ avatar_url: publicUrl });
  return publicUrl;
}

/** Send a password reset email for the given account email. */
export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo: RESET_REDIRECT_URL }
  );
  if (error) {
    throw new Error(error.message || 'Failed to send reset email.');
  }
}

/** Change the current user's password (strength rules enforced). */
export async function changePassword(newPassword: string): Promise<void> {
  const validationError = getPasswordValidationError(newPassword);
  if (validationError) {
    throw new Error(validationError);
  }
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message || 'Failed to update password.');
}

/** Sign the current user out. The app shell reacts via onAuthStateChange. */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message || 'Failed to sign out.');
}
