import { getPasswordValidationError } from '@/lib/password';
import { supabase } from '@/lib/supabase';
import { RESET_REDIRECT_URL } from '@/lib/env';

export interface AuthUser {
  id: string;
  email: string | null;
  role: string;
  /** True when the account still needs the mandatory Account Setup flow. */
  needsOnboarding: boolean;
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

  if (!trimmedUsername) {
    throw new Error('Please enter your email address or Account Number.');
  }

  // Residents may sign in with their email address OR their Account Number /
  // Cons Code (+ password). An identifier alone never grants access —
  // Supabase Auth still requires the correct password.
  const isEmailLogin = trimmedUsername.includes('@');
  const email = isEmailLogin
    ? trimmedUsername.toLowerCase()
    : loginHandleForAccount(trimmedUsername);

  let signInError: string | null = null;

  if (isEmailLogin) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) signInError = error.message;
  } else {
    // Account-number login. First attempt the pre-setup handle
    // (acc-<conscode>@example.com); if that identity no longer exists the
    // resident has completed Account Setup and their account number now
    // resolves through the resident-account-login edge function instead.
    const first = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!first.error) {
      // signed in with the handle — nothing more to do
    } else if (/invalid login credentials/i.test(first.error.message ?? '')) {
      const { data: resolved, error: resolveError } = await supabase.functions.invoke(
        'resident-account-login',
        {
          body: { account_number: trimmedUsername, password },
        }
      );
      const loginEmail =
        !resolveError && (resolved as { ok?: boolean; login_email?: string } | null)?.ok
          ? (resolved as { login_email: string }).login_email
          : null;
      if (!loginEmail) {
        // Unknown account, not-yet-activated, or wrong password — the edge
        // function returns the same generic error for all three so nothing
        // about the account's existence can be discovered.
        throw new Error(
          'Account not found or not activated yet. Get your temporary password at the barangay office.',
        );
      }
      const second = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });
      if (second.error) {
        throw new Error(second.error.message || 'Login failed. Please try again.');
      }
    } else {
      signInError = first.error.message;
    }
  }

  if (signInError) {
    throw new Error(signInError || 'Login failed. Please try again.');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Authentication failed.');
  }

  const profile = await getUserProfile(user.id, email);
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
    id: user.id,
    email: user.email ?? null,
    role: profile.role.name,
    needsOnboarding: profileNeedsOnboarding(profile),
  };
}

/**
 * The onboarding gate. A resident must complete Account Setup while
 * their profile has no onboarded_at timestamp, which is exactly when
 * they are still signing in with the internal login handle
 * (acc-<cons code>@example.com) issued by the barangay office.
 * Profiles with a real email were onboarded already (or are seeded
 * with real credentials) and skip setup entirely.
 */
function profileNeedsOnboarding(profile: {
  email: string;
  onboarded_at?: string | null;
}): boolean {
  if (profile.onboarded_at) return false;
  return isLoginHandleEmail(profile.email);
}

/** True when the email is our internal, cannot-receive-mail login handle. */
export function isLoginHandleEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return /^acc-[a-z0-9-]+@example\.com$/i.test(email.trim().toLowerCase());
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

export async function getCurrentProfile(): Promise<FullProfileWithOnboarding | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, email, first_name, middle_name, last_name, phone, avatar_url, is_active, onboarded_at, role:roles(name), accounts:resident_accounts(account_number, service_address, sitio)'
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
    onboarded_at?: string | null;
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
    needs_onboarding: profileNeedsOnboarding({
      email: row.email,
      onboarded_at: row.onboarded_at,
    }),
  };
}

/** FullProfile gains the onboarding flag (see profileNeedsOnboarding). */
export interface FullProfileWithOnboarding extends FullProfile {
  needs_onboarding: boolean;
}

/**
 * Step 2 of Account Setup — request the verification code.
 *
 * Uses Supabase Auth's native secure email change: updateUser({ email })
 * sends a 6-digit code to the NEW address, and the account's email is
 * only swapped after verifyEmailOwnership() confirms it. No OTP is ever
 * stored in this app or database (GoTrue hashes it server-side).
 */
export async function sendVerificationEmail(newEmail: string): Promise<void> {
  const trimmed = newEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new Error('Please enter a valid email address.');
  }
  if (isLoginHandleEmail(trimmed)) {
    throw new Error('Please enter your real Gmail/email address.');
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('You must be signed in to set up your account.');

  const { error } = await supabase.auth.updateUser({ email: trimmed });
  if (error) {
    // Duplicate email is the most common failure; give it a friendly message.
    if (/already.{0,20}registered/i.test(error.message)) {
      throw new Error('That email is already linked to another account. Use a different one.');
    }
    throw new Error(error.message || 'Failed to send the verification code.');
  }
}

/**
 * Step 3 of Account Setup — verify the OTP code sent to the resident's
 * own email. Supabase Auth commits the email change only when the code
 * is correct, which is what proves mailbox ownership.
 */
export async function verifyEmailOwnership(email: string, token: string): Promise<void> {
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedToken = token.trim();
  if (!trimmedToken) {
    throw new Error('Please enter the verification code from your email.');
  }

  const { error } = await supabase.auth.verifyOtp({
    email: trimmedEmail,
    token: trimmedToken,
    type: 'email_change',
  });
  if (error) {
    if (/expired/i.test(error.message)) {
      throw new Error('That code has expired. Please request a new one.');
    }
    throw new Error(error.message || 'Invalid verification code. Please try again.');
  }
}

/**
 * Step 4 of Account Setup — set the permanent password.
 * Delegates to Supabase Auth (bcrypt server-side); the temporary
 * barangay password stops working immediately after this succeeds.
 */
export async function setPermanentPassword(newPassword: string): Promise<void> {
  const validationError = getPasswordValidationError(newPassword);
  if (validationError) {
    throw new Error(validationError);
  }
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message || 'Failed to set your new password.');
}

/** Server-side shape of the RPC result. */
interface OnboardingRpcResult {
  ok: boolean;
  error?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

/**
 * Final step of Account Setup — persist the completed profile info and
 * flip the account to onboarded/active in one atomic server call.
 *
 * The RPC locates the profile strictly by auth.uid() and refuses to
 * complete unless the auth email is a real, confirmed mailbox, so a
 * resident can never complete setup for anybody but themselves.
 */
export async function completeAccountSetup(input: {
  first_name: string;
  middle_name: string | null;
  last_name: string;
  phone: string | null;
}): Promise<void> {
  if (!input.first_name.trim() || !input.last_name.trim()) {
    throw new Error('First name and last name are required.');
  }
  if (input.phone) {
    const digits = input.phone.replace(/\D/g, '');
    if (!/^09\d{9}$/.test(digits)) {
      throw new Error('Contact number must start with 09 and have exactly 11 digits.');
    }
  }

  // 1. Save the profile fields through the existing RLS-protected update
  //    (residents may only ever update their own row).
  await updateProfile({
    first_name: input.first_name,
    middle_name: input.middle_name,
    last_name: input.last_name,
    phone: input.phone,
  });

  // 2. Atomically mark the account onboarded via the SECURITY DEFINER RPC.
  const { data, error } = await supabase.rpc('complete_resident_onboarding');
  if (error) throw new Error(error.message || 'Failed to complete account setup.');

  const result = data as OnboardingRpcResult | null;
  if (!result?.ok) {
    throw new Error(result?.error || 'Could not complete account setup. Please contact support.');
  }
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
