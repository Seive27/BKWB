import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Navbar, type NavTab } from '@/components/NavBar/Navbar';

type AssignedProps = {
  activeTab?: NavTab;
  onTabPress?: (tab: NavTab) => void;
};

export default function Assigned({
  activeTab = 'assigned',
  onTabPress,
}: AssignedProps) {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-surface">
      <View className="flex-1 px-5" style={{ paddingTop: insets.top + 24 }}>
        <Text className="text-[28px] font-bold text-navy">Assigned</Text>
        <Text className="mt-2 text-[15px] text-navy-soft">
          Assigned routes will appear here.
        </Text>
      </View>
      <Navbar activeTab={activeTab} onTabPress={onTabPress} />
    </View>
  );
}
