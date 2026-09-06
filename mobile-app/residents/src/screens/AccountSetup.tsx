import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDialog } from '@/components/ui/AppDialog';
import { PasswordStrengthHint } from '@/components/ui/PasswordStrengthHint';
import { friendlyErrorMessage, isNetworkError } from '@/lib/errors';
import { getPasswordValidationError } from '@/lib/password';
import {
  completeAccountSetup,
  getCurrentProfile,
  sendVerificationEmail,
  setPermanentPassword,
  signOut,
  verifyEmailOwnership,
  type FullProfileWithOnboarding,
} from '@/services/authService';

type AccountSetupProps = {
  onSetupComplete: () => void;
};

type SetupStep = 'email' | 'otp' | 'password' | 'profile' | 'done';

/** Matches the Supabase "Email OTP length" setting (set to 6 in the
 *  dashboard). The min-length floor keeps Verify safe if the setting is
 *  ever changed back to 8. */
const OTP_LENGTH = 6;
const OTP_MAX_LENGTH = 8;

const stepShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 3,
};

/** Progress indicator across the four mandatory setup steps. */
function StepProgress({ current }: { current: number }) {
  const TOTAL = 4;
  return (
    <View className="flex-row items-center gap-1.5">
      {Array.from({ length: TOTAL }).map((_, index) => (
        <View
          key={index}
          className={`h-1.5 flex-1 rounded-full ${index <= current ? 'bg-brand' : 'bg-brand-100'}`}
        />
      ))}
    </View>
  );
}

function StepHeading({
  step,
  total,
  title,
  subtitle,
}: {
  step: number;
  total: number;
  title: string;
  subtitle: string;
}) {
  return (
    <View className="mb-5">
      <StepProgress current={step - 1} />
      <Text className="mt-5 text-[22px] font-bold leading-7 text-slate-900">{title}</Text>
      <Text className="mt-1.5 text-sm leading-5 text-slate-500">{subtitle}</Text>
      <Text className="mt-2 text-xs font-semibold uppercase tracking-wide text-brand">
        Step {step} of {total}
      </Text>
    </View>
  );
}

export default function AccountSetup({ onSetupComplete }: AccountSetupProps) {
  const insets = useSafeAreaInsets();
  const dialog = useDialog();

  const [step, setStep] = useState<SetupStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Password step
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Profile step
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');


  const stepIndex = useMemo<Record<SetupStep, number>>(
    () => ({ email: 1, otp: 2, password: 3, profile: 4, done: 4 }),
    []
  );

  /** Shared error funnel: connectivity failures open the branded retry
   *  modal; everything else shows inline on the current step. */
  const runWithErrors = async (
    fallback: string,
    action: () => Promise<void>,
    inline: (message: string) => void,
    retry: () => Promise<void>
  ) => {
    try {
      await action();
    } catch (err) {
      const message = friendlyErrorMessage(err, fallback);
      if (isNetworkError(message)) {
        dialog.alert(
          'Connection Problem',
          "You're offline or the connection is unstable. Check your Wi-Fi or mobile data, then try again — your progress in the setup is saved.",
          {
            tone: 'warning',
            actions: [
              { label: 'Try Again', onPress: () => { void retry(); } },
              { label: 'Dismiss' },
            ],
          }
        );
      } else {
        inline(message);
      }
    }
  };

  // ── Step 1: enter the email address that will own this account ──
  const handleSendCode = async () => {
    setError('');
    setBusy(true);
    await runWithErrors(
      'Could not send the verification code.',
      async () => {
        await sendVerificationEmail(email);
        setStep('otp');
      },
      setError,
      handleSendCode
    );
    setBusy(false);
  };

  // ── Step 2: confirm the 6-digit code from the resident's inbox ──
  const handleVerifyCode = async () => {
    setOtpError('');
    setBusy(true);
    await runWithErrors(
      'Invalid verification code. Please try again.',
      async () => {
        await verifyEmailOwnership(email, otp);
        setStep('password');
      },
      setOtpError,
      handleVerifyCode
    );
    setBusy(false);
  };

  const handleResendCode = async () => {
    setOtpError('');
    setBusy(true);
    await runWithErrors(
      'Could not resend the code.',
      async () => {
        await sendVerificationEmail(email);
        dialog.toast('A new code was sent to your email');
      },
      setOtpError,
      handleResendCode
    );
    setBusy(false);
  };

  // ── Step 3: replace the barangay-issued temporary password ──
  const handleSetPassword = async () => {
    setError('');
    if (password !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    const validationError = getPasswordValidationError(password);
    if (validationError) {
      setError(validationError);
      return;
    }
    setBusy(true);
    await runWithErrors(
      'Could not set your new password.',
      async () => {
        await setPermanentPassword(password);
        // Prefill the profile step with whatever the barangay already has on file.
        const profile = await getCurrentProfile();
        if (profile) {
          setFirstName(profile.first_name ?? '');
          setMiddleName(profile.middle_name ?? '');
          setLastName(profile.last_name ?? '');
          setPhone(profile.phone ?? '');
        }
        setStep('profile');
      },
      setError,
      handleSetPassword
    );
    setBusy(false);
  };

  // ── Step 4: confirm profile info and finish setup ──
  const handleCompleteSetup = async () => {
    setError('');
    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required.');
      return;
    }
    setBusy(true);
    await runWithErrors(
      'Could not complete account setup. Please try again.',
      async () => {
        await completeAccountSetup({
          first_name: firstName,
          middle_name: middleName.trim() || null,
          last_name: lastName,
          phone: phone.trim() || null,
        });
        setStep('done');
      },
      setError,
      handleCompleteSetup
    );
    setBusy(false);
  };

  // ── Success: hand control back to the app shell (dashboard) ──
  const handleDone = () => {
    onSetupComplete();
  };

  // Escape hatch for residents stuck mid-setup (e.g. they cannot access
  // their email right now): sign out instead of leaving them trapped.
  const handleSignOut = () => {
    dialog.confirm({
      title: 'Sign Out',
      message: 'Leave account setup and sign out for now?',
      confirmLabel: 'Sign Out',
      cancelLabel: 'Cancel',
      destructive: true,
      onConfirm: () => {
        signOut().catch(() => {});
      },
    });
  };

  const goBackToEmail = () => {
    setOtp('');
    setOtpError('');
    setError('');
    setStep('email');
  };

  return (
    <View className="flex-1 bg-slate-50" style={{ paddingTop: insets.top }}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: 24,
            paddingVertical: Math.max(insets.bottom, 24),
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand header — same identity as the login screen */}
          <View className="mb-7 items-center">
            <Image
              source={require('../../assets/Logo/Logo.BK.png')}
              style={{ width: 72, height: 72, marginBottom: 14 }}
              contentFit="contain"
              accessibilityLabel="Barangay Kalunasan official seal"
            />
            <Text className="text-center text-lg font-bold text-slate-900">Account Setup</Text>
            <Text className="mt-1 text-center text-[13px] leading-5 text-slate-500">
              One-time setup to secure your BKWB account.
            </Text>
          </View>

          {step !== 'done' ? (
            <View className="rounded-2xl border border-slate-200 bg-white p-5" style={stepShadow}>
              {step === 'email' && (
                <View>
                  <StepHeading
                    step={stepIndex.email}
                    total={4}
                    title="Verify your email"
                    subtitle="Enter your Gmail address. We'll send a verification code to confirm it's yours."
                  />
                  <Text className="mb-1.5 text-sm font-medium text-slate-700">Email address</Text>
                  <TextInput
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (error) setError('');
                    }}
                    placeholder="you@gmail.com"
                    placeholderTextColor="#94A3B8"
                    className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 text-[15px] text-slate-800"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    keyboardType="email-address"
                    returnKeyType="done"
                    onSubmitEditing={handleSendCode}
                  />
                  {error ? (
                    <Text className="mt-2 text-xs text-red-500">{error}</Text>
                  ) : null}
                  <Pressable
                    onPress={handleSendCode}
                    disabled={busy}
                    className="mt-5 items-center rounded-xl bg-brand py-3.5 active:bg-brand-dark disabled:opacity-60"
                    accessibilityRole="button"
                    accessibilityLabel="Send verification code"
                  >
                    {busy ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text className="text-base font-semibold text-white">Send Code</Text>
                    )}
                  </Pressable>
                </View>
              )}

              {step === 'otp' && (
                <View>
                  <StepHeading
                    step={stepIndex.otp}
                    total={4}
                    title="Enter verification code"
                    subtitle={`We sent a verification code to ${email.trim() || 'your email'}.`}
                  />
                  <TextInput
                    value={otp}
                    onChangeText={(text) => {
                      setOtp(text.replace(/[^0-9]/g, '').slice(0, OTP_MAX_LENGTH));
                      if (otpError) setOtpError('');
                    }}
                    placeholder={`${'\u2022'.repeat(OTP_LENGTH)}`}
                    placeholderTextColor="#CBD5E1"
                    className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 text-center text-xl font-bold tracking-[10px] text-slate-800"
                    keyboardType="number-pad"
                    maxLength={OTP_MAX_LENGTH}
                    textContentType="oneTimeCode"
                    autoComplete="sms-otp"
                    returnKeyType="done"
                    onSubmitEditing={handleVerifyCode}
                  />
                  <Text className="mt-2 text-center text-xs text-slate-400">
                    Enter the {OTP_LENGTH}-digit code from your inbox
                  </Text>
                  {otpError ? (
                    <Text className="mt-2 text-xs text-red-500">{otpError}</Text>
                  ) : null}
                  <Pressable
                    onPress={handleVerifyCode}
                    disabled={busy || otp.replace(/\s/g, '').length < OTP_LENGTH}
                    className="mt-5 items-center rounded-xl bg-brand py-3.5 active:bg-brand-dark disabled:opacity-60"
                    accessibilityRole="button"
                    accessibilityLabel="Verify code"
                  >
                    {busy ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text className="text-base font-semibold text-white">Verify</Text>
                    )}
                  </Pressable>
                  <View className="mt-3 flex-row items-center justify-between">
                    <Pressable onPress={goBackToEmail} className="py-1 active:opacity-70">
                      <Text className="text-sm font-medium text-slate-500">Change email</Text>
                    </Pressable>
                    <Pressable onPress={handleResendCode} disabled={busy} className="py-1 active:opacity-70">
                      <Text className="text-sm font-medium text-brand">Resend code</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {step === 'password' && (
                <View>
                  <StepHeading
                    step={stepIndex.password}
                    total={4}
                    title="Create your password"
                    subtitle="This replaces the temporary password from the barangay office."
                  />
                  <Text className="mb-1.5 text-sm font-medium text-slate-700">New password</Text>
                  <TextInput
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (error) setError('');
                    }}
                    placeholder="Enter new password"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showPassword}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 text-[15px] text-slate-800"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="password-new"
                  />
                  <PasswordStrengthHint password={password} />
                  <Text className="mb-1.5 mt-4 text-sm font-medium text-slate-700">
                    Confirm password
                  </Text>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      if (error) setError('');
                    }}
                    placeholder="Re-enter new password"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showPassword}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 text-[15px] text-slate-800"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="password-new"
                  />
                  {error ? <Text className="mt-2 text-xs text-red-500">{error}</Text> : null}
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    className="mt-3 self-start active:opacity-70"
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Hide passwords' : 'Show passwords'}
                  >
                    <Text className="text-sm font-medium text-brand">
                      {showPassword ? 'Hide passwords' : 'Show passwords'}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSetPassword}
                    disabled={busy}
                    className="mt-5 items-center rounded-xl bg-brand py-3.5 active:bg-brand-dark disabled:opacity-60"
                    accessibilityRole="button"
                    accessibilityLabel="Save new password"
                  >
                    {busy ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text className="text-base font-semibold text-white">Continue</Text>
                    )}
                  </Pressable>
                </View>
              )}

              {step === 'profile' && (
                <View>
                  <StepHeading
                    step={stepIndex.profile}
                    total={4}
                    title="Review your information"
                    subtitle="Confirm your details below. Your account number and billing records stay unchanged."
                  />
                  <View className="mb-4 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
                    <Text className="text-[13px] leading-5 text-brand-800">
                      Your verified email: <Text className="font-semibold">{email.trim()}</Text>
                    </Text>
                  </View>

                  <Text className="mb-1.5 text-sm font-medium text-slate-700">First name</Text>
                  <TextInput
                    value={firstName}
                    onChangeText={(text) => {
                      setFirstName(text);
                      if (error) setError('');
                    }}
                    placeholder="First name"
                    placeholderTextColor="#94A3B8"
                    className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 text-[15px] text-slate-800"
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                  <Text className="mb-1.5 mt-3 text-sm font-medium text-slate-700">Middle name (optional)</Text>
                  <TextInput
                    value={middleName}
                    onChangeText={setMiddleName}
                    placeholder="Middle name"
                    placeholderTextColor="#94A3B8"
                    className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 text-[15px] text-slate-800"
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                  <Text className="mb-1.5 mt-3 text-sm font-medium text-slate-700">Last name</Text>
                  <TextInput
                    value={lastName}
                    onChangeText={(text) => {
                      setLastName(text);
                      if (error) setError('');
                    }}
                    placeholder="Last name"
                    placeholderTextColor="#94A3B8"
                    className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 text-[15px] text-slate-800"
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                  <Text className="mb-1.5 mt-3 text-sm font-medium text-slate-700">Contact number</Text>
                  <TextInput
                    value={phone}
                    onChangeText={(text) => {
                      setPhone(text.replace(/[^0-9]/g, '').slice(0, 11));
                      if (error) setError('');
                    }}
                    placeholder="09XXXXXXXXX"
                    placeholderTextColor="#94A3B8"
                    className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 text-[15px] text-slate-800"
                    keyboardType="number-pad"
                    returnKeyType="done"
                  />
                  {error ? <Text className="mt-2 text-xs text-red-500">{error}</Text> : null}
                  <Pressable
                    onPress={handleCompleteSetup}
                    disabled={busy}
                    className="mt-5 items-center rounded-xl bg-brand py-3.5 active:bg-brand-dark disabled:opacity-60"
                    accessibilityRole="button"
                    accessibilityLabel="Finish account setup"
                  >
                    {busy ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text className="text-base font-semibold text-white">Finish Setup</Text>
                    )}
                  </Pressable>
                </View>
              )}
            </View>
          ) : (
            <View className="items-center rounded-2xl border border-slate-200 bg-white p-6" style={stepShadow}>
              <View className="h-16 w-16 items-center justify-center rounded-full bg-brand-100">
                <Text className="text-3xl text-brand">✓</Text>
              </View>
              <Text className="mt-4 text-xl font-bold text-slate-900">You're all set!</Text>
              <Text className="mt-2 text-center text-sm leading-5 text-slate-500">
                Your email is verified and your new password is active. Welcome to BKWB.
              </Text>
              <View className="mt-4 w-full rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
                <Text className="text-center text-[13px] leading-5 text-brand-800">
                  Keep your account number! You can always sign in with{'\n'}
                  <Text className="font-semibold">{email.trim()}</Text> or your Account Number,
                  {' '}plus your new password.
                </Text>
              </View>
              <Pressable
                onPress={handleDone}
                className="mt-6 w-full items-center rounded-xl bg-brand py-3.5 active:bg-brand-dark"
                accessibilityRole="button"
                accessibilityLabel="Go to dashboard"
              >
                <Text className="text-base font-bold text-white">Go to Dashboard</Text>
              </Pressable>
            </View>
          )}

          {step !== 'done' ? (
            <Pressable
              onPress={handleSignOut}
              className="mt-5 self-center px-4 py-2 active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Sign out"
            >
              <Text className="text-sm font-medium text-slate-500">Sign out instead</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
