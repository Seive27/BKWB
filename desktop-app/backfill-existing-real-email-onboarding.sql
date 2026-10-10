-- Existing accounts that already have a real mailbox were registered before
-- first-login email OTP was required. Mark them onboarded so only accounts
-- created after this point (onboarded_at left null by create-user) must
-- verify email, set a password, and confirm their profile.
--
-- Placeholder logins stay pending. Those residents still sign in with an
-- account number and finish Account Setup by entering their own email.
UPDATE public.profiles
SET onboarded_at = NOW()
WHERE onboarded_at IS NULL
  AND email IS NOT NULL
  AND lower(btrim(email)) !~ '^(acc-[a-z0-9-]+|no-email-[a-f0-9]+)@example\.com$';
