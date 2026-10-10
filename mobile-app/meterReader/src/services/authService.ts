import { getPasswordValidationError } from '@/lib/password';
import { supabase } from '@/lib/supabase';

/** True while Forgot Password OTP → new-password is in progress so the app
 *  shell does not treat the recovery session as a normal login. */
let passwordResetPending = false;

export function isPasswordResetPending(): boolean {
  return passwordResetPending;
}

function beginPasswordResetFlow(): void {
  passwordResetPending = true;
}

function endPasswordResetFlow(): void {
  passwordResetPending = false;
}

/** Shown for a wrong password and for a valid account that is not a meter
 *  reader, so the two cases cannot be told apart. */
const GENERIC_LOGIN_ERROR = 'Incorrect Credentials. Check Again.';

/** True while sign-in is still checking that this account may use the app.
 *  The shell must ignore the session until login() finishes. */
let loginGatePending = false;

export function isLoginGatePending(): boolean {
  return loginGatePending;
}

function loginFailure(message: string | undefined): Error {
  const raw = message?.trim() ?? '';
  if (!raw || /invalid login credentials/i.test(raw)) {
    return new Error(GENERIC_LOGIN_ERROR);
  }
  return new Error(raw);
}

/** Drop a session that authenticated but must not stay signed in. */
async function abandonSession(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {
    // The login gate still keeps the app on the login screen.
  }
}

export interface AuthUser {
  id: string;
  email: string | null;
  role: string;
  /** True until first login finishes OTP, a new password, and profile review. */
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
    return data as {
      role: { name: string };
      is_active: boolean;
      email: string;
      onboarded_at?: string | null;
    };
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

    return emailData as {
      role: { name: string };
      is_active: boolean;
      email: string;
      onboarded_at?: string | null;
    } | null;
  }

  return null;
}

/**
 * Whether the current session belongs in this app.
 * `null` means the profile could not be loaded — do not sign the user out.
 */
export async function currentSessionAllowed(): Promise<boolean | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return false;

  const profile = await getUserProfile(session.user.id, session.user.email ?? undefined);
  if (!profile) return null;
  return profile.is_active && profile.role?.name === 'meter_reader';
}

export async function login(username: string, password: string): Promise<AuthUser> {
  const email = username.trim().toLowerCase();
  if (!email.includes('@')) {
    throw new Error('Please log in with your email address.');
  }

  loginGatePending = true;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      if (data.user) await abandonSession();
      throw loginFailure(error?.message);
    }

    const profile = await getUserProfile(data.user.id, email);
    // Missing profile and the wrong role look the same as a bad password.
    if (!profile || profile.role?.name !== 'meter_reader') {
      await abandonSession();
      throw new Error(GENERIC_LOGIN_ERROR);
    }

    if (!profile.is_active) {
      await abandonSession();
      throw new Error('Your account is deactivated. Please contact support.');
    }

    return {
      id: data.user.id,
      email: data.user.email ?? null,
      role: profile.role.name,
      needsOnboarding: !profile.onboarded_at,
    };
  } finally {
    loginGatePending = false;
  }
}

/** The current user's full profile row (with role). */
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
  needs_onboarding: boolean;
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
      'id, email, first_name, middle_name, last_name, phone, avatar_url, is_active, onboarded_at, role:roles(name)'
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
  };
  return {
    id: row.id,
    email: row.email,
    first_name: row.first_name,
    middle_name: row.middle_name,
    last_name: row.last_name,
    phone: row.phone,
    avatar_url: row.avatar_url,
    is_active: row.is_active,
    role_name: row.role?.name ?? 'meter_reader',
    needs_onboarding: !row.onboarded_at,
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

/**
 * Send the first-login confirmation code to the email used to sign in.
 * Supabase Auth delivers it. Forgot-password uses a different email.
 */
export async function sendRegisteredEmailOtp(): Promise<void> {
  const { error } = await supabase.auth.reauthenticate();
  if (error) {
    throw new Error(error.message || 'Failed to send the verification code.');
  }
}

/** Confirm the code sent to the registration email. */
export async function verifyRegisteredEmailOtp(_email: string, token: string): Promise<void> {
  const trimmedToken = token.trim();
  if (!trimmedToken) {
    throw new Error('Please enter the verification code from your email.');
  }
  const { data, error } = await supabase.rpc('confirm_registered_email', {
    p_code: trimmedToken,
  });
  if (error) {
    throw new Error(error.message || 'Invalid verification code. Please try again.');
  }
  const result = data as { ok?: boolean; error?: string } | null;
  if (!result?.ok) {
    throw new Error(result?.error || 'Invalid verification code. Please try again.');
  }
}

/** Replace the temporary password issued at registration. */
export async function setPermanentPassword(newPassword: string): Promise<void> {
  const validationError = getPasswordValidationError(newPassword);
  if (validationError) throw new Error(validationError);
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message || 'Failed to set your new password.');
}

/** Save the reviewed profile and mark first login complete. */
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
  await updateProfile({
    first_name: input.first_name,
    middle_name: input.middle_name,
    last_name: input.last_name,
    phone: input.phone,
  });
  const { data, error } = await supabase.rpc('complete_resident_onboarding');
  if (error) throw new Error(error.message || 'Failed to complete account setup.');
  const result = data as { ok?: boolean; error?: string } | null;
  if (!result?.ok) {
    throw new Error(result?.error || 'Could not complete account setup. Please contact support.');
  }
}

/** Send a password-reset OTP email for the given account email. */
export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase()
  );
  if (error) {
    throw new Error(error.message || 'Failed to send reset email.');
  }
}

/**
 * Verify the 6-digit recovery OTP from email. Establishes a recovery session
 * that may set a new password via completePasswordReset().
 */
export async function verifyPasswordResetOtp(
  email: string,
  token: string
): Promise<void> {
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedToken = token.trim();
  if (!trimmedToken) {
    throw new Error('Please enter the verification code from your email.');
  }

  beginPasswordResetFlow();
  const { error } = await supabase.auth.verifyOtp({
    email: trimmedEmail,
    token: trimmedToken,
    type: 'recovery',
  });
  if (error) {
    endPasswordResetFlow();
    if (/expired/i.test(error.message)) {
      throw new Error('That code has expired. Please request a new one.');
    }
    throw new Error(error.message || 'Invalid verification code. Please try again.');
  }
}

/** Set a new password after OTP verification, then sign out for a clean login. */
export async function completePasswordReset(newPassword: string): Promise<void> {
  try {
    await changePassword(newPassword);
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message || 'Failed to sign out.');
  } finally {
    endPasswordResetFlow();
  }
}

/** Abandon an in-progress reset (clears recovery session if any). */
export async function cancelPasswordReset(): Promise<void> {
  try {
    if (passwordResetPending) {
      await supabase.auth.signOut();
    }
  } catch {
    // Ignore — local flag still clears below.
  } finally {
    endPasswordResetFlow();
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
