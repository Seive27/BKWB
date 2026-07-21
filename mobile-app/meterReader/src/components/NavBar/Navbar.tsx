import { useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type NavTab = 'dashboard' | 'assigned' | 'history' | 'profile';

type NavbarProps = {
  activeTab?: NavTab;
  onTabPress?: (tab: NavTab) => void;
};

const ACTIVE_COLOR = '#1E3A5F';
const INACTIVE_COLOR = '#94A3B8';

const tabs: {
  key: NavTab;
  label: string;
  icon: number;
}[] = [
  {
    key: 'dashboard',
    label: 'DASHBOARD',
    icon: require('../../../assets/Nav.icon/dashboard.png'),
  },
  {
    key: 'assigned',
    label: 'ASSIGNED',
    icon: require('../../../assets/Nav.icon/assigned.png'),
  },
  {
    key: 'history',
    label: 'HISTORY',
    icon: require('../../../assets/Nav.icon/history.png'),
  },
  {
    key: 'profile',
    label: 'PROFILE',
    icon: require('../../../assets/Nav.icon/profile.png'),
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
      className="flex-1 items-center justify-center"
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
    >
      <View
        className={`items-center justify-center gap-1 rounded-2xl px-2.5 py-2 ${
          isActive ? 'bg-white shadow-sm' : ''
        }`}
      >
        <Image
          source={icon}
          style={{ width: 22, height: 22, tintColor: color }}
          contentFit="contain"
        />
        <Text
          className={`text-[10px] tracking-wide ${
            isHighlighted ? 'font-bold text-nav-active' : 'font-medium text-nav-inactive'
          }`}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export function Navbar({ activeTab = 'dashboard', onTabPress }: NavbarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="absolute bottom-0 left-0 right-0 rounded-t-[28px] bg-white"
      style={{ paddingBottom: Math.max(insets.bottom, 8) }}
    >
      <View className="h-[72px] flex-row items-center px-2 pt-2">
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
