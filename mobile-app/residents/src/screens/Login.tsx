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
import { login, requestPasswordReset } from '@/services/authService';

type LoginProps = {
  onLogin?: () => void;
};

/** Forgot-password modal: email → reset link (never reveals whether the
 *  account exists, for privacy/security). */
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
    setSending(true);
    try {
      await requestPasswordReset(trimmed);
      setSent(true);
    } catch (err) {
      // Generic message either way — do not leak whether the email exists.
      console.warn('[forgot-password] reset request failed:', err);
      setSent(true);
    } finally {
      setSending(false);
    }
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
              <Text className="text-center text-lg font-bold text-[#1E3A5F]">
                Check your inbox
              </Text>
              <Text className="mt-3 text-center text-sm leading-5 text-[#707B81]">
                If an account exists for {email.trim()}, a password reset link has
                been sent. Open it to set a new password, then sign in.
              </Text>
              <Pressable
                onPress={handleClose}
                className="mt-6 items-center rounded-md bg-[#3581A7] py-3 active:opacity-85"
                accessibilityRole="button"
              >
                <Text className="text-base font-semibold text-white">Done</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text className="text-center text-lg font-bold text-[#1E3A5F]">
                Reset your password
              </Text>
              <Text className="mt-2 text-center text-sm leading-5 text-[#707B81]">
                Enter the email linked to your account and we'll send you a
                secure reset link.
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email address"
                placeholderTextColor="#9CA3AF"
                className="mt-5 rounded-md border border-[#D1D5DB] bg-white px-4 py-3.5 text-[15px] text-[#1E3A5F]"
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
                className="mt-5 items-center rounded-md bg-[#3581A7] py-3.5 active:opacity-85 disabled:opacity-60"
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
                <Text className="text-sm text-[#6497B1]">Back to Login</Text>
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
              style={{ width: 200, height: 200, marginBottom: 20 }}
              contentFit="contain"
              accessibilityLabel="Barangay Kalunasan official seal"
            />

            <Text className="text-center text-[22px] font-bold leading-7 text-[#1E3A5F]">
              Barangay Kalunasan{'\n'}Water Billing System
            </Text>
            <Text className="mt-2 text-center text-[14px] leading-5 text-[#707B81]">
              Secure access to your water billing information.
            </Text>
          </View>

          <View className="mt-10 gap-3.5">
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="Account number or email address"
              placeholderTextColor="#9CA3AF"
              className="rounded-md border border-[#D1D5DB] bg-white px-4 py-3.5 text-[15px] text-[#1E3A5F]"
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
                placeholderTextColor="#9CA3AF"
                className="rounded-md border border-[#D1D5DB] bg-white py-3.5 pl-4 pr-12 text-[15px] text-[#1E3A5F]"
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
                  style={{ width: 22, height: 18, tintColor: '#707B81' }}
                  contentFit="contain"
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={handleLogin}
            className="mt-5 items-center justify-center rounded-md bg-[#3581A7] py-3.5 active:opacity-85"
            accessibilityRole="button"
            accessibilityLabel="Login"
          >
            <Text className="text-base font-semibold text-white">Login</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setShowForgot(true);
            }}
            className="mt-5 items-center py-1 active:opacity-70"
            accessibilityRole="link"
            accessibilityLabel="Forgot Password"
          >
            <Text className="text-[14px] text-[#6497B1]">Forgot Password?</Text>
          </Pressable>

          <View className="mt-6 rounded-xl bg-[#F0F7FB] px-4 py-3.5">
            <Text className="text-center text-[13px] leading-5 text-[#4A6B7C]">
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
