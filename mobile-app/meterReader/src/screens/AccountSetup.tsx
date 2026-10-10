import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

import { PasswordStrengthHint } from '@/components/ui/PasswordStrengthHint';
import { getPasswordValidationError } from '@/lib/password';
import {
  completeAccountSetup,
  getCurrentProfile,
  sendRegisteredEmailOtp,
  setPermanentPassword,
  signOut,
  verifyRegisteredEmailOtp,
} from '@/services/authService';

type AccountSetupProps = {
  onSetupComplete: () => void;
};

type SetupStep = 'loading' | 'otp' | 'password' | 'profile' | 'done';

const OTP_LENGTH = 6;
const OTP_MAX_LENGTH = 8;

const stepShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 3,
};

function StepProgress({ current }: { current: number }) {
  return (
    <View className="flex-row items-center gap-1.5">
      {Array.from({ length: 3 }).map((_, index) => (
        <View
          key={index}
          className={`h-1.5 flex-1 rounded-full ${index <= current ? 'bg-brand' : 'bg-brand-100'}`}
        />
      ))}
    </View>
  );
}

export default function AccountSetup({ onSetupComplete }: AccountSetupProps) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<SetupStep>('loading');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const profile = await getCurrentProfile();
      if (cancelled) return;
      if (profile) {
        setEmail(profile.email ?? '');
        setFirstName(profile.first_name ?? '');
        setMiddleName(profile.middle_name ?? '');
        setLastName(profile.last_name ?? '');
        setPhone(profile.phone ?? '');
      }
      setStep('otp');
      try {
        await sendRegisteredEmailOtp();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not send the verification code.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleVerifyCode = async () => {
    setError('');
    setBusy(true);
    try {
      await verifyRegisteredEmailOtp(email, otp);
      setStep('password');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setBusy(true);
    try {
      await sendRegisteredEmailOtp();
      Alert.alert('Code sent', 'A new code was sent to your email.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend the code.');
    } finally {
      setBusy(false);
    }
  };

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
    try {
      await setPermanentPassword(password);
      setStep('profile');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set your new password.');
    } finally {
      setBusy(false);
    }
  };

  const handleCompleteSetup = async () => {
    setError('');
    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required.');
      return;
    }
    setBusy(true);
    try {
      await completeAccountSetup({
        first_name: firstName,
        middle_name: middleName.trim() || null,
        last_name: lastName,
        phone: phone.trim() || null,
      });
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete account setup.');
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Leave account setup and sign out for now?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => { signOut().catch(() => {}); } },
    ]);
  };

  const stepNumber = step === 'otp' ? 1 : step === 'password' ? 2 : 3;

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
              {step === 'loading' ? (
                <View className="items-center py-8">
                  <ActivityIndicator color="#1E3A5F" />
                  <Text className="mt-3 text-sm text-slate-500">Sending your verification code...</Text>
                </View>
              ) : (
                <View>
                  <StepProgress current={stepNumber - 1} />
                  <Text className="mt-5 text-[22px] font-bold leading-7 text-slate-900">
                    {step === 'otp'
                      ? 'Enter verification code'
                      : step === 'password'
                        ? 'Create your password'
                        : 'Review your information'}
                  </Text>
                  <Text className="mt-1.5 text-sm leading-5 text-slate-500">
                    {step === 'otp'
                      ? `We sent a verification code to ${email || 'your email'} to confirm this email.`
                      : step === 'password'
                        ? 'This replaces the temporary password from your registration email.'
                        : 'Confirm the details on your account. You can update them now.'}
                  </Text>
                  <Text className="mt-2 text-xs font-semibold uppercase tracking-wide text-brand">
                    Step {stepNumber} of 3
                  </Text>

                  {step === 'otp' && (
                    <View className="mt-5">
                      <TextInput
                        value={otp}
                        onChangeText={(text) => {
                          setOtp(text.replace(/[^0-9]/g, '').slice(0, OTP_MAX_LENGTH));
                          if (error) setError('');
                        }}
                        placeholder={`${'\u2022'.repeat(OTP_LENGTH)}`}
                        placeholderTextColor="#CBD5E1"
                        className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 text-center text-xl font-bold tracking-[10px] text-slate-800"
                        keyboardType="number-pad"
                        maxLength={OTP_MAX_LENGTH}
                        textContentType="oneTimeCode"
                        autoComplete="sms-otp"
                      />
                      {error ? <Text className="mt-2 text-xs text-red-500">{error}</Text> : null}
                      <Pressable
                        onPress={handleVerifyCode}
                        disabled={busy || otp.length < OTP_LENGTH}
                        className="mt-5 items-center rounded-xl bg-brand py-3.5 active:opacity-90 disabled:opacity-60"
                      >
                        {busy ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <Text className="text-base font-semibold text-white">Verify</Text>
                        )}
                      </Pressable>
                      <Pressable onPress={handleResendCode} disabled={busy} className="mt-3 items-center py-1">
                        <Text className="text-sm font-medium text-brand">Resend code</Text>
                      </Pressable>
                    </View>
                  )}

                  {step === 'password' && (
                    <View className="mt-5">
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
                      />
                      <PasswordStrengthHint password={password} />
                      <Text className="mb-1.5 mt-4 text-sm font-medium text-slate-700">Confirm password</Text>
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
                      />
                      {error ? <Text className="mt-2 text-xs text-red-500">{error}</Text> : null}
                      <Pressable onPress={() => setShowPassword((value) => !value)} className="mt-3 self-start">
                        <Text className="text-sm font-medium text-brand">
                          {showPassword ? 'Hide passwords' : 'Show passwords'}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={handleSetPassword}
                        disabled={busy}
                        className="mt-5 items-center rounded-xl bg-brand py-3.5 disabled:opacity-60"
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
                    <View className="mt-5">
                      <View className="mb-4 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
                        <Text className="text-[13px] leading-5 text-slate-700">
                          Verified email: <Text className="font-semibold">{email}</Text>
                        </Text>
                      </View>
                      <Text className="mb-1.5 text-sm font-medium text-slate-700">First name</Text>
                      <TextInput
                        value={firstName}
                        onChangeText={setFirstName}
                        placeholder="First name"
                        placeholderTextColor="#94A3B8"
                        className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 text-[15px] text-slate-800"
                        autoCapitalize="words"
                      />
                      <Text className="mb-1.5 mt-3 text-sm font-medium text-slate-700">Middle name (optional)</Text>
                      <TextInput
                        value={middleName}
                        onChangeText={setMiddleName}
                        placeholder="Middle name"
                        placeholderTextColor="#94A3B8"
                        className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 text-[15px] text-slate-800"
                        autoCapitalize="words"
                      />
                      <Text className="mb-1.5 mt-3 text-sm font-medium text-slate-700">Last name</Text>
                      <TextInput
                        value={lastName}
                        onChangeText={setLastName}
                        placeholder="Last name"
                        placeholderTextColor="#94A3B8"
                        className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 text-[15px] text-slate-800"
                        autoCapitalize="words"
                      />
                      <Text className="mb-1.5 mt-3 text-sm font-medium text-slate-700">Contact number</Text>
                      <TextInput
                        value={phone}
                        onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, '').slice(0, 11))}
                        placeholder="09XXXXXXXXX"
                        placeholderTextColor="#94A3B8"
                        className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 text-[15px] text-slate-800"
                        keyboardType="number-pad"
                      />
                      {error ? <Text className="mt-2 text-xs text-red-500">{error}</Text> : null}
                      <Pressable
                        onPress={handleCompleteSetup}
                        disabled={busy}
                        className="mt-5 items-center rounded-xl bg-brand py-3.5 disabled:opacity-60"
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
              )}
            </View>
          ) : (
            <View className="items-center rounded-2xl border border-slate-200 bg-white p-6" style={stepShadow}>
              <View className="h-16 w-16 items-center justify-center rounded-full bg-brand-100">
                <Text className="text-3xl text-brand">✓</Text>
              </View>
              <Text className="mt-4 text-xl font-bold text-slate-900">You're all set</Text>
              <Text className="mt-2 text-center text-sm leading-5 text-slate-500">
                Your email is verified and your new password is active.
              </Text>
              <Pressable
                onPress={onSetupComplete}
                className="mt-6 w-full items-center rounded-xl bg-brand py-3.5"
              >
                <Text className="text-base font-bold text-white">Go to Dashboard</Text>
              </Pressable>
            </View>
          )}

          {step !== 'done' ? (
            <Pressable onPress={handleSignOut} className="mt-5 self-center px-4 py-2">
              <Text className="text-sm font-medium text-slate-500">Sign out instead</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
