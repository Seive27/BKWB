import Constants from 'expo-constants';

const expoConfig = Constants.expoConfig as { extra?: Record<string, unknown> } | null;
const extra = expoConfig?.extra ?? {};

export const SUPABASE_URL = (extra.SUPABASE_URL as string) ?? '';
export const SUPABASE_ANON_KEY = (extra.SUPABASE_ANON_KEY as string) ?? '';

/** Hosted "Forgot Password" landing page (see /reset-password). */
export const RESET_REDIRECT_URL =
  (extra.RESET_REDIRECT_URL as string) ?? 'https://idyllic-lolly-7c6e23.netlify.app/';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    '[BKWB] Missing Supabase environment variables. Add SUPABASE_URL and SUPABASE_ANON_KEY to app.json extra.'
  );
}
