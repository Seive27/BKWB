import { useState } from 'react';
import {
  ActivityIndicator,
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
import { useDialog } from '@/components/ui/AppDialog';
import { friendlyErrorMessage } from '@/lib/errors';
import {
  isLoginHandleEmail,
  login,
  looksLikeAccountNumber,
  requestPasswordReset,
} from '@/services/authService';

type LoginProps = {
  /** Called after a real Supabase session exists; carries whether the
   *  resident must complete the mandatory Account Setup flow first. */
  onLogin?: (needsOnboarding: boolean) => void;
};

/** Forgot-password modal: email → reset link (never reveals whether the
 *  account exists, for privacy/security). Residents who have NOT completed
 *  the mandatory first-time Account Setup are redirected back to that flow
 *  instead of being offered password recovery — recovery links can only be
 *  sent to a real, verified email, never to an account number or the
 *  temporary @example.com login handle. */
function ForgotPasswordModal({
  visible,
  onClose,
  initialEmail,
}: {
  visible: boolean;
  onClose: () => void;
  initialEmail: string;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const ONBOARDING_MESSAGE =
    'Please complete your first-time account setup before using password ' +
    'recovery. Recovery links are sent to the verified email on your ' +
    'account — enter that email above.';

  const sendReset = async (address: string) => {
    setSending(true);
    try {
      await requestPasswordReset(address);
    } catch (err) {
      // Generic message either way — do not leak whether the email exists.
      console.warn('[forgot-password] reset request failed:', err);
    } finally {
      setSending(false);
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
      // An account number is not a recovery identity — never attempt to send
      // a reset to one (it would go nowhere and is the un-onboarded path).
      if (looksLikeAccountNumber(trimmed)) {
        setError(ONBOARDING_MESSAGE);
        return;
      }
      setError('Please enter a valid email address.');
      return;
    }
    // The acc-…@example.com handle is the pre-setup identity and cannot
    // receive mail — sending a reset there would silently go nowhere.
    if (isLoginHandleEmail(trimmed)) {
      setError(ONBOARDING_MESSAGE);
      return;
    }
    setSent(true);
    await sendReset(trimmed);
  };

  const handleResend = async () => {
    setError('');
    await sendReset(email.trim());
  };

  const handleClose = () => {
    setSent(false);
    setError('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        className="flex-1 items-center justify-center bg-black/50 px-6"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="w-full max-w-sm rounded-2xl bg-white p-6">
          {sent ? (
            <>
              <Text className="text-center text-lg font-bold text-slate-800">
                Check your inbox
              </Text>
              <Text className="mt-3 text-center text-sm leading-5 text-slate-500">
                If an account exists for {email.trim()}, a password reset link has
                been sent. Open it to set a new password, then sign in.
              </Text>
              <Pressable
                onPress={handleResend}
                disabled={sending}
                className="mt-5 items-center py-1 active:opacity-70 disabled:opacity-50"
                accessibilityRole="button"
                accessibilityLabel="Resend the password reset email"
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#186252" />
                ) : (
                  <Text className="text-sm font-semibold text-brand">
                    Didn't receive it? Resend
                  </Text>
                )}
              </Pressable>
              <Pressable
                onPress={handleClose}
                className="mt-3 items-center rounded-xl bg-brand py-3.5 active:bg-brand-dark"
                accessibilityRole="button"
              >
                <Text className="text-base font-semibold text-white">Done</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text className="text-center text-lg font-bold text-slate-800">
                Reset your password
              </Text>
              <Text className="mt-2 text-center text-sm leading-5 text-slate-500">
                Enter the verified email linked to your account and we'll send
                you a secure reset link.
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
                disabled={sending}
                className="mt-5 items-center rounded-xl bg-brand py-3.5 active:bg-brand-dark disabled:opacity-60"
                accessibilityRole="button"
              >
                {sending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-base font-semibold text-white">
                    Send Reset Link
                  </Text>
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
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function Login({ onLogin }: LoginProps) {
  const insets = useSafeAreaInsets();
  const dialog = useDialog();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  // Single login path for both the button and the keyboard submit action so
  // the app is never marked logged-in without a real Supabase session.
  const handleLogin = async () => {
    try {
      const user = await login(username, password);
      onLogin?.(user.needsOnboarding);
    } catch (error) {
      dialog.alert(
        'Login Failed',
        friendlyErrorMessage(error, 'An unexpected error occurred. Please try again.'),
        { tone: 'danger' }
      );
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
              placeholder="Account number or email address"
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

          <View className="mt-6 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3.5">
            <Text className="text-center text-[13px] leading-5 text-brand-800">
              First time here? Get your temporary password at the Barangay
              Hall using your Account Number, then sign in with it above to
              activate your account.
            </Text>
          </View>
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
