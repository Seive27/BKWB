import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Navbar, type NavTab } from '@/components/NavBar/Navbar';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { cardShadow } from '@/components/ui/cardShadow';
import {
  getCurrentProfile,
  updateProfile,
  changePassword,
  signOut,
  type FullProfile,
} from '@/services/authService';

type ProfileProps = {
  activeTab?: NavTab;
  onTabPress?: (tab: NavTab) => void;
};

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0) ?? ''}${lastName.charAt(0) ?? ''}`.toUpperCase() || 'MR';
}

function InfoRow({
  label,
  value,
  isLast,
  isStatus,
}: {
  label: string;
  value: string;
  isLast?: boolean;
  isStatus?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center justify-between px-4 py-3.5 ${
        isLast ? '' : 'border-b border-slate-100'
      }`}
    >
      <Text className="text-sm text-navy-soft">{label}</Text>
      {isStatus ? (
        <View className="rounded-full bg-emerald-500 px-3 py-1">
          <Text className="text-xs font-semibold text-white">{value}</Text>
        </View>
      ) : (
        <Text className="max-w-[58%] text-right text-sm font-semibold text-navy">{value}</Text>
      )}
    </View>
  );
}

export default function Profile({ activeTab = 'profile', onTabPress }: ProfileProps) {
  const insets = useSafeAreaInsets();
  const navbarHeight = 72 + Math.max(insets.bottom, 8);

  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Editable fields
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Password fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCurrentProfile();
      setProfile(data);
      setPhone(data?.phone ?? '');
      setAvatarUrl(data?.avatar_url ?? '');
    } catch (err) {
      Alert.alert(
        'Profile Error',
        err instanceof Error ? err.message : 'Failed to load your profile.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const fullName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim()
    : '';

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile({ phone, avatar_url: avatarUrl });
      setProfile((prev) => (prev ? { ...prev, phone, avatar_url: avatarUrl || null } : prev));
      setIsEditing(false);
      Alert.alert('Profile Updated', 'Your profile has been updated.');
    } catch (err) {
      Alert.alert('Update Failed', err instanceof Error ? err.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      Alert.alert('Invalid Password', 'New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Password Mismatch', 'New password and confirmation do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
      Alert.alert('Password Updated', 'Your password has been changed.');
    } catch (err) {
      Alert.alert('Update Failed', err instanceof Error ? err.message : 'Could not change your password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          signOut().catch(() => {});
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-surface">
      <View className="items-center bg-brand px-5 pb-8" style={{ paddingTop: insets.top + 24 }}>
        {avatarUrl ? (
          <View className="h-24 w-24 overflow-hidden rounded-full bg-white">
            <Image
              source={{ uri: avatarUrl }}
              style={{ width: 96, height: 96 }}
              contentFit="cover"
            />
          </View>
        ) : (
          <View className="h-24 w-24 items-center justify-center rounded-full bg-white">
            <Text className="text-3xl font-bold text-brand">
              {getInitials(profile?.first_name ?? '', profile?.last_name ?? '')}
            </Text>
          </View>
        )}
        <Text className="mt-4 text-2xl font-bold text-white">{fullName || 'Meter Reader'}</Text>
        <Text className="mt-1 text-base text-white/80">{profile?.email ?? ''}</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: navbarHeight + 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-4 pt-5">
          {loading ? (
            <Text className="py-10 text-center text-sm text-slate-400">Loading profile…</Text>
          ) : (
            <>
              <Text className="mb-3 text-base font-bold text-navy">Account Information</Text>

              <View className="overflow-hidden rounded-2xl bg-white" style={cardShadow}>
                <InfoRow label="Role" value={profile?.role_name === 'meter_reader' ? 'Meter Reader' : '—'} />
                <InfoRow label="Full Name" value={fullName || '—'} />
                <InfoRow label="Email" value={profile?.email ?? '—'} />
                <InfoRow label="Account Status" value={profile?.is_active ? 'Active' : 'Inactive'} isStatus isLast />
              </View>

              {/* Edit Profile */}
              <Text className="mb-3 mt-6 text-base font-bold text-navy">Edit Profile</Text>
              <View className="overflow-hidden rounded-2xl bg-white" style={cardShadow}>
                <View className="border-b border-slate-100 px-4 py-3.5">
                  <Text className="text-sm text-navy-soft">Profile Picture URL</Text>
                  <TextInput
                    value={avatarUrl}
                    onChangeText={setAvatarUrl}
                    placeholder="https://…/photo.jpg"
                    placeholderTextColor="#9CA3AF"
                    className="mt-1 text-sm font-semibold text-navy"
                    style={{ padding: 0 }}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <View className="px-4 py-3.5">
                  <Text className="text-sm text-navy-soft">Contact Number</Text>
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+63 9XX XXX XXXX"
                    placeholderTextColor="#9CA3AF"
                    className="mt-1 text-sm font-semibold text-navy"
                    style={{ padding: 0 }}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View className="mt-5">
                <PrimaryButton
                  label={saving ? 'Saving…' : isEditing ? 'Save Profile' : 'Edit Profile'}
                  onPress={isEditing ? handleSaveProfile : () => setIsEditing(true)}
                  disabled={saving}
                />
              </View>

              {/* Password */}
              <Text className="mb-3 mt-6 text-base font-bold text-navy">Security</Text>
              <View className="overflow-hidden rounded-2xl bg-white" style={cardShadow}>
                <Pressable
                  onPress={() => setShowPasswordForm((v) => !v)}
                  className="px-4 py-3.5 active:bg-slate-50"
                >
                  <Text className="text-sm font-semibold text-brand">
                    {showPasswordForm ? 'Hide Password Form' : 'Change Password'}
                  </Text>
                </Pressable>

                {showPasswordForm && (
                  <View className="border-t border-slate-100 px-4 py-3.5">
                    <Text className="text-sm text-navy-soft">New Password</Text>
                    <TextInput
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Min. 8 characters"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry
                      className="mt-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-navy"
                      autoCapitalize="none"
                    />
                    <Text className="mt-3 text-sm text-navy-soft">Confirm Password</Text>
                    <TextInput
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Re-enter new password"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry
                      className="mt-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-navy"
                      autoCapitalize="none"
                    />
                    <View className="mt-3">
                      <PrimaryButton
                        label={savingPassword ? 'Updating…' : 'Update Password'}
                        onPress={handleChangePassword}
                        disabled={savingPassword}
                      />
                    </View>
                  </View>
                )}
              </View>

              {/* Logout */}
              <View className="mt-6">
                <SecondaryButton label="Sign Out" onPress={handleLogout} />
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <Navbar activeTab={activeTab} onTabPress={onTabPress} />
    </View>
  );
}
