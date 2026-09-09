import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
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
  cancelPasswordReset,
  completePasswordReset,
  login,
  requestPasswordReset,
  verifyPasswordResetOtp,
} from '@/services/authService';

type LoginProps = {
  onLogin?: () => void;
};

type ResetStep = 'email' | 'otp' | 'password' | 'done';

const OTP_LENGTH = 6;

/** Forgot-password modal: email → OTP → new password (never reveals whether
 *  the account exists, for privacy/security). */
function ForgotPasswordModal({
  visible,
  onClose,
  initialEmail,
}: {
  visible: boolean;
  onClose: () => void;
  initialEmail: string;
}) {
  const [step, setStep] = useState<ResetStep>('email');
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const resetLocalState = () => {
    setStep('email');
    setOtp('');
    setPassword('');
    setConfirm('');
    setShowPassword(false);
    setError('');
    setBusy(false);
  };

  const sendReset = async (address: string) => {
    setBusy(true);
    try {
      await requestPasswordReset(address);
    } catch (err) {
      console.warn('[forgot-password] reset request failed:', err);
    } finally {
      setBusy(false);
    }
  };

  const handleSend = async () => {
    setError('');
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }
    setStep('otp');
    await sendReset(trimmed);
  };

  const handleVerifyOtp = async () => {
    setError('');
    const code = otp.replace(/\s/g, '');
    if (code.length < OTP_LENGTH) {
      setError(`Please enter the ${OTP_LENGTH}-digit code from your email.`);
      return;
    }
    setBusy(true);
    try {
      await verifyPasswordResetOtp(email.trim(), code);
      setStep('password');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code.');
    } finally {
      setBusy(false);
    }
  };

  const handleUpdatePassword = async () => {
    setError('');
    const validationError = getPasswordValidationError(password);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await completePasswordReset(password);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setBusy(false);
    }
  };

  const handleClose = async () => {
    await cancelPasswordReset();
    resetLocalState();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        className="flex-1 items-center justify-center bg-black/50 px-6"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="w-full max-w-sm rounded-2xl bg-white p-6">
          {step === 'email' && (
            <>
              <Text className="text-center text-lg font-bold text-slate-800">
                Reset your password
              </Text>
              <Text className="mt-2 text-center text-sm leading-5 text-slate-500">
                Enter the email linked to your account and we'll send you a
                6-digit code.
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email address"
                placeholderTextColor="#94A3B8"
                className="mt-5 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 text-[15px] text-slate-800"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                returnKeyType="send"
                onSubmitEditing={handleSend}
              />
              {error ? (
                <Text className="mt-2 text-xs text-red-500">{error}</Text>
              ) : null}
              <Pressable
                onPress={handleSend}
                disabled={busy}
                className="mt-5 items-center rounded-xl bg-brand py-3.5 active:bg-brand-dark disabled:opacity-60"
                accessibilityRole="button"
              >
                {busy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-base font-semibold text-white">Send Code</Text>
                )}
              </Pressable>
              <Pressable
                onPress={handleClose}
                className="mt-3 items-center py-1 active:opacity-70"
                accessibilityRole="button"
              >
                <Text className="text-sm font-medium text-brand">Back to Login</Text>
              </Pressable>
            </>
          )}

          {step === 'otp' && (
            <>
              <Text className="text-center text-lg font-bold text-slate-800">
                Enter verification code
              </Text>
              <Text className="mt-2 text-center text-sm leading-5 text-slate-500">
                If an account exists for {email.trim()}, a {OTP_LENGTH}-digit code
                was sent. Enter it below.
              </Text>
              <TextInput
                value={otp}
                onChangeText={(text) => {
                  setOtp(text.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH));
                  if (error) setError('');
                }}
                placeholder={`${'\u2022'.repeat(OTP_LENGTH)}`}
                placeholderTextColor="#CBD5E1"
                className="mt-5 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 text-center text-xl font-bold tracking-[10px] text-slate-800"
                keyboardType="number-pad"
                maxLength={OTP_LENGTH}
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                returnKeyType="done"
                onSubmitEditing={handleVerifyOtp}
              />
              {error ? (
                <Text className="mt-2 text-xs text-red-500">{error}</Text>
              ) : null}
              <Pressable
                onPress={handleVerifyOtp}
                disabled={busy || otp.length < OTP_LENGTH}
                className="mt-5 items-center rounded-xl bg-brand py-3.5 active:bg-brand-dark disabled:opacity-60"
                accessibilityRole="button"
              >
                {busy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-base font-semibold text-white">Verify</Text>
                )}
              </Pressable>
              <View className="mt-3 flex-row items-center justify-between">
                <Pressable
                  onPress={() => {
                    setStep('email');
                    setOtp('');
                    setError('');
                  }}
                  className="py-1 active:opacity-70"
                >
                  <Text className="text-sm font-medium text-slate-500">Change email</Text>
                </Pressable>
                <Pressable
                  onPress={() => sendReset(email.trim())}
                  disabled={busy}
                  className="py-1 active:opacity-70"
                >
                  <Text className="text-sm font-medium text-brand">Resend code</Text>
                </Pressable>
              </View>
            </>
          )}

          {step === 'password' && (
            <>
              <Text className="text-center text-lg font-bold text-slate-800">
                Set a new password
              </Text>
              <Text className="mt-2 text-center text-sm leading-5 text-slate-500">
                Choose a new password, then sign in with it.
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="New password"
                placeholderTextColor="#94A3B8"
                className="mt-5 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 text-[15px] text-slate-800"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
              />
              <PasswordStrengthHint password={password} />
              <TextInput
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Confirm new password"
                placeholderTextColor="#94A3B8"
                className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 text-[15px] text-slate-800"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={handleUpdatePassword}
              />
              <Pressable
                onPress={() => setShowPassword((prev) => !prev)}
                className="mt-2 self-start active:opacity-70"
              >
                <Text className="text-sm font-medium text-brand">
                  {showPassword ? 'Hide passwords' : 'Show passwords'}
                </Text>
              </Pressable>
              {error ? (
                <Text className="mt-2 text-xs text-red-500">{error}</Text>
              ) : null}
              <Pressable
                onPress={handleUpdatePassword}
                disabled={busy}
                className="mt-5 items-center rounded-xl bg-brand py-3.5 active:bg-brand-dark disabled:opacity-60"
                accessibilityRole="button"
              >
                {busy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-base font-semibold text-white">
                    Update Password
                  </Text>
                )}
              </Pressable>
              <Pressable
                onPress={handleClose}
                className="mt-3 items-center py-1 active:opacity-70"
                accessibilityRole="button"
              >
                <Text className="text-sm font-medium text-brand">Cancel</Text>
              </Pressable>
            </>
          )}

          {step === 'done' && (
            <>
              <Text className="text-center text-lg font-bold text-slate-800">
                Password updated
              </Text>
              <Text className="mt-3 text-center text-sm leading-5 text-slate-500">
                You can now sign in with your new password.
              </Text>
              <Pressable
                onPress={handleClose}
                className="mt-6 items-center rounded-xl bg-brand py-3.5 active:bg-brand-dark"
                accessibilityRole="button"
              >
                <Text className="text-base font-semibold text-white">Back to Login</Text>
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function Login({ onLogin }: LoginProps) {
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  // Single login path for both the button and the keyboard submit action so
  // the app is never marked logged-in without a real Supabase session.
  const handleLogin = async () => {
    try {
      await login(username, password);
      onLogin?.();
    } catch (error) {
      Alert.alert('Login failed', error instanceof Error ? error.message : 'An unexpected error occurred.');
    }
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
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
            paddingHorizontal: 28,
            paddingBottom: Math.max(insets.bottom, 24),
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="items-center">
            <Image
              source={require('../../assets/Logo/Logo.BK.png')}
              style={{ width: 128, height: 128, marginBottom: 22 }}
              contentFit="contain"
              accessibilityLabel="Barangay Kalunasan official seal"
            />

            <Text className="text-center text-[24px] font-bold leading-7 text-slate-900">
              Barangay Kalunasan{'\n'}Water Billing System
            </Text>
            <Text className="mt-2.5 text-center text-[14px] leading-5 text-slate-500">
              Secure access to your water billing information.
            </Text>
          </View>

          <View className="mt-10 gap-3.5">
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="Email address"
              placeholderTextColor="#94A3B8"
              className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-4 text-[15px] text-slate-800"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              returnKeyType="next"
            />
            <View className="relative justify-center">
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor="#94A3B8"
                className="rounded-xl border border-slate-200 bg-slate-50/60 py-4 pl-4 pr-12 text-[15px] text-slate-800"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <Pressable
                onPress={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 h-10 w-10 items-center justify-center active:opacity-70"
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                hitSlop={8}
              >
                <Image
                  source={
                    showPassword
                      ? require('../../assets/LoginIcons/HidePW.svg')
                      : require('../../assets/LoginIcons/ShowPW.svg')
                  }
                  style={{ width: 22, height: 18, tintColor: '#64748B' }}
                  contentFit="contain"
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={handleLogin}
            className="mt-5 items-center justify-center rounded-xl bg-brand py-4 shadow-lg active:bg-brand-dark"
            accessibilityRole="button"
            accessibilityLabel="Login"
          >
            <Text className="text-base font-bold text-white">Login</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setShowForgot(true);
            }}
            className="mt-4 items-center py-1 active:opacity-70"
            accessibilityRole="link"
            accessibilityLabel="Forgot Password"
          >
            <Text className="text-[14px] font-medium text-brand">Forgot Password?</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <ForgotPasswordModal
        visible={showForgot}
        onClose={() => setShowForgot(false)}
        initialEmail={username}
      />
    </View>
  );
}
