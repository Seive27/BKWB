import { supabase } from '../lib/supabase';

// ── Error handling ──

export function getProfileServiceErrorMessage(error: {
  message: string;
  code?: string;
}): string {
  const msg = error.message?.toLowerCase() ?? '';
  const code = error?.code ?? '';
  if (
    msg.includes('relation') ||
    msg.includes('does not exist') ||
    code === '42P01'
  ) {
    return 'The profiles table has not been set up yet. Please run the SQL migration.';
  }
  if (code === '42501' || msg.includes('row-level security') || msg.includes('permission denied')) {
    return 'You do not have permission to update your profile.';
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Network unavailable. Please check your connection and try again.';
  }
  return error.message || 'An unexpected error occurred. Please try again.';
}

// ── Profile update ──

export interface ProfileUpdateInput {
  firstName: string;
  middleName?: string | null;
  lastName: string;
  phone?: string | null;
  avatarUrl?: string | null;
}

/**
 * Update the current user's editable profile fields on the profiles table.
 * The database audit trigger records the change automatically.
 */
export async function updateOwnProfile(input: ProfileUpdateInput): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('You must be logged in to update your profile.');
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      first_name: input.firstName.trim(),
      middle_name: input.middleName?.trim() || null,
      last_name: input.lastName.trim(),
      phone: input.phone?.trim() || null,
      avatar_url: input.avatarUrl?.trim() || null,
    })
    .eq('id', user.id);

  if (error) {
    throw new Error(getProfileServiceErrorMessage(error));
  }
}

// ── Password change ──

/**
 * Change the current user's password. `newPassword` must be at least 8
 * characters. The user's email is left untouched.
 */
export async function changeOwnPassword(newPassword: string): Promise<void> {
  if (newPassword.length < 8) {
    throw new Error('New password must be at least 8 characters.');
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (error) {
    throw new Error(getProfileServiceErrorMessage(error));
  }
}

/** Sign out the current session. */
export async function signOutCurrentUser(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(getProfileServiceErrorMessage(error));
  }
}
