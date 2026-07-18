import { useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type NavTab = 'dashboard' | 'bills' | 'announcements' | 'profile';

type NavbarProps = {
  activeTab?: NavTab;
  onTabPress?: (tab: NavTab) => void;
};

const ACTIVE_COLOR = '#1E5B8C';
const INACTIVE_COLOR = '#9CA3AF';

const tabs: {
  key: NavTab;
  label: string;
  icon: number;
}[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: require('../../../assets/NavIcon/Dashboard.svg'),
  },
  {
    key: 'bills',
    label: 'Bills',
    icon: require('../../../assets/NavIcon/Bills.svg'),
  },
  {
    key: 'announcements',
    label: 'Announcements',
    icon: require('../../../assets/NavIcon/Announcements.svg'),
  },
  {
    key: 'profile',
    label: 'Profile',
    icon: require('../../../assets/NavIcon/Profile.svg'),
  },
];

function NavItem({
  label,
  icon,
  isActive,
  onPress,
}: {
  label: string;
  icon: number;
  isActive: boolean;
  onPress: () => void;
}) {
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const isHighlighted = isActive || isPressed || isHovered;
  const color = isHighlighted ? ACTIVE_COLOR : INACTIVE_COLOR;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      className="flex-1 items-center justify-center gap-1 py-1"
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
    >
      <Image
        source={icon}
        style={{ width: 22, height: 22, tintColor: color }}
        contentFit="contain"
      />
      <Text
        className={`text-[11px] ${isHighlighted ? 'font-semibold text-brand' : 'font-medium text-gray-400'}`}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Navbar({ activeTab = 'dashboard', onTabPress }: NavbarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="absolute bottom-0 left-0 right-0 border-t border-gray-100 bg-white"
      style={{ paddingBottom: Math.max(insets.bottom, 8) }}
    >
      <View className="h-16 flex-row items-center px-2 pt-1">
        {tabs.map(({ key, label, icon }) => (
          <NavItem
            key={key}
            label={label}
            icon={icon}
            isActive={activeTab === key}
            onPress={() => onTabPress?.(key)}
          />
        ))}
      </View>
    </View>
  );
}
