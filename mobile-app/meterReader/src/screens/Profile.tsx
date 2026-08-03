import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Navbar, type NavTab } from '@/components/NavBar/Navbar';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { cardShadow } from '@/components/ui/cardShadow';
import {
  getCurrentProfile,
  updateProfile,
  uploadAvatar,
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

function EditableField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  isLast,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad';
  isLast?: boolean;
}) {
  return (
    <View className={`px-4 py-3.5 ${isLast ? '' : 'border-b border-slate-100'}`}>
      <Text className="text-sm text-navy-soft">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        className="mt-1 text-sm font-semibold text-navy"
        style={{ padding: 0 }}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === 'phone-pad' ? 'none' : 'words'}
      />
    </View>
  );
}

export default function Profile({ activeTab = 'profile', onTabPress }: ProfileProps) {
  const insets = useSafeAreaInsets();
  const navbarHeight = 72 + Math.max(insets.bottom, 8);

  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const applyProfileFields = useCallback((data: FullProfile | null) => {
    setLastName(data?.last_name ?? '');
    setFirstName(data?.first_name ?? '');
    setMiddleName(data?.middle_name ?? '');
    setPhone(data?.phone ?? '');
    setAvatarUrl(data?.avatar_url ?? '');
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCurrentProfile();
      setProfile(data);
      applyProfileFields(data);
    } catch (err) {
      Alert.alert(
        'Profile Error',
        err instanceof Error ? err.message : 'Failed to load your profile.'
      );
    } finally {
      setLoading(false);
    }
  }, [applyProfileFields]);

  useEffect(() => {
    load();
  }, [load]);

  const displayName = [firstName, middleName, lastName].filter(Boolean).join(' ').trim();

  const handleCancelEdit = () => {
    applyProfileFields(profile);
    setIsEditing(false);
  };

  const handleSaveProfile = async () => {
    if (!lastName.trim() || !firstName.trim()) {
      Alert.alert('Missing Name', 'Last name and first name are required.');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        last_name: lastName,
        first_name: firstName,
        middle_name: middleName || null,
        phone,
      });
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              last_name: lastName.trim(),
              first_name: firstName.trim(),
              middle_name: middleName.trim() || null,
              phone: phone.trim() || null,
            }
          : prev
      );
      setIsEditing(false);
      Alert.alert('Profile Updated', 'Your profile has been updated.');
    } catch (err) {
      Alert.alert('Update Failed', err instanceof Error ? err.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  const applyPickedImage = async (uri: string) => {
    setUploadingAvatar(true);
    setAvatarUrl(uri);
    try {
      const publicUrl = await uploadAvatar(uri);
      setAvatarUrl(publicUrl);
      setProfile((prev) => (prev ? { ...prev, avatar_url: publicUrl } : prev));
    } catch (err) {
      setAvatarUrl(profile?.avatar_url ?? '');
      Alert.alert(
        'Upload Failed',
        err instanceof Error ? err.message : 'Could not update your profile picture.'
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow photo library access to choose a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      await applyPickedImage(result.assets[0].uri);
    }
  };

  const takeSelfie = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow camera access to take a profile selfie.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      cameraType: ImagePicker.CameraType.front,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      await applyPickedImage(result.assets[0].uri);
    }
  };

  const handleChangeAvatar = () => {
    if (uploadingAvatar) return;
    Alert.alert('Change Profile Picture', 'Choose how you want to update your photo.', [
      { text: 'Take Selfie', onPress: () => { void takeSelfie(); } },
      { text: 'Choose from Gallery', onPress: () => { void pickFromGallery(); } },
      { text: 'Cancel', style: 'cancel' },
    ]);
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
        <View className="relative h-24 w-24">
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
                {getInitials(firstName, lastName)}
              </Text>
            </View>
          )}
          <Pressable
            onPress={handleChangeAvatar}
            disabled={uploadingAvatar}
            className="absolute bottom-0 right-0 h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white active:opacity-80"
            accessibilityRole="button"
            accessibilityLabel="Change profile picture"
          >
            {uploadingAvatar ? (
              <ActivityIndicator size="small" color="#208AEF" />
            ) : (
              <Image
                source={require('../../assets/icons/camera.png')}
                style={{ width: 16, height: 16 }}
                contentFit="contain"
              />
            )}
          </Pressable>
        </View>
        <Text className="mt-4 text-2xl font-bold text-white">{displayName || 'Meter Reader'}</Text>
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
                {isEditing ? (
                  <>
                    <EditableField
                      label="Last Name"
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder="Last name"
                    />
                    <EditableField
                      label="First Name"
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="First name"
                    />
                    <EditableField
                      label="Middle Name"
                      value={middleName}
                      onChangeText={setMiddleName}
                      placeholder="Middle name (optional)"
                    />
                    <EditableField
                      label="Contact Number"
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="+63 9XX XXX XXXX"
                      keyboardType="phone-pad"
                    />
                  </>
                ) : (
                  <>
                    <InfoRow label="Last Name" value={lastName || '—'} />
                    <InfoRow label="First Name" value={firstName || '—'} />
                    <InfoRow label="Middle Name" value={middleName || '—'} />
                    <InfoRow label="Contact Number" value={phone || '—'} />
                  </>
                )}
                <InfoRow label="Email" value={profile?.email ?? '—'} />
                <InfoRow label="Account Status" value={profile?.is_active ? 'Active' : 'Inactive'} isStatus isLast />
              </View>

              <View className="mt-5 gap-3">
                {isEditing ? (
                  <>
                    <PrimaryButton
                      label={saving ? 'Saving…' : 'Save Profile'}
                      onPress={handleSaveProfile}
                      disabled={saving}
                    />
                    <SecondaryButton label="Cancel" onPress={handleCancelEdit} />
                  </>
                ) : (
                  <PrimaryButton label="Edit Profile" onPress={() => setIsEditing(true)} />
                )}
              </View>

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
