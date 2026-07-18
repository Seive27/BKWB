import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Navbar, type NavTab } from '@/components/ui/Navbar';

type ProfileProps = {
  activeTab?: NavTab;
  onTabPress?: (tab: NavTab) => void;
};

type ProfileFields = {
  accountNumber: string;
  fullName: string;
  address: string;
  contactNumber: string;
  email: string;
  zone: string;
  status: 'Active' | 'Inactive';
};

const INITIAL_PROFILE: ProfileFields = {
  accountNumber: 'KLN-2024-1234',
  fullName: 'Juan Dela Cruz',
  address: 'Purok 3, Barangay Kalunasan',
  contactNumber: '+63 912 345 6789',
  email: 'juandelacruz@email.com',
  zone: 'Zone 2',
  status: 'Active',
};

const EDITABLE_KEYS = ['fullName', 'address', 'contactNumber', 'email'] as const;
type EditableKey = (typeof EDITABLE_KEYS)[number];

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function InfoRow({
  label,
  value,
  isEditing,
  onChangeText,
  isLast,
  isStatus,
}: {
  label: string;
  value: string;
  isEditing?: boolean;
  onChangeText?: (text: string) => void;
  isLast?: boolean;
  isStatus?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center justify-between px-4 py-3.5 ${
        isLast ? '' : 'border-b border-slate-100'
      }`}
    >
      <Text className="text-sm text-slate-400">{label}</Text>
      {isStatus ? (
        <View className="rounded-full bg-emerald-500 px-3 py-1">
          <Text className="text-xs font-semibold text-white">{value}</Text>
        </View>
      ) : isEditing && onChangeText ? (
        <TextInput
          value={value}
          onChangeText={onChangeText}
          className="max-w-[58%] text-right text-sm font-semibold text-slate-800"
          style={{ padding: 0 }}
          autoCapitalize="none"
          autoCorrect={false}
        />
      ) : (
        <Text className="max-w-[58%] text-right text-sm font-semibold text-slate-800">{value}</Text>
      )}
    </View>
  );
}

export default function Profile({ activeTab = 'profile', onTabPress }: ProfileProps) {
  const insets = useSafeAreaInsets();
  const navbarHeight = 64 + Math.max(insets.bottom, 8);

  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<ProfileFields>(INITIAL_PROFILE);
  const [draft, setDraft] = useState<ProfileFields>(INITIAL_PROFILE);

  const displayed = isEditing ? draft : profile;

  const updateDraft = (key: EditableKey, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const startEditing = () => {
    setDraft(profile);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setDraft(profile);
    setIsEditing(false);
  };

  const saveEditing = () => {
    setProfile(draft);
    setIsEditing(false);
  };

  return (
    <View className="flex-1 bg-slate-50">
      <View className="items-center bg-brand px-5 pb-8" style={{ paddingTop: insets.top + 24 }}>
        <View className="h-24 w-24 items-center justify-center rounded-full bg-white">
          <Text className="text-3xl font-bold text-brand">{getInitials(displayed.fullName)}</Text>
        </View>
        <Text className="mt-4 text-2xl font-bold text-white">{displayed.fullName}</Text>
        <Text className="mt-1 text-base text-white/80">{displayed.email}</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: navbarHeight + 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-4 pt-5">
          <Text className="mb-3 text-base font-bold text-slate-800">Account Information</Text>

          <View
            className="overflow-hidden rounded-2xl bg-white"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <InfoRow label="Account Number" value={displayed.accountNumber} />
            <InfoRow
              label="Full Name"
              value={displayed.fullName}
              isEditing={isEditing}
              onChangeText={(text) => updateDraft('fullName', text)}
            />
            <InfoRow
              label="Address"
              value={displayed.address}
              isEditing={isEditing}
              onChangeText={(text) => updateDraft('address', text)}
            />
            <InfoRow
              label="Contact Number"
              value={displayed.contactNumber}
              isEditing={isEditing}
              onChangeText={(text) => updateDraft('contactNumber', text)}
            />
            <InfoRow
              label="Email"
              value={displayed.email}
              isEditing={isEditing}
              onChangeText={(text) => updateDraft('email', text)}
            />
            <InfoRow label="Zone" value={displayed.zone} />
            <InfoRow label="Account Status" value={displayed.status} isStatus isLast />
          </View>

          <Pressable
            onPress={isEditing ? saveEditing : startEditing}
            className="mt-5 items-center rounded-xl bg-brand py-3.5 active:bg-brand-dark"
          >
            <Text className="text-base font-semibold text-white">
              {isEditing ? 'Save' : 'Edit Profile'}
            </Text>
          </Pressable>

          {isEditing ? (
            <Pressable
              onPress={cancelEditing}
              className="mt-3 items-center rounded-xl border border-slate-200 bg-white py-3.5 active:bg-slate-50"
            >
              <Text className="text-base font-semibold text-slate-600">Cancel</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      <Navbar activeTab={activeTab} onTabPress={onTabPress} />
    </View>
  );
}
