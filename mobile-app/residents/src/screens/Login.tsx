import { useState } from 'react';
import {
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
import { login } from '@/services/authService';

type LoginProps = {
  onLogin?: () => void;
};

export default function Login({ onLogin }: LoginProps) {
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
              placeholder="Email address"
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
            onPress={() => {}}
            className="mt-5 items-center py-1 active:opacity-70"
            accessibilityRole="link"
            accessibilityLabel="Forgot Password"
          >
            <Text className="text-[14px] text-[#6497B1]">Forgot Password?</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
