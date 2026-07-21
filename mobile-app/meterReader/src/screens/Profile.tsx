import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Navbar, type NavTab } from '@/components/NavBar/Navbar';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { cardShadow } from '@/components/ui/cardShadow';

type ProfileProps = {
  activeTab?: NavTab;
  onTabPress?: (tab: NavTab) => void;
};

type ProfileFields = {
  employeeId: string;
  fullName: string;
  address: string;
  contactNumber: string;
  email: string;
  status: 'Active' | 'Inactive';
};

const INITIAL_PROFILE: ProfileFields = {
  employeeId: 'MR-2024-0042',
  fullName: 'Juan Dela Cruz',
  address: 'Purok 3, Barangay Kalunasan',
  contactNumber: '+63 912 345 6789',
  email: 'juandelacruz@email.com',
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
      <Text className="text-sm text-navy-soft">{label}</Text>
      {isStatus ? (
        <View className="rounded-full bg-emerald-500 px-3 py-1">
          <Text className="text-xs font-semibold text-white">{value}</Text>
        </View>
      ) : isEditing && onChangeText ? (
        <TextInput
          value={value}
          onChangeText={onChangeText}
          className="max-w-[58%] text-right text-sm font-semibold text-navy"
          style={{ padding: 0 }}
          autoCapitalize="none"
          autoCorrect={false}
        />
      ) : (
        <Text className="max-w-[58%] text-right text-sm font-semibold text-navy">
          {value}
        </Text>
      )}
    </View>
  );
}

export default function Profile({
  activeTab = 'profile',
  onTabPress,
}: ProfileProps) {
  const insets = useSafeAreaInsets();
  const navbarHeight = 72 + Math.max(insets.bottom, 8);

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
    <View className="flex-1 bg-surface">
      <View
        className="items-center bg-brand px-5 pb-8"
        style={{ paddingTop: insets.top + 24 }}
      >
        <View className="h-24 w-24 items-center justify-center rounded-full bg-white">
          <Text className="text-3xl font-bold text-brand">
            {getInitials(displayed.fullName)}
          </Text>
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
          <Text className="mb-3 text-base font-bold text-navy">Account Information</Text>

          <View className="overflow-hidden rounded-2xl bg-white" style={cardShadow}>
            <InfoRow label="Employee ID" value={displayed.employeeId} />
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
            <InfoRow label="Account Status" value={displayed.status} isStatus isLast />
          </View>

          <View className="mt-5">
            <PrimaryButton
              label={isEditing ? 'Save' : 'Edit Profile'}
              onPress={isEditing ? saveEditing : startEditing}
            />
          </View>

          {isEditing ? (
            <View className="mt-3">
              <SecondaryButton label="Cancel" onPress={cancelEditing} />
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Navbar activeTab={activeTab} onTabPress={onTabPress} />
    </View>
  );
}
